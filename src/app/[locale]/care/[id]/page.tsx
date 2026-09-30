'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Heart, AlertCircle, Pill, Coffee, Droplet, CheckCircle2,
  Calendar, BellRing, RotateCcw, Sun, Moon, Activity as ActivityIcon,
  Clock, Volume2, ChevronLeft, ChevronRight,
  Wallet, Plus, Landmark, DollarSign, PhoneCall,
  Sparkles, Check, CheckSquare, MessageSquareHeart,
  VolumeX, ShieldCheck, HeartHandshake, Smile,
} from 'lucide-react';
import { format, isSameDay, isToday, addDays } from 'date-fns';
import { getDateFnsLocale, getSpeechSynthesisLang, getCareTexts, getFinanceTexts } from '@/lib/i18n/care-translations';

// ── Shared Audio Engine (Unlocks on first interaction & loops continuously) ──
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!globalAudioCtx) {
    globalAudioCtx = new AudioCtx();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume().catch(() => {});
  }
  return globalAudioCtx;
}

// Gentle pleasant ascending chime sequence (C5, E5, G5, C6)
function playAlarmChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
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
  } catch (err) {
    console.warn('Audio error:', err);
  }
}

// Positive completion chime (D5, F#5, A5)
function playSuccessChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const notes = [587.33, 739.99, 880.00];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + idx * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch (err) {
    console.warn('Success chime error:', err);
  }
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
  } catch (err) {
    console.warn('Speech error:', err);
  }
}

interface AgendaEvent {
  id: string;
  title: string;
  time?: string;
  date: Date;
  type: 'appointment' | 'medication' | 'meal' | 'task';
  subtitle?: string;
  color: string;
  completed?: boolean;
  raw?: any;
}

interface FamilyMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  fullDate: Date;
}

