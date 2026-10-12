import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppMessage } from '@/lib/whatsapp/service';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const dynamic = 'force-dynamic';

const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';

// Meta Webhook Verification
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'parentcare_webhook_2024';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge || '', { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Handle Evolution API webhook format
    if (body.event && body.data?.key?.remoteJid) {
      return handleEvolutionWebhook(body);
    }

    // Handle Meta Cloud API webhook format
    if (body.object === 'whatsapp_business_account') {
      return handleMetaWebhook(body);
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (err: any) {
    console.error('[WhatsApp Webhook Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function handleMetaWebhook(body: any) {
  const entries = body.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;
      const messages = value?.messages || [];
      for (const msg of messages) {
        const fromPhone = msg.from;
        const msgType = msg.type; // text, audio, image, etc.
        let textContent = '';

        if (msgType === 'text') {
          textContent = msg.text?.body || '';
        } else if (msgType === 'audio') {
          textContent = '[Mensagem de áudio recebida]';
        } else {
          continue; // ignore other types
        }

        if (textContent) {
          await processWhatsAppMessage(fromPhone, textContent, msgType);
        }
      }
    }
  }
  return NextResponse.json({ status: 'ok' });
}

async function handleEvolutionWebhook(body: any) {
  if (body.event !== 'messages.upsert') return NextResponse.json({ status: 'ignored' });
  const msg = body.data;
  const fromPhone = msg?.key?.remoteJid?.replace('@s.whatsapp.net', '') || '';
  const msgType = msg?.messageType || 'text';
  let textContent = '';

  if (msg?.message?.conversation) {
    textContent = msg.message.conversation;
  } else if (msg?.message?.extendedTextMessage?.text) {
    textContent = msg.message.extendedTextMessage.text;
  } else if (msg?.message?.audioMessage) {
    textContent = '[Mensagem de áudio recebida]';
  }

  if (textContent && fromPhone) {
    await processWhatsAppMessage(fromPhone, textContent, msgType);
  }
  return NextResponse.json({ status: 'ok' });
}

async function processWhatsAppMessage(fromPhone: string, text: string, msgType: string) {
  try {
    const db = createAdminClient();

    // 1. Find cared person by their whatsapp_phone OR phone
    let person: any = null;
    let orgId = '';

    const cleanPhone = fromPhone.replace(/\D/g, '');
    const phoneVariants = [
      cleanPhone,
      cleanPhone.startsWith('55') ? cleanPhone.slice(2) : '55' + cleanPhone,
    ];

    try {
      for (const phone of phoneVariants) {
        const { data } = await (db as any)
          .from('cared_people')
          .select('id, full_name, organization_id')
          .or(`whatsapp_phone.eq.${phone},phone.eq.${phone}`)
          .maybeSingle();
        if (data) {
          person = data;
          orgId = data.organization_id;
          break;
        }
      }
    } catch {}

    // Fallback: check emergency contacts to find the associated cared person
    if (!person) {
      try {
        for (const phone of phoneVariants) {
          const { data: contact } = await (db as any)
            .from('emergency_contacts')
            .select('cared_person_id, cared_people(id, full_name, organization_id)')
            .eq('phone', phone)
            .maybeSingle();

          if (contact && (contact as any).cared_people) {
            person = (contact as any).cared_people;
            orgId = person.organization_id;
            break;
          }
        }
      } catch {}
    }

    if (!person) {
      console.log('[WhatsApp AI] Unknown phone, sending friendly greeting:', fromPhone);
      await sendWhatsAppMessage(
        fromPhone,
        `Olá! Sou o assistente de cuidados do Parent Care ❤️.\n\nRecebi sua mensagem! Para que eu possa te ajudar com consultas, remédios e rotina diária, seu número precisa estar cadastrado no painel do Parent Care (no Perfil da Pessoa Cuidada ou nos Contatos da Família).\n\nAssim que você cadastrar seu número com DDD lá no painel, já poderemos conversar por texto ou áudio! 😊`
      );
      return;
    }

    // 2. Check if AI is enabled for this organization
    const { data: orgData } = await db
      .from('organizations')
      .select('settings, name')
      .eq('id', orgId)
      .maybeSingle();

    const orgSettings = (orgData?.settings as any) || {};
    const aiEnabled = orgSettings.whatsapp_ai_enabled !== false; // default: enabled
    const elderName = person.full_name.split(' ')[0];

    if (!aiEnabled) {
      await sendWhatsAppMessage(
        fromPhone,
        `Olá, ${elderName}! O assistente de conversas está temporariamente desativado pelo seu cuidador.`
      );
      return;
    }

    // Handle audio message acknowledgement
    if (msgType === 'audio' || text === '[Mensagem de áudio recebida]') {
      await sendWhatsAppMessage(
        fromPhone,
        `Olá, ${elderName}! 🎤 Recebi sua mensagem de voz! No momento ainda não consigo ouvir áudios automaticamente. Por favor, escreva sua mensagem em texto e terei enorme prazer em ajudar! 😊`
      );
      return;
    }

    // 3. Fetch context: upcoming events and info
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowEnd = new Date(now);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 2);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const [apptRes, medRes, taskRes] = await Promise.all([
      db
        .from('appointments')
        .select('id,title,starts_at,doctor_name')
        .eq('cared_person_id', person.id)
        .gte('starts_at', todayStart.toISOString())
        .lte('starts_at', tomorrowEnd.toISOString())
        .order('starts_at')
        .limit(10),
      db
        .from('medications')
        .select('id,name,dosage,unit,medication_schedules(time_of_day)')
        .eq('cared_person_id', person.id)
        .eq('is_active', true)
        .limit(10),
      db
        .from('tasks')
        .select('id,title,due_date,status')
        .eq('cared_person_id', person.id)
        .neq('status', 'completed')
        .limit(5),
    ]);

    const appointments = apptRes.data || [];
    const medications = medRes.data || [];
    const tasks = taskRes.data || [];

    const contextStr = `
PESSOA CUIDADA: ${person.full_name} (ID: ${person.id})
ORGANIZAÇÃO: ${orgId}
HORÁRIO ATUAL: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

CONSULTAS PRÓXIMAS:
${appointments.length === 0 ? 'Nenhuma consulta agendada' : appointments.map((a: any) => `- ${a.title} em ${new Date(a.starts_at).toLocaleString('pt-BR')} com ${a.doctor_name || 'médico'}`).join('\n')}

MEDICAMENTOS ATIVOS:
${medications.length === 0 ? 'Nenhum' : medications.map((m: any) => `- ${m.name} ${m.dosage}${m.unit} nos horários: ${(m.medication_schedules || []).map((s: any) => s.time_of_day).join(', ') || 'a definir'}`).join('\n')}

TAREFAS PENDENTES:
${tasks.length === 0 ? 'Nenhuma' : tasks.map((t: any) => `- ${t.title}`).join('\n')}
`;

    if (!GEMINI_API_KEY) {
      console.warn('[WhatsApp AI] Missing GEMINI_API_KEY, responding with polite fallback');
      await sendWhatsAppMessage(
        fromPhone,
        `Olá, ${elderName}! Recebi sua mensagem: "${text}". Nossa equipe de suporte está configurando as chaves de inteligência artificial. Logo poderei responder todas as suas dúvidas!`
      );
      return;
    }

    // 4. Ask Gemini to understand intent and build action
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `Você é um assistente de cuidados de saúde atencioso, carinhoso e paciente para idosos do aplicativo Parent Care.
Você está conversando via WhatsApp com ${elderName}.

Contexto atual do sistema:
${contextStr}

Sua missão:
1. Responder em português brasileiro simples, afetuoso e acolhedor (use emojis amigáveis).
2. Responder perguntas sobre consultas, remédios, tarefas e rotina diária.
3. Se o idoso quiser CRIAR algo (consulta, tarefa, remédio), extraia os dados e retorne a respectiva ação.
4. Se o idoso quiser CONFIRMAR uma ação (tomei remédio, bebi água, estou bem, preciso de ligação), registre a ação.
5. Sempre confirme gentilmente o que foi feito ou responda a dúvida com clareza.

FORMATO DE RESPOSTA OBRIGATÓRIO:
Retorne SEMPRE um JSON válido (sem comentários) no seguinte formato:
{
  "reply": "texto da resposta carinhosa para o idoso",
  "action": null | {
    "type": "create_appointment" | "create_task" | "create_medication" | "confirm_medication" | "confirm_water" | "mood_checkin" | "request_call",
    "data": { ...campos necessários }
  }
}

Exemplo para criar consulta:
{ "reply": "Ótimo! Agendei sua consulta com o cardiologista na sexta às 14h. Já deixei anotado aqui para você! 😊", "action": { "type": "create_appointment", "data": { "title": "Consulta Cardiologista", "starts_at": "2025-10-15T14:00:00", "doctor_name": "Cardiologista" } } }

Mensagem do idoso: "${text}"`;

    const result = await model.generateContent(systemPrompt);
    const rawResponse = result.response.text();

    let replyText = rawResponse;
    let action: any = null;

    try {
      const jsonMatch = rawResponse.match(/```json?\s*([\s\S]+?)```/) || rawResponse.match(/(\{[\s\S]+\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        replyText = parsed.reply || rawResponse;
        action = parsed.action || null;
      }
    } catch {
      replyText = rawResponse.replace(/```json?/g, '').replace(/```/g, '').trim();
    }

    // 5. Execute action if any
    if (action) {
      await executeWhatsAppAction(action, person, orgId, db);
    }

    // 6. Send reply
    await sendWhatsAppMessage(fromPhone, replyText);

    // 7. Log conversation in care_notes
    try {
      await (db as any).from('care_notes').insert({
        cared_person_id: person.id,
        organization_id: orgId,
        author_id: null,
        content: `[WhatsApp AI] ${elderName} enviou: "${text.substring(0, 100)}" → Resposta: "${replyText.substring(0, 100)}"`,
        type: 'general',
      });
    } catch {}

  } catch (err: any) {
    console.error('[WhatsApp AI Processing Error]', err);
    try {
      await sendWhatsAppMessage(
        fromPhone,
        'Desculpe, tive um probleminha técnico no momento. Tente me mandar uma mensagem novamente em alguns instantes! 😊'
      );
    } catch {}
  }
}

async function executeWhatsAppAction(action: any, person: any, orgId: string, db: any) {
  const { type, data } = action;

  try {
    switch (type) {
      case 'create_appointment':
        await db.from('appointments').insert({
          organization_id: orgId,
          cared_person_id: person.id,
          title: data?.title || 'Consulta Médica',
          starts_at: data?.starts_at || new Date(Date.now() + 86400000).toISOString(),
          doctor_name: data?.doctor_name || null,
          status: 'scheduled',
        });
        break;

      case 'create_task':
        await db.from('tasks').insert({
          organization_id: orgId,
          cared_person_id: person.id,
          title: data?.title || 'Tarefa',
          due_date: data?.due_date || null,
          status: 'pending',
        });
        break;

      case 'confirm_medication': {
        const { data: meds } = await db
          .from('medications')
          .select('id')
          .eq('cared_person_id', person.id)
          .eq('is_active', true)
          .limit(1);

        if (meds && meds[0]) {
          await db.from('medication_confirmations').insert({
            organization_id: orgId,
            cared_person_id: person.id,
            medication_id: meds[0].id,
            confirmed_by: null,
            status: 'taken',
          });
        }
        break;
      }

      case 'confirm_water':
        await db.from('hydration_logs').insert({
          organization_id: orgId,
          cared_person_id: person.id,
          amount_ml: data?.amount_ml || 250,
          logged_by: null,
        });
        break;

      case 'mood_checkin':
        await db.from('check_ins').insert({
          organization_id: orgId,
          cared_person_id: person.id,
          mood: data?.mood || 'good',
          checked_by: null,
          notes: data?.notes || 'Check-in via WhatsApp AI',
        });
        break;

      case 'request_call':
        await db.from('help_requests').insert({
          organization_id: orgId,
          cared_person_id: person.id,
          requested_by: null,
          message: `${person.full_name.split(' ')[0]} pediu para a família ligar via WhatsApp.`,
          status: 'open',
        });
        break;
    }
  } catch (err) {
    console.error('[WhatsApp Action Error]', type, err);
  }
}
