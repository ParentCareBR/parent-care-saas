import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

// Models confirmed available for this API key (tested via /v1beta/models)
const CANDIDATE_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.5-flash',
  'gemini-flash-lite-latest',
  'gemini-flash-latest',
  'gemini-3.8-flash',
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, caredPersonId, userRole = 'host' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    if (!API_KEY) {
      console.error('[Nina IA] GEMINI_API_KEY não configurada');
      return NextResponse.json(
        { reply: 'A integração com IA não está configurada. Por favor, verifique a configuração do servidor. 🩺💙' },
        { status: 500 }
      );
    }

    // ── Auth context & Server-Side Role Enforcement ───────────────────────────
    let user: any = null;
    let isElderlyUser = userRole === 'elderly';
    let isHost = false;

    let db: any;
    try {
      db = createAdminClient();
    } catch {
      const supabase = await createClient();
      db = supabase;
    }

    try {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      user = data?.user || null;

      if (user && caredPersonId) {
        // Verify server-side if user is the cared person (elderly)
        const { data: elderCheck } = await db
          .from('cared_people')
          .select('id')
          .eq('id', caredPersonId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (elderCheck) {
          isElderlyUser = true;
        } else {
          // Check organization membership/role for caregiver/host
          const { data: member } = await db
            .from('organization_members')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();

          if (member && (member.role === 'owner' || member.role === 'admin' || member.role === 'caregiver')) {
            isHost = !isElderlyUser;
          } else if (user && !isElderlyUser) {
            isHost = true;
          }
        }
      } else if (!isElderlyUser && user) {
        isHost = true;
      }
    } catch {
      // Fallback: if userRole says elderly or no user, cannot be host
      if (isElderlyUser) isHost = false;
    }

    if (isElderlyUser) {
      isHost = false;
    }

    // ── 1. Fetch Real-Time Context ─────────────────────────────────────────────
    let personData: any = null;
    let appointments: any[] = [];
    let medications: any[] = [];
    let tasks: any[] = [];
    let todayMeals: any[] = [];
    let todayHydrationTotal = 0;
    let recentVitals: any[] = [];
    let enabledModules: string[] = [];
    let orgId = '';

    const now = new Date();
    const nowSaoPaulo = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now);

    const todayDateStr = now.toISOString().slice(0, 10);
    const startOfTodayIso = `${todayDateStr}T00:00:00.000Z`;

    if (caredPersonId) {
      try {
        let db: any;
        try {
          db = createAdminClient();
        } catch {
          const supabase = await createClient();
          db = supabase;
        }

        const [
          personRes,
          apptRes,
          medsRes,
          tasksRes,
          mealsRes,
          waterRes,
          vitalsRes,
          settingsRes,
        ] = await Promise.all([
          db.from('cared_people').select('*').eq('id', caredPersonId).maybeSingle(),
          db.from('appointments')
            .select('id, title, starts_at, doctor_name, specialty, location, description, status')
            .eq('cared_person_id', caredPersonId)
            .gte('starts_at', startOfTodayIso)
            .order('starts_at', { ascending: true })
            .limit(10),
          db.from('medications')
            .select('id, name, dosage, unit, instructions, is_active, medication_schedules(id, time_of_day)')
            .eq('cared_person_id', caredPersonId)
            .eq('is_active', true)
            .limit(15),
          db.from('tasks')
            .select('id, title, due_date, priority, status')
            .eq('cared_person_id', caredPersonId)
            .neq('status', 'completed')
            .order('due_date', { ascending: true })
            .limit(10),
          db.from('meals')
            .select('id, meal_type, created_at')
            .eq('cared_person_id', caredPersonId)
            .gte('created_at', startOfTodayIso)
            .order('created_at', { ascending: true }),
          db.from('hydration_logs')
            .select('amount_ml')
            .eq('cared_person_id', caredPersonId)
            .gte('created_at', startOfTodayIso),
          db.from('check_ins')
            .select('id, mood, notes, created_at')
            .eq('cared_person_id', caredPersonId)
            .order('created_at', { ascending: false })
            .limit(3),
          db.from('cared_person_monitoring_settings')
            .select('enabled, monitoring_definitions(code, label)')
            .eq('cared_person_id', caredPersonId),
        ]);

        personData = personRes.data || null;
        appointments = apptRes.data || [];
        medications = medsRes.data || [];
        tasks = tasksRes.data || [];
        todayMeals = mealsRes.data || [];
        todayHydrationTotal = (waterRes.data || []).reduce(
          (acc: number, item: any) => acc + (Number(item.amount_ml) || 0),
          0
        );
        recentVitals = vitalsRes.data || [];
        enabledModules = (settingsRes.data || [])
          .filter((s: any) => s.enabled)
          .map((s: any) => s.monitoring_definitions?.code)
          .filter(Boolean);

        if (personData?.organization_id) {
          orgId = personData.organization_id;
        }
      } catch (err) {
        console.warn('[Nina IA] Erro ao carregar dados do Supabase:', err);
      }
    }

    const elderName = personData?.full_name || 'Idoso Acompanhado';
    const elderFirstName = elderName.split(' ')[0];

    const todayAppointments = appointments.filter((a: any) => {
      try {
        return new Date(a.starts_at).toISOString().slice(0, 10) === todayDateStr;
      } catch {
        return false;
      }
    });
    const upcomingAppointments = appointments.filter((a: any) => !todayAppointments.includes(a));

    const liveContext = `
======================================================
DADOS CLÍNICOS E ROTINA EM TEMPO REAL DO PARENT CARE
======================================================
DATA E HORÁRIO ATUAL: ${nowSaoPaulo}
PERFIL DO USUÁRIO: ${isHost ? 'ANFITRIÃO / CUIDADOR (pode alterar rotinas, agenda e ativar/desativar recursos)' : 'IDOSO / PESSOA CUIDADA (NÃO tem permissão de alterar rotina ou agenda)'}
PESSOA CUIDADA: ${elderName} (ID: ${caredPersonId || 'Não selecionado'})

--- AGENDA DE HOJE (${todayDateStr}) ---
${todayAppointments.length === 0
  ? 'Nenhum compromisso médico ou consulta agendada para hoje.'
  : todayAppointments.map((a: any) => {
      const hora = new Date(a.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `- [ID: ${a.id}] ${a.title} às ${hora} | Médico: ${a.doctor_name || 'N/A'} | Local: ${a.location || 'N/A'} | Status: ${a.status}`;
    }).join('\n')}

--- PRÓXIMAS CONSULTAS (14 dias) ---
${upcomingAppointments.length === 0
  ? 'Nenhuma outra consulta nos próximos dias.'
  : upcomingAppointments.map((a: any) => {
      const dataHora = new Date(a.starts_at).toLocaleString('pt-BR');
      return `- [ID: ${a.id}] ${a.title} em ${dataHora} | Médico: ${a.doctor_name || 'Dr.'} | Local: ${a.location || 'A definir'}`;
    }).join('\n')}

--- MEDICAMENTOS CADASTRADOS ---
${medications.length === 0
  ? 'Nenhum medicamento ativo cadastrado.'
  : medications.map((m: any) => {
      const schedules = (m.medication_schedules || []).map((s: any) => s.time_of_day?.slice(0, 5)).join(', ');
      return `- ${m.name} ${m.dosage}${m.unit} | Horários: ${schedules || 'Não definidos'} | Instruções: ${m.instructions || 'Nenhuma'}`;
    }).join('\n')}

--- REFEIÇÕES HOJE ---
${todayMeals.length === 0
  ? 'Nenhuma refeição registrada hoje.'
  : todayMeals.map((m: any) => `- ${m.meal_type} às ${new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`).join('\n')}

--- HIDRATAÇÃO HOJE ---
Total consumido hoje: ${todayHydrationTotal} ml

--- CHECK-INS RECENTES ---
${recentVitals.length === 0
  ? 'Nenhum check-in registrado recentemente.'
  : recentVitals.map((v: any) => `- Humor: ${v.mood} | Notas: ${v.notes || 'Sem nota'} | Registrado em: ${new Date(v.created_at).toLocaleString('pt-BR')}`).join('\n')}

--- TAREFAS PENDENTES ---
${tasks.length === 0
  ? 'Nenhuma tarefa pendente.'
  : tasks.map((t: any) => `- [${t.priority}] ${t.title} | Vence: ${t.due_date || 'Sem data'} | Status: ${t.status}`).join('\n')}
`;

    // ── 2. Build System Prompt ─────────────────────────────────────────────────
    const systemInstruction = `
Você é a **Nina IA**, assistente virtual de saúde e cuidados do aplicativo **Parent Care**.
Sua missão é apoiar cuidadores, familiares e idosos com muito carinho, clareza, empatia e máxima responsabilidade.

SUAS CAPACIDADES:
1. Responder dúvidas sobre saúde do idoso (sintomas, hidratação, alimentação, medicamentos JÁ CADASTRADOS, prevenção de quedas, etc.)
2. Informar sobre a agenda, consultas e medicamentos registrados no sistema (use os dados do CONTEXTO ATUAL)
3. SE O USUÁRIO FOR ANFITRIÃO: executar ações operacionais no aplicativo (criar agendamentos, tarefas, registrar água)
4. Auxiliar na navegação e uso do aplicativo

REGRAS CRÍTICAS DE SEGURANÇA E PERMISSÃO:
- NUNCA prescreva, sugira novos medicamentos ou altere dosagens. Você apenas informa o que JÁ ESTÁ cadastrado.
- NUNCA invente dados. Se não houver dados no contexto, diga claramente que não há informação disponível.
${isElderlyUser ? `
- ATENÇÃO: O USUÁRIO ATUAL É O IDOSO (${elderName}).
- O IDOSO NÃO TEM PERMISSÃO DE CRIAR, EDITAR, REMOVER OU REAGENDAR CONSULTAS, ATIVIDADES OU MEDICAMENTOS, NEM DE GERENCIAR FAMILIARES OU PERMISSÕES.
- SE O IDOSO pedir para alterar, marcar, cancelar ou excluir consultas, remédios, atividades ou familiares, responda com afeto e firmeza:
  "Por segurança e cuidado com a sua saúde, qualquer alteração na sua rotina ou medicamentos precisa ser feita pelo seu cuidador ou anfitrião da família. Deseja que eu envie um aviso com o seu pedido para a sua família? 🩺💙"
- NUNCA inclua bloco de ação JSON para usuários idosos.
` : `
- O usuário atual é ANFITRIÃO/CUIDADOR AUTORIZADO. Pode solicitar ações de agendamento e rotina.
`}

PARA EXECUTAR AÇÕES (apenas se ANFITRIÃO AUTORIZADO):
Inclua no final da resposta um bloco JSON:
\`\`\`json
{
  "action": {
    "type": "create_appointment" | "cancel_appointment" | "reschedule_appointment" | "create_task" | "log_water" | "log_meal" | "toggle_module",
    "data": { ...campos relevantes... }
  }
}
\`\`\`

TOM DE VOZ:
- Afetuosa, calma, empática e respeitosa.
- Use linguagem clara, direta e acolhedora.
- Emojis delicados: 🩺 💙 💡 📅 ✅
- Responda SEMPRE em Português do Brasil.
- Resposta concisa mas completa (máx. 5 parágrafos).

CONTEXTO ATUAL DO SISTEMA:
${liveContext}
`;

    // ── 3. Call Gemini with sanitized history and fallback chain ─────────────
    const genAI = new GoogleGenerativeAI(API_KEY);
    let reply = '';
    let lastError: any = null;

    // Gemini SDK requires history to:
    // 1. Start with role 'user' (never 'model')
    // 2. Alternate between 'user' and 'model'
    const sanitizedHistory: { role: 'user' | 'model'; parts: { text: string }[] }[] = [];
    for (const m of messages.slice(0, -1)) {
      const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
      if (sanitizedHistory.length === 0) {
        if (role === 'user') {
          sanitizedHistory.push({ role, parts: [{ text: m.content }] });
        }
        // If the first message in state was an assistant greeting, omit from history
      } else {
        const lastRole = sanitizedHistory[sanitizedHistory.length - 1].role;
        if (role !== lastRole) {
          sanitizedHistory.push({ role, parts: [{ text: m.content }] });
        } else {
          sanitizedHistory[sanitizedHistory.length - 1].parts[0].text += `\n${m.content}`;
        }
      }
    }

    const lastUserMessage = messages[messages.length - 1].content;

    for (const modelName of CANDIDATE_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        const chat = model.startChat({ history: sanitizedHistory });
        const result = await chat.sendMessage(lastUserMessage);
        const text = result.response.text();
        if (text) {
          reply = text;
          console.log(`[Nina IA] Resposta via modelo: ${modelName}`);
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[Nina IA] Falha no modelo ${modelName}:`, err.message || err);
      }
    }

    if (!reply) {
      throw lastError || new Error('Nenhum modelo respondeu');
    }

    // ── 4. Parse & Execute Actions ────────────────────────────────────────────
    let actionPayload: any = null;
    const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/) || reply.match(/(\{[\s\S]*?"action"[\s\S]*?\})/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action) {
          actionPayload = parsed.action;
          reply = reply.replace(/```json[\s\S]*?```/g, '').trim();
        }
      } catch (e) {
        console.warn('[Nina IA] Erro ao processar JSON de ação:', e);
      }
    }

    // Strip and nullify any action payload if user is elderly or not an authorized host
    if (isElderlyUser || !isHost) {
      actionPayload = null;
    }

    if (actionPayload && isHost && caredPersonId) {
      try {
        let db: any;
        try { db = createAdminClient(); } catch { db = await createClient(); }
        const { type, data } = actionPayload;

        if (type === 'create_appointment') {
          await db.from('appointments').insert({
            cared_person_id: caredPersonId,
            organization_id: orgId || null,
            title: data.title || 'Consulta Médica',
            doctor_name: data.doctor_name || null,
            specialty: data.specialty || null,
            location: data.location || null,
            starts_at: data.starts_at || new Date(Date.now() + 86400000).toISOString(),
            description: data.description || 'Agendado via Nina IA',
            status: 'scheduled',
          });
        } else if (type === 'cancel_appointment' && data.appointment_id) {
          await db.from('appointments').update({ status: 'cancelled' }).eq('id', data.appointment_id);
        } else if (type === 'reschedule_appointment' && data.appointment_id) {
          await db.from('appointments').update({ starts_at: data.new_starts_at }).eq('id', data.appointment_id);
        } else if (type === 'create_task') {
          await db.from('tasks').insert({
            cared_person_id: caredPersonId,
            organization_id: orgId || null,
            title: data.title || 'Nova Tarefa',
            due_date: data.due_date || todayDateStr,
            priority: data.priority || 'medium',
            status: 'pending',
          });
        } else if (type === 'log_water') {
          await db.from('hydration_logs').insert({
            cared_person_id: caredPersonId,
            organization_id: orgId || null,
            amount_ml: Number(data.amount_ml) || 250,
            logged_by: user?.id || null,
          });
        } else if (type === 'log_meal') {
          await db.from('meals').insert({
            cared_person_id: caredPersonId,
            organization_id: orgId || null,
            meal_type: data.meal_type || 'other',
            logged_by: user?.id || null,
          });
        } else if (type === 'toggle_module' && data.module_code) {
          const targetEnabled = data.enabled !== false;
          const { data: def } = await db.from('monitoring_definitions').select('id').eq('code', data.module_code).maybeSingle();
          if (def) {
            await db.from('cared_person_monitoring_settings').upsert({
              cared_person_id: caredPersonId,
              definition_id: def.id,
              enabled: targetEnabled,
            });
          }
        }
      } catch (actionErr) {
        console.error('[Nina IA] Erro ao executar ação no Supabase:', actionErr);
      }
    }

    return NextResponse.json({ reply, actionExecuted: Boolean(actionPayload && isHost) });

  } catch (error: any) {
    console.error('[Nina IA] Erro fatal na rota:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro ao processar mensagem',
        reply: 'Desculpe, tive uma instabilidade momentânea. Por favor, tente novamente em alguns segundos. 🩺💙',
      },
      { status: 500 }
    );
  }
}