export default function ElderlyViewPage({ params }: { params: { id: string; locale: string } }) {
  const supabase = createClient();
  const router = useRouter();
  const tCare = getCareTexts(params.locale);
  const tFin = getFinanceTexts(params.locale);
  const dateFnsLoc = getDateFnsLocale(params.locale);
  const displayLocale = params.locale === 'en' ? 'en-US' : params.locale;

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  
  // Date navigation: simple 3-day switcher (Ontem, Hoje, Amanhã)
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const selectedDate = addDays(new Date(), selectedDayOffset);

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);

  // Audio unlocked status
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  // Family Love Notes / Mural de Afeto
  const [familyMessage, setFamilyMessage] = useState<FamilyMessage | null>(null);
  const [reactedMsgId, setReactedMsgId] = useState<string | null>(null);

  // Hydration progress today
  const [cupsDrank, setCupsDrank] = useState(0);

  // Next/current appointment for alarm
  const [nextAppointmentData, setNextAppointmentData] = useState<any>(null);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmDismissedId, setAlarmDismissedId] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<Date | null>(null);

  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmSpeechIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [personInfo, setPersonInfo] = useState({
    name: 'Carregando...',
    fullName: '',
    organizationId: '',
    userId: '',
    nextAppointment: null as string | null,
    nextMedication: null as string | null,
    medicationId: null as string | null,
    primaryPhone: '' as string,
  });

  const [lastAction, setLastAction] = useState<{ id: string; type: string; table: string } | null>(null);

  // Financial state for senior self-management
  const [financeData, setFinanceData] = useState<{
    monthlyIncome: number;
    totalExpenses: number;
    balance: number;
    currency: string;
    incomeSource: string;
  }>({
    monthlyIncome: 0,
    totalExpenses: 0,
    balance: 0,
    currency: 'BRL',
    incomeSource: 'Aposentadoria INSS',
  });
  const [showFinancesCard, setShowFinancesCard] = useState(false);
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [seniorPensionModalOpen, setSeniorPensionModalOpen] = useState(false);
  const [seniorExpenseAmount, setSeniorExpenseAmount] = useState('');
  const [seniorExpenseCategory, setSeniorExpenseCategory] = useState('medication');
  const [seniorExpenseDesc, setSeniorExpenseDesc] = useState('');
  const [seniorPensionInput, setSeniorPensionInput] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingPension, setSavingPension] = useState(false);

  // Clock tick
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 10000);
    return () => clearInterval(timer);
  }, []);

  // Unlock audio on any global interaction
  const unlockAudioContext = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx) {
      setAudioUnlocked(true);
    }
  }, []);

  useEffect(() => {
    const handleFirstTouch = () => {
      unlockAudioContext();
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
    window.addEventListener('click', handleFirstTouch);
    window.addEventListener('touchstart', handleFirstTouch);
    return () => {
      window.removeEventListener('click', handleFirstTouch);
      window.removeEventListener('touchstart', handleFirstTouch);
    };
  }, [unlockAudioContext]);

  // Continuous Alarm Starter / Stopper
  const startContinuousAlarm = useCallback((title: string, speechText: string) => {
    setAlarmModalOpen(true);
    unlockAudioContext();
    playAlarmChime();
    speakReminder(speechText, params.locale);

    if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
    if (alarmSpeechIntervalRef.current) clearInterval(alarmSpeechIntervalRef.current);

    alarmIntervalRef.current = setInterval(() => {
      playAlarmChime();
    }, 2800);

    alarmSpeechIntervalRef.current = setInterval(() => {
      speakReminder(speechText, params.locale);
    }, 8000);
  }, [params.locale, unlockAudioContext]);

  const stopContinuousAlarm = useCallback(() => {
    if (alarmIntervalRef.current) {
      clearInterval(alarmIntervalRef.current);
      alarmIntervalRef.current = null;
    }
    if (alarmSpeechIntervalRef.current) {
      clearInterval(alarmSpeechIntervalRef.current);
      alarmSpeechIntervalRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setAlarmModalOpen(false);
  }, []);

  // Fetch Finances
  const fetchFinances = useCallback(async (personId: string) => {
    try {
      const res = await fetch(`/api/expenses?caredPersonId=${personId}`);
      const data = await res.json();
      if (res.ok && data.success && data.summary) {
        setFinanceData({
          monthlyIncome: data.summary.monthlyIncome || 0,
          totalExpenses: data.summary.totalExpenses || 0,
          balance: data.summary.balance || 0,
          currency: data.summary.currency || 'BRL',
          incomeSource: data.financialProfile?.income_source || 'Aposentadoria INSS',
        });
        if (data.financialProfile?.monthly_income) {
          setSeniorPensionInput(String(data.financialProfile.monthly_income));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar finanças do idoso:', err);
    }
  }, []);

  // Fetch Family Notes (Mural de Afeto)
  const fetchFamilyNotes = useCallback(async (personId: string, elderFirstName: string) => {
    try {
      const { data: notes } = await (supabase as any)
        .from('care_notes')
        .select('id, content, created_at, author_id')
        .eq('cared_person_id', personId)
        .order('created_at', { ascending: false })
        .limit(20);

      // Filter notes that are messages from family/caregivers
      const humanNotes = (notes || []).filter((n: any) => {
        const c = n.content || '';
        return !c.startsWith('Refeição') && 
               !c.startsWith('Check-in') && 
               !c.includes('[Resposta do Idoso]') &&
               !c.includes('[Alarme:') &&
               c.trim().length > 3;
      });

      if (humanNotes.length > 0) {
        const latest = humanNotes[0];
        let sender = 'Família';
        let text = latest.content;

        // Extract "Sender: Message" if formatted that way
        const colonMatch = latest.content.match(/^([^:]+):\s*(.+)$/);
        if (colonMatch && colonMatch[1].length < 25) {
          sender = colonMatch[1].replace(/\[|\]/g, '').trim();
          text = colonMatch[2].trim();
        }

        setFamilyMessage({
          id: latest.id,
          sender,
          text,
          time: format(new Date(latest.created_at), 'HH:mm'),
          fullDate: new Date(latest.created_at),
        });
      } else {
        // Welcoming default love message
        setFamilyMessage({
          id: 'welcome',
          sender: 'Sua Família',
          text: `Que seu dia seja maravilhoso e abençoado, ${elderFirstName}! Estamos sempre conectados cuidando de você com todo o amor ❤️`,
          time: format(new Date(), 'HH:mm'),
          fullDate: new Date(),
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar recados da família:', err);
    }
  }, [supabase]);

  // Fetch Agenda Events (Appointments, Meds, Meals, Tasks)
  const fetchAgendaEvents = useCallback(async (personId: string) => {
    setAgendaLoading(true);
    const allEvents: AgendaEvent[] = [];
    const from = new Date(); from.setDate(from.getDate() - 14);
    const to = new Date(); to.setDate(to.getDate() + 30);

    // 1. Appointments
    const { data: appts } = await (supabase as any)
      .from('appointments').select('id,title,starts_at,doctor_name,location,status')
      .eq('cared_person_id', personId).gte('starts_at', from.toISOString())
      .lte('starts_at', to.toISOString()).order('starts_at', { ascending: true });
    (appts || []).forEach((a: any) => {
      const d = new Date(a.starts_at);
      allEvents.push({
        id: 'appt-' + a.id,
        title: a.title,
        subtitle: a.doctor_name || a.location || 'Consulta Médica',
        time: format(d, 'HH:mm'),
        date: d,
        type: 'appointment',
        color: 'blue',
        completed: a.status === 'completed',
        raw: a,
      });
    });

    // 2. Medications
    const { data: meds } = await (supabase as any)
      .from('medications').select('id,name,dosage,unit,medication_schedules(id,time_of_day)')
      .eq('cared_person_id', personId).eq('is_active', true);
    (meds || []).forEach((med: any) => {
      const schedules = med.medication_schedules || [];
      if (schedules.length === 0) {
        const d = new Date(); d.setHours(8, 0, 0, 0);
        allEvents.push({
          id: 'med-' + med.id + '-notime',
          title: `${med.name} ${med.dosage}${med.unit}`,
          subtitle: 'Medicamento agendado',
          time: '08:00',
          date: new Date(d),
          type: 'medication',
          color: 'green',
          raw: med,
        });
      } else {
        schedules.forEach((sched: any) => {
          for (let i = -7; i <= 14; i++) {
            const d = new Date(); d.setDate(d.getDate() + i);
            const pts = sched.time_of_day.split(':');
            d.setHours(parseInt(pts[0]), parseInt(pts[1]), 0, 0);
            allEvents.push({
              id: `med-${med.id}-${sched.id}-${i}`,
              title: `${med.name} ${med.dosage}${med.unit}`,
              subtitle: 'Horário do medicamento',
              time: sched.time_of_day.slice(0, 5),
              date: new Date(d),
              type: 'medication',
              color: 'green',
              raw: med,
            });
          }
        });
      }
    });

    // 3. Meals
    const mealFrom = new Date(); mealFrom.setDate(mealFrom.getDate() - 7);
    const [ { data: notes }, { data: directMeals } ] = await Promise.all([
      (supabase as any)
        .from('care_notes').select('id,content,created_at').eq('cared_person_id', personId)
        .ilike('content', '%refei%').gte('created_at', mealFrom.toISOString())
        .order('created_at', { ascending: false }).limit(50),
      (supabase as any)
        .from('meals').select('id,meal_type,description,notes,consumed_at,created_at').eq('cared_person_id', personId)
        .gte('created_at', mealFrom.toISOString())
        .order('created_at', { ascending: false }).limit(50),
    ]);
    const emojiMap: Record<string, string> = { breakfast: '🥣 Café da Manhã', lunch: '🥗 Almoço', snack: '🍎 Lanche da Tarde', dinner: '🍲 Jantar', supper: '🥛 Ceia', other: '🍽️ Refeição' };
    const seenCareMeals = new Set<string>();

    (notes || []).forEach((n: any) => {
      const d = new Date(n.created_at);
      const typeMatch = n.content.match(/Refei.+?\((.+?)\)/i);
      const nameMatch = n.content.match(/Refei.+?\(.+?\)(?:\s*(?:às|as)?\s*\d{2}:\d{2})?:\s*([^.]+)/i);
      const mealType = typeMatch ? typeMatch[1] : 'other';
      const mealName = nameMatch ? nameMatch[1].trim() : n.content.substring(0, 40);
      const explicitTimeMatch = n.content.match(/\b(\d{2}:\d{2})\b/);
      const timeStr = explicitTimeMatch ? explicitTimeMatch[1] : format(d, 'HH:mm');
      const key = `${format(d, 'yyyy-MM-dd')}-${mealType}-${mealName.toLowerCase().slice(0, 10)}`;
      seenCareMeals.add(key);

      allEvents.push({
        id: 'meal-' + n.id,
        title: emojiMap[mealType] || '🍽️ Refeição',
        subtitle: mealName !== 'Refeição' ? mealName : undefined,
        time: timeStr,
        date: d,
        type: 'meal',
        color: 'orange',
        completed: true,
        raw: n,
      });
    });

    (directMeals || []).forEach((m: any) => {
      const d = new Date(m.consumed_at || m.created_at);
      const mealType = m.meal_type || 'other';
      const mealName = m.description || 'Refeição';
      const key = `${format(d, 'yyyy-MM-dd')}-${mealType}-${mealName.toLowerCase().slice(0, 10)}`;
      if (!seenCareMeals.has(key)) {
        seenCareMeals.add(key);
        allEvents.push({
          id: 'meal-direct-' + m.id,
          title: emojiMap[mealType] || '🍽️ Refeição',
          subtitle: mealName,
          time: format(d, 'HH:mm'),
          date: d,
          type: 'meal',
          color: 'orange',
          completed: true,
          raw: m,
        });
      }
    });

    // 4. Tasks
    const { data: tasks } = await (supabase as any)
      .from('tasks').select('id,title,due_date,status,priority').eq('cared_person_id', personId)
      .order('due_date', { ascending: true }).limit(50);
    (tasks || []).forEach((t: any) => {
      const d = t.due_date ? new Date(t.due_date) : new Date();
      allEvents.push({
        id: 'task-' + t.id,
        title: t.title,
        subtitle: t.status === 'completed' ? '✓ Concluída' : 'Tarefa da rotina',
        time: format(d, 'HH:mm'),
        date: d,
        type: 'task',
        color: 'purple',
        completed: t.status === 'completed',
        raw: t,
      });
    });

    // Hydration logs today
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const { data: hydro } = await (supabase as any)
      .from('hydration_logs')
      .select('amount_ml')
      .eq('cared_person_id', personId)
      .gte('created_at', todayStart.toISOString());
    const totalMl = (hydro || []).reduce((acc: number, curr: any) => acc + (curr.amount_ml || 250), 0);
    setCupsDrank(Math.round(totalMl / 250));

    setEvents(allEvents);
    setAgendaLoading(false);
  }, [supabase]);

  // Main Data Loading
  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/' + params.locale + '/care/login'); return; }
      
      const { data: person, error: pErr } = await supabase
        .from('cared_people')
        .select('full_name, organization_id, photo_url')
        .eq('id', params.id)
        .single();
        
      if (!person || pErr) { router.push('/' + params.locale + '/care/login'); return; }

      const orgId = person.organization_id;
      const firstName = person.full_name.split(' ')[0];

      // Primary contact phone
      let pPhone = '';
      try {
        const { data: contacts } = await (supabase as any)
          .from('emergency_contacts')
          .select('phone')
          .eq('cared_person_id', params.id)
          .limit(1);
        if (contacts && contacts[0]?.phone) pPhone = contacts[0].phone;
      } catch {
        // ignore
      }

      // Next medication
      const { data: meds } = await supabase.from('medications').select('id,name').eq('cared_person_id', params.id).eq('is_active', true).limit(1);
      let nextMed = null; let medId = null;
      if (meds && meds.length > 0) { nextMed = meds[0].name; medId = meds[0].id; }

      // Next appointment
      const { data: appt } = await (supabase as any)
        .from('appointments')
        .select('id,title,starts_at,doctor_name,location,description')
        .eq('cared_person_id', params.id)
        .gte('starts_at', new Date(Date.now() - 45 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (appt) {
        setNextAppointmentData(appt);
      } else {
        setNextAppointmentData(null);
      }

      // Modules
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
      setEnabledModules(enabledSet);
      setSettingsLoaded(true);

      setPersonInfo({
        name: firstName,
        fullName: person.full_name,
        organizationId: orgId,
        userId: user.id,
        nextMedication: nextMed,
        medicationId: medId,
        nextAppointment: appt?.title || null,
        primaryPhone: pPhone,
      });

      await fetchAgendaEvents(params.id);
      await fetchFamilyNotes(params.id, firstName);
      await fetchFinances(params.id);
    }
    fetchData();
  }, [params.id, params.locale, router, supabase, fetchAgendaEvents, fetchFamilyNotes, fetchFinances]);

  // Appointment Alarm Auto-Trigger
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
      const timeStr = format(new Date(nextAppointmentData.starts_at), 'HH:mm');
      const speech = tCare.alarmSpeech({
        name: personInfo.name,
        title: nextAppointmentData.title,
        time: timeStr,
        doctor: nextAppointmentData.doctor_name,
        location: nextAppointmentData.location,
      });
      startContinuousAlarm(nextAppointmentData.title, speech);
    }
  }, [currentTime, nextAppointmentData, alarmDismissedId, snoozeUntil, alarmModalOpen, personInfo.name, tCare, startContinuousAlarm]);

  // Vibration helper
  const triggerVibration = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([150, 100, 150]);
  };

  // Generic check-in / action dispatcher
  const handleAction = async (type: string, message: string, dbTable: string, payloadData: any) => {
    setLoading(true);
    unlockAudioContext();
    playSuccessChime();
    triggerVibration();

    const payload = { organization_id: personInfo.organizationId, cared_person_id: params.id, ...payloadData };
    const { data: result, error } = await supabase.from(dbTable).insert(payload).select().single();
    if (error) {
      setLoading(false);
      alert('Falha na comunicação. Verifique sua internet.');
      return;
    }

    setLastAction({ id: (result as any).id, type, table: dbTable });
    setLoading(false);
    setSuccessMsg(`${message}! A família foi avisada.`);

    speakReminder(`${message}! Sua família já sabe.`, params.locale);

    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', personInfo.organizationId)
      .neq('user_id', personInfo.userId);

    if (members && members.length > 0) {
      await supabase.from('notifications').insert(
        members.map((m: any) => ({
          user_id: m.user_id,
          organization_id: personInfo.organizationId,
          type: type === 'emergency' ? 'alert' : 'info',
          title: `Aviso de ${personInfo.name}`,
          message,
          link_url: `/${params.locale}/dashboard`,
        }))
      );
    }
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const undoLastAction = async () => {
    if (!lastAction) return;
    setLoading(true);
    await supabase.from(lastAction.table).delete().eq('id', lastAction.id);
    setLoading(false);
    setLastAction(null);
    setSuccessMsg('Ação cancelada.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Audio Test Button in Header
  const handleTestAudio = () => {
    unlockAudioContext();
    playAlarmChime();
    speakReminder(tCare.demoSpeech(personInfo.name), params.locale);
    setSuccessMsg('🔔 Som e voz ativados com sucesso!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Senior Emotional Well-being check-in
  const handleMoodCheckIn = async (mood: string, label: string) => {
    await handleAction('mood', `Humor registrado: ${label}`, 'check_ins', {
      mood,
      checked_by: personInfo.userId,
      notes: `Humor registrado na tela do idoso: ${label}`,
    });

    if (mood === 'bad' || mood === 'critical') {
      speakReminder(`Fique tranquilo, ${personInfo.name}. Já avisamos sua família para te ligar com carinho.`, params.locale);
    } else {
      speakReminder(`Que ótimo, ${personInfo.name}! É muito bom saber que você está bem.`, params.locale);
    }
  };

  // Senior reaction to family note
  const handleSendReaction = async (reactionType: 'kiss' | 'seen' | 'call', noteText: string) => {
    if (!familyMessage) return;
    setReactedMsgId(familyMessage.id);
    playSuccessChime();
    triggerVibration();

    let replyText = '';
    let voiceSpeech = '';

    if (reactionType === 'kiss') {
      replyText = '❤️ Mandou um beijo cheio de carinho para a família!';
      voiceSpeech = 'Beijo enviado para sua família com muito amor!';
    } else if (reactionType === 'seen') {
      replyText = '👍 Viu o recado da família e confirmou que está tudo bem!';
      voiceSpeech = 'Avisamos a sua família que você já viu o recado!';
    } else {
      replyText = '📞 Pediu uma ligação para bater um papo hoje.';
      voiceSpeech = 'Pedido de ligação enviado! Logo alguém vai te ligar.';
    }

    speakReminder(voiceSpeech, params.locale);
    setSuccessMsg(replyText);

    // 1. Post to care_notes
    await supabase.from('care_notes').insert({
      cared_person_id: params.id,
      organization_id: personInfo.organizationId,
      author_id: personInfo.userId,
      content: `[Resposta de ${personInfo.name}]: ${replyText}`,
      type: 'general',
    });

    // 2. Notify family
    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', personInfo.organizationId)
      .neq('user_id', personInfo.userId);

    if (members && members.length > 0) {
      await supabase.from('notifications').insert(
        members.map((m: any) => ({
          user_id: m.user_id,
          organization_id: personInfo.organizationId,
          type: 'info',
          title: `Carinho de ${personInfo.name}`,
          message: `${personInfo.name} respondeu ao recado: "${noteText.substring(0, 50)}...": ${replyText}`,
          link_url: `/${params.locale}/dashboard`,
        }))
      );
    }

    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // Senior "Quero Conversar" (Soft Call Request)
  const handleRequestCall = async () => {
    unlockAudioContext();
    playSuccessChime();
    triggerVibration();

    speakReminder(`Avisamos seus filhos, ${personInfo.name}! Logo alguém vai te dar uma ligadinha para conversar.`, params.locale);
    setSuccessMsg('📞 Pedido de conversa enviado para a família!');

    await supabase.from('help_requests').insert({
      cared_person_id: params.id,
      organization_id: personInfo.organizationId,
      requested_by: personInfo.userId,
      message: `${personInfo.name} pediu para a família ligar para bater um papo hoje.`,
      status: 'open',
    });

    const { data: members } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', personInfo.organizationId)
      .neq('user_id', personInfo.userId);

    if (members && members.length > 0) {
      await supabase.from('notifications').insert(
        members.map((m: any) => ({
          user_id: m.user_id,
          organization_id: personInfo.organizationId,
          type: 'info',
          title: `📞 ${personInfo.name} quer conversar!`,
          message: `${personInfo.name} tocou em "Quero Conversar". Dê uma ligadinha para ele(a) assim que puder!`,
          link_url: `/${params.locale}/dashboard`,
        }))
      );
    }

    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // Hydration Drink Water Handler
  const handleDrinkWater = async () => {
    unlockAudioContext();
    playSuccessChime();
    const newCount = cupsDrank + 1;
    setCupsDrank(newCount);
    speakReminder(`Parabéns! Mais um copo de água registrado. Você já tomou ${newCount} copos hoje.`, params.locale);

    await handleAction('hydration', `Bebi água (+1 copo)`, 'hydration_logs', {
      amount_ml: 250,
      logged_by: personInfo.userId,
    });
  };

  // Senior Financial Handlers
  const handleSeniorAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seniorExpenseAmount) return;
    setSavingExpense(true);

    const defaultNames: Record<string, string> = {
      medication: 'Farmácia / Medicamento',
      food: 'Mercado / Alimentos',
      appointment: 'Consulta / Exame',
      housing: 'Conta da Casa',
      other: 'Outro Gasto',
    };

    const payload = {
      caredPersonId: params.id,
      category: seniorExpenseCategory,
      description: seniorExpenseDesc.trim() || defaultNames[seniorExpenseCategory] || 'Gasto registrado',
      amount: seniorExpenseAmount,
      date: new Date().toISOString().slice(0, 10),
      paid_by: personInfo.name || 'Próprio Idoso',
      notes: 'Lançado pela tela do idoso',
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerVibration();
        setSuccessMsg(tFin.expenseAdded);
        setExpenseModalOpen(false);
        setSeniorExpenseAmount('');
        setSeniorExpenseDesc('');
        await fetchFinances(params.id);
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        alert(data.error || 'Erro ao registrar gasto.');
      }
    } catch {
      alert('Falha na conexão.');
    } finally {
      setSavingExpense(false);
    }
  };

  const handleSeniorSavePension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seniorPensionInput) return;
    setSavingPension(true);

    try {
      const res = await fetch('/api/finances/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caredPersonId: params.id,
          monthly_income: seniorPensionInput,
          income_source: 'Aposentadoria / Renda Própria',
          income_day: 5,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerVibration();
        setSuccessMsg(tFin.incomeUpdated);
        setSeniorPensionModalOpen(false);
        await fetchFinances(params.id);
        setTimeout(() => setSuccessMsg(''), 6000);
      } else {
        alert(data.error || 'Erro ao atualizar aposentadoria.');
      }
    } catch {
      alert('Falha na conexão.');
    } finally {
      setSavingPension(false);
    }
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString(displayLocale, { style: 'currency', currency: financeData.currency || 'BRL' });

  // ── Find "AGORA" (The single most relevant action happening right now) ──
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todayEvents = events
    .filter(e => isSameDay(e.date, selectedDate))
    .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));

  let currentNowEvent: AgendaEvent | null = null;
  if (selectedDayOffset === 0) {
    // Look for an event scheduled around now (-30 min to +90 min)
    let minDiff = Infinity;
    for (const ev of todayEvents) {
      if (ev.time && !ev.completed) {
        const [h, m] = ev.time.split(':').map(Number);
        const evMinutes = h * 60 + m;
        const diff = evMinutes - nowMinutes;
        if (diff >= -45 && diff <= 120 && Math.abs(diff) < minDiff) {
          minDiff = Math.abs(diff);
          currentNowEvent = ev;
        }
      }
    }
    // If none found in window, pick the next upcoming pending event today
    if (!currentNowEvent) {
      currentNowEvent = todayEvents.find(e => {
        if (!e.time || e.completed) return false;
        const [h, m] = e.time.split(':').map(Number);
        return (h * 60 + m) >= nowMinutes;
      }) || null;
    }
  }

  // Greeting based on time of day
  const hour = currentTime.getHours();
  const greetingText = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const greetingIcon = hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';

  return (
    <div className='min-h-screen bg-stone-100/90 elderly-mode text-stone-900 pb-36'>
      
      {/* ── HEADER: Clear, affectionate, with Audio Unlocker ── */}
      <header className='bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-20 shadow-xs px-4 py-3 sm:px-8'>
        <div className='max-w-4xl mx-auto flex items-center justify-between gap-3'>
          
          <div className='flex items-center gap-3'>
            <div className='h-12 w-12 sm:h-14 sm:w-14 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center shrink-0 border-2 border-emerald-300'>
              <Heart className='h-7 w-7 fill-emerald-600 text-emerald-600' />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <h1 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight'>
                  {greetingIcon} {greetingText}, {personInfo.name}!
                </h1>
                <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800'>
                  <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                  <span className='text-[11px] font-bold text-emerald-800 dark:text-emerald-300 hidden sm:inline'>Família Conectada</span>
                </span>
              </div>
              <p className='text-xs sm:text-sm text-stone-500 font-medium capitalize'>
                {currentTime.toLocaleDateString(displayLocale, { weekday: 'long', day: 'numeric', month: 'long' })}
                {' · '}
                <span className='font-black text-stone-800 dark:text-stone-200 tabular-nums'>
                  {currentTime.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </p>
            </div>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              onClick={handleTestAudio}
              title='Testar som do alarme e voz'
              className='h-10 px-3 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 bg-indigo-50/50 dark:bg-indigo-950/50 hover:bg-indigo-100 rounded-xl text-xs font-bold gap-1.5'
            >
              <Volume2 className='h-4 w-4' />
              <span className='hidden md:inline'>{audioUnlocked ? 'Som Ativo' : 'Testar Som'}</span>
            </Button>
            <Button
              variant='ghost'
              onClick={() => { supabase.auth.signOut(); router.push(`/${params.locale}/care/login`); }}
              className='text-stone-500 hover:text-stone-800 h-10 px-3 text-xs font-bold rounded-xl'
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className='p-4 sm:p-6 max-w-4xl mx-auto space-y-6'>
        
        {/* Success Alert Banner with Undo */}
        {successMsg && (
          <div className='bg-emerald-50 border-3 border-emerald-500 text-emerald-950 p-4 sm:p-5 rounded-3xl flex items-center gap-4 shadow-lg animate-in slide-in-from-top-3'>
            <div className='w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0'>
              <CheckCircle2 className='h-7 w-7' />
            </div>
            <div className='flex-1'>
              <p className='text-lg sm:text-xl font-black leading-tight'>{successMsg}</p>
            </div>
            {lastAction && (
              <Button onClick={undoLastAction} variant='outline' className='h-11 border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-100 text-sm font-bold px-3 rounded-xl gap-1.5'>
                <RotateCcw className='h-4 w-4' /> Desfazer
              </Button>
            )}
          </div>
        )}

        {/* ── 1. MURAL DE CARINHO DA FAMÍLIA (Correio de Afeto) ── */}
        {familyMessage && (
          <div className='bg-gradient-to-br from-rose-50 via-amber-50/70 to-orange-50 border-3 border-rose-200 dark:border-rose-900/60 dark:from-stone-900 dark:via-rose-950/20 dark:to-stone-900 rounded-3xl p-5 sm:p-7 shadow-md space-y-4 animate-in fade-in duration-300'>
            <div className='flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-2xl bg-rose-500 text-white flex items-center justify-center text-2xl shadow-sm'>
                  💌
                </div>
                <div>
                  <span className='inline-block px-2.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 font-black text-xs rounded-full uppercase tracking-wider'>
                    Recado com Carinho da Família
                  </span>
                  <p className='text-xs sm:text-sm text-stone-500 font-bold mt-0.5'>
                    Enviado por <span className='text-stone-800 dark:text-stone-200'>{familyMessage.sender}</span> às {familyMessage.time}
                  </p>
                </div>
              </div>

              <Button
                size='sm'
                variant='outline'
                onClick={() => speakReminder(`Recado de ${familyMessage.sender}: ${familyMessage.text}`, params.locale)}
                className='h-11 px-4 rounded-xl border-rose-300 text-rose-800 dark:text-rose-300 bg-white dark:bg-stone-800 hover:bg-rose-100 font-extrabold text-sm gap-2 shrink-0 shadow-xs'
              >
                <Volume2 className='h-5 w-5 text-rose-600' /> Ouvir Recado
              </Button>
            </div>

            <div className='bg-white/80 dark:bg-stone-800/80 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-4 sm:p-5'>
              <p className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-snug'>
                &ldquo;{familyMessage.text}&rdquo;
              </p>
            </div>

            {/* Quick Responders with 1 Touch */}
            <div className='space-y-1.5'>
              <p className='text-xs font-extrabold text-rose-800 dark:text-rose-400 uppercase tracking-wide'>
                Toque para responder agora com 1 clique:
              </p>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-2.5'>
                <button
                  onClick={() => handleSendReaction('kiss', familyMessage.text)}
                  className={`p-3.5 rounded-2xl border-2 font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs ${
                    reactedMsgId === familyMessage.id
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : 'border-rose-300 bg-white dark:bg-stone-800 hover:bg-rose-100 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  <span className='text-xl'>❤️</span> Mandar Beijo!
                </button>
                <button
                  onClick={() => handleSendReaction('seen', familyMessage.text)}
                  className='p-3.5 rounded-2xl border-2 border-emerald-300 bg-white dark:bg-stone-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-200 font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs'
                >
                  <span className='text-xl'>👍</span> Já Vi, Obrigado!
                </button>
                <button
                  onClick={() => handleSendReaction('call', familyMessage.text)}
                  className='p-3.5 rounded-2xl border-2 border-amber-300 bg-white dark:bg-stone-800 hover:bg-amber-50 text-amber-800 dark:text-amber-200 font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs'
                >
                  <span className='text-xl'>📞</span> Me Liga Quando Puder
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. O CARD DO "AGORA" (Foco Humano no Momento Presente) ── */}
        {selectedDayOffset === 0 && (
          <div className='bg-white dark:bg-stone-900 rounded-3xl border-3 border-indigo-300 dark:border-indigo-700 p-5 sm:p-7 shadow-lg space-y-4 relative overflow-hidden'>
            <div className='absolute top-0 right-0 w-32 h-32 bg-indigo-100 dark:bg-indigo-950/40 rounded-full blur-2xl pointer-events-none' />

            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2.5'>
                <span className='w-3 h-3 rounded-full bg-indigo-600 animate-ping' />
                <span className='text-xs font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-200'>
                  Atividade do Momento · Agora
                </span>
              </div>
              <span className='text-sm font-bold text-stone-500'>
                {currentTime.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {currentNowEvent ? (
              <div className='space-y-4'>
                <div className='flex items-start gap-4'>
                  <div className='w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 border-2 border-indigo-200 flex items-center justify-center text-3xl sm:text-4xl shrink-0'>
                    {currentNowEvent.type === 'medication' ? '💊' : currentNowEvent.type === 'meal' ? '🍽️' : currentNowEvent.type === 'appointment' ? '🩺' : '✅'}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/80 px-2 py-0.5 rounded-lg'>
                        ⏰ {currentNowEvent.time || 'Hoje'}
                      </span>
                    </div>
                    <h2 className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 leading-tight mt-1'>
                      {currentNowEvent.title}
                    </h2>
                    {currentNowEvent.subtitle && (
                      <p className='text-base sm:text-lg font-semibold text-stone-600 dark:text-stone-300 mt-0.5'>
                        {currentNowEvent.subtitle}
                      </p>
                    )}
                  </div>
                </div>

                {/* Big Action Button */}
                <button
                  disabled={loading}
                  onClick={() => {
                    if (currentNowEvent.type === 'medication') {
                      handleAction('medication', `Tomei ${currentNowEvent.title}`, 'medication_confirmations', {
                        medication_id: currentNowEvent.raw?.id || personInfo.medicationId,
                        confirmed_by: personInfo.userId,
                        status: 'taken',
                      });
                    } else if (currentNowEvent.type === 'meal') {
                      handleAction('meal', `Já me alimentei: ${currentNowEvent.title}`, 'meals', {
                        meal_type: currentNowEvent.raw?.meal_type || 'other',
                        description: currentNowEvent.title,
                        logged_by: personInfo.userId,
                      });
                    } else {
                      handleAction('general', `Realizei: ${currentNowEvent.title}`, 'care_notes', {
                        content: `✓ Realizado por ${personInfo.name}: ${currentNowEvent.title}`,
                        type: 'general',
                      });
                    }
                  }}
                  className='w-full h-18 sm:h-20 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl shadow-xl flex items-center justify-center gap-3.5 text-xl sm:text-2xl font-black tracking-wide transition-all active:scale-95 border-b-4 border-emerald-800'
                >
                  <Check className='h-8 w-8 stroke-[3.5]' />
                  <span>
                    {currentNowEvent.type === 'medication' ? '✓ JÁ TOMEI ESSE REMÉDIO' : currentNowEvent.type === 'meal' ? '✓ JÁ ME ALIMENTEI' : '✓ CONCLUIR ESSA ATIVIDADE'}
                  </span>
                </button>
              </div>
            ) : (
              <div className='py-6 text-center space-y-2'>
                <div className='w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-2xl'>
                  🌿
                </div>
                <h3 className='text-xl sm:text-2xl font-black text-stone-800 dark:text-stone-200'>
                  Tudo em dia por agora!
                </h3>
                <p className='text-sm sm:text-base font-semibold text-stone-500 max-w-md mx-auto'>
                  Você já cumpriu as tarefas deste horário. Aproveite para descansar ou tomar um copo de água!
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── 3. A SEGUIR HOJE (Linha do Tempo Simples & Humana) ── */}
        <div className='bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-700 shadow-sm p-5 sm:p-6 space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100 dark:border-stone-800'>
            <div>
              <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2'>
                <Calendar className='h-6 w-6 text-indigo-600' />
                Minha Rotina
              </h2>
              <p className='text-xs sm:text-sm text-stone-500 font-bold capitalize mt-0.5'>
                {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: dateFnsLoc })}
              </p>
            </div>

            {/* 3-day switcher: Ontem, Hoje, Amanhã */}
            <div className='flex items-center gap-1.5 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl'>
              {[
                { offset: -1, label: 'Ontem' },
                { offset: 0, label: 'Hoje' },
                { offset: 1, label: 'Amanhã' },
              ].map(tab => (
                <button
                  key={tab.offset}
                  onClick={() => setSelectedDayOffset(tab.offset)}
                  className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${
                    selectedDayOffset === tab.offset
                      ? 'bg-white dark:bg-stone-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {agendaLoading ? (
            <div className='py-12 flex justify-center'>
              <div className='animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full' />
            </div>
          ) : todayEvents.length === 0 ? (
            <div className='py-10 text-center space-y-2'>
              <p className='text-4xl'>☀️</p>
              <p className='text-lg font-bold text-stone-500'>Nenhum compromisso marcado para este dia</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {todayEvents.map((ev) => {
                const isPast = ev.time && selectedDayOffset === 0 && (() => {
                  const [h, m] = ev.time.split(':').map(Number);
                  return (h * 60 + m) < (nowMinutes - 30);
                })();

                return (
                  <div
                    key={ev.id}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      ev.completed
                        ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-75'
                        : isPast
                        ? 'bg-stone-50 dark:bg-stone-800/40 border-stone-200 dark:border-stone-800'
                        : 'bg-white dark:bg-stone-800 border-indigo-200 dark:border-indigo-800 shadow-xs'
                    }`}
                  >
                    <div className='w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-2xl shrink-0'>
                      {ev.type === 'medication' ? '💊' : ev.type === 'meal' ? '🍽️' : ev.type === 'appointment' ? '🩺' : '✅'}
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-black text-stone-700 dark:text-stone-300'>
                          ⏰ {ev.time || 'Horário livre'}
                        </span>
                        {ev.completed && (
                          <span className='text-[10px] font-extrabold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded-full'>
                            ✓ Realizado
                          </span>
                        )}
                      </div>
                      <p className={`text-lg font-bold leading-tight truncate ${ev.completed ? 'line-through text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}>
                        {ev.title}
                      </p>
                      {ev.subtitle && (
                        <p className='text-xs text-stone-500 truncate'>{ev.subtitle}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── 4. BOTÃO "QUERO CONVERSAR" (Sem ser SOS de pânico) ── */}
        <button
          onClick={handleRequestCall}
          className='w-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-700 text-white p-5 sm:p-6 rounded-3xl flex items-center justify-between shadow-lg active:scale-95 transition-all border-b-4 border-amber-700'
        >
          <div className='flex items-center gap-4'>
            <div className='w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl shrink-0'>
              📞
            </div>
            <div className='text-left'>
              <span className='text-2xl sm:text-3xl font-black block leading-none'>
                Quero Conversar
              </span>
              <span className='text-xs sm:text-sm font-medium text-amber-100 mt-1 block'>
                Avisar seus filhos para te darem uma ligadinha hoje
              </span>
            </div>
          </div>
          <span className='bg-white text-orange-800 px-4 py-2.5 rounded-2xl text-sm font-black hidden sm:inline shadow-xs'>
            Avisar Família
          </span>
        </button>

        {/* ── 5. TERMÔMETRO DE BEM-ESTAR EMOCIONAL ── */}
        <div className='bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-5 sm:p-6 shadow-sm space-y-4'>
          <div className='flex items-center gap-3'>
            <div className='w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center text-2xl shrink-0'>
              💛
            </div>
            <div>
              <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight'>
                Como você está se sentindo agora?
              </h2>
              <p className='text-xs sm:text-sm text-stone-500 font-medium'>
                Toque na carinha que melhor combina com seu estado de espírito
              </p>
            </div>
          </div>

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-1'>
            <button
              onClick={() => handleMoodCheckIn('great', 'Muito Bem!')}
              className='bg-emerald-50/70 hover:bg-emerald-100/90 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-800 p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center shadow-xs'
            >
              <span className='text-4xl sm:text-5xl'>😄</span>
              <span className='text-base sm:text-lg font-black text-emerald-900 dark:text-emerald-200'>Muito Bem!</span>
              <span className='text-[11px] font-semibold text-emerald-700'>Com energia</span>
            </button>

            <button
              onClick={() => handleMoodCheckIn('good', 'Tranquilo(a)')}
              className='bg-sky-50/70 hover:bg-sky-100/90 dark:bg-sky-950/30 border-2 border-sky-300 dark:border-sky-800 p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center shadow-xs'
            >
              <span className='text-4xl sm:text-5xl'>😊</span>
              <span className='text-base sm:text-lg font-black text-sky-900 dark:text-sky-200'>Tranquilo(a)</span>
              <span className='text-[11px] font-semibold text-sky-700'>Tudo calmo</span>
            </button>

            <button
              onClick={() => handleMoodCheckIn('okay', 'Mais ou Menos')}
              className='bg-amber-50/70 hover:bg-amber-100/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center shadow-xs'
            >
              <span className='text-4xl sm:text-5xl'>😐</span>
              <span className='text-base sm:text-lg font-black text-amber-900 dark:text-amber-200'>Mais ou Menos</span>
              <span className='text-[11px] font-semibold text-amber-700'>Dia comum</span>
            </button>

            <button
              onClick={() => handleMoodCheckIn('bad', 'Com dor / Cansado(a)')}
              className='bg-rose-50/70 hover:bg-rose-100/90 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-800 p-4 rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 text-center shadow-xs'
            >
              <span className='text-4xl sm:text-5xl'>😔</span>
              <span className='text-base sm:text-lg font-black text-rose-900 dark:text-rose-200'>Com dor</span>
              <span className='text-[11px] font-semibold text-rose-700'>Quero carinho</span>
            </button>
          </div>
        </div>

        {/* ── 6. AÇÕES RÁPIDAS DE ROTINA (Água, Remédio, Refeição, Sono) ── */}
        <div className='bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-700 p-5 sm:p-6 shadow-sm space-y-4'>
          <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100'>
            Ações Rápidas do Dia
          </h2>

          <div className='grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4'>
            {/* Bebi Água */}
            <button
              disabled={loading}
              onClick={handleDrinkWater}
              className='bg-sky-50 dark:bg-sky-950/30 hover:bg-sky-100 border-2 border-sky-300 dark:border-sky-800 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 text-center shadow-xs'
            >
              <div className='w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-2xl'>
                💧
              </div>
              <div>
                <span className='text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 block'>Bebi Água</span>
                <span className='text-xs font-bold text-sky-700 dark:text-sky-300'>+1 copo ({cupsDrank}/8 hoje)</span>
              </div>
            </button>

            {/* Tomei Remédio */}
            <button
              disabled={loading || !personInfo.medicationId}
              onClick={() => handleAction('medication', 'Medicamento tomado!', 'medication_confirmations', {
                medication_id: personInfo.medicationId,
                confirmed_by: personInfo.userId,
                status: 'taken',
              })}
              className='bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 border-2 border-emerald-300 dark:border-emerald-800 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 text-center shadow-xs disabled:opacity-50'
            >
              <div className='w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-2xl'>
                💊
              </div>
              <div>
                <span className='text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 block'>Tomei Remédio</span>
                <span className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>Horário cumprido</span>
              </div>
            </button>

            {/* Já Almocei / Comi */}
            <button
              disabled={loading}
              onClick={() => handleAction('meal', 'Refeição feita!', 'meals', {
                meal_type: 'other',
                logged_by: personInfo.userId,
              })}
              className='bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 border-2 border-amber-300 dark:border-amber-800 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 text-center shadow-xs'
            >
              <div className='w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-2xl'>
                🍽️
              </div>
              <div>
                <span className='text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 block'>Já Me Alimentei</span>
                <span className='text-xs font-bold text-amber-700 dark:text-amber-300'>Refeição feita</span>
              </div>
            </button>

            {/* Acordei / Vou Dormir */}
            <button
              disabled={loading}
              onClick={() => {
                if (hour < 15) {
                  handleAction('wake', 'Bom dia! Avisamos que você acordou', 'check_ins', { mood: 'great', checked_by: personInfo.userId, notes: 'Acordou' });
                } else {
                  handleAction('sleep', 'Boa noite! Registramos seu descanso', 'check_ins', { mood: 'good', checked_by: personInfo.userId, notes: 'Foi dormir' });
                }
              }}
              className='bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 border-2 border-indigo-300 dark:border-indigo-800 p-4 sm:p-5 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95 text-center shadow-xs'
            >
              <div className='w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-2xl'>
                {hour < 15 ? '☀️' : '🌙'}
              </div>
              <div>
                <span className='text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 block'>
                  {hour < 15 ? 'Acordei' : 'Vou Dormir'}
                </span>
                <span className='text-xs font-bold text-indigo-700 dark:text-indigo-300'>
                  {hour < 15 ? 'Bom dia família!' : 'Boa noite família!'}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* ── 7. AUTONOMIA FINANCEIRA DO IDOSO (Saldo e Gastos) ── */}
        <div className='bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 dark:from-stone-900 dark:via-emerald-950/20 dark:to-stone-900 rounded-3xl border-3 border-emerald-300 dark:border-emerald-700 p-5 sm:p-6 shadow-md space-y-4'>
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center text-2xl shadow-sm'>
                <Wallet className='h-6 w-6' />
              </div>
              <div>
                <span className='inline-block px-2.5 py-0.5 bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 font-extrabold text-xs rounded-full uppercase tracking-wider'>
                  {tFin.selfManagementTitle}
                </span>
                <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight mt-0.5'>
                  {tFin.availableBalance}
                </h2>
              </div>
            </div>
            <div className='text-left sm:text-right'>
              <p className={`text-3xl sm:text-4xl font-black tabular-nums leading-none ${financeData.balance < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-800 dark:text-emerald-300'}`}>
                {formatCurrency(financeData.balance)}
              </p>
              <p className='text-xs sm:text-sm font-bold text-stone-500 dark:text-stone-400 mt-1'>
                {financeData.monthlyIncome > 0 ? (
                  <>Renda: <span className='text-emerald-700 font-extrabold'>{formatCurrency(financeData.monthlyIncome)}</span> · Gastos: <span className='text-amber-700 font-extrabold'>{formatCurrency(financeData.totalExpenses)}</span></>
                ) : (
                  'Defina sua aposentadoria para abater seus gastos'
                )}
              </p>
            </div>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60'>
            <button
              onClick={() => setExpenseModalOpen(true)}
              className='bg-emerald-600 hover:bg-emerald-700 text-white p-3.5 sm:p-4 rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all text-center'
            >
              <Plus className='h-5 w-5 stroke-[3]' />
              <span className='text-lg sm:text-xl font-black'>{tFin.addExpense}</span>
            </button>
            <button
              onClick={() => setSeniorPensionModalOpen(true)}
              className='bg-white dark:bg-stone-800 border-2 border-emerald-400 dark:border-emerald-600 hover:bg-emerald-50 text-emerald-900 dark:text-emerald-200 p-3.5 sm:p-4 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all text-center font-bold'
            >
              <Landmark className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
              <span className='text-base sm:text-lg font-extrabold'>{tFin.editIncome}</span>
            </button>
          </div>
        </div>

      </main>

      {/* ── 8. BOTÃO DE EMERGÊNCIA / SOS FIXO NO RODAPÉ ── */}
      {enabledModules.has('checkin_btn_emergency') && (
        <div className='fixed bottom-0 left-0 right-0 p-4 sm:p-5 bg-gradient-to-t from-white dark:from-stone-950 via-white/95 dark:via-stone-950/95 to-transparent z-30'>
          <div className='max-w-4xl mx-auto'>
            <button
              disabled={loading}
              onClick={() => {
                if (window.confirm('ALERTA DE EMERGÊNCIA! Deseja enviar um aviso urgente com som para toda a família agora?')) {
                  handleAction('emergency', 'EMERGÊNCIA! Preciso de socorro imediato', 'emergency_events', {
                    reported_by: personInfo.userId,
                    description: 'Emergência acionada pela tela do idoso',
                    severity: 'critical',
                  });
                }
              }}
              className='w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-4 sm:p-5 rounded-3xl flex items-center justify-center gap-4 shadow-xl transition-all active:scale-95 border-b-4 border-red-800'
            >
              <div className='w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center animate-ping shrink-0'>
                <AlertCircle className='h-6 w-6 sm:h-7 sm:w-7 text-white' />
              </div>
              <span className='text-xl sm:text-3xl font-black tracking-wider uppercase'>EMERGÊNCIA / SOS</span>
            </button>
          </div>
        </div>
      )}

      {/* ── 9. MODAL DE ALARME / DESPERTADOR CONTÍNUO (Com Som em Loop) ── */}
      {alarmModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-amber-400 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-pulse'>
            
            <div className='mx-auto w-24 h-24 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 flex items-center justify-center'>
              <BellRing className='h-14 w-14 text-amber-600 dark:text-amber-400 animate-bounce' />
            </div>

            <div>
              <span className='inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-extrabold text-sm rounded-full tracking-wider uppercase mb-2'>
                {tCare.appointmentAlarmTitle}
              </span>
              <h2 className='text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 leading-tight'>
                {nextAppointmentData ? nextAppointmentData.title : tCare.demoTitle}
              </h2>
              <p className='text-lg font-bold text-amber-700 dark:text-amber-400 mt-2'>
                {nextAppointmentData ? `${tCare.scheduledFor} ${format(new Date(nextAppointmentData.starts_at), "dd/MM 'às' HH:mm", { locale: dateFnsLoc })}` : tCare.demoText}
              </p>
              {nextAppointmentData?.doctor_name && (
                <p className='text-base font-semibold text-stone-700 dark:text-stone-300 mt-1'>
                  {tCare.doctorLabel}: {nextAppointmentData.doctor_name}
                </p>
              )}
              {nextAppointmentData?.location && (
                <p className='text-sm text-stone-500 dark:text-stone-400 mt-0.5'>
                  {tCare.locationLabel}: {nextAppointmentData.location}
                </p>
              )}
            </div>

            <div className='space-y-3 pt-2'>
              <Button
                type='button'
                onClick={() => {
                  stopContinuousAlarm();
                  if (nextAppointmentData) setAlarmDismissedId(nextAppointmentData.id);
                }}
                className='w-full h-18 text-2xl font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl active:scale-95 transition-transform'
              >
                {tCare.confirmSeen}
              </Button>

              {nextAppointmentData && (
                <Button
                  type='button'
                  onClick={() => {
                    stopContinuousAlarm();
                    setSnoozeUntil(new Date(Date.now() + 10 * 60 * 1000));
                  }}
                  variant='outline'
                  className='w-full h-14 text-lg font-bold text-stone-600 border-2 border-stone-300 hover:bg-stone-100 rounded-2xl'
                >
                  {tCare.snooze10m}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 10. MODAIS DE GASTO E APOSENTADORIA ── */}
      {expenseModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-emerald-400 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl'>
                <DollarSign className='h-7 w-7 stroke-[3]' />
              </div>
              <div>
                <h3 className='text-2xl font-black text-stone-900 dark:text-stone-100'>{tFin.addExpense}</h3>
                <p className='text-xs text-stone-500 font-medium'>O valor será abatido do seu saldo deste mês.</p>
              </div>
            </div>

            <form onSubmit={handleSeniorAddExpense} className='space-y-4'>
              <div>
                <label className='block text-sm font-black text-stone-700 dark:text-stone-300 mb-1'>Valor Gasto (R$) *</label>
                <input
                  type='number' step='0.01' required autoFocus placeholder='0.00'
                  value={seniorExpenseAmount} onChange={(e) => setSeniorExpenseAmount(e.target.value)}
                  className='w-full text-3xl font-black p-3.5 rounded-2xl border-2 border-emerald-300 focus:border-emerald-600 bg-emerald-50/50 dark:bg-stone-800 dark:text-white outline-hidden text-center'
                />
              </div>

              <div>
                <label className='block text-sm font-black text-stone-700 dark:text-stone-300 mb-2'>O que você comprou / pagou?</label>
                <div className='grid grid-cols-2 gap-2'>
                  {[
                    { key: 'medication', label: '💊 Farmácia' },
                    { key: 'food', label: '🛒 Mercado' },
                    { key: 'appointment', label: '🩺 Médico' },
                    { key: 'housing', label: '🏠 Conta da Casa' },
                  ].map((cat) => (
                    <button
                      type='button' key={cat.key} onClick={() => setSeniorExpenseCategory(cat.key)}
                      className={`p-3 rounded-xl border-2 text-sm font-bold transition-all text-left ${seniorExpenseCategory === cat.key ? 'border-emerald-500 bg-emerald-100/70 text-emerald-900 dark:text-emerald-200' : 'border-stone-200 hover:border-emerald-300 text-stone-700 dark:text-stone-300'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold text-stone-500 dark:text-stone-400 mb-1'>Detalhe (opcional):</label>
                <input
                  type='text' placeholder='Ex: Remédio de pressão, Pão...'
                  value={seniorExpenseDesc} onChange={(e) => setSeniorExpenseDesc(e.target.value)}
                  className='w-full text-base font-semibold p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-white outline-hidden'
                />
              </div>

              <div className='flex gap-3 pt-2'>
                <Button type='button' variant='outline' onClick={() => setExpenseModalOpen(false)} className='flex-1 h-14 text-base font-bold rounded-2xl border-stone-300'>
                  Cancelar
                </Button>
                <Button type='submit' disabled={savingExpense} className='flex-2 h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg active:scale-95'>
                  {savingExpense ? 'Salvando...' : '✓ Salvar e Abater'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {seniorPensionModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-emerald-400 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200'>
            <div className='flex items-center gap-3'>
              <div className='w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl'>
                <Landmark className='h-7 w-7' />
              </div>
              <div>
                <h3 className='text-2xl font-black text-stone-900 dark:text-stone-100'>{tFin.editIncome}</h3>
                <p className='text-xs text-stone-500 font-medium'>Quanto você recebe por mês de aposentadoria ou renda?</p>
              </div>
            </div>

            <form onSubmit={handleSeniorSavePension} className='space-y-4'>
              <div>
                <label className='block text-sm font-black text-stone-700 dark:text-stone-300 mb-1'>Valor Mensal Recebido (R$) *</label>
                <input
                  type='number' step='0.01' required autoFocus placeholder='Ex: 3500.00'
                  value={seniorPensionInput} onChange={(e) => setSeniorPensionInput(e.target.value)}
                  className='w-full text-3xl font-black p-3.5 rounded-2xl border-2 border-emerald-300 focus:border-emerald-600 bg-emerald-50/50 dark:bg-stone-800 dark:text-white outline-hidden text-center'
                />
              </div>

              <div className='flex gap-3 pt-2'>
                <Button type='button' variant='outline' onClick={() => setSeniorPensionModalOpen(false)} className='flex-1 h-14 text-base font-bold rounded-2xl border-stone-300'>
                  Cancelar
                </Button>
                <Button type='submit' disabled={savingPension} className='flex-2 h-14 text-lg font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg active:scale-95'>
                  {savingPension ? 'Salvando...' : '✓ Salvar Minha Renda'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
