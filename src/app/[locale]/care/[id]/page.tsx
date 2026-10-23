'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CognitiveGamesHub } from '@/components/games/CognitiveGamesHub';
import { NinaAIChatbot } from '@/components/nina/NinaAIChatbot';
import { 
  Gamepad2,
  Heart, AlertCircle, Pill, Coffee, Droplet, CheckCircle2,
  Calendar, BellRing, RotateCcw, Sun, Moon, Activity as ActivityIcon,
  Clock, Volume2, ChevronLeft, ChevronRight,
  Wallet, Plus, Landmark, DollarSign, Phone,
  Sparkles, Check, MessageSquareHeart,
  Home, Zap, ListTodo, ShieldAlert,
} from 'lucide-react';
import { format, isSameDay, isToday, addDays } from 'date-fns';
import { getDateFnsLocale, getSpeechSynthesisLang, getCareTexts, getFinanceTexts } from '@/lib/i18n/care-translations';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/shared/ThemeToggle';

// ── Shared Audio Engine (Web Audio API Synthesizer) ──
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any;
}

interface FamilyMessage {
  id: string;
  sender: string;
  text: string;
  time: string;
  fullDate: Date;
}

type MobileTab = 'home' | 'routine' | 'games' | 'actions' | 'finances';

export default function ElderlyViewPage({ params }: { params: { id: string; locale: string } }) {
  // Stable client instance across renders to prevent infinite re-fetching loops
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { theme } = useTheme(); // consumed to keep ThemeContext reactive
  const tCare = getCareTexts(params.locale);
  const tFin = getFinanceTexts(params.locale);
  const dateFnsLoc = getDateFnsLocale(params.locale);
  const displayLocale = params.locale === 'en' ? 'en-US' : params.locale;

  // Active Mobile Tab (Native App Navigation)
  const [activeTab, setActiveTab] = useState<MobileTab>('home');

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // 30-Day Free Trial State (Loaded from organization entitlements)
  const [trialInfo, setTrialInfo] = useState<{ isTrial: boolean; daysRemaining: number } | null>(null);
  
  // Date navigation for routine: simple 3-day switcher (Ontem, Hoje, Amanhã)
  const [selectedDayOffset, setSelectedDayOffset] = useState<number>(0);
  const selectedDate = useMemo(() => addDays(new Date(), selectedDayOffset), [selectedDayOffset]);
  const [routineFilter, setRoutineFilter] = useState<'all' | 'medication' | 'meal' | 'appointment' | 'task'>('all');

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    platformWhatsAppNumber: '15556657789', // default Meta test number
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
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [seniorPensionModalOpen, setSeniorPensionModalOpen] = useState(false);
  const [seniorExpenseAmount, setSeniorExpenseAmount] = useState('');
  const [seniorExpenseCategory, setSeniorExpenseCategory] = useState('medication');
  const [seniorExpenseDesc, setSeniorExpenseDesc] = useState('');
  const [seniorPensionInput, setSeniorPensionInput] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [savingPension, setSavingPension] = useState(false);
  const [sosModalOpen, setSosModalOpen] = useState(false);
  const [sendingSos, setSendingSos] = useState(false);
  const [conversationModalOpen, setConversationModalOpen] = useState(false);
  const [sendingCallRequest, setSendingCallRequest] = useState(false);
  const [ninaModalOpen, setNinaModalOpen] = useState(false);

  // Clock tick (every 30 seconds to avoid wasteful render cascades)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
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

  // Haptic Feedback for Mobile Ergonomics
  const triggerHaptic = (pattern: number | number[] = 35) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch {
        // ignore
      }
    }
  };

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

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      if (alarmIntervalRef.current) clearInterval(alarmIntervalRef.current);
      if (alarmSpeechIntervalRef.current) clearInterval(alarmSpeechIntervalRef.current);
    };
  }, []);

  // Confirmation of SOS
  const handleConfirmSos = async () => {
    setSendingSos(true);
    unlockAudioContext();
    playAlarmChime();
    triggerHaptic([150, 100, 150, 100, 200]);

    try {
      await fetch('/api/care/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cared_person_id: params.id,
          type: 'emergency',
          message: `Emergência acionada pelo mini app do idoso (${personInfo.name})`,
        }),
      });
    } catch (e) {
      console.error('Error sending SOS alert:', e);
    }

    setSendingSos(false);
    setSosModalOpen(false);
    setSuccessMsg('🚨 ALERTA DE EMERGÊNCIA ENVIADO! Toda a família e cuidadores foram alertados.');
    speakReminder(`Alerta de emergência enviado, ${personInfo.name}! Sua família foi avisada agora mesmo e já está ciente.`, params.locale);
    setTimeout(() => setSuccessMsg(''), 10000);
  };

  // ── Parallelized High-Performance Initial Data Fetching (Zero Lag) ──
  useEffect(() => {
    let isCancelled = false;

    async function loadAllData() {
      try {
        // Step 1: User authentication & cared person info (fast baseline)
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/' + params.locale + '/care/login');
          return;
        }

        const { data: person, error: pErr } = await supabase
          .from('cared_people')
          .select('full_name, organization_id, photo_url')
          .eq('id', params.id)
          .single();

        if (!person || pErr) {
          router.push('/' + params.locale + '/care/login');
          return;
        }

        if (isCancelled) return;

        const orgId = person.organization_id;
        const firstName = person.full_name.split(' ')[0];

        // Step 2: Parallel Batch Request (All 8 secondary calls in a single network roundtrip)
        const dateFrom = new Date(); dateFrom.setDate(dateFrom.getDate() - 14);
        const dateTo = new Date(); dateTo.setDate(dateTo.getDate() + 30);
        const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
        const mealFrom = new Date(); mealFrom.setDate(mealFrom.getDate() - 7);

        const [
          contactsRes,
          medsRes,
          apptRes,
          orgRes,
          settingsRes,
          entitlementsRes,
          apptsListRes,
          notesRes,
          directMealsRes,
          tasksRes,
          hydroRes,
          humanNotesRes,
          financesRes
        ] = await Promise.all([
          // 1. Emergency phone
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('emergency_contacts').select('phone').eq('cared_person_id', params.id).limit(1),
          // 2. Active meds for quick action
          supabase.from('medications').select('id,name,dosage,unit,medication_schedules(id,time_of_day)').eq('cared_person_id', params.id).eq('is_active', true),
          // 3. Next appointment
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('appointments').select('id,title,starts_at,doctor_name,location,description').eq('cared_person_id', params.id).gte('starts_at', new Date(Date.now() - 45 * 60 * 1000).toISOString()).order('starts_at', { ascending: true }).limit(1).maybeSingle(),
          // 4. Org settings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('organizations').select('settings').eq('id', orgId).maybeSingle(),
          // 5. Cared person monitoring settings
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('cared_person_monitoring_settings').select('enabled,monitoring_definitions(code)').eq('cared_person_id', params.id),
          // 6. Entitlements & 30-day trial status
          fetch(`/api/billing/entitlements?organizationId=${orgId}`).then(r => r.json()).catch(() => null),
          // 7. Appointments list
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('appointments').select('id,title,starts_at,doctor_name,location,status').eq('cared_person_id', params.id).gte('starts_at', dateFrom.toISOString()).lte('starts_at', dateTo.toISOString()).order('starts_at', { ascending: true }),
          // 8. Care notes for meals
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('care_notes').select('id,content,created_at').eq('cared_person_id', params.id).ilike('content', '%refei%').gte('created_at', mealFrom.toISOString()).order('created_at', { ascending: false }).limit(30),
          // 9. Direct meals
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('meals').select('id,meal_type,description,notes,consumed_at,created_at').eq('cared_person_id', params.id).gte('created_at', mealFrom.toISOString()).order('created_at', { ascending: false }).limit(30),
          // 10. Tasks
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('tasks').select('id,title,due_date,status,priority').eq('cared_person_id', params.id).order('due_date', { ascending: true }).limit(30),
          // 11. Hydration today
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('hydration_logs').select('amount_ml').eq('cared_person_id', params.id).gte('created_at', todayStart.toISOString()),
          // 12. Human care notes (Mural de Afeto)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('care_notes').select('id,content,created_at,author_id').eq('cared_person_id', params.id).order('created_at', { ascending: false }).limit(20),
          // 13. Financial expenses & profile
          fetch(`/api/expenses?caredPersonId=${params.id}`).then(r => r.json()).catch(() => null),
        ]);

        if (isCancelled) return;

        // Process Trial Entitlements Info
        if (entitlementsRes?.entitlements) {
          const ent = entitlementsRes.entitlements;
          if (ent.isTrial) {
            setTrialInfo({
              isTrial: true,
              daysRemaining: ent.daysRemaining ?? 30,
            });
          }
        }

        // Process Primary Phone
        let pPhone = '';
        if (contactsRes?.data && contactsRes.data[0]?.phone) {
          pPhone = contactsRes.data[0].phone;
        }

        // Process Next Medication
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allMeds: any[] = (medsRes.data as any) || [];
        let nextMed = null;
        let medId = null;
        if (allMeds.length > 0) {
          nextMed = allMeds[0].name;
          medId = allMeds[0].id;
        }

        // Process Next Appointment
        if (apptRes?.data) {
          setNextAppointmentData(apptRes.data);
        } else {
          setNextAppointmentData(null);
        }

        // Process Enabled Modules
        const enabledSet = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const orgSettings = (orgRes?.data?.settings as any) || {};
        const personConfig = orgSettings.monitoring?.[params.id];
        if (personConfig && Array.isArray(personConfig.enabled_codes)) {
          personConfig.enabled_codes.forEach((c: string) => enabledSet.add(c));
        } else if (settingsRes?.data && settingsRes.data.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settingsRes.data.forEach((row: any) => {
            const code = row.monitoring_definitions?.code;
            if (row.enabled && code) enabledSet.add(code);
          });
        } else {
          ['meds_scheduled','schedule_appointments','checkin_btn_im_well','checkin_btn_need_help','checkin_btn_took_med','checkin_btn_ate','checkin_btn_drank_water','checkin_btn_emergency'].forEach((c) => enabledSet.add(c));
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
          nextAppointment: apptRes?.data?.title || null,
          primaryPhone: pPhone,
          platformWhatsAppNumber: orgSettings.whatsapp_platform_number || '15556657789',
        });

        // Process Agenda Events
        const allEvents: AgendaEvent[] = [];

        // Appointments
        (apptsListRes?.data || []).forEach((a: any) => {
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

        // Medications
        allMeds.forEach((med: any) => {
          const schedules = med.medication_schedules || [];
          if (schedules.length === 0) {
            const d = new Date(); d.setHours(8, 0, 0, 0);
            allEvents.push({
              id: 'med-' + med.id + '-notime',
              title: `${med.name} ${med.dosage || ''}${med.unit || ''}`.trim(),
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
                  title: `${med.name} ${med.dosage || ''}${med.unit || ''}`.trim(),
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

        // Meals
        const emojiMap: Record<string, string> = { breakfast: '🥣 Café da Manhã', lunch: '🥗 Almoço', snack: '🍎 Lanche da Tarde', dinner: '🍲 Jantar', supper: '🥛 Ceia', other: '🍽️ Refeição' };
        const seenCareMeals = new Set<string>();

        (notesRes?.data || []).forEach((n: any) => {
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

        (directMealsRes?.data || []).forEach((m: any) => {
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

        // Tasks
        (tasksRes?.data || []).forEach((t: any) => {
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

        setEvents(allEvents);
        setAgendaLoading(false);

        // Process Hydration
        const totalMl = (hydroRes?.data || []).reduce((acc: number, curr: any) => acc + (curr.amount_ml || 250), 0);
        setCupsDrank(Math.round(totalMl / 250));

        // Process Family Notes (Mural de Afeto)
        const rawNotes = humanNotesRes?.data || [];
        const humanNotes = rawNotes.filter((n: any) => {
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
          setFamilyMessage({
            id: 'welcome',
            sender: 'Sua Família',
            text: `Que seu dia seja maravilhoso e abençoado, ${firstName}! Estamos sempre conectados cuidando de você com todo o amor ❤️`,
            time: format(new Date(), 'HH:mm'),
            fullDate: new Date(),
          });
        }

        // Process Finances
        if (financesRes?.success && financesRes?.summary) {
          setFinanceData({
            monthlyIncome: financesRes.summary.monthlyIncome || 0,
            totalExpenses: financesRes.summary.totalExpenses || 0,
            balance: financesRes.summary.balance || 0,
            currency: financesRes.summary.currency || 'BRL',
            incomeSource: financesRes.financialProfile?.income_source || 'Aposentadoria INSS',
          });
          if (financesRes.financialProfile?.monthly_income) {
            setSeniorPensionInput(String(financesRes.financialProfile.monthly_income));
          }
        }
      } catch (err) {
        console.error('[CarePage] Error loading data in parallel:', err);
      }
    }

    loadAllData();

    return () => {
      isCancelled = true;
    };
  }, [params.id, params.locale, router, supabase]);

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

  // Generic check-in / action dispatcher
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleAction = async (type: string, message: string, dbTable: string, payloadData: any) => {
    setLoading(true);
    unlockAudioContext();
    playSuccessChime();
    triggerHaptic(40);

    let recordedId: string | null = null;
    let targetTable = dbTable;

    try {
      const res = await fetch('/api/care/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cared_person_id: params.id,
          type,
          message,
          payload: payloadData,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        recordedId = data.id;
        targetTable = data.table || dbTable;
      } else {
        // Fallback to client-side insert if API returned error
        const payload = { organization_id: personInfo.organizationId, cared_person_id: params.id, ...payloadData };
        const { data: result } = await supabase.from(dbTable).insert(payload).select().maybeSingle();
        if (result) recordedId = (result as any).id;
      }
    } catch {
      try {
        const payload = { organization_id: personInfo.organizationId, cared_person_id: params.id, ...payloadData };
        const { data: result } = await supabase.from(dbTable).insert(payload).select().maybeSingle();
        if (result) recordedId = (result as any).id;
      } catch {}
    }

    if (recordedId) {
      setLastAction({ id: recordedId, type, table: targetTable });
    }
    setLoading(false);
    setSuccessMsg(`${message}! A família foi avisada.`);
    speakReminder(`${message}! Sua família já sabe.`, params.locale);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const undoLastAction = async () => {
    if (!lastAction) return;
    setLoading(true);
    try {
      await fetch(`/api/care/action?table=${lastAction.table}&id=${lastAction.id}`, {
        method: 'DELETE',
      });
    } catch {
      await supabase.from(lastAction.table).delete().eq('id', lastAction.id);
    }
    setLoading(false);
    setLastAction(null);
    setSuccessMsg('Ação cancelada.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Read aloud current tab contents
  const handleReadAloudCurrentTab = () => {
    unlockAudioContext();
    triggerHaptic(30);
    if (activeTab === 'home') {
      let speech = `Olá, ${personInfo.name}! `;
      if (currentNowEvent) {
        speech += `No momento, sua atividade principal é: ${currentNowEvent.title}, agendada para ${currentNowEvent.time || 'agora'}. `;
      } else {
        speech += `Todas as suas atividades deste horário estão concluídas. `;
      }
      if (familyMessage) {
        speech += `Você tem um recado da família de ${familyMessage.sender}: ${familyMessage.text}. `;
      }
      speech += `Você já tomou ${cupsDrank} copos de água hoje.`;
      speakReminder(speech, params.locale);
    } else if (activeTab === 'routine') {
      const dayLabel = selectedDayOffset === 0 ? 'Hoje' : selectedDayOffset === 1 ? 'Amanhã' : 'Ontem';
      const dayEvents = filteredEvents;
      if (dayEvents.length === 0) {
        speakReminder(`Você não tem nenhum compromisso marcado para ${dayLabel}.`, params.locale);
      } else {
        const eventsDesc = dayEvents.map(e => `${e.title}${e.time ? ` às ${e.time}` : ''}`).join('. ');
        speakReminder(`Sua rotina de ${dayLabel} tem ${dayEvents.length} atividades: ${eventsDesc}.`, params.locale);
      }
    } else if (activeTab === 'games') {
      speakReminder('Aqui estão seus jogos cognitivos: Jogo da Forca, Memória, Caça-Palavras, Trivia Brasil, Genius e muito mais. Toque em um jogo para exercitar a mente!', params.locale);
    } else if (activeTab === 'actions') {
      speakReminder(`Aqui você pode registrar o que fez hoje: beber água, tomar remédio, refeição, ou avisar como está se sentindo.`, params.locale);
    } else if (activeTab === 'finances') {
      speakReminder(`Seu saldo disponível para este mês é de ${formatCurrency(financeData.balance)}.`, params.locale);
    }
  };

  // Senior Emotional Well-being check-in
  const handleMoodCheckIn = async (mood: string, label: string) => {
    await handleAction('mood', `Humor: ${label}`, 'check_ins', {
      mood,
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
    triggerHaptic(50);

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

    try {
      await fetch('/api/care/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cared_person_id: params.id,
          type: 'reaction',
          message: replyText,
          payload: { content: `[Resposta de ${personInfo.name}]: ${replyText}` },
        }),
      });
    } catch {}

    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // Senior "Quero Conversar" (Soft Call Request)
  const handleRequestCall = async () => {
    unlockAudioContext();
    playSuccessChime();
    triggerHaptic(40);
    setConversationModalOpen(true);
    setSendingCallRequest(true);

    speakReminder(`Avisamos sua família, ${personInfo.name}! Logo alguém vai te dar uma ligadinha para conversar.`, params.locale);
    setSuccessMsg('📞 Pedido de conversa enviado para a família!');

    try {
      await fetch('/api/care/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cared_person_id: params.id,
          type: 'help',
          message: `${personInfo.name} tocou em "Quero Conversar" e pediu para a família entrar em contato.`,
        }),
      });
    } catch (e) {
      console.error('Error sending conversation alert:', e);
    } finally {
      setSendingCallRequest(false);
    }

    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // Hydration Drink Water Handler
  const handleDrinkWater = async () => {
    unlockAudioContext();
    playSuccessChime();
    triggerHaptic([40, 60]);
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
      notes: 'Lançado pelo mini app do idoso',
    };

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        triggerHaptic(40);
        setSuccessMsg(tFin.expenseAdded);
        setExpenseModalOpen(false);
        setSeniorExpenseAmount('');
        setSeniorExpenseDesc('');
        // Re-fetch finances in background
        fetch(`/api/expenses?caredPersonId=${params.id}`)
          .then(r => r.json())
          .then(data => {
            if (data?.summary) {
              setFinanceData(prev => ({
                ...prev,
                totalExpenses: data.summary.totalExpenses || 0,
                balance: data.summary.balance || 0,
              }));
            }
          })
          .catch(() => {});
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
        triggerHaptic(40);
        setSuccessMsg(tFin.incomeUpdated);
        setSeniorPensionModalOpen(false);
        // Re-fetch finances in background
        fetch(`/api/expenses?caredPersonId=${params.id}`)
          .then(r => r.json())
          .then(data => {
            if (data?.summary) {
              setFinanceData(prev => ({
                ...prev,
                monthlyIncome: data.summary.monthlyIncome || 0,
                balance: data.summary.balance || 0,
              }));
            }
          })
          .catch(() => {});
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

  // ── High Performance Memoized Event Calculations (60fps) ──
  const todayEvents = useMemo(() => {
    return events
      .filter(e => isSameDay(e.date, selectedDate))
      .sort((a, b) => (a.time || '00:00').localeCompare(b.time || '00:00'));
  }, [events, selectedDate]);

  const filteredEvents = useMemo(() => {
    return todayEvents.filter(ev => {
      if (routineFilter === 'all') return true;
      return ev.type === routineFilter;
    });
  }, [todayEvents, routineFilter]);

  const currentNowEvent = useMemo(() => {
    if (selectedDayOffset !== 0) return null;
    const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    let minDiff = Infinity;
    let found: AgendaEvent | null = null;

    for (const ev of todayEvents) {
      if (ev.time && !ev.completed) {
        const [h, m] = ev.time.split(':').map(Number);
        const evMinutes = h * 60 + m;
        const diff = evMinutes - nowMinutes;
        if (diff >= -45 && diff <= 120 && Math.abs(diff) < minDiff) {
          minDiff = Math.abs(diff);
          found = ev;
        }
      }
    }
    if (!found) {
      found = todayEvents.find(e => {
        if (!e.time || e.completed) return false;
        const [h, m] = e.time.split(':').map(Number);
        return (h * 60 + m) >= nowMinutes;
      }) || null;
    }
    return found;
  }, [selectedDayOffset, todayEvents, currentTime]);

  // Greeting based on time of day
  const hour = currentTime.getHours();
  const greetingText = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const greetingIcon = hour < 12 ? '☀️' : hour < 18 ? '🌤️' : '🌙';

  return (
    <div className='min-h-screen bg-stone-100 dark:bg-stone-950 text-stone-900 dark:text-stone-100 flex flex-col justify-between selection:bg-emerald-500/20'>
      
      {/* ── TOP APP BAR: Mobile Native Sticky Header ── */}
      <header className='bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200 dark:border-stone-800 sticky top-0 z-30 px-3 py-2.5 sm:px-4 shadow-xs'>
        <div className='max-w-md mx-auto flex items-center justify-between gap-2'>
          
          {/* User & Status */}
          <div className='flex items-center gap-2.5 min-w-0'>
            <div className='w-11 h-11 rounded-2xl bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-600 dark:text-emerald-400'>
              <Heart className='h-6 w-6 fill-current' />
            </div>
            <div className='min-w-0'>
              <div className='flex items-center gap-1.5'>
                <h1 className='text-lg font-black truncate leading-tight'>
                  {greetingIcon} {greetingText}, {personInfo.name}!
                </h1>
              </div>
              <div className='flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-bold'>
                <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                <span className='truncate'>{currentTime.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })} · Conectado</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Audio / Read / Logout) */}
          <div className='flex items-center gap-1.5 shrink-0'>
            <button
              onClick={handleReadAloudCurrentTab}
              title='Ouvir em Voz Alta'
              className='w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center transition active:scale-90 shadow-xs'
            >
              <Volume2 className='h-5 w-5' />
            </button>
            <ThemeToggle className='w-10 h-10' />
            <button
              onClick={() => { supabase.auth.signOut(); router.push(`/${params.locale}/care/login`); }}
              className='px-2.5 h-10 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-bold transition active:scale-95'
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT AREA (Clean Single-Screen Viewport per Tab) ── */}
      <main className='flex-1 max-w-md mx-auto w-full px-3.5 py-3 space-y-3.5 pb-28'>
        
        {/* ── AVISO DE 30 DIAS DE TESTE GRÁTIS ATIVO ── */}
        {trialInfo?.isTrial && (
          <div className='bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-2 border-emerald-500/30 dark:border-emerald-500/40 text-emerald-950 dark:text-emerald-100 p-3 rounded-2xl flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-300'>
            <div className='flex items-center gap-2.5 min-w-0'>
              <div className='w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0'>
                <Sparkles className='h-4 w-4' />
              </div>
              <div className='min-w-0'>
                <p className='text-xs font-extrabold leading-tight truncate'>
                  Período de Teste Grátis Ativo
                </p>
                <p className='text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold truncate'>
                  Você tem <strong className='font-black underline'>{trialInfo.daysRemaining === 1 ? '1 dia restante' : `${trialInfo.daysRemaining} dias restantes`}</strong> sem cobrança
                </p>
              </div>
            </div>
            <span className='text-[10px] uppercase tracking-wider font-black text-emerald-800 dark:text-emerald-200 bg-white dark:bg-stone-900 border border-emerald-300 dark:border-emerald-700 px-2.5 py-1 rounded-xl shrink-0 shadow-2xs'>
              30 Dias
            </span>
          </div>
        )}

        {/* Banner de Sucesso / Desfazer */}
        {successMsg && (
          <div className='bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-200 p-3.5 rounded-2xl flex items-center gap-3 shadow-md animate-in slide-in-from-top-2 duration-200'>
            <div className='w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0'>
              <CheckCircle2 className='h-5 w-5' />
            </div>
            <div className='flex-1 min-w-0'>
              <p className='text-sm sm:text-base font-black leading-tight truncate'>{successMsg}</p>
            </div>
            {lastAction && (
              <button 
                onClick={undoLastAction} 
                className='h-9 px-2.5 rounded-xl border border-emerald-600 bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-300 text-xs font-bold flex items-center gap-1 active:scale-95'
              >
                <RotateCcw className='h-3.5 w-3.5' /> Desfazer
              </button>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: 🏠 INÍCIO (Momento Atual & Afeto)                      */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className='space-y-4 animate-in fade-in duration-200'>
            
            {/* 1.1 HERO CARD: ATIVIDADE DO MOMENTO ("AGORA") */}
            <div className='bg-white dark:bg-stone-900 rounded-3xl border-3 border-indigo-400 dark:border-indigo-600 p-4 sm:p-5 shadow-lg relative overflow-hidden'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <span className='w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping' />
                  <span className='text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800'>
                    Atividade do Momento
                  </span>
                </div>
                <span className='text-xs font-bold text-stone-500'>
                  {currentTime.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {currentNowEvent ? (
                <div className='space-y-3.5'>
                  <div className='flex items-start gap-3.5'>
                    <div className='w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 border-2 border-indigo-200 flex items-center justify-center text-3xl shrink-0'>
                      {currentNowEvent.type === 'medication' ? '💊' : currentNowEvent.type === 'meal' ? '🍽️' : currentNowEvent.type === 'appointment' ? '🩺' : '✅'}
                    </div>
                    <div className='flex-1 min-w-0'>
                      <span className='text-xs font-black text-indigo-700 dark:text-indigo-400 bg-indigo-100/70 dark:bg-indigo-950/80 px-2 py-0.5 rounded-md'>
                        ⏰ {currentNowEvent.time || 'Agora'}
                      </span>
                      <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight mt-1 truncate'>
                        {currentNowEvent.title}
                      </h2>
                      {currentNowEvent.subtitle && (
                        <p className='text-sm font-semibold text-stone-600 dark:text-stone-300 truncate'>
                          {currentNowEvent.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Big 1-Tap Action Button */}
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
                    className='w-full h-15 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl shadow-lg flex items-center justify-center gap-2.5 text-lg font-black transition-all active:scale-[0.98] border-b-4 border-emerald-800'
                  >
                    <Check className='h-7 w-7 stroke-[3]' />
                    <span>
                      {currentNowEvent.type === 'medication' ? '✓ JÁ TOMEI ESSE REMÉDIO' : currentNowEvent.type === 'meal' ? '✓ JÁ ME ALIMENTEI' : '✓ CONCLUIR AGORA'}
                    </span>
                  </button>
                </div>
              ) : (
                <div className='py-4 text-center space-y-1'>
                  <div className='w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-2xl'>
                    🌿
                  </div>
                  <h3 className='text-lg font-black text-stone-800 dark:text-stone-200'>
                    Tudo em dia por agora!
                  </h3>
                  <p className='text-xs text-stone-500 max-w-xs mx-auto'>
                    Você cumpriu seus horários. Aproveite para descansar ou tomar uma água!
                  </p>
                </div>
              )}
            </div>

            {/* 1.2 MURAL DE CARINHO DA FAMÍLIA (Correio de Afeto) */}
            {familyMessage && (
              <div className='bg-gradient-to-br from-rose-50 via-amber-50/60 to-rose-100/50 dark:from-stone-900 dark:via-rose-950/20 dark:to-stone-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-3xl p-4 shadow-sm space-y-3'>
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex items-center gap-2.5 min-w-0'>
                    <span className='text-2xl'>💌</span>
                    <div className='min-w-0'>
                      <span className='text-[10px] font-black uppercase text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded-full'>
                        Recado com Carinho
                      </span>
                      <p className='text-xs text-stone-500 dark:text-stone-400 font-bold mt-0.5 truncate'>
                        De <span className='text-stone-800 dark:text-stone-200 font-extrabold'>{familyMessage.sender}</span> às {familyMessage.time}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => speakReminder(`Recado de ${familyMessage.sender}: ${familyMessage.text}`, params.locale)}
                    className='h-9 px-3 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-stone-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-1.5 active:scale-95 shadow-xs shrink-0'
                  >
                    <Volume2 className='h-4 w-4' /> Ouvir
                  </button>
                </div>

                <div className='bg-white/90 dark:bg-stone-800/90 border border-rose-200/80 dark:border-rose-800/60 rounded-2xl p-3.5'>
                  <p className='text-lg font-black text-stone-900 dark:text-stone-100 leading-snug'>
                    &ldquo;{familyMessage.text}&rdquo;
                  </p>
                </div>

              </div>
            )}

            {/* 1.3 NÚMEROS ESSENCIAIS DE EMERGÊNCIA (SAMU 192, BOMBEIROS 193, POLÍCIA 190) */}
            <div className='bg-red-50/90 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 rounded-3xl p-3.5 shadow-sm space-y-2.5'>
              <div className='flex items-center justify-between px-1'>
                <div className='flex items-center gap-2'>
                  <span className='w-2.5 h-2.5 rounded-full bg-red-600 animate-ping' />
                  <span className='text-[11px] font-black uppercase tracking-wider text-red-800 dark:text-red-300'>
                    Números de Emergência Rápidos
                  </span>
                </div>
                <span className='text-[10px] font-extrabold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/80 px-2 py-0.5 rounded-full'>
                  1 Toque para Ligar
                </span>
              </div>

              <div className='grid grid-cols-3 gap-2'>
                {/* SAMU 192 */}
                <a
                  href='tel:192'
                  onClick={() => triggerHaptic([60, 40, 60])}
                  className='bg-white dark:bg-stone-900 border-2 border-red-400 hover:border-red-600 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center gap-1 active:scale-95 shadow-xs transition-all group'
                >
                  <div className='w-11 h-11 rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform'>
                    🚑
                  </div>
                  <span className='text-xs font-black text-red-700 dark:text-red-400 leading-tight'>
                    SAMU
                  </span>
                  <span className='text-lg font-black text-stone-900 dark:text-stone-100 leading-none'>
                    192
                  </span>
                  <span className='text-[9px] font-bold text-stone-500 leading-none mt-0.5'>
                    Ambulância
                  </span>
                </a>

                {/* Bombeiros 193 */}
                <a
                  href='tel:193'
                  onClick={() => triggerHaptic([60, 40, 60])}
                  className='bg-white dark:bg-stone-900 border-2 border-amber-400 hover:border-amber-600 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center gap-1 active:scale-95 shadow-xs transition-all group'
                >
                  <div className='w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform'>
                    🚒
                  </div>
                  <span className='text-xs font-black text-amber-700 dark:text-amber-400 leading-tight'>
                    Bombeiros
                  </span>
                  <span className='text-lg font-black text-stone-900 dark:text-stone-100 leading-none'>
                    193
                  </span>
                  <span className='text-[9px] font-bold text-stone-500 leading-none mt-0.5'>
                    Resgate
                  </span>
                </a>

                {/* Polícia 190 */}
                <a
                  href='tel:190'
                  onClick={() => triggerHaptic([60, 40, 60])}
                  className='bg-white dark:bg-stone-900 border-2 border-blue-400 hover:border-blue-600 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center text-center gap-1 active:scale-95 shadow-xs transition-all group'
                >
                  <div className='w-11 h-11 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 flex items-center justify-center text-2xl group-hover:scale-105 transition-transform'>
                    🚓
                  </div>
                  <span className='text-xs font-black text-blue-700 dark:text-blue-400 leading-tight'>
                    Polícia
                  </span>
                  <span className='text-lg font-black text-stone-900 dark:text-stone-100 leading-none'>
                    190
                  </span>
                  <span className='text-[9px] font-bold text-stone-500 leading-none mt-0.5'>
                    Emergência
                  </span>
                </a>
              </div>
            </div>

            {/* 1.4 CARD DA NINA IA (Assistente de Saúde & Conversa) */}
            <div className='bg-gradient-to-r from-sky-500/15 via-indigo-500/15 to-purple-500/15 dark:from-sky-950/40 dark:via-indigo-950/40 dark:to-purple-950/40 border-3 border-indigo-400 dark:border-indigo-600 p-4 sm:p-5 rounded-3xl shadow-sm flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3.5 min-w-0'>
                <div className='w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 via-indigo-600 to-purple-600 text-white flex items-center justify-center text-3xl shadow-md shrink-0 relative'>
                  👩‍⚕️
                  <span className='absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-white dark:border-stone-900 animate-pulse' />
                </div>
                <div className='min-w-0'>
                  <div className='flex items-center gap-1.5'>
                    <span className='text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-300 block'>
                      Assistente Pessoal
                    </span>
                    <span className='text-[9px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded-md'>
                      Voz & Texto
                    </span>
                  </div>
                  <h3 className='text-lg font-black text-stone-900 dark:text-white leading-tight truncate'>
                    Falar com a Nina
                  </h3>
                  <p className='text-xs font-bold text-stone-600 dark:text-slate-300 mt-0.5 line-clamp-1'>
                    Pergunte sobre horários, remédios ou converse por áudio
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => {
                  triggerHaptic(40);
                  setNinaModalOpen(true);
                }}
                className='px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-black text-sm shadow-md active:scale-95 shrink-0 transition-all flex items-center gap-1.5'
              >
                <span>Conversar</span>
                <ChevronRight className='h-4 w-4' />
              </button>
            </div>

            {/* 1.5 HUB DE CARDS DO DIA A DIA (Controle Confortável & Eficiente) */}
            <div className='space-y-2.5'>
              <div className='flex items-center justify-between px-1'>
                <h3 className='text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400'>
                  Minhas Atividades & Acessos
                </h3>
                <span className='text-[11px] font-bold text-stone-500'>Toque para entrar</span>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                {/* Card 1: Meus Remédios */}
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveTab('routine');
                  }}
                  className='bg-white dark:bg-stone-900 border-2 border-emerald-300 dark:border-emerald-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-emerald-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 flex items-center justify-center text-3xl shadow-2xs'>
                    💊
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Meus Remédios
                  </span>
                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>
                    {todayEvents.filter(e => e.type === 'medication').length > 0
                      ? `${todayEvents.filter(e => e.type === 'medication').length} para hoje`
                      : 'Ver horários'}
                  </span>
                </button>

                {/* Card 2: Bebi Água */}
                <button
                  disabled={loading}
                  onClick={handleDrinkWater}
                  className='bg-white dark:bg-stone-900 border-2 border-sky-300 dark:border-sky-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-sky-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-sky-100 dark:bg-sky-950/80 text-sky-700 flex items-center justify-center text-3xl shadow-2xs'>
                    💧
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Bebi Água
                  </span>
                  <span className='text-xs font-bold text-sky-700 dark:text-sky-300'>
                    {cupsDrank}/8 copos hoje (+1)
                  </span>
                </button>

                {/* Card 3: Já Me Alimentei */}
                <button
                  disabled={loading}
                  onClick={() => {
                    triggerHaptic(30);
                    handleAction('meal', 'Refeição feita!', 'meals', {
                      meal_type: 'other',
                      logged_by: personInfo.userId,
                    });
                  }}
                  className='bg-white dark:bg-stone-900 border-2 border-amber-300 dark:border-amber-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-amber-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 flex items-center justify-center text-3xl shadow-2xs'>
                    🍽️
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Já Comi
                  </span>
                  <span className='text-xs font-bold text-amber-700 dark:text-amber-300'>
                    Registrar refeição
                  </span>
                </button>

                {/* Card 4: Minha Agenda */}
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveTab('routine');
                  }}
                  className='bg-white dark:bg-stone-900 border-2 border-indigo-300 dark:border-indigo-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-indigo-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 flex items-center justify-center text-3xl shadow-2xs'>
                    📅
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Minha Agenda
                  </span>
                  <span className='text-xs font-bold text-indigo-700 dark:text-indigo-300'>
                    {todayEvents.length} compromissos
                  </span>
                </button>

                {/* Card 5: Falar com a Família */}
                <button
                  onClick={handleRequestCall}
                  className='bg-white dark:bg-stone-900 border-2 border-rose-300 dark:border-rose-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-rose-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-700 flex items-center justify-center text-3xl shadow-2xs'>
                    📞
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Chamar Família
                  </span>
                  <span className='text-xs font-bold text-rose-700 dark:text-rose-300'>
                    Pedir ligação
                  </span>
                </button>

                {/* Card 6: Jogos Cognitivos */}
                <button
                  onClick={() => {
                    triggerHaptic(30);
                    setActiveTab('games');
                  }}
                  className='bg-white dark:bg-stone-900 border-2 border-[#D97706]/40 dark:border-[#D97706]/60 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-[#D97706]'
                >
                  <div className='w-13 h-13 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-[#D97706] flex items-center justify-center text-3xl shadow-2xs'>
                    🎮
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Passatempos
                  </span>
                  <span className='text-xs font-bold text-amber-700 dark:text-amber-400'>
                    Jogos da mente
                  </span>
                </button>

                {/* Card 7: Meu Dinheirinho / Finanças */}
                <button
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveTab('finances');
                  }}
                  className='bg-white dark:bg-stone-900 border-2 border-teal-300 dark:border-teal-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-teal-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 flex items-center justify-center text-3xl shadow-2xs'>
                    💰
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Meu Dinheiro
                  </span>
                  <span className='text-xs font-bold text-teal-700 dark:text-teal-300'>
                    Saldo & gastos
                  </span>
                </button>

                {/* Card 8: Estou Bem! */}
                <button
                  disabled={loading}
                  onClick={() => {
                    triggerHaptic(25);
                    handleAction('mood', 'Estou bem!', 'check_ins', {
                      mood: 'great',
                      checked_by: personInfo.userId,
                      notes: 'Estou bem',
                    });
                  }}
                  className='bg-white dark:bg-stone-900 border-2 border-emerald-300 dark:border-emerald-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-emerald-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 flex items-center justify-center text-3xl shadow-2xs'>
                    ❤️
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    Estou Bem!
                  </span>
                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>
                    Avisar família
                  </span>
                </button>

                {/* Card 9: Acordei / Dormir */}
                <button
                  disabled={loading}
                  onClick={() => {
                    triggerHaptic(25);
                    if (hour < 15) {
                      handleAction('wake', 'Bom dia! Avisamos que você acordou', 'check_ins', { mood: 'great', checked_by: personInfo.userId, notes: 'Acordou' });
                    } else {
                      handleAction('sleep', 'Boa noite! Registramos seu descanso', 'check_ins', { mood: 'good', checked_by: personInfo.userId, notes: 'Foi dormir' });
                    }
                  }}
                  className='bg-white dark:bg-stone-900 border-2 border-purple-300 dark:border-purple-800 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-purple-500'
                >
                  <div className='w-13 h-13 rounded-2xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 flex items-center justify-center text-3xl shadow-2xs'>
                    {hour < 15 ? '☀️' : '🌙'}
                  </div>
                  <span className='text-base font-black text-stone-900 dark:text-stone-100 leading-tight'>
                    {hour < 15 ? 'Acordei' : 'Vou Dormir'}
                  </span>
                  <span className='text-xs font-bold text-purple-700 dark:text-purple-300'>
                    {hour < 15 ? 'Bom dia!' : 'Boa noite!'}
                  </span>
                </button>

                {/* Card 10: SOS Emergência */}
                <button
                  onClick={() => {
                    triggerHaptic([60, 60]);
                    setSosModalOpen(true);
                  }}
                  className='bg-red-50 dark:bg-red-950/60 border-2 border-red-400 dark:border-red-700 p-4 rounded-3xl flex flex-col items-center text-center gap-1.5 transition active:scale-95 shadow-xs hover:border-red-600'
                >
                  <div className='w-13 h-13 rounded-2xl bg-red-600 text-white flex items-center justify-center text-3xl shadow-md animate-pulse'>
                    🚨
                  </div>
                  <span className='text-base font-black text-red-700 dark:text-red-400 leading-tight'>
                    SOS Urgente
                  </span>
                  <span className='text-xs font-extrabold text-red-600 dark:text-red-300'>
                    Pedir Socorro
                  </span>
                </button>
              </div>
            </div>

            {/* Link para ver rotina completa */}
            <button
              onClick={() => { setActiveTab('routine'); triggerHaptic(20); }}
              className='w-full py-3.5 px-4 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 flex items-center justify-between text-sm font-black shadow-xs active:scale-98 transition'
            >
              <span className='flex items-center gap-2'>
                <Calendar className='h-4 w-4 text-indigo-600' /> Ver Todos os Compromissos de Hoje ({todayEvents.length})
              </span>
              <ChevronRight className='h-4 w-4 text-stone-400' />
            </button>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 2: ⏰ ROTINA (Timeline & Agenda do Dia)                   */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'routine' && (
          <div className='space-y-3.5 animate-in fade-in duration-200'>
            
            {/* Seletor 3-Day Pill: Ontem, Hoje, Amanhã */}
            <div className='bg-white dark:bg-stone-900 rounded-3xl p-3 border-2 border-stone-200 dark:border-stone-800 shadow-xs space-y-2.5'>
              <div className='flex items-center justify-between px-1'>
                <div>
                  <h2 className='text-lg font-black text-stone-900 dark:text-stone-100'>Minha Rotina</h2>
                  <p className='text-xs text-stone-500 font-bold capitalize'>
                    {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: dateFnsLoc })}
                  </p>
                </div>
                <button
                  onClick={handleReadAloudCurrentTab}
                  className='h-8 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 active:scale-95'
                >
                  <Volume2 className='h-3.5 w-3.5' /> Ouvir
                </button>
              </div>

              {/* Day Switcher */}
              <div className='grid grid-cols-3 gap-1.5 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl'>
                {[
                  { offset: -1, label: 'Ontem' },
                  { offset: 0, label: 'Hoje' },
                  { offset: 1, label: 'Amanhã' },
                ].map(tab => (
                  <button
                    key={tab.offset}
                    onClick={() => { setSelectedDayOffset(tab.offset); triggerHaptic(25); }}
                    className={`py-2 rounded-xl text-xs font-black transition-all ${
                      selectedDayOffset === tab.offset
                        ? 'bg-white dark:bg-stone-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                        : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Type Filter Pills */}
              <div className='flex items-center gap-1.5 overflow-x-auto pb-1 text-xs'>
                {[
                  { key: 'all', label: 'Tudo' },
                  { key: 'medication', label: '💊 Remédios' },
                  { key: 'meal', label: '🍽️ Refeições' },
                  { key: 'appointment', label: '🩺 Consultas' },
                  { key: 'task', label: '✅ Tarefas' },
                ].map(f => (
                  <button
                    key={f.key}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    onClick={() => { setRoutineFilter(f.key as any); triggerHaptic(20); }}
                    className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition ${
                      routineFilter === f.key
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Events List */}
            {agendaLoading ? (
              <div className='py-12 flex justify-center'>
                <div className='animate-spin h-8 w-8 border-3 border-indigo-600 border-t-transparent rounded-full' />
              </div>
            ) : filteredEvents.length === 0 ? (
              <div className='bg-white dark:bg-stone-900 rounded-3xl p-8 text-center border-2 border-stone-200 dark:border-stone-800 space-y-2'>
                <p className='text-4xl'>☀️</p>
                <p className='text-base font-bold text-stone-600 dark:text-stone-300'>
                  Nenhum compromisso deste tipo marcado para este dia.
                </p>
              </div>
            ) : (
              <div className='space-y-2.5'>
                {filteredEvents.map(ev => (
                  <div
                    key={ev.id}
                    className={`p-3.5 rounded-2xl border-2 flex items-center gap-3 transition-all ${
                      ev.completed
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 opacity-80'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 shadow-xs'
                    }`}
                  >
                    <div className='w-12 h-12 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-2xl shrink-0'>
                      {ev.type === 'medication' ? '💊' : ev.type === 'meal' ? '🍽️' : ev.type === 'appointment' ? '🩺' : '✅'}
                    </div>

                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-1.5'>
                        <span className='text-xs font-black text-indigo-700 dark:text-indigo-400'>
                          ⏰ {ev.time || 'Horário flexível'}
                        </span>
                        {ev.completed && (
                          <span className='text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded-md'>
                            ✓ Realizado
                          </span>
                        )}
                      </div>
                      <p className={`text-base font-bold leading-tight truncate ${ev.completed ? 'line-through text-stone-500' : 'text-stone-900 dark:text-stone-100'}`}>
                        {ev.title}
                      </p>
                      {ev.subtitle && (
                        <p className='text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5'>{ev.subtitle}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        
        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB: 🎮 JOGOS COGNITIVOS (ACESSO TOTAL PARA O IDOSO)           */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'games' && (
          <div className='space-y-4 pb-12 animate-in fade-in duration-200'>
            <div className='bg-white dark:bg-stone-900 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-2xl bg-[#D97706] text-white flex items-center justify-center text-2xl shadow-xs'>
                  🎮
                </div>
                <div>
                  <h2 className='text-lg font-black text-stone-900 dark:text-white leading-tight'>
                    Passatempos Cognitivos
                  </h2>
                  <p className='text-xs font-bold text-stone-600 dark:text-slate-300 mt-0.5'>
                    7 jogos para exercitar a memória e o raciocínio
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => { setActiveTab('home'); triggerHaptic(20); }}
                className='text-xs font-black text-stone-700 dark:text-slate-200 bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-200'
              >
                Voltar
              </button>
            </div>

            <CognitiveGamesHub showBackHeader={false} caredPersonId={params.id} caredPersonName={personInfo.name} />
          </div>
        )}

        {/* TAB 3: ⚡ AÇÕES (Central de 1 Toque para o Idoso)             */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'actions' && (
          <div className='space-y-4 animate-in fade-in duration-200'>
            
            {/* Header explicativo */}
            <div className='bg-white dark:bg-stone-900 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-xs'>
              <h2 className='text-lg font-black text-stone-900 dark:text-stone-100'>O que você fez agora?</h2>
              <p className='text-xs text-stone-500 font-medium'>Toque no botão para registrar e avisar a família:</p>
            </div>

                        {/* Acesso a Finanças / Saldo */}
            <button
              onClick={() => { setActiveTab('finances'); triggerHaptic(20); }}
              className='w-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 p-4 rounded-3xl flex items-center justify-between text-left transition active:scale-95 shadow-xs'
            >
              <div className='flex items-center gap-3'>
                <div className='w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-2xl'>
                  💰
                </div>
                <div>
                  <span className='text-sm font-black text-stone-900 dark:text-white block'>Meu Saldo & Finanças</span>
                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>Ver extrato mensal disponível</span>
                </div>
              </div>
              <ChevronRight className='h-4 w-4 text-stone-400' />
            </button>

            {/* Grade de Ações Rápidas (Toques grandes e acessíveis) */}
            <div className='grid grid-cols-2 gap-3'>
              
              {/* 1. Bebi Água */}
              <button
                disabled={loading}
                onClick={handleDrinkWater}
                className='bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 border-2 border-sky-300 dark:border-sky-800 p-4 rounded-3xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center shadow-xs'
              >
                <div className='w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-3xl'>
                  💧
                </div>
                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>Bebi Água</span>
                <span className='text-xs font-bold text-sky-700 dark:text-sky-300'>+1 copo ({cupsDrank}/8)</span>
              </button>

              {/* 2. Tomei Remédio */}
              <button
                disabled={loading || !personInfo.medicationId}
                onClick={() => handleAction('medication', 'Medicamento tomado!', 'medication_confirmations', {
                  medication_id: personInfo.medicationId,
                  confirmed_by: personInfo.userId,
                  status: 'taken',
                })}
                className='bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border-2 border-emerald-300 dark:border-emerald-800 p-4 rounded-3xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center shadow-xs disabled:opacity-50'
              >
                <div className='w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-3xl'>
                  💊
                </div>
                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>Tomei Remédio</span>
                <span className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>Horário cumprido</span>
              </button>

              {/* 3. Já Me Alimentei */}
              <button
                disabled={loading}
                onClick={() => handleAction('meal', 'Refeição feita!', 'meals', {
                  meal_type: 'other',
                  logged_by: personInfo.userId,
                })}
                className='bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 border-2 border-amber-300 dark:border-amber-800 p-4 rounded-3xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center shadow-xs'
              >
                <div className='w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-3xl'>
                  🍽️
                </div>
                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>Já Me Alimentei</span>
                <span className='text-xs font-bold text-amber-700 dark:text-amber-300'>Refeição feita</span>
              </button>

              {/* 4. Acordei / Dormir */}
              <button
                disabled={loading}
                onClick={() => {
                  if (hour < 15) {
                    handleAction('wake', 'Bom dia! Avisamos que você acordou', 'check_ins', { mood: 'great', checked_by: personInfo.userId, notes: 'Acordou' });
                  } else {
                    handleAction('sleep', 'Boa noite! Registramos seu descanso', 'check_ins', { mood: 'good', checked_by: personInfo.userId, notes: 'Foi dormir' });
                  }
                }}
                className='bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 border-2 border-indigo-300 dark:border-indigo-800 p-4 rounded-3xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center shadow-xs'
              >
                <div className='w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-900/60 flex items-center justify-center text-3xl'>
                  {hour < 15 ? '☀️' : '🌙'}
                </div>
                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>
                  {hour < 15 ? 'Acordei' : 'Vou Dormir'}
                </span>
                <span className='text-xs font-bold text-indigo-700 dark:text-indigo-300'>
                  {hour < 15 ? 'Bom dia família!' : 'Boa noite família!'}
                </span>
              </button>
            </div>

            {/* Termômetro de Humor */}
            <div className='bg-white dark:bg-stone-900 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-xs space-y-2.5'>
              <h3 className='text-base font-black text-stone-900 dark:text-stone-100'>Como está seu humor hoje?</h3>
              <div className='grid grid-cols-4 gap-2'>
                {[
                  { mood: 'great', emoji: '😄', label: 'Muito Bem' },
                  { mood: 'good', emoji: '😊', label: 'Tranquilo' },
                  { mood: 'okay', emoji: '😐', label: 'Mais ou Menos' },
                  { mood: 'bad', emoji: '😔', label: 'Com Dor' },
                ].map(item => (
                  <button
                    key={item.mood}
                    onClick={() => handleMoodCheckIn(item.mood, item.label)}
                    className='py-2.5 px-1 rounded-2xl border-2 border-stone-200 dark:border-stone-800 hover:border-emerald-300 flex flex-col items-center text-center transition active:scale-95'
                  >
                    <span className='text-2xl'>{item.emoji}</span>
                    <span className='text-[11px] font-black mt-1 text-stone-800 dark:text-stone-200 truncate'>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 4: 💰 FINANÇAS (Autonomia Financeira do Idoso)           */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'finances' && (
          <div className='space-y-4 animate-in fade-in duration-200'>
            
            {/* Saldo Principal */}
            <div className='bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/60 dark:from-stone-900 dark:via-emerald-950/30 dark:to-stone-900 rounded-3xl border-3 border-emerald-400 dark:border-emerald-700 p-5 shadow-md space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='px-2.5 py-0.5 bg-emerald-200/80 dark:bg-emerald-900/60 text-emerald-950 dark:text-emerald-200 font-black text-[11px] rounded-full uppercase tracking-wider'>
                  {tFin.selfManagementTitle}
                </span>
                <span className='text-xs font-bold text-stone-500'>
                  {financeData.incomeSource}
                </span>
              </div>

              <div>
                <p className='text-xs font-bold text-stone-500 uppercase tracking-wide'>{tFin.availableBalance}</p>
                <p className={`text-3xl sm:text-4xl font-black tabular-nums leading-none mt-1 ${financeData.balance < 0 ? 'text-red-600' : 'text-emerald-800 dark:text-emerald-300'}`}>
                  {formatCurrency(financeData.balance)}
                </p>
                <div className='flex items-center justify-between text-xs font-bold text-stone-500 mt-2.5 pt-2.5 border-t border-emerald-200/60 dark:border-emerald-800/60'>
                  <span>Renda: <strong className='text-emerald-700'>{formatCurrency(financeData.monthlyIncome)}</strong></span>
                  <span>Gastos: <strong className='text-amber-700'>{formatCurrency(financeData.totalExpenses)}</strong></span>
                </div>
              </div>
            </div>

            {/* Ações Financeiras */}
            <div className='space-y-2.5'>
              <button
                onClick={() => setExpenseModalOpen(true)}
                className='w-full h-15 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-2xl shadow-lg flex items-center justify-center gap-2.5 text-lg font-black transition active:scale-[0.98] border-b-4 border-emerald-800'
              >
                <Plus className='h-6 w-6 stroke-[3]' />
                <span>+ REGISTRAR GASTO</span>
              </button>

              <button
                onClick={() => setSeniorPensionModalOpen(true)}
                className='w-full h-13 bg-white dark:bg-stone-900 border-2 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold active:scale-[0.98] shadow-xs'
              >
                <Landmark className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                <span>Minha Aposentadoria / Renda</span>
              </button>
            </div>
          </div>
        )}

      </main>

      {/* ── NATIVE MOBILE BOTTOM NAVIGATION DOCK (Thumb Zone) ── */}
      <nav className='fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 pb-[env(safe-area-inset-bottom)] shadow-lg'>
        <div className='max-w-md mx-auto grid grid-cols-5 items-center px-1 py-1.5'>
          
          {/* Tab 1: Início */}
          <button
            onClick={() => { setActiveTab('home'); triggerHaptic(20); }}
            className={`py-1.5 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all ${
              activeTab === 'home'
                ? 'text-emerald-600 dark:text-emerald-400 font-black'
                : 'text-stone-600 dark:text-slate-300 font-bold hover:text-stone-900'
            }`}
          >
            <Home className='h-6 w-6 stroke-[2.2]' />
            <span className='text-[11px] leading-none'>Início</span>
          </button>

          {/* Tab 2: Rotina */}
          <button
            onClick={() => { setActiveTab('routine'); triggerHaptic(20); }}
            className={`py-1.5 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all ${
              activeTab === 'routine'
                ? 'text-indigo-600 dark:text-indigo-400 font-black'
                : 'text-stone-600 dark:text-slate-300 font-bold hover:text-stone-900'
            }`}
          >
            <Clock className='h-6 w-6 stroke-[2.2]' />
            <span className='text-[11px] leading-none'>Rotina</span>
          </button>

          {/* Tab Central: SOS de Emergência */}
          <button
            onClick={() => { setSosModalOpen(true); triggerHaptic([50, 50]); }}
            className='py-1 flex flex-col items-center justify-center -mt-4 group'
          >
            <div className='w-13 h-13 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-3 border-white dark:border-stone-900 group-active:scale-90 transition'>
              <ShieldAlert className='h-7 w-7' />
            </div>
            <span className='text-[10px] font-black text-red-600 dark:text-red-400 leading-none mt-0.5'>SOS</span>
          </button>

          {/* Tab 3: 🎮 Jogos Cognitivos */}
          <button
            onClick={() => { setActiveTab('games'); triggerHaptic(20); }}
            className={`py-1.5 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all ${
              activeTab === 'games'
                ? 'text-[#D97706] dark:text-amber-400 font-black'
                : 'text-stone-600 dark:text-slate-300 font-bold hover:text-stone-900'
            }`}
          >
            <Gamepad2 className='h-6 w-6 stroke-[2.2]' />
            <span className='text-[11px] leading-none'>Jogos</span>
          </button>

          {/* Tab 4: 👩‍⚕️ Nina IA */}
          <button
            onClick={() => { setNinaModalOpen(true); triggerHaptic(20); }}
            className='py-1.5 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-900'
          >
            <div className='w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-sm shadow-2xs'>
              👩‍⚕️
            </div>
            <span className='text-[11px] leading-none font-bold'>Nina IA</span>
          </button>

        </div>
      </nav>

      {/* ── MODAL DE CONVERSA: QUERO CONVERSAR COM A FAMÍLIA ── */}
      {conversationModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-amber-400 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200'>
            <div className='mx-auto w-18 h-18 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 flex items-center justify-center text-3xl'>
              📞
            </div>

            <div>
              <span className='inline-block px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs rounded-full uppercase tracking-wider mb-1'>
                Pedido de Conversa
              </span>
              <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight'>
                Avisamos sua família!
              </h2>
              <p className='text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium'>
                {sendingCallRequest
                  ? 'Enviando aviso para seus cuidadores...'
                  : 'Um aviso foi registrado no painel e enviado no WhatsApp da família para te darem uma ligadinha.'}
              </p>
            </div>

            <div className='space-y-2.5 pt-1'>
              {personInfo.primaryPhone && (
                <>
                  <a
                    href={`tel:${personInfo.primaryPhone}`}
                    className='w-full h-13 text-base font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-95 transition'
                  >
                    <Phone className='h-5 w-5' /> Ligar para a Família Agora
                  </a>
                  <a
                    href={`https://wa.me/${personInfo.primaryPhone.replace(/\D/g, '')}`}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='w-full h-12 text-sm font-bold bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95 transition'
                  >
                    💬 Abrir WhatsApp da Família
                  </a>
                </>
              )}

              <button
                type='button'
                onClick={() => setConversationModalOpen(false)}
                className='w-full h-11 text-xs font-bold text-stone-600 dark:text-stone-300 border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 rounded-2xl'
              >
                ✓ Entendi, vou aguardar a ligação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE CONFIRMAÇÃO DE EMERGÊNCIA / SOS ── */}
      {sosModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-red-500 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-center space-y-4 animate-in zoom-in-95 duration-200'>
            <div className='mx-auto w-18 h-18 rounded-3xl bg-red-100 dark:bg-red-950/60 border-2 border-red-300 flex items-center justify-center'>
              <AlertCircle className='h-10 w-10 text-red-600 dark:text-red-400 animate-bounce' />
            </div>

            <div>
              <span className='inline-block px-2.5 py-0.5 bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-300 font-extrabold text-xs rounded-full uppercase tracking-wider mb-1'>
                Aviso de Emergência
              </span>
              <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight'>
                Deseja avisar a família agora?
              </h2>
              <p className='text-xs text-stone-600 dark:text-stone-300 mt-1 font-medium'>
                Um alarme sonoro urgente será disparado para todos os seus cuidadores.
              </p>
            </div>

            <div className='space-y-2.5 pt-1'>
              <button
                type='button'
                disabled={sendingSos}
                onClick={handleConfirmSos}
                className='w-full h-15 text-lg font-black bg-red-600 hover:bg-red-700 text-white rounded-2xl shadow-xl active:scale-95 transition-transform border-b-4 border-red-800'
              >
                {sendingSos ? 'Enviando Alerta...' : '🚨 SIM! AVISAR MINHA FAMÍLIA AGORA'}
              </button>

              {personInfo.primaryPhone && (
                <a
                  href={`tel:${personInfo.primaryPhone}`}
                  className='w-full h-12 text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl flex items-center justify-center gap-2 shadow-md active:scale-95'
                >
                  <Phone className='h-4 w-4' /> Ligar Diretamente para a Família
                </a>
              )}

              <button
                type='button'
                onClick={() => setSosModalOpen(false)}
                className='w-full h-11 text-xs font-bold text-stone-600 dark:text-stone-300 border-2 border-stone-300 dark:border-stone-700 hover:bg-stone-100 rounded-2xl'
              >
                Cancelar / Toquei Sem Querer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DE ALARME / DESPERTADOR CONTÍNUO (Com Som em Loop) ── */}
      {alarmModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-amber-400 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl text-center space-y-4 animate-pulse'>
            
            <div className='mx-auto w-18 h-18 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 flex items-center justify-center'>
              <BellRing className='h-10 w-10 text-amber-600 dark:text-amber-400 animate-bounce' />
            </div>

            <div>
              <span className='inline-block px-2.5 py-0.5 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-extrabold text-xs rounded-full uppercase tracking-wider mb-1'>
                {tCare.appointmentAlarmTitle}
              </span>
              <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight'>
                {nextAppointmentData ? nextAppointmentData.title : tCare.demoTitle}
              </h2>
              <p className='text-base font-bold text-amber-700 dark:text-amber-400 mt-1'>
                {nextAppointmentData ? `${tCare.scheduledFor} ${format(new Date(nextAppointmentData.starts_at), "dd/MM 'às' HH:mm", { locale: dateFnsLoc })}` : tCare.demoText}
              </p>
              {nextAppointmentData?.doctor_name && (
                <p className='text-sm font-semibold text-stone-700 dark:text-stone-300 mt-0.5'>
                  {tCare.doctorLabel}: {nextAppointmentData.doctor_name}
                </p>
              )}
            </div>

            <div className='space-y-2 pt-1'>
              <button
                type='button'
                onClick={() => {
                  stopContinuousAlarm();
                  if (nextAppointmentData) setAlarmDismissedId(nextAppointmentData.id);
                }}
                className='w-full h-14 text-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-xl active:scale-95 transition-transform'
              >
                {tCare.confirmSeen}
              </button>

              {nextAppointmentData && (
                <button
                  type='button'
                  onClick={() => {
                    stopContinuousAlarm();
                    setSnoozeUntil(new Date(Date.now() + 10 * 60 * 1000));
                  }}
                  className='w-full h-11 text-xs font-bold text-stone-600 border border-stone-300 hover:bg-stone-100 rounded-2xl'
                >
                  {tCare.snooze10m}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: REGISTRAR GASTO ── */}
      {expenseModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-emerald-400 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200'>
            <div className='flex items-center gap-3'>
              <div className='w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl'>
                <DollarSign className='h-6 w-6 stroke-[3]' />
              </div>
              <div>
                <h3 className='text-xl font-black text-stone-900 dark:text-stone-100'>{tFin.addExpense}</h3>
                <p className='text-xs text-stone-500 font-medium'>Será abatido do saldo do mês.</p>
              </div>
            </div>

            <form onSubmit={handleSeniorAddExpense} className='space-y-3.5'>
              <div>
                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>Valor Gasto (R$) *</label>
                <input
                  type='number' step='0.01' required autoFocus placeholder='0.00'
                  value={seniorExpenseAmount} onChange={(e) => setSeniorExpenseAmount(e.target.value)}
                  className='w-full text-2xl font-black p-3 rounded-2xl border-2 border-emerald-300 focus:border-emerald-600 bg-emerald-50/50 dark:bg-stone-800 dark:text-white outline-hidden text-center'
                />
              </div>

              <div>
                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1.5'>Categoria:</label>
                <div className='grid grid-cols-2 gap-2'>
                  {[
                    { key: 'medication', label: '💊 Farmácia' },
                    { key: 'food', label: '🛒 Mercado' },
                    { key: 'appointment', label: '🩺 Médico' },
                    { key: 'housing', label: '🏠 Casa' },
                  ].map((cat) => (
                    <button
                      type='button' key={cat.key} onClick={() => setSeniorExpenseCategory(cat.key)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-bold transition-all text-left ${seniorExpenseCategory === cat.key ? 'border-emerald-500 bg-emerald-100/70 text-emerald-900 dark:text-emerald-200' : 'border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'}`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className='block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1'>Detalhe (opcional):</label>
                <input
                  type='text' placeholder='Ex: Remédio, Pão...'
                  value={seniorExpenseDesc} onChange={(e) => setSeniorExpenseDesc(e.target.value)}
                  className='w-full text-sm font-semibold p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-white outline-hidden'
                />
              </div>

              <div className='flex gap-2 pt-1'>
                <Button type='button' variant='outline' onClick={() => setExpenseModalOpen(false)} className='flex-1 h-12 text-sm font-bold rounded-xl border-stone-300'>
                  Cancelar
                </Button>
                <Button type='submit' disabled={savingExpense} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>
                  {savingExpense ? 'Salvando...' : '✓ Salvar Gasto'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: APOSENTADORIA / RENDA ── */}
      {seniorPensionModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200'>
          <div className='bg-white dark:bg-stone-900 border-4 border-emerald-400 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200'>
            <div className='flex items-center gap-3'>
              <div className='w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl'>
                <Landmark className='h-6 w-6' />
              </div>
              <div>
                <h3 className='text-xl font-black text-stone-900 dark:text-stone-100'>{tFin.editIncome}</h3>
                <p className='text-xs text-stone-500 font-medium'>Renda mensal para cálculo de saldo.</p>
              </div>
            </div>

            <form onSubmit={handleSeniorSavePension} className='space-y-3.5'>
              <div>
                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>Valor Mensal (R$) *</label>
                <input
                  type='number' step='0.01' required autoFocus placeholder='Ex: 3000.00'
                  value={seniorPensionInput} onChange={(e) => setSeniorPensionInput(e.target.value)}
                  className='w-full text-2xl font-black p-3 rounded-2xl border-2 border-emerald-300 focus:border-emerald-600 bg-emerald-50/50 dark:bg-stone-800 dark:text-white outline-hidden text-center'
                />
              </div>

              <div className='flex gap-2 pt-1'>
                <Button type='button' variant='outline' onClick={() => setSeniorPensionModalOpen(false)} className='flex-1 h-12 text-sm font-bold rounded-xl border-stone-300'>
                  Cancelar
                </Button>
                <Button type='submit' disabled={savingPension} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>
                  {savingPension ? 'Salvando...' : '✓ Salvar Minha Renda'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: NINA IA (Assistente de Saúde para o Idoso) ── */}
      {ninaModalOpen && (
        <div className='fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200'>
          <div className='w-full max-w-lg'>
            <NinaAIChatbot
              caredPersonId={params.id}
              caredPersonName={personInfo.name}
              userRole='elderly'
              isOpen={true}
              onClose={() => setNinaModalOpen(false)}
            />
          </div>
        </div>
      )}

    </div>
  );
}
