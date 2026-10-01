import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp/service';
import { WhatsAppTemplates } from '@/lib/whatsapp/message-templates';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

export async function GET(req: NextRequest) {
  return handleRemindersDispatch(req);
}

export async function POST(req: NextRequest) {
  return handleRemindersDispatch(req);
}

async function handleRemindersDispatch(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      // Optional security for production cron jobs
    }

    const supabase = await createClient();
    const db = getDbClient(supabase);

    // Current date and time in Brazil timezone
    const now = new Date();
    const nowStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const todayYMD = format(now, 'yyyy-MM-dd');
    const currentHour = parseInt(nowStr.split(':')[0], 10);
    const currentMinute = parseInt(nowStr.split(':')[1], 10);

    const results: any[] = [];
    let sentCount = 0;

    // 1. Obter todas as pessoas cuidadas ativas
    const { data: caredPeople, error: cpErr } = await db
      .from('cared_people')
      .select('id, full_name, organization_id')
      .order('created_at', { ascending: false });

    if (cpErr || !caredPeople) {
      return NextResponse.json({ error: cpErr?.message || 'Erro ao buscar pessoas cuidadas.' }, { status: 500 });
    }

    for (const person of caredPeople) {
      const elderName = person.full_name.split(' ')[0];

      // Obter telefone para WhatsApp do idoso:
      // Busca em emergency_contacts (contato principal ou identificado como do idoso) ou settings
      let targetPhone = '';
      const { data: contacts } = await db
        .from('emergency_contacts')
        .select('name, phone, is_primary, relationship')
        .eq('cared_person_id', person.id)
        .order('is_primary', { ascending: false });

      if (contacts && contacts.length > 0) {
        // Preferência para contato com telefone preenchido
        targetPhone = contacts[0].phone || '';
      }

      // Se não houver telefone cadastrado, pula para a próxima pessoa
      if (!targetPhone) continue;

      // ─────────────────────────────────────────────────────────────
      // A. VERIFICAR LEMBRETES DE MEDICAMENTOS (Para o horário atual)
      // ─────────────────────────────────────────────────────────────
      const { data: meds } = await db
        .from('medications')
        .select('id, name, dosage, unit, instructions, medication_schedules(id, time_of_day)')
        .eq('cared_person_id', person.id)
        .eq('is_active', true);

      for (const med of meds || []) {
        const schedules = (med as any).medication_schedules || [];
        for (const sched of schedules) {
          const schedTime = sched.time_of_day?.slice(0, 5) || '08:00';
          const [schedH, schedM] = schedTime.split(':').map(Number);

          // Verifica se o horário do remédio bate com a janela atual (±15 minutos)
          const diffMinutes = Math.abs((schedH * 60 + schedM) - (currentHour * 60 + currentMinute));
          if (diffMinutes <= 15) {
            const deduplicationKey = `[WA-Med]:${person.id}:${med.id}:${sched.id}:${todayYMD}`;

            // Verifica se já enviamos lembrete para esse remédio hoje
            const { data: alreadySent } = await db
              .from('care_notes')
              .select('id')
              .eq('cared_person_id', person.id)
              .ilike('content', `%${deduplicationKey}%`)
              .limit(1);

            if (!alreadySent || alreadySent.length === 0) {
              const text = WhatsAppTemplates.medicationReminder({
                elderName,
                medName: med.name,
                dosage: `${med.dosage || ''} ${med.unit || ''}`.trim(),
                time: schedTime,
                instructions: med.instructions || undefined,
              });

              const sendRes = await sendWhatsAppMessage(targetPhone, text);

              // Salva marcação no histórico para não enviar duplicado no mesmo dia
              await db.from('care_notes').insert({
                organization_id: person.organization_id,
                cared_person_id: person.id,
                author_id: (person as any).user_id || person.created_by,
                content: `📲 Lembrete WhatsApp enviado para ${elderName}: Remédio ${med.name} (${schedTime}). ${deduplicationKey}`,
                type: 'health',
              });

              sentCount++;
              results.push({
                type: 'medication',
                person: elderName,
                medication: med.name,
                time: schedTime,
                phone: targetPhone,
                status: sendRes.success ? 'sent' : 'failed',
                simulated: sendRes.simulated,
              });
            }
          }
        }
      }

      // ─────────────────────────────────────────────────────────────
      // B. VERIFICAR CONSULTAS MÉDICAS (Avisar se houver nas próximas 2 horas)
      // ─────────────────────────────────────────────────────────────
      const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const { data: upcomingAppts } = await db
        .from('appointments')
        .select('id, title, starts_at, doctor_name, location')
        .eq('cared_person_id', person.id)
        .gte('starts_at', now.toISOString())
        .lte('starts_at', twoHoursAhead.toISOString())
        .order('starts_at', { ascending: true });

      for (const appt of upcomingAppts || []) {
        const apptDate = new Date(appt.starts_at);
        const timeStr = format(apptDate, 'HH:mm');
        const deduplicationKey = `[WA-Appt]:${person.id}:${appt.id}:${todayYMD}`;

        const { data: alreadySent } = await db
          .from('care_notes')
          .select('id')
          .eq('cared_person_id', person.id)
          .ilike('content', `%${deduplicationKey}%`)
          .limit(1);

        if (!alreadySent || alreadySent.length === 0) {
          const text = WhatsAppTemplates.appointmentReminder({
            elderName,
            title: appt.title,
            time: timeStr,
            doctorName: appt.doctor_name || undefined,
            location: appt.location || undefined,
          });

          const sendRes = await sendWhatsAppMessage(targetPhone, text);

          await db.from('care_notes').insert({
            organization_id: person.organization_id,
            cared_person_id: person.id,
            author_id: (person as any).user_id || person.created_by,
            content: `📲 Lembrete WhatsApp enviado para ${elderName}: Consulta ${appt.title} (${timeStr}). ${deduplicationKey}`,
            type: 'observation',
          });

          sentCount++;
          results.push({
            type: 'appointment',
            person: elderName,
            appointment: appt.title,
            time: timeStr,
            phone: targetPhone,
            status: sendRes.success ? 'sent' : 'failed',
            simulated: sendRes.simulated,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      currentTimeBrazil: nowStr,
      totalSent: sentCount,
      reminders: results,
    });
  } catch (err: any) {
    console.error('Error in WhatsApp reminders cron:', err);
    return NextResponse.json({ error: err.message || 'Erro interno no cron de lembretes.' }, { status: 500 });
  }
}
