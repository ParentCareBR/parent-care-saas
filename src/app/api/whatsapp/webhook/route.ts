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

// ─── Meta Webhook Verification ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');
  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'parentcare_webhook_2024';

  if (mode === 'subscribe' && token === verifyToken) {
    return new Response(challenge || '', { status: 200 });
  }
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

// ─── POST entry-point ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.event && body.data?.key?.remoteJid) {
      return handleEvolutionWebhook(body);
    }

    if (body.object === 'whatsapp_business_account') {
      return handleMetaWebhook(body);
    }

    return NextResponse.json({ status: 'ignored' });
  } catch (err: any) {
    console.error('[WhatsApp Webhook Error]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─── Meta Cloud API handler ────────────────────────────────────────────────────
async function handleMetaWebhook(body: any) {
  console.log('[Meta Webhook Received]', JSON.stringify(body));
  const entries = body.entry || [];
  for (const entry of entries) {
    for (const change of entry.changes || []) {
      const value = change.value;

      // Log delivery status updates
      for (const st of value?.statuses || []) {
        console.log(
          `[Meta Status] ID: ${st.id}, Status: ${st.status}, Recipient: ${st.recipient_id}`
        );
        if (st.errors?.length) console.error('[Meta Status Error]', JSON.stringify(st.errors));
      }

      for (const msg of value?.messages || []) {
        const fromPhone = msg.from;
        const msgType = msg.type;
        let textContent = '';

        if (msgType === 'text') {
          textContent = msg.text?.body || '';
        } else if (msgType === 'audio') {
          textContent = '__AUDIO__';
        } else {
          continue;
        }

        if (textContent) {
          await processWhatsAppMessage(fromPhone, textContent, msgType);
        }
      }
    }
  }
  return NextResponse.json({ status: 'ok' });
}

// ─── Evolution API handler ─────────────────────────────────────────────────────
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
    textContent = '__AUDIO__';
  }

  if (textContent && fromPhone) {
    await processWhatsAppMessage(fromPhone, textContent, msgType);
  }
  return NextResponse.json({ status: 'ok' });
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/** Build the numbered interactive menu text */
function buildMenu(name: string): string {
  return (
    `Ola, ${name}! Sou o assistente do Parent Care. Como posso te ajudar hoje?\n\n` +
    `*Digite o numero da opcao:*\n\n` +
    `1 - Confirmar que tomei o remedio 💊\n` +
    `2 - Registrar que bebi agua 💧\n` +
    `3 - Registrar refeicao 🍽️\n` +
    `4 - Ver proximas consultas 📅\n` +
    `5 - Estou bem, tudo tranquilo ✅\n` +
    `6 - Preciso de ajuda / Chamar a familia 🆘\n\n` +
    `Ou escreva livremente o que precisa!`
  );
}

/** Greeting/contact phrases that should trigger the menu */
const GREETING_PATTERNS = [
  /^(oi|ola|bom dia|boa tarde|boa noite|hey|hello|hi)\b/i,
  /quero falar com o assistente/i,
  /assistente/i,
  /ajuda/i,
  /menu/i,
  /opcoes/i,
  /^(1|2|3|4|5|6)$/, // numbered menu options handled separately
];

/** Returns true if the message is a greeting/first-contact phrase */
function isGreeting(text: string): boolean {
  const t = text.trim();
  // Numbered options are NOT greetings (handled in quickAction check)
  if (/^[1-6]$/.test(t)) return false;
  return GREETING_PATTERNS.some((p) => p.test(t));
}

/** Quick action shortcuts — bypass Gemini for simple confirmations */
async function handleQuickAction(
  option: string,
  person: any,
  orgId: string,
  fromPhone: string,
  db: any
): Promise<boolean> {
  const name = person.full_name.split(' ')[0];
  const opt = option.trim().toLowerCase();

  // Map numeric menu and common phrases to actions
  const isMed =
    opt === '1' ||
    /remedio|remedios|tomei|tomou|medicamento/i.test(opt);
  const isWater =
    opt === '2' ||
    /agua|bebi|hidrata/i.test(opt);
  const isMeal =
    opt === '3' ||
    /comi|refeicao|almoco|jantar|cafe|lanch/i.test(opt);
  const isAppt =
    opt === '4' ||
    /consulta|agendamento|medico|appointment/i.test(opt);
  const isWell =
    opt === '5' ||
    /estou bem|tudo bem|tranquilo|ok|okay/i.test(opt);
  const isHelp =
    opt === '6' ||
    /ajuda|socorro|ligar|chamar|familia|emergencia/i.test(opt);

  if (isMed) {
    const { data: meds } = await db
      .from('medications')
      .select('id, name')
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
      await sendWhatsAppMessage(
        fromPhone,
        `Otimo, ${name}! Registrei que voce tomou o remedio "${meds[0].name}". A familia sera avisada! 💊✅`
      );
    } else {
      await sendWhatsAppMessage(
        fromPhone,
        `Registrei sua confirmacao de remedio, ${name}! Nao encontrei medicamentos ativos cadastrados, mas avisarei sua familia. 💊`
      );
    }
    return true;
  }

  if (isWater) {
    await db.from('hydration_logs').insert({
      organization_id: orgId,
      cared_person_id: person.id,
      amount_ml: 250,
      logged_by: null,
    });
    await sendWhatsAppMessage(
      fromPhone,
      `Perfeito, ${name}! Registrei que voce bebeu agua (1 copo). Continua assim, hidratacao e muito importante! 💧`
    );
    return true;
  }

  if (isMeal) {
    await db.from('meals').insert({
      organization_id: orgId,
      cared_person_id: person.id,
      meal_type: 'other',
      logged_by: null,
    });
    await sendWhatsAppMessage(
      fromPhone,
      `Anotado, ${name}! Registrei sua refeicao. Bom apetite! 🍽️`
    );
    return true;
  }

  if (isAppt) {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const next7 = new Date(now);
    next7.setDate(next7.getDate() + 7);

    const { data: appts } = await db
      .from('appointments')
      .select('title, starts_at, doctor_name, location')
      .eq('cared_person_id', person.id)
      .gte('starts_at', todayStart.toISOString())
      .lte('starts_at', next7.toISOString())
      .order('starts_at')
      .limit(5);

    if (!appts || appts.length === 0) {
      await sendWhatsAppMessage(
        fromPhone,
        `Ola, ${name}! Nao ha consultas agendadas para os proximos 7 dias. Se precisar agendar uma, e so me dizer! 📅`
      );
    } else {
      const list = appts
        .map((a: any) => {
          const d = new Date(a.starts_at);
          return `• ${a.title} — ${d.toLocaleDateString('pt-BR')} as ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}${a.doctor_name ? ` com ${a.doctor_name}` : ''}${a.location ? ` em ${a.location}` : ''}`;
        })
        .join('\n');
      await sendWhatsAppMessage(
        fromPhone,
        `Aqui estao suas proximas consultas, ${name}:\n\n${list}\n\nSe precisar de mais informacoes, e so perguntar! 📅`
      );
    }
    return true;
  }

  if (isWell) {
    await db.from('check_ins').insert({
      organization_id: orgId,
      cared_person_id: person.id,
      mood: 'great',
      checked_by: null,
      notes: 'Check-in via WhatsApp — Estou bem',
    });
    await sendWhatsAppMessage(
      fromPhone,
      `Que otimo saber, ${name}! Fico muito feliz que voce esta bem. A familia sera notificada. Qualquer coisa que precisar, e so chamar! 😊❤️`
    );
    return true;
  }

  if (isHelp) {
    await db.from('help_requests').insert({
      organization_id: orgId,
      cared_person_id: person.id,
      requested_by: null,
      message: `${name} pediu ajuda / chamou a familia pelo WhatsApp.`,
      status: 'open',
    });
    await sendWhatsAppMessage(
      fromPhone,
      `Entendido, ${name}! Avisei sua familia agora mesmo. Eles vao entrar em contato em breve. Fique tranquilo(a)! 🆘❤️`
    );
    return true;
  }

  return false;
}

