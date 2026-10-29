'use client';

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { CognitiveGamesHub } from '@/components/games/CognitiveGamesHub';
import { GamesAndMomentsHub } from '@/components/games/GamesAndMomentsHub';
import { NinaAIChatbot } from '@/components/nina/NinaAIChatbot';
import { MobileMacroMicroCards } from '@/components/dashboard/MobileMacroMicroCards';
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
import { ElderlyLanguageSwitcher } from '@/components/shared/ElderlyLanguageSwitcher';
import { speakPleasantVoice, stopVoiceSpeech } from '@/lib/audio/voice-synthesizer';
import { VoiceSettingsModal } from '@/components/shared/VoiceSettingsModal';
import { CaringNoteCard } from '@/components/care/CaringNoteCard';
import { EmergencyContactsBlock } from '@/components/care/EmergencyContactsBlock';
import { getElderlyCardsTexts } from '@/lib/i18n/elderly-cards-translations';
import { normalizeLang } from '@/lib/i18n/relationship-translations';

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
  speakPleasantVoice(text, { locale: rawLocale });
}

interface AgendaEvent {
  id: string;
  title: string;
  time?: string;
  date: Date;
  type: 'appointment' | 'medication' | 'meal' | 'task' | 'activity';
  subtitle?: string;
  color: string;
  completed?: boolean;
  schedId?: string;
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
  const tCards = getElderlyCardsTexts(params.locale);
  const dateFnsLoc = getDateFnsLocale(params.locale);
  const displayLocale = params.locale === 'en' ? 'en-US' : params.locale;

  // Active Mobile Tab (Native App Navigation)
  const [activeTab, setActiveTab] = useState<MobileTab>('home');

  const [loading, setLoading] = useState(false);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [emergencyContacts, setEmergencyContacts] = useState<Array<{
    id?: string;
    name?: string;
    relationship?: string;
    phone?: string;
    is_primary?: boolean;
  }>>([]);
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
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
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

  const [lastAction, setLastAction] = useState<{ id: string; type: string; table: string; eventId?: string } | null>(null);

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

