import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

function formatDateToICS(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const caredPersonId = searchParams.get('caredPersonId');
    const name = searchParams.get('name');

    const supabase = createAdminClient();

    // 1. Identify Cared Person
    let person: any = null;
    if (caredPersonId) {
      const { data } = await supabase.from('cared_people').select('id, full_name, preferred_name').eq('id', caredPersonId).maybeSingle();
      person = data;
    } else if (name) {
      const { data } = await supabase
        .from('cared_people')
        .select('id, full_name, preferred_name')
        .or(`full_name.ilike.%${name}%,preferred_name.ilike.%${name}%`)
        .limit(1)
        .maybeSingle();
      person = data;
    }

    const personName = person ? (person.preferred_name || person.full_name) : (name || 'Pessoa Cuidada');
    const pId = person?.id;

    const events: Array<{
      uid: string;
      title: string;
      description: string;
      location?: string;
      start: Date;
      end: Date;
    }> = [];

    if (pId) {
      // 2. Load Appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select('*')
        .eq('cared_person_id', pId)
        .order('starts_at', { ascending: true });

      (appts || []).forEach((a: any) => {
        const start = new Date(a.starts_at);
        const end = new Date(start.getTime() + 60 * 60 * 1000);
        events.push({
          uid: `appt-${a.id}@parentcare.app`,
          title: `🩺 ${a.title}`,
          description: [
            a.doctor_name ? `Médico: ${a.doctor_name}` : '',
            a.specialty ? `Especialidade: ${a.specialty}` : '',
            a.description || '',
          ].filter(Boolean).join('\n'),
          location: a.location || undefined,
          start,
          end,
        });
      });

      // 3. Load Medications (generate next 14 days)
      const { data: meds } = await supabase
        .from('medications')
        .select('id, name, dosage, unit, instructions, medication_schedules(id, time_of_day)')
        .eq('cared_person_id', pId)
        .eq('is_active', true);

      (meds || []).forEach((m: any) => {
        const schedules = m.medication_schedules || [];
        schedules.forEach((sched: any) => {
          const [h, min] = (sched.time_of_day || '08:00').split(':').map(Number);
          for (let i = 0; i <= 14; i++) {
            const start = new Date();
            start.setDate(start.getDate() + i);
            start.setHours(h, min, 0, 0);
            const end = new Date(start.getTime() + 15 * 60 * 1000);

            events.push({
              uid: `med-${m.id}-${sched.id}-${i}@parentcare.app`,
              title: `💊 Tomar ${m.name} ${m.dosage || ''}${m.unit || ''}`.trim(),
              description: m.instructions || 'Horário de medicamento registrado no Parent Care',
              start,
              end,
            });
          }
        });
      });

      // 4. Load Life Activities
      const { data: acts } = await supabase
        .from('life_activities')
        .select('*')
        .eq('cared_person_id', pId)
        .eq('is_active', true);

      (acts || []).forEach((act: any) => {
        const [h, min] = (act.time_of_day || '09:00').split(':').map(Number);
        const recDays: number[] = Array.isArray(act.recurrence_days) ? act.recurrence_days : [];
        const dur = (act.duration_minutes || 60) * 60 * 1000;

        for (let i = 0; i <= 14; i++) {
          const start = new Date();
          start.setDate(start.getDate() + i);
          const dayOfWeek = start.getDay();
          const isScheduled = recDays.length === 0 || recDays.includes(dayOfWeek) || act.recurrence_type === 'daily';

          if (isScheduled) {
            start.setHours(h, min, 0, 0);
            const end = new Date(start.getTime() + dur);
            events.push({
              uid: `act-${act.id}-${i}@parentcare.app`,
              title: `🏃 ${act.title}`,
              description: [
                act.instructor_name ? `Instrutor: ${act.instructor_name}` : '',
                act.health_orientations || '',
              ].filter(Boolean).join('\n'),
              location: act.location_name || undefined,
              start,
              end,
            });
          }
        }
      });
    }

    // 5. Build RFC 5545 iCalendar content
    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Parent Care//Agenda Pessoal//PT',
      `X-WR-CALNAME:Parent Care - ${personName}`,
      'X-WR-TIMEZONE:America/Sao_Paulo',
      'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    const nowStr = formatDateToICS(new Date());

    events.forEach(ev => {
      ics.push(
        'BEGIN:VEVENT',
        `UID:${ev.uid}`,
        `DTSTAMP:${nowStr}`,
        `DTSTART:${formatDateToICS(ev.start)}`,
        `DTEND:${formatDateToICS(ev.end)}`,
        `SUMMARY:${ev.title.replace(/\n/g, ' ')}`,
        `DESCRIPTION:${ev.description.replace(/\n/g, '\\n')}`,
        ev.location ? `LOCATION:${ev.location.replace(/\n/g, ' ')}` : '',
        'STATUS:CONFIRMED',
        'BEGIN:VALARM',
        'TRIGGER:-PT15M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Lembrete: ${ev.title}`,
        'END:VALARM',
        'BEGIN:VALARM',
        'TRIGGER:PT0M',
        'ACTION:DISPLAY',
        `DESCRIPTION:Horário agora: ${ev.title}`,
        'END:VALARM',
        'END:VEVENT'
      );
    });

    ics = ics.filter(Boolean);
    ics.push('END:VCALENDAR');

    const icsContent = ics.join('\r\n');

    return new Response(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `inline; filename="parent-care-${encodeURIComponent(personName)}.ics"`,
        'Cache-Control': 'no-cache, no-store, max-age=0, must-revalidate',
      },
    });
  } catch (error: any) {
    console.error('Error generating calendar feed:', error);
    return NextResponse.json({ error: 'Erro ao gerar feed do calendário' }, { status: 500 });
  }
}
