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
  console.log('[Meta Webhook Received]', JSON.stringify(body));
  const entries = body.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;

      // Handle delivery status updates (sent, delivered, read, failed)
      const statuses = value?.statuses || [];
      for (const st of statuses) {
        console.log(`[Meta Status] Message ID: ${st.id}, Status: ${st.status}, Recipient: ${st.recipient_id}`);
        if (st.errors && st.errors.length > 0) {
          console.error('[Meta Status Error]', JSON.stringify(st.errors));
        }
      }

      const messages = value?.messages || [];
      for (const msg of messages) {
        const fromPhone = msg.from;
        const msgType = msg.type; // text, audio, image, etc.
        let textContent = '';

        if (msgType === 'text') {
          textContent = msg.text?.body || '';
        } else if (msgType === 'audio') {
          textContent = '[Mensagem de Ã¡udio recebida]';
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
    textContent = '[Mensagem de Ã¡udio recebida]';
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
      console.log('[WhatsApp AI] Unknown phone, checking for pending link:', fromPhone);
      
      // Check if there's a pending link request for this phone
      // When elder clicks wa.me link with pre-filled text "PC-LINK-[token]", we auto-link
      const linkTokenMatch = text.match(/PC-LINK-([A-Z0-9]{8,})/i);
      
      if (linkTokenMatch) {
        const linkToken = linkTokenMatch[1].toUpperCase();
        try {
          const { data: linkReq } = await (db as any)
            .from('whatsapp_link_requests')
            .select('cared_person_id, cared_people(id, full_name, organization_id)')
            .eq('token', linkToken)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .maybeSingle();
          
          if (linkReq && linkReq.cared_people) {
            // Auto-link: save the phone to cared_people
            const cp: any = linkReq.cared_people;
            await (db as any)
              .from('cared_people')
              .update({ whatsapp_phone: cleanPhone })
              .eq('id', cp.id);
            
            // Mark link as used
            await (db as any)
              .from('whatsapp_link_requests')
              .update({ status: 'used', linked_at: new Date().toISOString(), linked_phone: cleanPhone })
              .eq('token', linkToken);
            
            const name = cp.full_name.split(' ')[0];
            await sendWhatsAppMessage(
              fromPhone,
              `Ola, ${name}! Seu WhatsApp foi vinculado com sucesso ao Parent Care!\n\n` +
              `A partir de agora posso te ajudar com:\n` +
              `- Confirmar que tomou o remedio\n` +
              `- Ver e criar consultas\n` +
              `- Registrar que bebeu agua\n` +
              `- Registrar refeicoes\n` +
              `- Ver tarefas do dia\n` +
              `- Pedir ajuda para a familia\n\n` +
              `Pode mandar mensagem de texto a qualquer hora! O que voce precisa hoje?`
            );
            return;
          }
        } catch (e) {
          console.error('[WhatsApp AI] Error processing link token:', e);
        }
      }
      
      // No link found - send friendly instruction
      await sendWhatsAppMessage(
        fromPhone,
        `Ola! Sou o assistente de cuidados do Parent Care.\n\n` +
        `Recebi sua mensagem, mas ainda nao reconheco seu numero.\n\n` +
        `Peca ao seu cuidador para acessar o painel do Parent Care, ir em Configuracoes e tocar em Gerar Link de Vinculacao. E so um toque!`
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
        `OlÃ¡, ${elderName}! O assistente de conversas estÃ¡ temporariamente desativado pelo seu cuidador.`
      );
      return;
    }

    // Handle audio message acknowledgement
    if (msgType === 'audio' || text === '[Mensagem de Ã¡udio recebida]') {
      await sendWhatsAppMessage(
        fromPhone,
        `OlÃ¡, ${elderName}! ðŸŽ¤ Recebi sua mensagem de voz! No momento ainda nÃ£o consigo ouvir Ã¡udios automaticamente. Por favor, escreva sua mensagem em texto e terei enorme prazer em ajudar! ðŸ˜Š`
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
ORGANIZAÃ‡ÃƒO: ${orgId}
HORÃRIO ATUAL: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

CONSULTAS PRÃ“XIMAS:
${appointments.length === 0 ? 'Nenhuma consulta agendada' : appointments.map((a: any) => `- ${a.title} em ${new Date(a.starts_at).toLocaleString('pt-BR')} com ${a.doctor_name || 'mÃ©dico'}`).join('\n')}

MEDICAMENTOS ATIVOS:
${medications.length === 0 ? 'Nenhum' : medications.map((m: any) => `- ${m.name} ${m.dosage}${m.unit} nos horÃ¡rios: ${(m.medication_schedules || []).map((s: any) => s.time_of_day).join(', ') || 'a definir'}`).join('\n')}

TAREFAS PENDENTES:
${tasks.length === 0 ? 'Nenhuma' : tasks.map((t: any) => `- ${t.title}`).join('\n')}
`;

    if (!GEMINI_API_KEY) {
      console.warn('[WhatsApp AI] Missing GEMINI_API_KEY, responding with polite fallback');
      await sendWhatsAppMessage(
        fromPhone,
        `OlÃ¡, ${elderName}! Recebi sua mensagem: "${text}". Nossa equipe de suporte estÃ¡ configurando as chaves de inteligÃªncia artificial. Logo poderei responder todas as suas dÃºvidas!`
      );
      return;
    }

    // 4. Ask Gemini to understand intent and build action
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `VocÃª Ã© um assistente de cuidados de saÃºde atencioso, carinhoso e paciente para idosos do aplicativo Parent Care.
VocÃª estÃ¡ conversando via WhatsApp com ${elderName}.

Contexto atual do sistema:
${contextStr}

Sua missÃ£o:
1. Responder em portuguÃªs brasileiro simples, afetuoso e acolhedor (use emojis amigÃ¡veis).
2. Responder perguntas sobre consultas, remÃ©dios, tarefas e rotina diÃ¡ria.
3. Se o idoso quiser CRIAR algo (consulta, tarefa, remÃ©dio), extraia os dados e retorne a respectiva aÃ§Ã£o.
4. Se o idoso quiser CONFIRMAR uma aÃ§Ã£o (tomei remÃ©dio, bebi Ã¡gua, estou bem, preciso de ligaÃ§Ã£o), registre a aÃ§Ã£o.
5. Sempre confirme gentilmente o que foi feito ou responda a dÃºvida com clareza.

FORMATO DE RESPOSTA OBRIGATÃ“RIO:
Retorne SEMPRE um JSON vÃ¡lido (sem comentÃ¡rios) no seguinte formato:
{
  "reply": "texto da resposta carinhosa para o idoso",
  "action": null | {
    "type": "create_appointment" | "create_task" | "create_medication" | "confirm_medication" | "confirm_water" | "mood_checkin" | "request_call",
    "data": { ...campos necessÃ¡rios }
  }
}

Exemplo para criar consulta:
{ "reply": "Ã“timo! Agendei sua consulta com o cardiologista na sexta Ã s 14h. JÃ¡ deixei anotado aqui para vocÃª! ðŸ˜Š", "action": { "type": "create_appointment", "data": { "title": "Consulta Cardiologista", "starts_at": "2025-10-15T14:00:00", "doctor_name": "Cardiologista" } } }

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
        content: `[WhatsApp AI] ${elderName} enviou: "${text.substring(0, 100)}" â†’ Resposta: "${replyText.substring(0, 100)}"`,
        type: 'general',
      });
    } catch {}

  } catch (err: any) {
    console.error('[WhatsApp AI Processing Error]', err);
    try {
      await sendWhatsAppMessage(
        fromPhone,
        'Desculpe, tive um probleminha tÃ©cnico no momento. Tente me mandar uma mensagem novamente em alguns instantes! ðŸ˜Š'
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
          title: data?.title || 'Consulta MÃ©dica',
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
          message: `${person.full_name.split(' ')[0]} pediu para a famÃ­lia ligar via WhatsApp.`,
          status: 'open',
        });
        break;
    }
  } catch (err) {
    console.error('[WhatsApp Action Error]', type, err);
  }
}
