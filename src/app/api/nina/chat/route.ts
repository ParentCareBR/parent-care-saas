import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, caredPersonId, userRole = 'host' } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Check if user is host/caregiver or elder
    // By default: if authenticated via dashboard, user is host. If userRole explicitly 'elderly' or unauthenticated, it is elder.
    const isHost = Boolean(user && userRole !== 'elderly');

    // ── 1. Fetch Real-Time Context for the Cared Person ────────────────────
    let personData: any = null;
    let appointments: any[] = [];
    let medications: any[] = [];
    let tasks: any[] = [];
    let todayMeals: any[] = [];
    let todayHydrationTotal = 0;
    let recentVitals: any = null;
    let enabledModules: string[] = [];
    let orgSettings: any = {};
    let orgId = '';

    const now = new Date();
    const nowSaoPaulo = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      dateStyle: 'full',
      timeStyle: 'medium',
    }).format(now);

    const todayDateStr = now.toISOString().slice(0, 10);
    const startOfTodayIso = `${todayDateStr}T00:00:00.000Z`;
    const endOfTodayIso = `${todayDateStr}T23:59:59.999Z`;

    // Try admin client first for comprehensive access, fallback to user client
    let db: any;
    try {
      db = createAdminClient();
    } catch {
      db = supabase;
    }

    if (caredPersonId) {
      try {
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
          // Person
          db.from('cared_people').select('*').eq('id', caredPersonId).maybeSingle(),
          // Appointments for next 14 days
          db.from('appointments')
            .select('id, title, starts_at, doctor_name, specialty, location, description, status')
            .eq('cared_person_id', caredPersonId)
            .gte('starts_at', startOfTodayIso)
            .order('starts_at', { ascending: true })
            .limit(10),
          // Active Medications with schedules
          db.from('medications')
            .select('id, name, dosage, unit, instructions, is_active, medication_schedules(id, time_of_day)')
            .eq('cared_person_id', caredPersonId)
            .eq('is_active', true)
            .limit(15),
          // Pending tasks
          db.from('tasks')
            .select('id, title, due_date, priority, status')
            .eq('cared_person_id', caredPersonId)
            .neq('status', 'completed')
            .order('due_date', { ascending: true })
            .limit(10),
          // Meals logged today
          db.from('meals')
            .select('id, meal_type, created_at')
            .eq('cared_person_id', caredPersonId)
            .gte('created_at', startOfTodayIso)
            .order('created_at', { ascending: true }),
          // Hydration today
          db.from('hydration_logs')
            .select('amount_ml')
            .eq('cared_person_id', caredPersonId)
            .gte('created_at', startOfTodayIso),
          // Recent vitals / check-ins
          db.from('check_ins')
            .select('id, mood, notes, created_at')
            .eq('cared_person_id', caredPersonId)
            .order('created_at', { ascending: false })
            .limit(3),
          // Active monitoring modules
          db.from('cared_person_monitoring_settings')
            .select('enabled, monitoring_definitions(code, label)')
            .eq('cared_person_id', caredPersonId),
        ]);

        personData = personRes.data || null;
        appointments = apptRes.data || [];
        medications = medsRes.data || [];
        tasks = tasksRes.data || [];
        todayMeals = mealsRes.data || [];
        todayHydrationTotal = (waterRes.data || []).reduce((acc: number, item: any) => acc + (Number(item.amount_ml) || 0), 0);
        recentVitals = vitalsRes.data || [];
        enabledModules = (settingsRes.data || [])
          .filter((s: any) => s.enabled)
          .map((s: any) => s.monitoring_definitions?.code)
          .filter(Boolean);

        if (personData?.organization_id) {
          orgId = personData.organization_id;
          const { data: org } = await db.from('organizations').select('settings').eq('id', orgId).maybeSingle();
          orgSettings = org?.settings || {};
        }
      } catch (err) {
        console.warn('Erro ao carregar dados do Supabase para a Nina IA:', err);
      }
    }

    const elderName = personData?.full_name || 'Idoso Acompanhado';
    const elderFirstName = elderName.split(' ')[0];

    // Filter appointments for today specifically
    const todayAppointments = appointments.filter((a: any) => {
      try {
        const d = new Date(a.starts_at);
        return d.toISOString().slice(0, 10) === todayDateStr;
      } catch {
        return false;
      }
    });

    const upcomingAppointments = appointments.filter((a: any) => !todayAppointments.includes(a));

    // Build Detailed Context for System Prompt
    const liveContext = `
======================================================
DADOS CLÍNICOS E ROTINA EM TEMPO REAL DO PARENT CARE
======================================================
DATA E HORÁRIO ATUAL: ${nowSaoPaulo}
PERFIL DO USUÁRIO QUE ESTÁ FALANDO COM VOCÊ: ${isHost ? 'ANFITRIÃO / CUIDADOR (Permissão para alterar rotinas, agenda e ativar/desativar recursos)' : 'IDOSO / PESSOA CUIDADA (NÃO TEM PERMISSÃO de alterar rotina ou agenda sem autorização do anfitrião)'}
PESSOA CUIDADA: ${elderName} (ID: ${caredPersonId || 'Não selecionado'})
ORGANIZAÇÃO ID: ${orgId || 'Não vinculada'}

--- AGENDA DE HOJE (${todayDateStr}) ---
${todayAppointments.length === 0
  ? 'Nenhum compromisso médico ou consulta agendada para hoje.'
  : todayAppointments.map((a: any) => {
      const hora = new Date(a.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return `- [ID: ${a.id}] ${a.title} às ${hora} | Médico: ${a.doctor_name || 'Não informado'} | Local: ${a.location || 'Consultório/Em casa'} | Status: ${a.status}`;
    }).join('\n')}

--- PRÓXIMAS CONSULTAS E EXAMES (Próximos 14 dias) ---
${upcomingAppointments.length === 0
  ? 'Nenhuma outra consulta nos próximos dias.'
  : upcomingAppointments.map((a: any) => {
      const dataHora = new Date(a.starts_at).toLocaleString('pt-BR');
      return `- [ID: ${a.id}] ${a.title} em ${dataHora} | Médico: ${a.doctor_name || 'Dr.'} | Local: ${a.location || 'Local a definir'}`;
    }).join('\n')}

--- MEDICAMENTOS CADASTRADOS (JÁ PROGRAMADOS NO APP) ---
${medications.length === 0
  ? 'Nenhum medicamento ativo cadastrado no sistema.'
  : medications.map((m: any) => {
      const horários = (m.medication_schedules || []).map((s: any) => s.time_of_day.slice(0, 5)).join(', ') || 'Horário livre/conforme necessidade';
      return `- [ID: ${m.id}] ${m.name} (${m.dosage} ${m.unit}) - Horários: ${horários} | Instruções: ${m.instructions || 'Uso contínuo'}`;
    }).join('\n')}

--- ALIMENTAÇÃO REGISTRADA HOJE ---
${todayMeals.length === 0
  ? 'Nenhuma refeição registrada hoje ainda.'
  : todayMeals.map((m: any) => `- Refeição ${m.meal_type} às ${new Date(m.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`).join('\n')}

--- HIDRATAÇÃO DE HOJE ---
Total ingerido: ${todayHydrationTotal} ml (Aprox. ${Math.round(todayHydrationTotal / 250)} de 8 copos). Meta diária recomendada: 2000 ml.

--- TAREFAS PENDENTES DO DIA ---
${tasks.length === 0
  ? 'Nenhuma tarefa pendente.'
  : tasks.map((t: any) => `- [ID: ${t.id}] ${t.title} (Prioridade: ${t.priority || 'média'})`).join('\n')}

--- MÓDULOS DE MONITORAMENTO ATIVOS NA TELA DO IDOSO ---
${enabledModules.length === 0 ? 'Módulos padrão ativados.' : enabledModules.join(', ')}

======================================================
GUIA COMPLETO DE RECURSOS DO APLICATIVO PARENT CARE
======================================================
1. Agenda Centralizada: Consultas médicas, exames e retornos.
2. Medicamentos: Cadastro de remédios, horários, dosagens e confirmação de tomada.
3. Alimentação: Registro de café da manhã, almoço, lanche, jantar e apetite.
4. Hidratação: Acompanhamento de copos de água tomados (meta de 2000ml / 8 copos).
5. Sinais Vitais: Aferição de Pressão Arterial, Glicemia, Saturação O2 e Batimentos.
6. Atividades Físicas: Exercícios leves, caminhadas e fisioterapia.
7. Jogos Cognitivos: 7 jogos para estímulo cerebral com fases (Forca, Caça-Palavras, Memória, Sudoku, etc.).
8. Tarefas: Organização de afazeres diários com alarmes e prioridades.
9. Nina IA: Assistente virtual 24h para orientação e navegação.
10. Modo Idoso: Tela simplificada com botões gigantes, voz e alta acessibilidade.
11. Passagem de Plantão: Comunicação e troca de turno entre cuidadores e familiares.
12. Família & Cuidadores: Gestão de pessoas autorizadas na equipe de cuidado.
13. Compras & Suprimentos: Controle de estoque de medicamentos e compras essenciais.
14. Segurança do Lar: Checklist de prevenção de quedas e adaptações residenciais.
15. Relatórios & PDF: Prontuário médico consolidado para levar em consultas.
16. Histórico Clínico: Registro cronológico de tudo o que aconteceu no cuidado.
17. Despesas & Custos: Gestão financeira com farmácia e tratamentos.
18. Memórias & Fotos: Álbum de recordações para estímulo afetivo e cognitivo.
19. Botão SOS / Emergência: Disparo de sirene e alerta urgente para toda a família.
20. Configurações de Monitoramento: O anfitrião ativa ou desativa módulos específicos por idoso.
`;

    const systemInstruction = `Você é a Nina IA, enfermeira e núcleo inteligente de navegação e apoio do aplicativo Parent Care.
Seu propósito: Fornecer assistência humanizada, acolhedora, precisa e segura aos cuidadores, familiares e idosos.

REGRAS ESSENCIAIS ABSOLUTAS:
1. NÃO RECEITAR OU MEDICAR:
   - Você JAMAIS receita, medica, prescreve novos remédios ou altera dosagens por conta própria.
   - Você APENAS LEMBRA E INFORMA aquilo que JÁ ESTÁ PROGRAMADO e cadastrado no banco de dados do aplicativo pelo médico ou anfitrião!
   - Se o usuário perguntar sobre remédios: consulte a lista de "MEDICAMENTOS CADASTRADOS" no contexto e informe exatamente o que está registrado com carinho e clareza.
   - Se perguntarem sobre remédios que não estão cadastrados ou sobre diagnóstico clínico: esclareça que você não pode prescrever e recomende conversar com o médico de confiança ou com o anfitrião da família.

2. ATIVAÇÃO / DESATIVAÇÃO DE RECURSOS E ALTERAÇÃO DE AGENDA:
   - SE O USUÁRIO FOR O ANFITRIÃO / CUIDADOR (${isHost ? 'SIM, ESTE USUÁRIO É O ANFITRIÃO' : 'NÃO, ESTE USUÁRIO É O IDOSO'}):
     - Ele TEM AUTORIZAÇÃO TOTAL para alterar a agenda, marcar consultas, criar tarefas, registrar água, e ativar ou desativar recursos!
     - Quando o anfitrião pedir para fazer uma dessas alterações, você deve executar a ação retornando um bloco JSON especial no final da sua resposta, no formato:
       \`\`\`json
       {
         "action": {
           "type": "create_appointment" | "reschedule_appointment" | "cancel_appointment" | "toggle_module" | "create_task" | "log_water" | "log_meal",
           "data": { ...campos da ação... }
         }
       }
       \`\`\`
     - Confirme na sua fala em texto de forma carinhosa e profissional que a alteração foi realizada com sucesso!

   - SE O USUÁRIO FOR O IDOSO / PESSOA CUIDADA (${!isHost ? 'ESTE USUÁRIO É O IDOSO' : ''}):
     - O idoso NÃO TEM AUTORIZAÇÃO PRÉVIA para alterar medicamentos, rotina ou recursos do aplicativo sem o consentimento do anfitrião.
     - Se o idoso pedir para mudar a agenda, remédio ou desligar recursos, responda com muito afeto:
       "Por segurança e cuidado com a sua saúde, alterações na sua agenda, remédios ou recursos do aplicativo precisam da aprovação do seu cuidador ou anfitrião da família. Deseja que eu avise a sua família para que eles façam essa alteração para você? 🩺💙"

3. PERGUNTAS SOBRE A AGENDA E O DIA A DIA:
   - Se o usuário perguntar "qual a agenda de hoje?", consulte o bloco "AGENDA DE HOJE" no contexto:
     - Se houver consultas hoje: liste com horário, médico e local.
     - Se NÃO houver consultas hoje: diga expressamente com carinho: "Para hoje, ${todayDateStr}, não há nenhuma consulta ou exame médico agendado na sua Agenda Centralizada. A rotina médica está tranquila! 🩺📅". Lembre também dos medicamentos ou hidratação se achar relevante.

4. NAVEGAÇÃO NO APLICATIVO:
   - Você entende todos os 20 recursos do Parent Care listados acima. Se o usuário perguntar onde fica ou como usar qualquer função, explique o passo a passo direto e simples.

5. TOM DE VOZ:
   - Extremamente afetuosa, calma, empática, respeitosa (use linguagem acolhedora, emojis delicados como 🩺, 💙, 💡, 📅).
   - Responda em Português do Brasil de forma clara e objetiva.

CONTEXTO ATUAL DO SISTEMA:
${liveContext}
`;

    // ── 2. Run Gemini Generation with Model Fallbacks ─────────────────────────
    const genAI = new GoogleGenerativeAI(API_KEY);
    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];

    let reply = '';
    let lastError: any = null;

    // Format chat history for Google Generative AI
    const history = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const lastUserMessage = messages[messages.length - 1].content;

    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });

        const chat = model.startChat({ history });
        const result = await chat.sendMessage(lastUserMessage);
        reply = result.response.text();
        if (reply) break;
      } catch (err: any) {
        lastError = err;
        console.warn(`[Nina IA] Falha no modelo ${modelName}:`, err.message || err);
      }
    }

    if (!reply) {
      throw lastError || new Error('Não foi possível obter resposta do Gemini');
    }

    // ── 3. Parse and Execute Actions if Present ──────────────────────────────
    let actionPayload: any = null;
    const jsonMatch = reply.match(/```json\s*(\{[\s\S]*?\})\s*```/) || reply.match(/(\{[\s\S]*?"action"[\s\S]*?\})/);

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.action) {
          actionPayload = parsed.action;
          // Clean the JSON codeblock from user-facing text
          reply = reply.replace(/```json[\s\S]*?```/g, '').trim();
        }
      } catch (e) {
        console.warn('Erro ao processar JSON de ação da Nina IA:', e);
      }
    }

    // Execute Action in Database ONLY IF USER IS HOST
    if (actionPayload && isHost && caredPersonId) {
      try {
        const { type, data } = actionPayload;

        if (type === 'create_appointment') {
          await db.from('appointments').insert({
            cared_person_id: caredPersonId,
            organization_id: orgId || null,
            title: data.title || 'Consulta Médica',
            doctor_name: data.doctor_name || null,
            specialty: data.specialty || null,
            location: data.location || null,
            starts_at: data.starts_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
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
          // Toggle monitoring setting
          const targetEnabled = data.enabled !== false;
          // Find definition ID
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
        console.error('Erro ao executar ação da Nina IA no Supabase:', actionErr);
      }
    }

    return NextResponse.json({
      reply,
      actionExecuted: Boolean(actionPayload && isHost),
    });

  } catch (error: any) {
    console.error('Erro na rota da Nina IA:', error);
    return NextResponse.json(
      {
        error: error.message || 'Erro ao processar mensagem',
        reply: 'Olá! Tive uma pequena oscilação na conexão com a central. Por favor, repita sua dúvida que estarei pronta para ajudar! 🩺💙',
      },
      { status: 500 }
    );
  }
}