  // Confirmation of SOS with verified status reporting
  const handleConfirmSos = async () => {
    setSendingSos(true);
    unlockAudioContext();
    playAlarmChime();
    triggerHaptic([150, 100, 150, 100, 200]);

    const sosLang = normalizeLang(params.locale);
    const sosTexts = {
      'pt-BR': {
        sentMsg: '🚨 ALERTA DE EMERGÊNCIA ENVIADO! Toda a família e cuidadores foram alertados.',
        sentSpeech: (name: string) => `Alerta de emergência enviado, ${name}! Sua família foi avisada agora mesmo e já está ciente.`,
        fallbackMsg: '⚠️ Pedido de emergência registrado no sistema. Por favor, tente também ligar para um contato de emergência.',
        fallbackSpeech: (name: string) => `Atenção, ${name}. Registramos seu chamado no sistema, mas por favor, tente também ligar para um dos números logo abaixo.`,
        networkErrorMsg: '⚠️ Falha de rede no envio automático. Por favor, use a discagem direta para a família ou para os serviços de emergência.',
        networkErrorSpeech: (name: string) => `Atenção, ${name}. Houve uma instabilidade de conexão. Por favor, use os botões de ligação rápida logo abaixo.`,
      },
      'en': {
        sentMsg: '🚨 EMERGENCY ALERT SENT! All family members and caregivers have been alerted.',
        sentSpeech: (name: string) => `Emergency alert sent, ${name}! Your family has been notified right now and is aware.`,
        fallbackMsg: '⚠️ Emergency request logged in the system. Please also try calling an emergency contact directly.',
        fallbackSpeech: (name: string) => `Notice, ${name}. We registered your request, but please also try calling one of the numbers below.`,
        networkErrorMsg: '⚠️ Network failure during auto-send. Please use direct dialing below for family or emergency services.',
        networkErrorSpeech: (name: string) => `Notice, ${name}. There was a connection issue. Please use the quick call buttons below.`,
      },
      'es': {
        sentMsg: '🚨 ¡ALERTA DE EMERGENCIA ENVIADA! Toda la familia y cuidadores han sido avisados.',
        sentSpeech: (name: string) => `¡Alerta de emergencia enviada, ${name}! Su familia ha sido notificada ahora mismo.`,
        fallbackMsg: '⚠️ Solicitud de emergencia registrada en el sistema. Por favor, intente también llamar a un contacto de emergencia.',
        fallbackSpeech: (name: string) => `Atención, ${name}. Registramos su llamado, pero por favor intente también llamar a uno de los números abajo.`,
        networkErrorMsg: '⚠️ Falla de red en el envío automático. Por favor, use el marcado directo para la familia o emergencias.',
        networkErrorSpeech: (name: string) => `Atención, ${name}. Hubo una inestabilidad de conexión. Por favor, use los botones de llamada rápida abajo.`,
      },
      'fr': {
        sentMsg: '🚨 ALERTE D’URGENCE ENVOYÉE ! Toute la famille et les soignants ont été alertés.',
        sentSpeech: (name: string) => `Alerte d’urgence envoyée, ${name} ! Votre famille est prévenue dès maintenant.`,
        fallbackMsg: '⚠️ Demande d’urgence enregistrée dans le système. Veuillez également essayer d’appeler un contact d’urgence.',
        fallbackSpeech: (name: string) => `Attention, ${name}. Votre appel est enregistré, mais veuillez aussi appeler un des numéros ci-dessous.`,
        networkErrorMsg: '⚠️ Échec réseau lors de l’envoi automatique. Veuillez utiliser la composition directe ci-dessous.',
        networkErrorSpeech: (name: string) => `Attention, ${name}. Instabilité de connexion. Veuillez utiliser les boutons d’appel rapide ci-dessous.`,
      },
      'de': {
        sentMsg: '🚨 NOTRUF GESENDET! Die gesamte Familie und Pflegekräfte wurden benachrichtigt.',
        sentSpeech: (name: string) => `Notruf gesendet, ${name}! Ihre Familie wurde soeben benachrichtigt und informiert.`,
        fallbackMsg: '⚠️ Notfallanfrage im System erfasst. Bitte versuchen Sie auch, einen Notfallkontakt direkt anzurufen.',
        fallbackSpeech: (name: string) => `Achtung, ${name}. Ihr Anruf ist erfasst, bitte rufen Sie zusätzlich eine der Nummern unten an.`,
        networkErrorMsg: '⚠️ Netzwerkfehler beim automatischen Senden. Bitte nutzen Sie die Direktwahl für Familie oder Notruf.',
        networkErrorSpeech: (name: string) => `Achtung, ${name}. Verbindungsfehler. Bitte nutzen Sie die Schnellanruftasten unten.`,
      },
    }[sosLang] || {
      sentMsg: '🚨 ALERTA DE EMERGÊNCIA ENVIADO! Toda a família e cuidadores foram alertados.',
      sentSpeech: (name: string) => `Alerta de emergência enviado, ${name}! Sua família foi avisada agora mesmo e já está ciente.`,
      fallbackMsg: '⚠️ Pedido de emergência registrado no sistema. Por favor, tente também ligar para um contato de emergência.',
      fallbackSpeech: (name: string) => `Atenção, ${name}. Registramos seu chamado no sistema, mas por favor, tente também ligar para um dos números logo abaixo.`,
      networkErrorMsg: '⚠️ Falha de rede no envio automático. Por favor, use a discagem direta para a família ou para os serviços de emergência.',
      networkErrorSpeech: (name: string) => `Atenção, ${name}. Houve uma instabilidade de conexão. Por favor, use os botões de ligação rápida logo abaixo.`,
    };

    try {
      const res = await fetch('/api/care/alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cared_person_id: params.id,
          type: 'emergency',
          message: `Emergência acionada pelo mini app do idoso (${personInfo.name})`,
        }),
      });

      if (res.ok) {
        setSuccessMsg(sosTexts.sentMsg);
        speakReminder(sosTexts.sentSpeech(personInfo.name), params.locale);
      } else {
        setSuccessMsg(sosTexts.fallbackMsg);
        speakReminder(sosTexts.fallbackSpeech(personInfo.name), params.locale);
      }
    } catch (e) {
      console.error('Error sending SOS alert:', e);
      setSuccessMsg(sosTexts.networkErrorMsg);
      speakReminder(sosTexts.networkErrorSpeech(personInfo.name), params.locale);
    } finally {
      setSendingSos(false);
      setSosModalOpen(false);
      setTimeout(() => setSuccessMsg(''), 10000);
    }
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
          financesRes,
          lifeActsRes,
          medConfirmationsRes
        ] = await Promise.all([
          // 1. Emergency contacts list & phone
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('emergency_contacts').select('id,name,relationship,phone,is_primary').eq('cared_person_id', params.id).order('is_primary', { ascending: false }),
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
          // 14. Life activities (física, aula, reabilitação, lazer)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('life_activities').select('*').eq('cared_person_id', params.id).eq('is_active', true),
          // 15. Medication confirmations for historical dose tracking
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (supabase as any).from('medication_confirmations').select('id,medication_id,schedule_id,confirmed_at,created_at,status,notes').eq('cared_person_id', params.id).gte('created_at', dateFrom.toISOString()),
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

        // Process Emergency Contacts List & Primary Phone
        if (contactsRes?.data && Array.isArray(contactsRes.data)) {
          setEmergencyContacts(contactsRes.data);
        }
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

        // 15. Historical medication confirmations
        const medConfirmations: any[] = (medConfirmationsRes?.data as any[]) || [];

        // Medications
        allMeds.forEach((med: any) => {
          const schedules = med.medication_schedules || [];
          if (schedules.length === 0) {
            const d = new Date(); d.setHours(8, 0, 0, 0);
            const dateStr = format(d, 'yyyy-MM-dd');
            const eventId = 'med-' + med.id + '-notime';
            const isConfirmed = medConfirmations.some((c: any) => {
              if (c.medication_id !== med.id || c.status === 'missed') return false;
              const confDateStr = format(new Date(c.confirmed_at || c.created_at), 'yyyy-MM-dd');
              return confDateStr === dateStr;
            });

            allEvents.push({
              id: eventId,
              title: `${med.name} ${med.dosage || ''}${med.unit || ''}`.trim(),
              subtitle: isConfirmed ? '✓ Remédio tomado' : 'Medicamento agendado',
              time: '08:00',
              date: new Date(d),
              type: 'medication',
              color: 'green',
              completed: isConfirmed,
              raw: med,
            });
          } else {
            schedules.forEach((sched: any) => {
              for (let i = -7; i <= 14; i++) {
                const d = new Date(); d.setDate(d.getDate() + i);
                const pts = sched.time_of_day.split(':');
                d.setHours(parseInt(pts[0]), parseInt(pts[1]), 0, 0);
                const timeStr = sched.time_of_day.slice(0, 5);
                const eventId = `med-${med.id}-${sched.id}-${i}`;
                const dateStr = format(d, 'yyyy-MM-dd');

                // Check if this exact dose was confirmed
                const isConfirmed = medConfirmations.some((c: any) => {
                  if (c.medication_id !== med.id || c.status === 'missed') return false;

                  // Direct note match
                  if (c.notes && typeof c.notes === 'string') {
                    if (c.notes.includes(eventId)) return true;
                    if (c.notes.includes(dateStr) && c.notes.includes(timeStr)) return true;
                  }

                  // Schedule ID and date match
                  const confDate = new Date(c.confirmed_at || c.created_at);
                  const confDateStr = format(confDate, 'yyyy-MM-dd');
                  if (c.schedule_id && c.schedule_id === sched.id && confDateStr === dateStr) {
                    return true;
                  }

                  // If no schedule_id on confirmation, match same day and close time
                  if (!c.schedule_id && confDateStr === dateStr) {
                    const confTimeStr = format(confDate, 'HH:mm');
                    const [ch, cm] = confTimeStr.split(':').map(Number);
                    const [sh, sm] = timeStr.split(':').map(Number);
                    if (Math.abs((ch * 60 + cm) - (sh * 60 + sm)) <= 90) {
                      return true;
                    }
                  }

                  return false;
                });

                const normLang = normalizeLang(params.locale);
                const medSubText = isConfirmed
                  ? (normLang === 'en' ? '✓ Taken' : normLang === 'es' ? '✓ Tomado' : normLang === 'fr' ? '✓ Pris' : normLang === 'de' ? '✓ Eingenommen' : '✓ Remédio tomado')
                  : (normLang === 'en' ? 'Scheduled dose' : normLang === 'es' ? 'Dosis programada' : normLang === 'fr' ? 'Dose programmée' : normLang === 'de' ? 'Geplante Dosis' : 'Horário do medicamento');

                allEvents.push({
                  id: eventId,
                  title: `${med.name} ${med.dosage || ''}${med.unit || ''}`.trim(),
                  subtitle: medSubText,
                  time: timeStr,
                  date: new Date(d),
                  type: 'medication',
                  color: 'green',
                  completed: isConfirmed,
                  schedId: sched.id,
                  raw: med,
                });
              }
            });
          }
        });

        // Meals
        const normLang = normalizeLang(params.locale);
        const mealEmojiMapByLocale: Record<string, Record<string, string>> = {
          'pt-BR': { breakfast: '🥣 Café da Manhã', lunch: '🥗 Almoço', snack: '🍎 Lanche da Tarde', dinner: '🍲 Jantar', supper: '🥛 Ceia', other: '🍽️ Refeição' },
          'en': { breakfast: '🥣 Breakfast', lunch: '🥗 Lunch', snack: '🍎 Afternoon Snack', dinner: '🍲 Dinner', supper: '🥛 Supper', other: '🍽️ Meal' },
          'es': { breakfast: '🥣 Desayuno', lunch: '🥗 Almuerzo', snack: '🍎 Merienda', dinner: '🍲 Cena', supper: '🥛 Colación', other: '🍽️ Comida' },
          'fr': { breakfast: '🥣 Petit-déjeuner', lunch: '🥗 Déjeuner', snack: '🍎 Goûter', dinner: '🍲 Dîner', supper: '🥛 Collation', other: '🍽️ Repas' },
          'de': { breakfast: '🥣 Frühstück', lunch: '🥗 Mittagessen', snack: '🍎 Nachmittagssnack', dinner: '🍲 Abendessen', supper: '🥛 Spätmahlzeit', other: '🍽️ Mahlzeit' },
        };
        const emojiMap = mealEmojiMapByLocale[normLang] || mealEmojiMapByLocale['pt-BR'];
        const defaultMealLabel = emojiMap['other'] || '🍽️ Refeição';
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
            title: emojiMap[mealType] || defaultMealLabel,
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
          const mealName = m.description || defaultMealLabel.replace(/^[^\s]+\s*/, '');
          const key = `${format(d, 'yyyy-MM-dd')}-${mealType}-${mealName.toLowerCase().slice(0, 10)}`;
          if (!seenCareMeals.has(key)) {
            seenCareMeals.add(key);
            allEvents.push({
              id: 'meal-direct-' + m.id,
              title: emojiMap[mealType] || defaultMealLabel,
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
        const taskCompletedText = normLang === 'en' ? '✓ Completed' : normLang === 'es' ? '✓ Completada' : normLang === 'fr' ? '✓ Terminée' : normLang === 'de' ? '✓ Erledigt' : '✓ Concluída';
        const taskPendingText = normLang === 'en' ? 'Routine task' : normLang === 'es' ? 'Tarea de la rutina' : normLang === 'fr' ? 'Tâche de la routine' : normLang === 'de' ? 'Routineaufgabe' : 'Tarefa da rotina';
        const activityDefaultSub = normLang === 'en' ? 'Routine activity' : normLang === 'es' ? 'Actividad de la rutina' : normLang === 'fr' ? 'Activité de la routine' : normLang === 'de' ? 'Routineaktivität' : 'Atividade da rotina';

        (tasksRes?.data || []).forEach((t: any) => {
          const d = t.due_date ? new Date(t.due_date) : new Date();
          allEvents.push({
            id: 'task-' + t.id,
            title: t.title,
            subtitle: t.status === 'completed' ? taskCompletedText : taskPendingText,
            time: format(d, 'HH:mm'),
            date: d,
            type: 'task',
            color: 'purple',
            completed: t.status === 'completed',
            raw: t,
          });
        });

        // Life Activities (Physical, Learning, Rehab, Leisure & Social)
        (lifeActsRes?.data || []).forEach((act: any) => {
          const timeStr = act.time_of_day ? act.time_of_day.slice(0, 5) : '09:00';
          const [h, m] = timeStr.split(':').map(Number);
          const recDays: number[] = Array.isArray(act.recurrence_days) ? act.recurrence_days : [];

          for (let i = -7; i <= 14; i++) {
            const d = new Date(); d.setDate(d.getDate() + i);
            const dayOfWeek = d.getDay();
            const isScheduled = recDays.length === 0 || recDays.includes(dayOfWeek) || act.recurrence_type === 'daily';
            if (isScheduled) {
              d.setHours(h || 9, m || 0, 0, 0);
              const icon = act.category === 'physical' ? '🏃' : act.category === 'learning' ? '📚' : act.category === 'rehab' ? '🩹' : '🎭';
              allEvents.push({
                id: `act-${act.id}-${i}`,
                title: `${icon} ${act.title}`,
                subtitle: [act.location_name, act.instructor_name].filter(Boolean).join(' · ') || activityDefaultSub,
                time: timeStr,
                date: new Date(d),
                type: 'activity',
                color: 'indigo',
                completed: false,
                raw: act,
              });
            }
          }
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
  const handleAction = async (type: string, message: string, dbTable: string, payloadData: any, eventId?: string) => {
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
      setLastAction({ id: recordedId, type, table: targetTable, eventId });
    }
    setLoading(false);
    setSuccessMsg(tCare.actionNotified(message));
    speakReminder(`${message}! Sua família já sabe.`, params.locale);
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  // Dedicated medication confirmation helper that immediately marks dose as completed,
  // prevents double-tap collisions, removes it from pending, and persists with full date & time.
  const confirmMedicationDose = async (targetEvent: AgendaEvent) => {
    if (confirmingId === targetEvent.id) return;
    setConfirmingId(targetEvent.id);

    const previousState = { ...targetEvent };

    // 1. Immediately update UI state so it leaves "ATIVIDADE DO MOMENTO" and is marked done
    setEvents(prev => prev.map(e => e.id === targetEvent.id ? { ...e, completed: true, subtitle: '✓ Remédio tomado' } : e));

    const doseDateStr = format(targetEvent.date, 'yyyy-MM-dd');
    const doseTimeStr = targetEvent.time || format(new Date(), 'HH:mm');
    const doseNote = JSON.stringify({
      doseDate: doseDateStr,
      doseTime: doseTimeStr,
      eventId: targetEvent.id,
      medName: targetEvent.title,
      schedId: targetEvent.schedId || null,
    });

    try {
      await handleAction(
        'medication',
        `Tomei ${targetEvent.title}`,
        'medication_confirmations',
        {
          medication_id: targetEvent.raw?.id || personInfo.medicationId,
          schedule_id: targetEvent.schedId || targetEvent.raw?.schedule_id || null,
          confirmed_by: personInfo.userId,
          status: 'taken',
          confirmed_at: new Date().toISOString(),
          notes: doseNote,
          doseDate: doseDateStr,
          doseTime: doseTimeStr,
          eventId: targetEvent.id,
        },
        targetEvent.id
      );
    } catch (err) {
      // Revert if saving fails
      setEvents(prev => prev.map(e => e.id === targetEvent.id ? previousState : e));
      setSuccessMsg('');
      alert('Não foi possível registrar o medicamento. Por favor, tente novamente.');
    } finally {
      setConfirmingId(null);
    }
  };

  // Dedicated activity/routine confirmation helper that immediately marks occurrence as completed,
  // prevents double-tap collisions, removes it from pending, and persists with full date & time.
  const confirmActivityOccurrence = async (targetEvent: AgendaEvent) => {
    if (confirmingId === targetEvent.id) return;
    setConfirmingId(targetEvent.id);

    const previousState = { ...targetEvent };

    // 1. Immediately update UI state so it leaves "ATIVIDADE DO MOMENTO" and is marked done
    setEvents(prev => prev.map(e => e.id === targetEvent.id ? { ...e, completed: true, subtitle: '✓ Realizado' } : e));

    const occurrenceDate = format(targetEvent.date, 'yyyy-MM-dd');
    const occurrenceTime = targetEvent.time || format(new Date(), 'HH:mm');

    try {
      if (targetEvent.type === 'meal') {
        await handleAction('meal', `Já me alimentei: ${targetEvent.title}`, 'meals', {
          meal_type: targetEvent.raw?.meal_type || 'other',
          description: targetEvent.title,
          consumed_at: new Date().toISOString(),
          logged_by: personInfo.userId,
          notes: JSON.stringify({ occurrenceDate, occurrenceTime, eventId: targetEvent.id }),
        }, targetEvent.id);
      } else {
        await handleAction('general', `Realizei: ${targetEvent.title}`, 'care_notes', {
          content: `✓ Realizado por ${personInfo.name}: ${targetEvent.title}`,
          type: 'general',
          created_at: new Date().toISOString(),
          notes: JSON.stringify({ occurrenceDate, occurrenceTime, eventId: targetEvent.id, completed: true }),
        }, targetEvent.id);
      }
    } catch (err) {
      setEvents(prev => prev.map(e => e.id === targetEvent.id ? previousState : e));
      setSuccessMsg('');
      alert('Não foi possível registrar a atividade. Por favor, tente novamente.');
    } finally {
      setConfirmingId(null);
    }
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
    // Revert completed state on local event if applicable
    if (lastAction.eventId) {
      setEvents(prev => prev.map(e => e.id === lastAction.eventId ? { ...e, completed: false } : e));
    }
    setLoading(false);
    setLastAction(null);
    setSuccessMsg(tCare.actionUndone);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Read aloud current tab contents
  const handleReadAloudCurrentTab = () => {
    unlockAudioContext();
    triggerHaptic(30);
    if (activeTab === 'home') {
      const speech = tCare.speechHome(
        personInfo.name,
        currentNowEvent?.title,
        cupsDrank,
        !!familyMessage,
      );
      speakReminder(speech, params.locale);
    } else if (activeTab === 'routine') {
      const dayLabel = selectedDayOffset === 0 ? tCare.dayToday : selectedDayOffset === 1 ? tCare.dayTomorrow : tCare.dayYesterday;
      const dayEvents = filteredEvents;
      if (dayEvents.length === 0) {
        speakReminder(tCare.speechNoRoutine(dayLabel), params.locale);
      } else {
        speakReminder(tCare.speechRoutine(dayEvents.length, dayLabel), params.locale);
      }
    } else if (activeTab === 'games') {
      speakReminder(tCare.speechGames, params.locale);
    } else if (activeTab === 'actions') {
      speakReminder(tCare.speechActions, params.locale);
    } else if (activeTab === 'finances') {
      speakReminder(tCare.speechFinances(formatCurrency(financeData.balance)), params.locale);
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

    speakReminder(tCare.speechCallRequested(personInfo.name), params.locale);
    setSuccessMsg(`📞 ${tCare.familyNotified}`);

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

  const todayMedsCount = useMemo(() => {
    const meds = todayEvents.filter(e => e.type === 'medication');
    const taken = meds.filter(e => e.completed).length;
    return { taken, total: meds.length };
  }, [todayEvents]);

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
                  {greetingIcon} {tCare.greeting(personInfo.name)}
                </h1>
              </div>
              <div className='flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400 font-bold'>
                <span className='w-2 h-2 rounded-full bg-emerald-500 animate-pulse' />
                <span className='truncate'>{currentTime.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })} · {tCare.familyConnected}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions (Language / Audio / Read / Logout) */}
          <div className='flex items-center gap-1.5 shrink-0'>
            <ElderlyLanguageSwitcher caredPersonId={params.id} compact />
            <button
              onClick={handleReadAloudCurrentTab}
              title={tCare.readAloudTooltip}
              className='w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center transition active:scale-90 shadow-xs'
            >
              <Volume2 className='h-5 w-5' />
            </button>
            <button
              type="button"
              onClick={() => setVoiceModalOpen(true)}
              title="Ajustar Tom de Voz da IA (Vozes Agradáveis)"
              className='w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 flex items-center justify-center text-lg transition active:scale-90 shadow-xs'
            >
              🎙️
            </button>
            <ThemeToggle className='w-10 h-10' />
            <button
              onClick={() => { supabase.auth.signOut(); router.push(`/${params.locale}/care/login`); }}
              className='px-2.5 h-10 rounded-xl text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-bold transition active:scale-95'
            >
              {tCare.signOut}
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
                  {tCare.trialBadge(trialInfo.daysRemaining)}
                </p>
                <p className='text-[11px] text-emerald-800 dark:text-emerald-300 font-semibold truncate'>
                  {trialInfo.daysRemaining === 1 ? '1 dia' : `${trialInfo.daysRemaining} dias`}
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
                <RotateCcw className='h-3.5 w-3.5' /> {tCare.undoBtn}
              </button>
            )}
          </div>
        )}

        {/* ═════════════════════════════════════════════════════════════ */}
        {/* TAB 1: 🏠 INÍCIO (Experiência Acessível do Idoso)             */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'home' && (
          <div className='space-y-5 pb-32 animate-in fade-in duration-200'>
            
            {/* ── 1. IDENTIFICAÇÃO DA PESSOA E SAUDAÇÃO BREVE ── */}
            <div className='flex items-center justify-between px-1 pt-1'>
              <div>
                <h2 className='text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tight leading-tight'>
                  {greetingIcon} {greetingText}, {personInfo.name}!
                </h2>
                <p className='text-xs font-bold text-stone-500 capitalize mt-0.5'>
                  {format(currentTime, "EEEE, dd 'de' MMMM", { locale: dateFnsLoc })}
                </p>
              </div>
              <button
                type='button'
                onClick={handleReadAloudCurrentTab}
                className='h-9 px-3 rounded-2xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-stone-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 shadow-2xs active:scale-95 transition'
                title='Ouvir resumo do dia em voz alta'
              >
                <Volume2 className='h-4 w-4' /> {tCare.listenBtn}
              </button>
            </div>

            {/* ── 2. RESUMO DA ROTINA E PRÓXIMO COMPROMISSO ── */}
            {/* 2.1 Hero Card: Atividade do Momento */}
            <div className='bg-white dark:bg-stone-900 rounded-3xl border-3 border-indigo-500/70 dark:border-indigo-600 p-4 sm:p-5 shadow-lg relative overflow-hidden'>
              <div className='flex items-center justify-between mb-3'>
                <div className='flex items-center gap-2'>
                  <span className='w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping' />
                  <span className='text-[11px] font-black uppercase tracking-wider text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/80 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800'>
                    {tCare.activityNow}
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
                        ⏰ {currentNowEvent.time || tCare.dayToday}
                      </span>
                      <h3 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight mt-1 truncate'>
                        {currentNowEvent.title}
                      </h3>
                      {currentNowEvent.subtitle && (
                        <p className='text-sm font-semibold text-stone-600 dark:text-stone-300 truncate'>
                          {currentNowEvent.subtitle}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botão de Confirmação em 1 Toque com trava contra toques múltiplos */}
                  <button
                    disabled={loading || Boolean(confirmingId)}
                    onClick={() => {
                      if (currentNowEvent.type === 'medication') {
                        confirmMedicationDose(currentNowEvent);
                      } else {
                        confirmActivityOccurrence(currentNowEvent);
                      }
                    }}
                    className='w-full h-15 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white rounded-2xl shadow-lg flex items-center justify-center gap-2.5 text-base sm:text-lg font-black transition-all active:scale-[0.98] border-b-4 border-emerald-800'
                  >
                    <Check className='h-7 w-7 stroke-[3]' />
                    <span>
                      {confirmingId === currentNowEvent.id
                        ? tCards.buttons.confirming
                        : currentNowEvent.type === 'medication'
                        ? tCards.buttons.tookMed
                        : currentNowEvent.type === 'meal'
                        ? tCards.buttons.hadMeal
                        : tCards.buttons.completedTask}
                    </span>
                  </button>
                </div>
              ) : (
                <div className='py-4 text-center space-y-1.5'>
                  <div className='w-12 h-12 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-2xl'>
                    🌿
                  </div>
                  <h3 className='text-lg font-black text-stone-800 dark:text-stone-200'>
                    {tCare.allDoneTitle}
                  </h3>
                  <p className='text-xs text-stone-500 max-w-xs mx-auto'>
                    {tCare.allDoneDesc}
                  </p>
                </div>
              )}
            </div>

            {/* 2.2 Resumo da rotina de hoje */}
            <div className='bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 p-4 shadow-2xs flex items-center justify-between gap-3'>
              <div className='flex items-center gap-3 min-w-0'>
                <div className='w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-lg shrink-0'>
                  📋
                </div>
                <div className='min-w-0'>
                  <p className='text-xs sm:text-sm font-black text-stone-900 dark:text-stone-100 truncate'>
                    {tCards.routineSummary.completedText(
                      todayEvents.filter(e => e.completed).length,
                      todayEvents.length
                    )}
                  </p>
                  <p className='text-[11px] text-stone-500 font-semibold truncate'>
                    {todayEvents.filter(e => !e.completed).length > 0
                      ? tCards.routineSummary.remainingText(todayEvents.filter(e => !e.completed).length)
                      : tCards.routineSummary.allDone}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => { triggerHaptic(20); setActiveTab('routine'); }}
                className='h-8 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold shrink-0 transition active:scale-95'
              >
                {tCards.routineSummary.seeAgenda}
              </button>
            </div>

            {/* ── 3. CARDS PRINCIPAIS HABILITADOS (5 CARDS EXATOS) ── */}
            <div className='space-y-2'>
              <div className='grid grid-cols-2 gap-3'>
                
                {/* Card 1: Minha rotina */}
                <button
                  type='button'
                  onClick={() => {
                    triggerHaptic(20);
                    setRoutineFilter('all');
                    setActiveTab('routine');
                  }}
                  className='bg-[#3B82F6] hover:bg-[#2563EB] active:bg-[#1D4ED8] text-white p-4 rounded-3xl shadow-md text-left flex flex-col justify-between min-h-[120px] transition-transform active:scale-95 border-b-4 border-[#1E40AF]'
                >
                  <div className='flex items-center justify-between'>
                    <div className='w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl'>
                      ⏰
                    </div>
                    <ChevronRight className='h-5 w-5 text-white/70' />
                  </div>
                  <div className='mt-3'>
                    <h4 className='text-base sm:text-lg font-black leading-tight'>
                      {tCards.routine.title}
                    </h4>
                    <p className='text-[11px] text-blue-100 font-semibold line-clamp-1 mt-0.5'>
                      {tCards.routine.subtitle}
                    </p>
                  </div>
                </button>

                {/* Card 2: Meus medicamentos */}
                <button
                  type='button'
                  onClick={() => {
                    triggerHaptic(20);
                    setRoutineFilter('medication');
                    setActiveTab('routine');
                  }}
                  className='bg-[#059669] hover:bg-[#047857] active:bg-[#065F46] text-white p-4 rounded-3xl shadow-md text-left flex flex-col justify-between min-h-[120px] transition-transform active:scale-95 border-b-4 border-[#064E3B]'
                >
                  <div className='flex items-center justify-between'>
                    <div className='w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl'>
                      💊
                    </div>
                    {todayMedsCount.total > 0 && (
                      <span className='text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full'>
                        {todayMedsCount.taken}/{todayMedsCount.total}
                      </span>
                    )}
                  </div>
                  <div className='mt-3'>
                    <h4 className='text-base sm:text-lg font-black leading-tight'>
                      {tCards.medications.title}
                    </h4>
                    <p className='text-[11px] text-emerald-100 font-semibold line-clamp-1 mt-0.5'>
                      {tCards.medications.subtitle(todayMedsCount.taken, todayMedsCount.total)}
                    </p>
                  </div>
                </button>

                {/* Card 3: Minha agenda */}
                <button
                  type='button'
                  onClick={() => {
                    triggerHaptic(20);
                    setRoutineFilter('appointment');
                    setActiveTab('routine');
                  }}
                  className='bg-[#0284C7] hover:bg-[#0369A1] active:bg-[#075985] text-white p-4 rounded-3xl shadow-md text-left flex flex-col justify-between min-h-[120px] transition-transform active:scale-95 border-b-4 border-[#0C4A6E]'
                >
                  <div className='flex items-center justify-between'>
                    <div className='w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl'>
                      📅
                    </div>
                    <ChevronRight className='h-5 w-5 text-white/70' />
                  </div>
                  <div className='mt-3'>
                    <h4 className='text-base sm:text-lg font-black leading-tight'>
                      {tCards.agenda.title}
                    </h4>
                    <p className='text-[11px] text-sky-100 font-semibold line-clamp-1 mt-0.5'>
                      {tCards.agenda.subtitle}
                    </p>
                  </div>
                </button>

                {/* Card 4: Conversar com a IA (Nina) */}
                <button
                  type='button'
                  onClick={() => {
                    triggerHaptic(40);
                    setNinaModalOpen(true);
                  }}
                  className='bg-[#7C3AED] hover:bg-[#6D28D9] active:bg-[#5B21B6] text-white p-4 rounded-3xl shadow-md text-left flex flex-col justify-between min-h-[120px] transition-transform active:scale-95 border-b-4 border-[#4C1D95]'
                >
                  <div className='flex items-center justify-between'>
                    <div className='w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl'>
                      ✨
                    </div>
                    <span className='text-[10px] font-black bg-white/25 px-2 py-0.5 rounded-full'>
                      {tCards.aiChat.badge}
                    </span>
                  </div>
                  <div className='mt-3'>
                    <h4 className='text-base sm:text-lg font-black leading-tight'>
                      {tCards.aiChat.title}
                    </h4>
                    <p className='text-[11px] text-purple-100 font-semibold line-clamp-1 mt-0.5'>
                      {tCards.aiChat.subtitle}
                    </p>
                  </div>
                </button>

                {/* Card 5: Jogos e Memória (Ocupa 2 colunas no celular para destaque) */}
                <button
                  type='button'
                  onClick={() => {
                    triggerHaptic(20);
                    setActiveTab('games');
                  }}
                  className='col-span-2 bg-[#DB2777] hover:bg-[#BE185D] active:bg-[#9D174D] text-white p-4 rounded-3xl shadow-md text-left flex items-center justify-between transition-transform active:scale-95 border-b-4 border-[#831843]'
                >
                  <div className='flex items-center gap-3.5 min-w-0'>
                    <div className='w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shrink-0'>
                      🎮
                    </div>
                    <div className='min-w-0'>
                      <div className='flex items-center gap-2'>
                        <h4 className='text-base sm:text-lg font-black leading-tight'>
                          {tCards.games.title}
                        </h4>
                        <span className='text-[10px] font-black bg-white/25 px-2 py-0.2 rounded-full'>
                          {tCards.games.badge}
                        </span>
                      </div>
                      <p className='text-xs text-pink-100 font-semibold truncate mt-0.5'>
                        {tCards.games.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className='h-6 w-6 text-white/80 shrink-0 ml-2' />
                </button>

              </div>
            </div>

            {/* ── 4. RECADO COM CARINHO (Gerado por IA, Estável, Adulto e Acolhedor) ── */}
            <CaringNoteCard locale={params.locale} elderName={personInfo.name} />

            {/* ── 5. CONTATOS DE EMERGÊNCIA (ÚLTIMO BLOCO DO CONTEÚDO) ── */}
            <EmergencyContactsBlock locale={params.locale} personalContacts={emergencyContacts} />

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
                  <h2 className='text-lg font-black text-stone-900 dark:text-stone-100'>{tCare.routineTitle}</h2>
                  <p className='text-xs text-stone-500 font-bold capitalize'>
                    {format(selectedDate, normalizeLang(params.locale) === 'en' ? "EEEE, MMMM do" : normalizeLang(params.locale) === 'de' ? "EEEE, d. MMMM" : normalizeLang(params.locale) === 'fr' ? "EEEE d MMMM" : "EEEE, dd 'de' MMMM", { locale: dateFnsLoc })}
                  </p>
                </div>
                <button
                  onClick={handleReadAloudCurrentTab}
                  className='h-8 px-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 active:scale-95'
                >
                  <Volume2 className='h-3.5 w-3.5' /> {tCare.listenBtn}
                </button>
              </div>

              {/* Day Switcher */}
              <div className='grid grid-cols-3 gap-1.5 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl'>
                {[
                  { offset: -1, label: tCare.dayYesterday },
                  { offset: 0, label: tCare.dayToday },
                  { offset: 1, label: tCare.dayTomorrow },
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
                  { key: 'all', label: tCare.filterAll },
                  { key: 'medication', label: `💊 ${tCare.filterMeds}` },
                  { key: 'meal', label: `🍽️ ${tCare.filterMeals}` },
                  { key: 'appointment', label: `🩺 ${tCare.filterAppts}` },
                  { key: 'task', label: `✅ ${tCare.filterTasks}` },
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
                  {tCare.noEventsDay}
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
                          ⏰ {ev.time || tCare.flexibleSchedule}
                        </span>
                        {ev.completed && (
                          <span className='text-[10px] font-black text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-1.5 py-0.2 rounded-md'>
                            {tCare.doneStatus}
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

                    {/* Botão de confirmação direta na rotina */}
                    {!ev.completed && (
                      <button
                        type='button'
                        disabled={Boolean(confirmingId)}
                        onClick={() => {
                          triggerHaptic(25);
                          if (ev.type === 'medication') {
                            confirmMedicationDose(ev);
                          } else {
                            confirmActivityOccurrence(ev);
                          }
                        }}
                        className='px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:opacity-50 text-white text-xs font-black shrink-0 active:scale-95 shadow-xs flex items-center gap-1 transition'
                      >
                        <Check className='h-4 w-4 stroke-[3]' />
                        <span>{normalizeLang(params.locale) === 'en' ? 'Done' : normalizeLang(params.locale) === 'es' ? 'Hecho' : normalizeLang(params.locale) === 'fr' ? 'Fait' : normalizeLang(params.locale) === 'de' ? 'Erledigt' : 'Fiz'}</span>
                      </button>
                    )}
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
                    {tCare.gamesHubTitle}
                  </h2>
                  <p className='text-xs font-bold text-stone-600 dark:text-slate-300 mt-0.5'>
                    {tCare.gamesHubSubtitle}
                  </p>
                </div>
              </div>
              <button
                type='button'
                onClick={() => { setActiveTab('home'); triggerHaptic(20); }}
                className='text-xs font-black text-stone-700 dark:text-slate-200 bg-stone-100 dark:bg-stone-800 px-3 py-2 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-200'
              >
                {tCare.backBtn}
              </button>
            </div>

            <GamesAndMomentsHub
              showBackHeader={false}
              caredPersonId={params.id}
              caredPersonName={personInfo.name}
              organizationId={personInfo.organizationId}
              locale={params.locale}
            />
          </div>
        )}

        {/* TAB 3: ⚡ AÇÕES (Central de 1 Toque para o Idoso)             */}
        {/* ═════════════════════════════════════════════════════════════ */}
        {activeTab === 'actions' && (
          <div className='space-y-4 animate-in fade-in duration-200'>
            
            {/* Header explicativo */}
            <div className='bg-white dark:bg-stone-900 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-xs'>
              <h2 className='text-lg font-black text-stone-900 dark:text-stone-100'>{tCare.actionsTitle}</h2>
              <p className='text-xs text-stone-500 font-medium'>{tCare.actionsSubtitle}</p>
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
                  <span className='text-sm font-black text-stone-900 dark:text-white block'>{tCare.actionFinancesTitle}</span>
                  <span className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>{tCare.actionFinancesSubtitle}</span>
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
                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>{tCare.actionWaterLabel}</span>
                <span className='text-xs font-bold text-sky-700 dark:text-sky-300'>{tCare.actionWaterSub(cupsDrank)}</span>
              </button>

              {/* 2. Tomei Remédio */}
              <button
                disabled={loading || (!personInfo.medicationId && todayEvents.filter(e => e.type === 'medication' && !e.completed).length === 0)}
                onClick={() => {
                  const targetMed = todayEvents.find(e => e.type === 'medication' && !e.completed) || (currentNowEvent?.type === 'medication' ? currentNowEvent : null);
                  if (targetMed) {
                    confirmMedicationDose(targetMed);
                  } else {
                    handleAction('medication', 'Medicamento tomado!', 'medication_confirmations', {
                      medication_id: personInfo.medicationId,
                      confirmed_by: personInfo.userId,
                      status: 'taken',
                      confirmed_at: new Date().toISOString(),
                    });
                  }
                }}
                className='bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 border-2 border-emerald-300 dark:border-emerald-800 p-4 rounded-3xl flex flex-col items-center gap-1.5 transition active:scale-95 text-center shadow-xs disabled:opacity-50'
              >
                <div className='w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-3xl'>
                  💊
                </div>
                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>{tCare.actionMedsLabel}</span>
                <span className='text-xs font-bold text-emerald-700 dark:text-emerald-300'>{tCare.actionMedsSub}</span>
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
                <span className='text-base font-black text-stone-900 dark:text-stone-100 block'>{tCare.actionMealLabel}</span>
                <span className='text-xs font-bold text-amber-700 dark:text-amber-300'>{tCare.actionMealSub}</span>
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
                  {hour < 15 ? tCare.actionWakeLabel : tCare.actionSleepLabel}
                </span>
                <span className='text-xs font-bold text-indigo-700 dark:text-indigo-300'>
                  {hour < 15 ? tCare.actionWakeSub : tCare.actionSleepSub}
                </span>
              </button>
            </div>

            {/* Termômetro de Humor */}
            <div className='bg-white dark:bg-stone-900 p-4 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-xs space-y-2.5'>
              <h3 className='text-base font-black text-stone-900 dark:text-stone-100'>{tCare.actionMoodTitle}</h3>
              <div className='grid grid-cols-4 gap-2'>
                {[
                  { mood: 'great', emoji: '😄', label: tCare.moodGreat },
                  { mood: 'good', emoji: '😊', label: tCare.moodGood },
                  { mood: 'okay', emoji: '😐', label: tCare.moodOkay },
                  { mood: 'bad', emoji: '😔', label: tCare.moodSad },
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
                  <span>{tCare.financeIncome}: <strong className='text-emerald-700'>{formatCurrency(financeData.monthlyIncome)}</strong></span>
                  <span>{tCare.financeExpenses}: <strong className='text-amber-700'>{formatCurrency(financeData.totalExpenses)}</strong></span>
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
                <span>{tCare.financeRegisterExpense}</span>
              </button>

              <button
                onClick={() => setSeniorPensionModalOpen(true)}
                className='w-full h-13 bg-white dark:bg-stone-900 border-2 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-200 rounded-2xl flex items-center justify-center gap-2 text-sm font-extrabold active:scale-[0.98] shadow-xs'
              >
                <Landmark className='h-5 w-5 text-emerald-600 dark:text-emerald-400' />
                <span>{tCare.financePension}</span>
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
            <span className='text-[11px] leading-none'>{tCare.tabHome}</span>
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
            <span className='text-[11px] leading-none'>{tCare.tabRoutine}</span>
          </button>

          {/* Tab Central: SOS de Emergência */}
          <button
            onClick={() => { setSosModalOpen(true); triggerHaptic([50, 50]); }}
            className='py-1 flex flex-col items-center justify-center -mt-4 group'
          >
            <div className='w-13 h-13 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-3 border-white dark:border-stone-900 group-active:scale-90 transition'>
              <ShieldAlert className='h-7 w-7' />
            </div>
            <span className='text-[10px] font-black text-red-600 dark:text-red-400 leading-none mt-0.5'>{tCare.tabSos}</span>
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
            <span className='text-[11px] leading-none'>{tCare.tabGames}</span>
          </button>

          {/* Tab 4: 👩‍⚕️ Nina IA */}
          <button
            onClick={() => { setNinaModalOpen(true); triggerHaptic(20); }}
            className='py-1.5 flex flex-col items-center justify-center gap-1 rounded-2xl transition-all text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-900'
          >
            <div className='w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-sm shadow-2xs'>
              👩‍⚕️
            </div>
            <span className='text-[11px] leading-none font-bold'>{tCare.ninaTab}</span>
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
                {tCare.conversationRequestTitle}
              </span>
              <h2 className='text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 leading-tight'>
                {tCare.conversationNotifiedTitle}
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
                {tCare.sosCancel}
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
                <p className='text-xs text-stone-500 font-medium'>{tCare.expenseDeducted}</p>
              </div>
            </div>

            <form onSubmit={handleSeniorAddExpense} className='space-y-3.5'>
              <div>
                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>{tCare.expenseLabelAmount}</label>
                <input
                  type='number' step='0.01' required autoFocus placeholder='0.00'
                  value={seniorExpenseAmount} onChange={(e) => setSeniorExpenseAmount(e.target.value)}
                  className='w-full text-2xl font-black p-3 rounded-2xl border-2 border-emerald-300 focus:border-emerald-600 bg-emerald-50/50 dark:bg-stone-800 dark:text-white outline-hidden text-center'
                />
              </div>

              <div>
                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1.5'>{tCare.expenseLabelCategory}</label>
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
                <label className='block text-[11px] font-bold text-stone-500 dark:text-stone-400 mb-1'>{tCare.expenseLabelDetail}</label>
                <input
                  type='text' placeholder='Ex: Remédio, Pão...'
                  value={seniorExpenseDesc} onChange={(e) => setSeniorExpenseDesc(e.target.value)}
                  className='w-full text-sm font-semibold p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 dark:text-white outline-hidden'
                />
              </div>

              <div className='flex gap-2 pt-1'>
                <Button type='button' variant='outline' onClick={() => setExpenseModalOpen(false)} className='flex-1 h-12 text-sm font-bold rounded-xl border-stone-300'>
                  {tCare.cancelBtn}
                </Button>
                <Button type='submit' disabled={savingExpense} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>
                  {savingExpense ? tCare.expenseSaving : tCare.expenseSave}
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
                <p className='text-xs text-stone-500 font-medium'>{tCare.pensionDesc}</p>
              </div>
            </div>

            <form onSubmit={handleSeniorSavePension} className='space-y-3.5'>
              <div>
                <label className='block text-xs font-black text-stone-700 dark:text-stone-300 mb-1'>{tCare.pensionLabelAmount}</label>
                <input
                  type='number' step='0.01' required autoFocus placeholder='Ex: 3000.00'
                  value={seniorPensionInput} onChange={(e) => setSeniorPensionInput(e.target.value)}
                  className='w-full text-2xl font-black p-3 rounded-2xl border-2 border-emerald-300 focus:border-emerald-600 bg-emerald-50/50 dark:bg-stone-800 dark:text-white outline-hidden text-center'
                />
              </div>

              <div className='flex gap-2 pt-1'>
                <Button type='button' variant='outline' onClick={() => setSeniorPensionModalOpen(false)} className='flex-1 h-12 text-sm font-bold rounded-xl border-stone-300'>
                  {tCare.cancelBtn}
                </Button>
                <Button type='submit' disabled={savingPension} className='flex-2 h-12 text-sm font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md active:scale-95'>
                  {savingPension ? tCare.pensionSaving : tCare.pensionSave}
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

      {/* ── MODAL: VOZES AGRADÁVEIS DE IA ── */}
      <VoiceSettingsModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        locale={params.locale}
      />

    </div>
  );
}
