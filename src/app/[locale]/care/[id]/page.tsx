'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Heart, AlertCircle, Pill, Coffee, Droplet, CheckCircle2,
  Calendar, BellRing, RotateCcw, Sun, Moon, Activity as ActivityIcon,
  Clock, Volume2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameDay, isSameMonth, isToday } from 'date-fns';
import { getDateFnsLocale, getSpeechSynthesisLang, getCareTexts } from '@/lib/i18n/care-translations';

function playAlarmChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + idx * 0.18;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  } catch (err) { console.warn('Audio error:', err); }
}

function speakReminder(text: string, rawLocale: string = 'pt-BR') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechSynthesisLang(rawLocale);
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (err) { console.warn('Speech error:', err); }
}

type ViewMode = 'day' | 'week' | 'month';

interface AgendaEvent {
  id: string;
  title: string;
  time?: string;
  date: Date;
  type: 'appointment' | 'medication' | 'meal' | 'task';
  subtitle?: string;
  color: string;
}

export default function ElderlyViewPage({ params }: { params: { id: string; locale: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const tCare = getCareTexts(params.locale);
  const dateFnsLoc = getDateFnsLocale(params.locale);
  const displayLocale = params.locale === 'en' ? 'en-US' : params.locale;

  const [loading, setLoading] = useState(false);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarBase, setCalendarBase] = useState(new Date());
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [nextAppointmentData, setNextAppointmentData] = useState<any>(null);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmDismissedId, setAlarmDismissedId] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<Date | null>(null);
  const [personInfo, setPersonInfo] = useState({
    name: 'Carregando...', organizationId: '', userId: '',
    nextAppointment: null as string | null, nextMedication: null as string | null,
    medicationId: null as string | null, medicationScheduleId: null as string | null,
  });
  const [lastAction, setLastAction] = useState<{ id: string; type: string; table: string } | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchAgendaEvents = useCallback(async (personId: string) => {
    setAgendaLoading(true);
    const allEvents: AgendaEvent[] = [];
    const from = new Date(); from.setDate(from.getDate() - 30);
    const to = new Date(); to.setDate(to.getDate() + 60);

    const { data: appts } = await (supabase as any)
      .from('appointments').select('id,title,starts_at,doctor_name,location,status')
      .eq('cared_person_id', personId).gte('starts_at', from.toISOString())
      .lte('starts_at', to.toISOString()).order('starts_at', { ascending: true });
    (appts || []).forEach((a: any) => {
      const d = new Date(a.starts_at);
      allEvents.push({ id: 'appt-' + a.id, title: a.title, subtitle: a.doctor_name || a.location || '', time: format(d, 'HH:mm'), date: d, type: 'appointment', color: 'blue' });
    });

    const { data: meds } = await (supabase as any)
      .from('medications').select('id,name,dosage,unit,medication_schedules(id,time_of_day)')
      .eq('cared_person_id', personId).eq('is_active', true);
    (meds || []).forEach((med: any) => {
      const schedules = med.medication_schedules || [];
      if (schedules.length === 0) {
        const d = new Date(); d.setHours(8, 0, 0, 0);
        allEvents.push({ id: 'med-' + med.id + '-notime', title: med.name + ' ' + med.dosage + med.unit, time: '08:00', date: new Date(d), type: 'medication', color: 'green' });
      } else {
        schedules.forEach((sched: any) => {
          for (let i = -7; i <= 30; i++) {
            const d = new Date(); d.setDate(d.getDate() + i);
            const pts = sched.time_of_day.split(':');
            d.setHours(parseInt(pts[0]), parseInt(pts[1]), 0, 0);
            allEvents.push({ id: 'med-' + med.id + '-' + sched.id + '-' + i, title: med.name + ' ' + med.dosage + med.unit, time: sched.time_of_day.slice(0, 5), date: new Date(d), type: 'medication', color: 'green' });
          }
        });
      }
    });

    const mealFrom = new Date(); mealFrom.setDate(mealFrom.getDate() - 7);
    const { data: notes } = await (supabase as any)
      .from('care_notes').select('id,content,created_at').eq('cared_person_id', personId)
      .like('content', 'Refei%').gte('created_at', mealFrom.toISOString())
      .order('created_at', { ascending: false }).limit(50);
    const emojiMap: Record<string, string> = { breakfast: '🥣', lunch: '🥗', snack: '🍎', dinner: '🍲', supper: '🥛' };
    (notes || []).forEach((n: any) => {
      const d = new Date(n.created_at);
      const match = n.content.match(/^Refei.+?((.+?)): (.+?). Apetite:/);
      const mealType = match ? match[1] : 'meal';
      const mealName = match ? match[2] : n.content.substring(0, 40);
      allEvents.push({ id: 'meal-' + n.id, title: (emojiMap[mealType] || '🍽') + ' ' + mealName, time: format(d, 'HH:mm'), date: d, type: 'meal', color: 'orange' });
    });

    const { data: tasks } = await (supabase as any)
      .from('tasks').select('id,title,due_date,status,priority').eq('cared_person_id', personId)
      .order('due_date', { ascending: true }).limit(50);
    (tasks || []).forEach((t: any) => {
      const d = t.due_date ? new Date(t.due_date) : new Date();
      allEvents.push({ id: 'task-' + t.id, title: t.title, subtitle: t.status === 'completed' ? '✓ Concluída' : (t.priority === 'high' || t.priority === 'urgent') ? '⚠️ Alta Prioridade' : '', date: d, type: 'task', color: 'purple' });
    });

    setEvents(allEvents);
    setAgendaLoading(false);
  }, [supabase]);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/' + params.locale + '/care/login'); return; }
      const { data: person, error: pErr } = await supabase.from('cared_people').select('full_name,organization_id').eq('id', params.id).single();
      if (!person || pErr) { router.push('/' + params.locale + '/care/login'); return; }
      const orgId = person.organization_id;
      const firstName = person.full_name.split(' ')[0];
      const { data: meds } = await supabase.from('medications').select('id,name').eq('cared_person_id', params.id).eq('is_active', true).limit(1);
      let nextMed = null; let medId = null;
      if (meds && meds.length > 0) { nextMed = meds[0].name + ' (Verifique Horário)'; medId = meds[0].id; }
      const { data: appt } = await (supabase as any).from('appointments').select('id,title,starts_at,doctor_name,location,description').eq('cared_person_id', params.id).gte('starts_at', new Date(Date.now() - 45 * 60 * 1000).toISOString()).order('starts_at', { ascending: true }).limit(1).maybeSingle();
      let nextAppt = null;
      if (appt) {
        nextAppt = appt.title;
        setNextAppointmentData(appt);
      } else { setNextAppointmentData(null); }
      const enabledSet = new Set<string>();
      const { data: orgData } = await (supabase as any).from('organizations').select('settings').eq('id', orgId).maybeSingle();
      const orgSettings = (orgData?.settings as any) || {};
      const personConfig = orgSettings.monitoring?.[params.id];
      if (personConfig && Array.isArray(personConfig.enabled_codes)) {
        personConfig.enabled_codes.forEach((c: string) => enabledSet.add(c));
      } else {
        const { data: settingsData } = await (supabase as any).from('cared_person_monitoring_settings').select('enabled,monitoring_definitions(code)').eq('cared_person_id', params.id);
        if (settingsData && settingsData.length > 0) {
          settingsData.forEach((row: any) => { const code = row.monitoring_definitions?.code; if (row.enabled && code) enabledSet.add(code); });
        } else {
          ['meds_scheduled','schedule_appointments','checkin_btn_im_well','checkin_btn_need_help','checkin_btn_took_med','checkin_btn_ate','checkin_btn_drank_water','checkin_btn_emergency'].forEach((c) => enabledSet.add(c));
        }
      }
      setEnabledModules(enabledSet); setSettingsLoaded(true);
      setPersonInfo({ name: firstName, organizationId: orgId, userId: user.id, nextMedication: nextMed, medicationId: medId, medicationScheduleId: null, nextAppointment: nextAppt });
      await fetchAgendaEvents(params.id);
    }
    fetchData();
  }, [params.id, params.locale, router, supabase, dateFnsLoc, fetchAgendaEvents]);

  useEffect(() => {
    if (!nextAppointmentData) return;
    if (alarmDismissedId === nextAppointmentData.id) return;
    if (snoozeUntil && new Date() < snoozeUntil) return;
    const apptTime = new Date(nextAppointmentData.starts_at).getTime();
    const now = currentTime.getTime();
    let offsetMinutes = 15;
    const desc = nextAppointmentData.description || '';
    if (desc.includes('No horário') || desc.includes('exact') || desc.includes('Uhrzeit')) offsetMinutes = 0;
    else if (desc.includes('30 min') || desc.includes('30 Minuten') || desc.includes('30 minutes')) offsetMinutes = 30;
    else if (desc.includes('1 hora') || desc.includes('1 hour') || desc.includes('1 Stunde')) offsetMinutes = 60;
    else if (desc.includes('08:00') || desc.includes('morning')) {
      const apptDay = new Date(nextAppointmentData.starts_at);
      if (apptDay.toDateString() === currentTime.toDateString() && currentTime.getHours() >= 8) offsetMinutes = 999999;
    }
    const triggerTime = apptTime - offsetMinutes * 60 * 1000;
    const expiryTime = apptTime + 45 * 60 * 1000;
    if (now >= triggerTime && now <= expiryTime && !alarmModalOpen) {
      setAlarmModalOpen(true); playAlarmChime();
      const timeStr = format(new Date(nextAppointmentData.starts_at), 'HH:mm');
      speakReminder(tCare.alarmSpeech({ name: personInfo.name, title: nextAppointmentData.title, time: timeStr, doctor: nextAppointmentData.doctor_name, location: nextAppointmentData.location }), params.locale);
    }
  }, [currentTime, nextAppointmentData, alarmDismissedId, snoozeUntil, alarmModalOpen, personInfo.name, params.locale, tCare]);

  const triggerAlarmManually = () => {
    if (!nextAppointmentData) return;
    setAlarmModalOpen(true); playAlarmChime();
    const timeStr = format(new Date(nextAppointmentData.starts_at), "dd/MM 'às' HH:mm", { locale: dateFnsLoc });
    speakReminder(tCare.alarmSpeech({ name: personInfo.name, title: nextAppointmentData.title, time: timeStr, doctor: nextAppointmentData.doctor_name, location: nextAppointmentData.location }), params.locale);
  };
  const testAlarmDemo = () => { setAlarmModalOpen(true); playAlarmChime(); speakReminder(tCare.demoSpeech(personInfo.name), params.locale); };
  const triggerVibration = () => { if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(200); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAction = async (type: string, message: string, dbTable: string, payloadData: any) => {
    setLoading(true);
    const payload = { organization_id: personInfo.organizationId, cared_person_id: params.id, ...payloadData };
    const { data: result, error } = await supabase.from(dbTable).insert(payload).select().single();
    if (error) { setLoading(false); alert('Falha na comunicação. Verifique sua internet.'); return; }
    triggerVibration();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLastAction({ id: (result as any).id, type, table: dbTable });
    setLoading(false); setSuccessMsg(message + '! A família foi avisada.');
    const { data: members } = await supabase.from('organization_members').select('user_id').eq('organization_id', personInfo.organizationId).neq('user_id', personInfo.userId);
    if (members && members.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.from('notifications').insert(members.map((m: any) => ({ user_id: m.user_id, organization_id: personInfo.organizationId, type: type === 'emergency' ? 'alert' : 'info', title: 'Aviso de ' + personInfo.name, message, link_url: '/' + params.locale + '/dashboard' })));
    }
    setTimeout(() => setSuccessMsg(''), 6000);
  };
  const undoLastAction = async () => {
    if (!lastAction) return;
    setLoading(true); await supabase.from(lastAction.table).delete().eq('id', lastAction.id);
    setLoading(false); setLastAction(null); setSuccessMsg('Ação cancelada.'); setTimeout(() => setSuccessMsg(''), 3000);
  };

  const navigatePrev = () => {
    if (viewMode === 'month') setCalendarBase(subMonths(calendarBase, 1));
    else setSelectedDate(addDays(selectedDate, viewMode === 'week' ? -7 : -1));
  };
  const navigateNext = () => {
    if (viewMode === 'month') setCalendarBase(addMonths(calendarBase, 1));
    else setSelectedDate(addDays(selectedDate, viewMode === 'week' ? 7 : 1));
  };
  const goToToday = () => { setSelectedDate(new Date()); setCalendarBase(new Date()); };
  const getEventsForDay = (day: Date) =>
    events.filter(e => isSameDay(e.date, day)).sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  const eventColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
    blue:   { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-800 dark:text-blue-300', dot: 'bg-blue-500' },
    green:  { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-800 dark:text-emerald-300', dot: 'bg-emerald-500' },
    orange: { bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-800 dark:text-orange-300', dot: 'bg-orange-500' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-950/30', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-800 dark:text-purple-300', dot: 'bg-purple-500' },
  };
  const typeEmoji: Record<string, string> = { appointment: '📅', medication: '💊', meal: '🍽', task: '✅' };

  const renderEventCard = (ev: AgendaEvent) => {
    const cls = eventColors[ev.color] || eventColors.blue;
    return (
      <div key={ev.id} className={'flex items-start gap-3 p-3 sm:p-4 rounded-2xl border ' + cls.bg + ' ' + cls.border}>
        <div className={'w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center text-lg shrink-0 ' + cls.bg + ' border ' + cls.border}>{typeEmoji[ev.type] || '📌'}</div>
        <div className='flex-1 min-w-0'>
          <p className={'font-bold text-base sm:text-lg leading-tight truncate ' + cls.text}>{ev.title}</p>
          {ev.subtitle && <p className='text-sm text-stone-500 dark:text-stone-400 mt-0.5 truncate'>{ev.subtitle}</p>}
          {ev.time && <p className='text-sm font-semibold text-stone-600 dark:text-stone-400 mt-1'>⏰ {ev.time}</p>}
        </div>
      </div>
    );
  };

  const buildMonthGrid = () => {
    const start = startOfWeek(startOfMonth(calendarBase), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(calendarBase), { weekStartsOn: 0 });
    const days: Date[] = []; let cur = start;
    while (cur <= end) { days.push(cur); cur = addDays(cur, 1); }
    return days;
  };
  const buildWeekDays = () => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 0 });
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  };

  return (
    <div className='min-h-screen bg-stone-100/80 elderly-mode text-stone-900 pb-36'>
      <header className='bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-20 shadow-xs px-4 py-3 sm:px-8'>
        <div className='max-w-5xl mx-auto flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 sm:h-14 sm:w-14 bg-emerald-100 rounded-2xl flex items-center justify-center'><Heart className='h-7 w-7 fill-emerald-600 text-emerald-600' /></div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100'>{'Olá, ' + personInfo.name + '!'}</h1>
                <span className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200'>
                  <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                  <span className='text-[11px] font-bold text-emerald-800 hidden sm:inline'>Família Conectada</span>
                </span>
              </div>
              <p className='text-sm text-stone-500 font-medium'>
                {currentTime.toLocaleDateString(displayLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                <span className='font-black text-stone-800 dark:text-stone-200 tabular-nums'>
                  {currentTime.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            </div>
          </div>
          <Button variant='outline' onClick={() => { supabase.auth.signOut(); router.push('/' + params.locale + '/care/login'); }} className='text-stone-600 border-stone-300 hover:bg-stone-100 h-10 px-4 text-sm font-bold rounded-xl'>Sair</Button>
        </div>
      </header>

      <main className='p-4 sm:p-6 max-w-5xl mx-auto space-y-6'>
        {successMsg && (
          <div className='bg-emerald-50 border-2 border-emerald-500 text-emerald-900 p-5 rounded-3xl flex items-center gap-4 shadow-md animate-in slide-in-from-top-3'>
            <div className='w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0'><CheckCircle2 className='h-7 w-7' /></div>
            <div className='flex-1'><p className='text-xl font-black leading-tight'>{successMsg}</p></div>
            {lastAction && (<Button onClick={undoLastAction} variant='outline' className='h-12 border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-100 text-base font-bold px-4 rounded-xl gap-2'><RotateCcw className='h-5 w-5' /> Desfazer</Button>)}
          </div>
        )}

        {/* AGENDA MODERNA */}
        <div className='bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-700 shadow-sm overflow-hidden'>
          <div className='p-4 sm:p-5 border-b border-stone-100 dark:border-stone-800 flex flex-col sm:flex-row sm:items-center gap-3'>
            <div className='flex items-center gap-2 flex-1'>
              <Calendar className='h-6 w-6 text-indigo-600 shrink-0' />
              <h2 className='text-xl font-black text-stone-900 dark:text-stone-100'>Minha Agenda</h2>
            </div>
            <div className='flex items-center gap-1 bg-stone-100 dark:bg-stone-800 rounded-xl p-1'>
              {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
                <button key={mode} onClick={() => setViewMode(mode)} className={'px-3 py-1.5 rounded-lg text-sm font-bold transition-all ' + (viewMode === mode ? 'bg-white dark:bg-stone-700 text-indigo-700 dark:text-indigo-300 shadow-xs' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300')}>
                  {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
            <div className='flex items-center gap-2'>
              <button onClick={navigatePrev} className='p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 transition-colors'><ChevronLeft className='h-5 w-5' /></button>
              <button onClick={goToToday} className='px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700'>Hoje</button>
              <button onClick={navigateNext} className='p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 transition-colors'><ChevronRight className='h-5 w-5' /></button>
            </div>
          </div>

          <div className='px-4 sm:px-5 py-2.5 border-b border-stone-100 dark:border-stone-800 flex items-center gap-4 overflow-x-auto'>
            {([['bg-blue-500','Consultas'],['bg-emerald-500','Medicamentos'],['bg-orange-500','Refeições'],['bg-purple-500','Tarefas']] as [string,string][]).map(([color, label]) => (
              <div key={label} className='flex items-center gap-1.5 shrink-0'>
                <span className={'w-2.5 h-2.5 rounded-full ' + color} />
                <span className='text-xs font-semibold text-stone-500 dark:text-stone-400'>{label}</span>
              </div>
            ))}
          </div>

          {agendaLoading ? (
            <div className='py-16 flex justify-center'><div className='animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full' /></div>
          ) : (
            <div className='p-4 sm:p-5'>
              {viewMode === 'day' && (() => {
                const dayEvents = getEventsForDay(selectedDate);
                return (
                  <div className='space-y-4'>
                    <h3 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 capitalize'>
                      {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: dateFnsLoc })}
                      {isToday(selectedDate) && <span className='ml-2 text-sm font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full'>Hoje</span>}
                    </h3>
                    {dayEvents.length === 0 ? (
                      <div className='py-12 text-center'>
                        <Calendar className='h-14 w-14 mx-auto text-stone-300 dark:text-stone-600 mb-3' />
                        <p className='text-lg font-bold text-stone-400 dark:text-stone-500'>Nenhum evento neste dia</p>
                      </div>
                    ) : (
                      <div className='space-y-3'>{dayEvents.map(ev => renderEventCard(ev))}</div>
                    )}
                  </div>
                );
              })()}

              {viewMode === 'week' && (() => {
                const weekDays = buildWeekDays();
                return (
                  <div className='space-y-3'>
                    <h3 className='text-lg font-black text-stone-900 dark:text-stone-100'>
                      {format(weekDays[0], "dd 'de' MMM", { locale: dateFnsLoc })} – {format(weekDays[6], "dd 'de' MMM yyyy", { locale: dateFnsLoc })}
                    </h3>
                    <div className='grid grid-cols-7 gap-1 sm:gap-2'>
                      {weekDays.map(day => {
                        const dayEvs = getEventsForDay(day);
                        const isTodayDay = isToday(day);
                        const isSelected = isSameDay(day, selectedDate);
                        return (
                          <button key={day.toISOString()} onClick={() => { setSelectedDate(day); setViewMode('day'); }}
                            className={'p-2 sm:p-3 rounded-2xl border text-center transition-all space-y-1.5 ' + (isTodayDay ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30' : isSelected ? 'border-stone-400 bg-stone-50 dark:bg-stone-800' : 'border-stone-200 dark:border-stone-700 bg-stone-50/50 dark:bg-stone-800/50 hover:border-indigo-300')}>
                            <p className='text-[11px] font-bold text-stone-500 uppercase'>{format(day, 'EEE', { locale: dateFnsLoc })}</p>
                            <p className={'text-base sm:text-xl font-black ' + (isTodayDay ? 'text-indigo-600' : 'text-stone-900 dark:text-stone-100')}>{format(day, 'd')}</p>
                            {dayEvs.length > 0 && (
                              <div className='flex flex-wrap justify-center gap-0.5 mt-1'>
                                {dayEvs.slice(0, 4).map(ev => <span key={ev.id} className={'w-2 h-2 rounded-full ' + (eventColors[ev.color]?.dot || 'bg-stone-400')} />)}
                                {dayEvs.length > 4 && <span className='text-[9px] text-stone-400'>+{dayEvs.length - 4}</span>}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    <div className='pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3'>
                      <p className='text-sm font-bold text-stone-500 dark:text-stone-400 capitalize'>{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: dateFnsLoc })}</p>
                      {getEventsForDay(selectedDate).length === 0 ? <p className='text-stone-400 text-sm py-4 text-center'>Nenhum evento neste dia</p> : getEventsForDay(selectedDate).map(ev => renderEventCard(ev))}
                    </div>
                  </div>
                );
              })()}

              {viewMode === 'month' && (() => {
                const monthDays = buildMonthGrid();
                const weekDayLabels = Array.from({ length: 7 }, (_, i) => format(addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), i), 'EEE', { locale: dateFnsLoc }));
                return (
                  <div className='space-y-3'>
                    <h3 className='text-xl font-black text-stone-900 dark:text-stone-100 capitalize'>{format(calendarBase, 'MMMM yyyy', { locale: dateFnsLoc })}</h3>
                    <div>
                      <div className='grid grid-cols-7 mb-1'>{weekDayLabels.map(lbl => <div key={lbl} className='text-center text-[11px] font-bold text-stone-400 py-1 uppercase'>{lbl}</div>)}</div>
                      <div className='grid grid-cols-7 gap-1'>
                        {monthDays.map(day => {
                          const dayEvs = getEventsForDay(day);
                          const inMonth = isSameMonth(day, calendarBase);
                          const isTodayDay = isToday(day);
                          const isSelected = isSameDay(day, selectedDate);
                          return (
                            <button key={day.toISOString()} onClick={() => { setSelectedDate(day); setCalendarBase(day); setViewMode('day'); }}
                              className={'aspect-square p-1 rounded-xl text-center flex flex-col items-center justify-start transition-all hover:bg-indigo-50 dark:hover:bg-indigo-950/30 ' + (!inMonth ? 'opacity-30 ' : '') + (isTodayDay ? 'bg-indigo-100 dark:bg-indigo-950/50 ring-2 ring-indigo-400 ' : '') + (isSelected && !isTodayDay ? 'bg-stone-100 dark:bg-stone-800 ' : '')}>
                              <span className={'text-sm font-black leading-none mt-1 ' + (isTodayDay ? 'text-indigo-600' : 'text-stone-900 dark:text-stone-100')}>{format(day, 'd')}</span>
                              {dayEvs.length > 0 && (
                                <div className='flex flex-wrap justify-center gap-0.5 mt-auto mb-0.5'>
                                  {dayEvs.slice(0, 3).map(ev => <span key={ev.id} className={'w-1.5 h-1.5 rounded-full ' + (eventColors[ev.color]?.dot || 'bg-stone-400')} />)}
                                  {dayEvs.length > 3 && <span className='text-[8px] text-stone-400'>+{dayEvs.length - 3}</span>}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className='pt-3 border-t border-stone-100 dark:border-stone-800 space-y-3'>
                      <p className='text-sm font-bold text-stone-500'>{'Eventos de hoje (' + getEventsForDay(new Date()).length + ')'}</p>
                      {getEventsForDay(new Date()).length === 0 ? <p className='text-stone-400 text-sm text-center py-3'>Nenhum evento hoje</p> : (
                        <div className='grid sm:grid-cols-2 gap-3'>{getEventsForDay(new Date()).slice(0, 6).map(ev => renderEventCard(ev))}</div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <p className='text-center text-lg font-extrabold text-stone-600 dark:text-stone-400'>Toque em um botão para avisar sua família:</p>
        {settingsLoaded && (
          <div className='grid grid-cols-2 gap-4 sm:gap-6'>
            {enabledModules.has('checkin_btn_im_well') && (<button disabled={loading} onClick={() => handleAction('mood','Estou bem!','check_ins',{mood:'great',checked_by:personInfo.userId,notes:'Estou bem'})} className='bg-white dark:bg-stone-800 hover:bg-emerald-50 border-3 border-emerald-300 hover:border-emerald-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-emerald-100 flex items-center justify-center'><Heart className='h-12 w-12 sm:h-14 sm:w-14 text-emerald-600 fill-emerald-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Estou Bem</span><span className='text-xs sm:text-sm font-semibold text-emerald-700'>Tudo calmo por aqui</span></div></button>)}
            {enabledModules.has('checkin_btn_drank_water') && (<button disabled={loading} onClick={() => handleAction('hydration','Bebi água!','hydration_logs',{amount_ml:250,logged_by:personInfo.userId})} className='bg-white dark:bg-stone-800 hover:bg-sky-50 border-3 border-sky-300 hover:border-sky-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-sky-100 flex items-center justify-center'><Droplet className='h-12 w-12 sm:h-14 sm:w-14 text-sky-600 fill-sky-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Bebi Água</span><span className='text-xs sm:text-sm font-semibold text-sky-700'>+ 1 copo</span></div></button>)}
            {enabledModules.has('checkin_btn_ate') && (<button disabled={loading} onClick={() => handleAction('meal','Já me alimentei!','meals',{meal_type:'other',logged_by:personInfo.userId})} className='bg-white dark:bg-stone-800 hover:bg-amber-50 border-3 border-amber-300 hover:border-amber-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-100 flex items-center justify-center'><Coffee className='h-12 w-12 sm:h-14 sm:w-14 text-amber-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Já Comi</span><span className='text-xs sm:text-sm font-semibold text-amber-700'>Refeição feita</span></div></button>)}
            {enabledModules.has('checkin_btn_took_med') && (<button disabled={loading||!personInfo.medicationId} onClick={() => handleAction('medication','Remédio tomado!','medication_confirmations',{medication_id:personInfo.medicationId,confirmed_by:personInfo.userId,status:'taken'})} className='bg-white dark:bg-stone-800 hover:bg-blue-50 border-3 border-blue-300 hover:border-blue-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center disabled:opacity-50'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-100 flex items-center justify-center'><Pill className='h-12 w-12 sm:h-14 sm:w-14 text-blue-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Tomei Remédio</span><span className='text-xs sm:text-sm font-semibold text-blue-700'>Horário cumprido</span></div></button>)}
            {enabledModules.has('checkin_btn_woke_up') && (<button disabled={loading} onClick={() => handleAction('wake','Bom dia! Avisamos que você acordou','check_ins',{mood:'great',checked_by:personInfo.userId,notes:'Acordou'})} className='bg-white dark:bg-stone-800 hover:bg-yellow-50 border-3 border-yellow-300 hover:border-yellow-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-yellow-100 flex items-center justify-center'><Sun className='h-12 w-12 sm:h-14 sm:w-14 text-yellow-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Acordei</span><span className='text-xs sm:text-sm font-semibold text-yellow-700'>Bom dia!</span></div></button>)}
            {enabledModules.has('checkin_btn_going_to_sleep') && (<button disabled={loading} onClick={() => handleAction('sleep','Boa noite! Registramos seu descanso','check_ins',{mood:'good',checked_by:personInfo.userId,notes:'Foi dormir'})} className='bg-white dark:bg-stone-800 hover:bg-indigo-50 border-3 border-indigo-300 hover:border-indigo-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-indigo-100 flex items-center justify-center'><Moon className='h-12 w-12 sm:h-14 sm:w-14 text-indigo-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Vou Dormir</span><span className='text-xs sm:text-sm font-semibold text-indigo-700'>Boa noite!</span></div></button>)}
            {enabledModules.has('checkin_btn_activity_done') && (<button disabled={loading} onClick={() => handleAction('activity','Parabéns! Atividade concluída','check_ins',{mood:'great',checked_by:personInfo.userId,notes:'Atividade concluída'})} className='bg-white dark:bg-stone-800 hover:bg-violet-50 border-3 border-violet-300 hover:border-violet-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-violet-100 flex items-center justify-center'><ActivityIcon className='h-12 w-12 sm:h-14 sm:w-14 text-violet-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Atividade</span><span className='text-xs sm:text-sm font-semibold text-violet-700'>Caminhada/exercício</span></div></button>)}
            {enabledModules.has('checkin_btn_remind_later') && (<button disabled={loading} onClick={() => handleAction('remind_later','Lembrete adiado em 15 minutos','check_ins',{checked_by:personInfo.userId,notes:'Lembrar mais tarde (15 min)'})} className='bg-white dark:bg-stone-800 hover:bg-slate-50 border-3 border-slate-300 hover:border-slate-500 p-6 sm:p-8 rounded-3xl flex flex-col items-center gap-4 transition-all shadow-sm active:scale-95 text-center'><div className='w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-100 flex items-center justify-center'><Clock className='h-12 w-12 sm:h-14 sm:w-14 text-slate-600' /></div><div><span className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 block'>Depois</span><span className='text-xs sm:text-sm font-semibold text-slate-600'>Lembrar em 15 min</span></div></button>)}
          </div>
        )}

        {enabledModules.has('checkin_btn_need_help') && (
          <button disabled={loading} onClick={() => { if (window.confirm('Tem certeza que deseja pedir a atenção da família agora?')) { handleAction('help','Preciso de ajuda com a rotina','help_requests',{message:'Preciso de ajuda geral',requested_by:personInfo.userId}); } }}
            className='w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-6 sm:p-7 rounded-3xl flex items-center justify-center gap-5 transition-all shadow-lg active:scale-95'>
            <div className='bg-white/20 p-3 rounded-2xl'><BellRing className='h-10 w-10 text-white' /></div>
            <div className='text-left'><span className='text-2xl sm:text-3xl font-black block leading-none'>Preciso de Ajuda</span><span className='text-sm font-medium text-amber-100'>Avisar a família para me ligar</span></div>
          </button>
        )}
      </main>

      {enabledModules.has('checkin_btn_emergency') && (
        <div className='fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white dark:from-stone-950 via-white/95 dark:via-stone-950/95 to-transparent z-30'>
          <div className='max-w-5xl mx-auto'>
            <button disabled={loading} onClick={() => { if (window.confirm('ALERTA DE EMERGÊNCIA! Deseja enviar um aviso urgente com som para toda a família agora?')) { handleAction('emergency','EMERGÊNCIA! Preciso de socorro imediato','emergency_events',{reported_by:personInfo.userId,description:'Emergência acionada pela tela do idoso',severity:'critical'}); } }}
              className='w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-5 sm:p-6 rounded-3xl flex items-center justify-center gap-4 sm:gap-6 shadow-xl transition-all active:scale-95 border-b-4 border-red-800'>
              <div className='w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-ping shrink-0'><AlertCircle className='h-7 w-7 text-white' /></div>
              <span className='text-2xl sm:text-4xl font-black tracking-wider uppercase'>EMERGÊNCIA / SOS</span>
            </button>
          </div>
        </div>
      )}

      {alarmModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-amber-400 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200'>
            <div className='mx-auto w-24 h-24 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 flex items-center justify-center'><BellRing className='h-14 w-14 text-amber-600 dark:text-amber-400 animate-bounce' /></div>
            <div>
              <span className='inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-extrabold text-sm rounded-full tracking-wider uppercase mb-2'>{tCare.appointmentAlarmTitle}</span>
              <h2 className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 leading-tight'>{nextAppointmentData ? nextAppointmentData.title : tCare.demoTitle}</h2>
              <p className='text-lg font-bold text-amber-700 dark:text-amber-400 mt-2'>
                {nextAppointmentData ? tCare.scheduledFor + ' ' + format(new Date(nextAppointmentData.starts_at), "dd/MM 'às' HH:mm", { locale: dateFnsLoc }) : tCare.demoText}
              </p>
              {nextAppointmentData?.doctor_name && <p className='text-base font-semibold text-stone-700 dark:text-stone-300 mt-1'>{tCare.doctorLabel}: {nextAppointmentData.doctor_name}</p>}
              {nextAppointmentData?.location && <p className='text-sm text-stone-500 dark:text-stone-400 mt-0.5'>{tCare.locationLabel}: {nextAppointmentData.location}</p>}
            </div>
            <div className='space-y-3 pt-2'>
              <Button type='button' onClick={() => { if (nextAppointmentData) { triggerAlarmManually(); } else { testAlarmDemo(); } }} variant='outline' className='w-full h-14 text-lg font-bold border-2 border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 rounded-2xl flex items-center justify-center gap-2'><Volume2 className='h-5 w-5 text-indigo-600' /> {tCare.listenAgain}</Button>
              <Button type='button' onClick={() => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); if (nextAppointmentData) setAlarmDismissedId(nextAppointmentData.id); setAlarmModalOpen(false); }} className='w-full h-16 text-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg active:scale-95 transition-transform'>{tCare.confirmSeen}</Button>
              {nextAppointmentData && <Button type='button' onClick={() => { if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel(); setSnoozeUntil(new Date(Date.now() + 10 * 60 * 1000)); setAlarmModalOpen(false); }} variant='ghost' className='w-full h-12 text-base font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'>{tCare.snooze10m}</Button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
