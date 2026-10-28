import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendWhatsAppBroadcast } from '@/lib/whatsapp/service';
import { WhatsAppTemplates } from '@/lib/whatsapp/message-templates';

export const dynamic = 'force-dynamic';

function getDbClient(authenticatedSupabase: any) {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      return createAdminClient();
    } catch {
      return authenticatedSupabase;
    }
  }
  return authenticatedSupabase;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { cared_person_id, type, message, payload = {} } = body;

    if (!cared_person_id || !type) {
      return NextResponse.json({ error: 'cared_person_id e type são obrigatórios.' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Emergency requires authentication for safety, other actions (water, food, mood, chat) work directly from elder screen
    if (!user && type === 'emergency') {
      return NextResponse.json({ error: 'Não autenticado para emergência.' }, { status: 401 });
    }

    const db = getDbClient(supabase) as any;

    // 1. Obter dados da pessoa cuidada
    const { data: person, error: personErr } = await db
      .from('cared_people')
      .select('id, full_name, organization_id')
      .eq('id', cared_person_id)
      .single();

    if (personErr || !person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const orgId = person.organization_id;
    const elderName = person.full_name.split(' ')[0];
    const userId = user?.id || null;
    let createdRecordId: string | null = null;
    let targetTable = 'care_notes';

    // 2. Executar ação na tabela correspondente com tolerância a falhas
    switch (type) {
      case 'hydration': {
        targetTable = 'hydration_logs';
        const { data: inserted } = await db
          .from('hydration_logs')
          .insert({
            organization_id: orgId,
            cared_person_id: person.id,
            amount_ml: payload.amount_ml || 250,
            logged_by: userId,
          })
          .select('id')
          .maybeSingle();
        createdRecordId = inserted?.id || null;
        break;
      }

      case 'medication': {
        targetTable = 'medication_confirmations';
        const confirmedAt = payload.confirmed_at || new Date().toISOString();
        const noteStr = typeof payload.notes === 'string' ? payload.notes : JSON.stringify(payload.notes || {});

        const { data: inserted, error: medErr } = await db
          .from('medication_confirmations')
          .insert({
            organization_id: orgId,
            cared_person_id: person.id,
            medication_id: payload.medication_id,
            schedule_id: payload.schedule_id || null,
            confirmed_by: userId,
            status: payload.status || 'taken',
            confirmed_at: confirmedAt,
            notes: noteStr,
          })
          .select('id')
          .maybeSingle();

        if (medErr) {
          console.warn('[care/action] medication_confirmations insert with notes failed, trying fallback:', medErr);
          // Fallback if notes or schedule_id column has an unexpected type or constraint
          const { data: fallbackInserted } = await db
            .from('medication_confirmations')
            .insert({
              organization_id: orgId,
              cared_person_id: person.id,
              medication_id: payload.medication_id,
              confirmed_by: userId,
              status: payload.status || 'taken',
            })
            .select('id')
            .maybeSingle();
          createdRecordId = fallbackInserted?.id || null;
        } else {
          createdRecordId = inserted?.id || null;
        }

        // Sync com medication_logs se a tabela existir
        try {
          await db.from('medication_logs').insert({
            organization_id: orgId,
            medication_id: payload.medication_id,
            taken_by: userId,
            status: 'taken',
            notes: message || 'Confirmado pelo idoso',
            taken_at: confirmedAt,
          });
        } catch {}

        // Registrar no histórico de cuidados (care_notes) com data e hora exatas
        try {
          const medCleanName = (message || 'Remédio').replace(/^Tomei\s*/i, '');
          await db.from('care_notes').insert({
            organization_id: orgId,
            cared_person_id: person.id,
            author_id: userId,
            content: `✓ ${elderName} confirmou que tomou o remédio: ${medCleanName}`,
            type: 'medication',
          });
        } catch {}
        break;
      }

      case 'meal': {
        targetTable = 'meals';
        const { data: inserted } = await db
          .from('meals')
          .insert({
            organization_id: orgId,
            cared_person_id: person.id,
            meal_type: payload.meal_type || 'other',
            logged_by: userId,
            notes: payload.notes || message || 'Refeição feita',
          })
          .select('id')
          .maybeSingle();
        createdRecordId = inserted?.id || null;
        break;
      }

      case 'mood':
      case 'wake':
      case 'sleep': {
        targetTable = 'check_ins';
        const { data: inserted } = await db
          .from('check_ins')
          .insert({
            organization_id: orgId,
            cared_person_id: person.id,
            mood: payload.mood || 'good',
            checked_by: userId,
            notes: payload.notes || message || `Check-in: ${type}`,
          })
          .select('id')
          .maybeSingle();
        createdRecordId = inserted?.id || null;
        break;
      }

      case 'reaction': {
        targetTable = 'care_notes';
        const { data: inserted } = await db
          .from('care_notes')
          .insert({
            organization_id: orgId,
            cared_person_id: person.id,
            author_id: userId,
            content: payload.content || message || `[Resposta de ${elderName}]`,
            type: 'general',
          })
          .select('id')
          .maybeSingle();
        createdRecordId = inserted?.id || null;
        break;
      }

      case 'help': {
        targetTable = 'help_requests';
        const { data: inserted } = await db
          .from('help_requests')
          .insert({
            organization_id: orgId,
            cared_person_id: person.id,
            requested_by: userId,
            message: message || `${elderName} tocou em "Quero Conversar" e pediu contato da família.`,
            status: 'open',
          })
          .select('id')
          .maybeSingle();
        createdRecordId = inserted?.id || null;

        // Registra também nas notas de cuidado para ficar no histórico geral
        try {
          await db.from('care_notes').insert({
            organization_id: orgId,
            cared_person_id: person.id,
            author_id: userId,
            content: `📞 PEDIDO DE CONVERSA: ${elderName} pediu para a família ligar hoje.`,
            type: 'general',
          });
        } catch {}
        break;
      }

      case 'emergency': {
        targetTable = 'emergency_events';
        const { data: inserted } = await db
          .from('emergency_events')
          .insert({
            organization_id: orgId,
            cared_person_id: person.id,
            reported_by: userId,
            description: message || `Alerta SOS emitido pela tela de ${elderName}`,
            severity: 'critical',
          })
          .select('id')
          .maybeSingle();
        createdRecordId = inserted?.id || null;

        try {
          await db.from('care_notes').insert({
            organization_id: orgId,
            cared_person_id: person.id,
            author_id: userId,
            content: `🚨 EMERGÊNCIA: ${elderName} acionou o botão SOS de emergência!`,
            type: 'incident',
          });
        } catch {}
        break;
      }
    }

    // 3. Notificar familiares na organização via tabela notifications
    try {
      const { data: members } = await db
        .from('organization_members')
        .select('user_id')
        .eq('organization_id', orgId);

      if (members && members.length > 0) {
        const notifRows = members.map((m: any) => ({
          organization_id: orgId,
          user_id: m.user_id,
          title: type === 'emergency' 
            ? `🚨 EMERGÊNCIA: ${person.full_name}` 
            : type === 'help' 
            ? `📞 Pedido de Conversa: ${person.full_name}` 
            : `Aviso de ${elderName}`,
          body: message || `${elderName} registrou uma atividade na tela de cuidados.`,
          type: type === 'emergency' ? 'alert' : 'info',
          data: {
            cared_person_id: person.id,
            type,
            created_at: new Date().toISOString(),
          },
        }));

        await db.from('notifications').insert(notifRows);
      }
    } catch (e) {
      console.warn('[Care Action] Erro ao criar notificações no dashboard:', e);
    }

    // 4. Se for "help" ou "emergency", disparar WhatsApp para os contatos de emergência
    if (type === 'help' || type === 'emergency') {
      try {
        const { data: contacts } = await db
          .from('emergency_contacts')
          .select('phone')
          .eq('cared_person_id', person.id);

        const phones = (contacts || []).map((c: any) => c.phone).filter(Boolean);
        if (phones.length > 0) {
          const timeNow = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
          const waText = type === 'emergency'
            ? WhatsAppTemplates.emergencyAlert({
                elderName,
                time: timeNow,
                description: message || undefined,
              })
            : WhatsAppTemplates.helpAlert({
                elderName,
                time: timeNow,
              });

          await sendWhatsAppBroadcast(phones, waText);
        }
      } catch (waErr) {
        console.warn('[Care Action] Erro ao enviar WhatsApp:', waErr);
      }
    }

    return NextResponse.json({
      success: true,
      id: createdRecordId,
      table: targetTable,
      message: `${message || 'Ação registrada com sucesso'}!`,
    });
  } catch (err: any) {
    console.error('[Care Action API Error]', err);
    return NextResponse.json({ error: err.message || 'Erro interno ao processar ação.' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    const id = searchParams.get('id');

    if (!table || !id) {
      return NextResponse.json({ error: 'table e id são obrigatórios.' }, { status: 400 });
    }

    const allowedTables = ['hydration_logs', 'medication_confirmations', 'meals', 'check_ins', 'care_notes', 'help_requests'];
    if (!allowedTables.includes(table)) {
      return NextResponse.json({ error: 'Tabela não permitida para cancelamento.' }, { status: 400 });
    }

    const supabase = await createClient();
    const db = getDbClient(supabase) as any;

    await db.from(table).delete().eq('id', id);

    return NextResponse.json({ success: true, message: 'Ação desfeita com sucesso.' });
  } catch (err: any) {
    console.error('[Care Action Undo Error]', err);
    return NextResponse.json({ error: err.message || 'Erro ao desfazer ação.' }, { status: 500 });
  }
}