// ─── Core processing function ──────────────────────────────────────────────────
async function processWhatsAppMessage(
  fromPhone: string,
  text: string,
  msgType: string
) {
  try {
    const db = createAdminClient();

    // ── 1. Resolve cared person by phone (emergency_contacts & org settings) ──
    let person: any = null;
    let orgId = '';

    const cleanPhone = fromPhone.replace(/\D/g, '');
    const phoneVariants = [
      cleanPhone,
      cleanPhone.startsWith('55') ? cleanPhone.slice(2) : '55' + cleanPhone,
    ];

    console.log('[WhatsApp Webhook] Processing from:', fromPhone, 'variants:', phoneVariants);

    // 1A. Try emergency_contacts first (most direct and standard phone mapping)
    try {
      for (const phone of phoneVariants) {
        const { data: contacts } = await (db as any)
          .from('emergency_contacts')
          .select('cared_person_id, cared_people(id, full_name, organization_id)')
          .eq('phone', phone)
          .limit(1);

        if (contacts && contacts[0]?.cared_people) {
          person = contacts[0].cared_people;
          orgId = person.organization_id;
          console.log('[WhatsApp Webhook] Found person via emergency_contacts:', person.full_name);
          break;
        }
      }
    } catch (ecErr) {
      console.warn('[WhatsApp Webhook] Error checking emergency_contacts:', ecErr);
    }

    // 1B. Try organization settings metadata (cared_people_profiles)
    if (!person) {
      try {
        const { data: orgs } = await (db as any)
          .from('organizations')
          .select('id, settings');

        if (orgs) {
          for (const org of orgs) {
            const profiles = org.settings?.cared_people_profiles || {};
            for (const [pId, pData] of Object.entries(profiles) as [string, any][]) {
              const pPhone = (pData.whatsapp_phone || pData.phone || '').replace(/\D/g, '');
              if (pPhone && phoneVariants.includes(pPhone)) {
                // Fetch person by ID from cared_people
                const { data: cp } = await (db as any)
                  .from('cared_people')
                  .select('id, full_name, organization_id')
                  .eq('id', pId)
                  .maybeSingle();

                if (cp) {
                  person = cp;
                  orgId = org.id;
                  console.log('[WhatsApp Webhook] Found person via org settings profile:', person.full_name);
                  break;
                }
              }
            }
            if (person) break;
          }
        }
      } catch (orgErr) {
        console.warn('[WhatsApp Webhook] Error checking org settings:', orgErr);
      }
    }

    // ── 2. Try name-based auto-linking ("sou [Nome]" or "me chamo [Nome]") ───
    if (!person) {
      const nameMatch =
        text.match(/(?:sou\s+|me\s+chamo\s+|meu\s+nome\s+[eé]\s+)([A-Za-zÀ-ÿ]{2,30})/i) ||
        text.match(/^([A-Za-zÀ-ÿ]{2,30})[\s,!.]*$/);

      if (nameMatch) {
        const guessedName = nameMatch[1];
        try {
          const { data: foundPeople } = await (db as any)
            .from('cared_people')
            .select('id, full_name, organization_id')
            .ilike('full_name', `%${guessedName}%`)
            .limit(1);

          if (foundPeople && foundPeople[0]) {
            person = foundPeople[0];
            orgId = person.organization_id;

            // Link in emergency_contacts so it's remembered
            try {
              await (db as any).from('emergency_contacts').insert({
                organization_id: orgId,
                cared_person_id: person.id,
                name: person.full_name,
                phone: cleanPhone,
                relationship: 'Self',
                is_primary: false,
              });
            } catch {}

            console.log('[WhatsApp Webhook] Auto-linked person by name:', person.full_name);
            const firstName = person.full_name.split(' ')[0];
            await sendWhatsAppMessage(fromPhone, buildMenu(firstName));
            return;
          }
        } catch (nameErr) {
          console.warn('[WhatsApp Webhook] Error matching name:', nameErr);
        }
      }
    }

    // ── 3. PC-LINK token auto-linking ─────────────────────────────────────────
    if (!person) {
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
            const cp: any = linkReq.cared_people;
            await (db as any)
              .from('cared_people')
              .update({ whatsapp_phone: cleanPhone })
              .eq('id', cp.id);
            await (db as any)
              .from('whatsapp_link_requests')
              .update({
                status: 'used',
                linked_at: new Date().toISOString(),
                linked_phone: cleanPhone,
              })
              .eq('token', linkToken);

            const firstName = cp.full_name.split(' ')[0];
            await sendWhatsAppMessage(
              fromPhone,
              `Seu WhatsApp foi vinculado com sucesso ao Parent Care!\n\n` +
                buildMenu(firstName)
            );
            return;
          }
        } catch (e) {
          console.error('[WhatsApp AI] Error processing link token:', e);
        }
      }

      // Truly unknown number
      await sendWhatsAppMessage(
        fromPhone,
        `Ola! Sou o assistente de cuidados do Parent Care.\n\n` +
          `Recebi sua mensagem, mas ainda nao reconheco seu numero.\n\n` +
          `Se voce e um idoso cadastrado, pode me dizer seu nome? Por exemplo: "Me chamo Maria".\n\n` +
          `Ou peca ao seu cuidador para acessar o painel do Parent Care e gerar um link de vinculacao para voce.`
      );
      return;
    }

    // ── 4. Resolved person — check org settings ───────────────────────────────
    const { data: orgData } = await db
      .from('organizations')
      .select('settings, name')
      .eq('id', orgId)
      .maybeSingle();

    const orgSettings = (orgData?.settings as any) || {};
    const aiEnabled = orgSettings.whatsapp_ai_enabled !== false;
    const elderName = person.full_name.split(' ')[0];

    if (!aiEnabled) {
      await sendWhatsAppMessage(
        fromPhone,
        `Ola, ${elderName}! O assistente de conversas esta temporariamente desativado pelo seu cuidador.`
      );
      return;
    }

    // ── 5. Audio message → show menu ─────────────────────────────────────────
    if (msgType === 'audio' || text === '__AUDIO__') {
      await sendWhatsAppMessage(fromPhone, buildMenu(elderName));
      return;
    }

    // ── 6. Greeting → show menu ────────────────────────────────────────────────
    if (isGreeting(text)) {
      await sendWhatsAppMessage(fromPhone, buildMenu(elderName));
      return;
    }

    // ── 7. Quick action shortcuts (numeric menu + keywords) ───────────────────
    const handledByQuick = await handleQuickAction(text, person, orgId, fromPhone, db);
    if (handledByQuick) {
      // Log quick action
      try {
        await (db as any).from('care_notes').insert({
          cared_person_id: person.id,
          organization_id: orgId,
          author_id: null,
          content: `[WhatsApp] ${elderName} enviou acao rapida: "${text.substring(0, 100)}"`,
          type: 'general',
        });
      } catch {}
      return;
    }

    // ── 8. Gemini AI for everything else ──────────────────────────────────────
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
ORGANIZACAO: ${orgId}
HORARIO ATUAL: ${now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

CONSULTAS PROXIMAS:
${
  appointments.length === 0
    ? 'Nenhuma consulta agendada'
    : appointments
        .map(
          (a: any) =>
            `- ${a.title} em ${new Date(a.starts_at).toLocaleString('pt-BR')} com ${a.doctor_name || 'medico'}`
        )
        .join('\n')
}

MEDICAMENTOS ATIVOS:
${
  medications.length === 0
    ? 'Nenhum'
    : medications
        .map(
          (m: any) =>
            `- ${m.name} ${m.dosage}${m.unit} nos horarios: ${(m.medication_schedules || []).map((s: any) => s.time_of_day).join(', ') || 'a definir'}`
        )
        .join('\n')
}

TAREFAS PENDENTES:
${tasks.length === 0 ? 'Nenhuma' : tasks.map((t: any) => `- ${t.title}`).join('\n')}
`;

    if (!GEMINI_API_KEY) {
      console.warn('[WhatsApp AI] Missing GEMINI_API_KEY');
      await sendWhatsAppMessage(
        fromPhone,
        `Ola, ${elderName}! Recebi sua mensagem. O assistente inteligente esta sendo configurado. Por enquanto use o menu:\n\n` +
          buildMenu(elderName)
      );
      return;
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const systemPrompt = `Voce e um assistente de cuidados de saude atencioso, carinhoso e paciente para idosos do aplicativo Parent Care.
Voce esta conversando via WhatsApp com ${elderName}.

Contexto atual do sistema:
${contextStr}

Sua missao:
1. Responder em portugues brasileiro simples, afetuoso e acolhedor (use emojis amigaveis).
2. Responder perguntas sobre consultas, remedios, tarefas e rotina diaria.
3. Se o idoso quiser CRIAR algo (consulta, tarefa, remedio), extraia os dados e retorne a respectiva acao.
4. Se o idoso quiser CONFIRMAR uma acao (tomei remedio, bebi agua, estou bem, preciso de ligacao), registre a acao.
5. Sempre confirme gentilmente o que foi feito ou responda a duvida com clareza.
6. Ao final de cada resposta, ofeca o menu de opcoes novamente se fizer sentido.

FORMATO DE RESPOSTA OBRIGATORIO:
Retorne SEMPRE um JSON valido (sem comentarios) no seguinte formato:
{
  "reply": "texto da resposta carinhosa para o idoso",
  "action": null | {
    "type": "create_appointment" | "create_task" | "create_medication" | "confirm_medication" | "confirm_water" | "mood_checkin" | "request_call",
    "data": { ...campos necessarios }
  }
}

Mensagem do idoso: "${text}"`;

    const result = await model.generateContent(systemPrompt);
    const rawResponse = result.response.text();

    let replyText = rawResponse;
    let action: any = null;

    try {
      const jsonMatch =
        rawResponse.match(/```json?\s*([\s\S]+?)```/) ||
        rawResponse.match(/(\{[\s\S]+\})/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1] || jsonMatch[0]);
        replyText = parsed.reply || rawResponse;
        action = parsed.action || null;
      }
    } catch {
      replyText = rawResponse.replace(/```json?/g, '').replace(/```/g, '').trim();
    }

    if (action) {
      await executeWhatsAppAction(action, person, orgId, db);
    }

    await sendWhatsAppMessage(fromPhone, replyText);

    // Log conversation
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
        'Desculpe, tive um probleminha tecnico agora. Por favor, tente novamente em instantes! 😊'
      );
    } catch {}
  }
}

// ─── Action executor ───────────────────────────────────────────────────────────
async function executeWhatsAppAction(
  action: any,
  person: any,
  orgId: string,
  db: any
) {
  const { type, data } = action;
  try {
    switch (type) {
      case 'create_appointment':
        await db.from('appointments').insert({
          organization_id: orgId,
          cared_person_id: person.id,
          title: data?.title || 'Consulta Medica',
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
          message: `${person.full_name.split(' ')[0]} pediu para a familia ligar via WhatsApp.`,
          status: 'open',
        });
        break;
    }
  } catch (err) {
    console.error('[WhatsApp Action Error]', type, err);
  }
}
