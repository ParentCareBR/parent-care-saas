'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { createClient } from '@/lib/supabase/client';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Pill,
  Droplet,
  Calendar,
  Utensils,
  Heart,
  Footprints,
  Clock,
  ExternalLink,
  Phone,
  AlertCircle,
  AlertTriangle,
  Receipt,
  Check,
  Plus,
  Activity,
  Send,
  Sparkles,
  FileText,
  CreditCard,
  Users,
  ChevronRight,
  Stethoscope,
  Syringe,
  BookOpen,
  MessageSquare,
  Gamepad2,
  BellRing,
  CheckCircle2,
  Eye,
  Thermometer,
  Gauge,
  Wind,
  BedDouble,
  Dumbbell,
  HeartPulse,
  Fingerprint,
  Boxes,
  ShoppingCart,
  DollarSign,
  ClipboardList,
  ShieldCheck,
  TrendingUp,
  Flame,
  ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MobileMacroMicroCards } from '@/components/dashboard/MobileMacroMicroCards';
import { QuickVitalsModal } from '@/components/dashboard/QuickVitalsModal';
import { QuickHandoverModal } from '@/components/dashboard/QuickHandoverModal';

function playEmergencySiren() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const tones = [880, 587.33, 880, 587.33];
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const t = ctx.currentTime + idx * 0.22;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.22);
    });
  } catch (e) {
    console.warn('Audio error:', e);
  }
}

export default function DashboardOverviewPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId } = useAuth();
  const { caredPeople, selectedPerson, loading: personLoading } = useCaredPerson();
  const { isModuleEnabled } = useMonitoring();
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'hoje' | 'semana'>('hoje');
  const [timelineFilter, setTimelineFilter] = useState<'all' | 'meds' | 'appts' | 'meals' | 'acts'>('all');
  const [userName, setUserName] = useState('');
  const [activeEmergency, setActiveEmergency] = useState<{ id: string; created_at: string; description: string; severity: string } | null>(null);
  const [activeHelpRequest, setActiveHelpRequest] = useState<{ id: string; created_at: string; message: string } | null>(null);
  const [primaryContactPhone, setPrimaryContactPhone] = useState<string>('');
  const [resolvingAlert, setResolvingAlert] = useState(false);
  const dismissedAlertIdsRef = useRef<Set<string>>(new Set());
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set();
    try {
      const saved = localStorage.getItem('parentcare_dismissed_alerts');
      return saved ? new Set<string>(JSON.parse(saved)) : new Set<string>();
    } catch {
      return new Set();
    }
  });

  // Health & Routine State
  const [medsData, setMedsData] = useState<{ taken: number; total: number; list: any[] }>({ taken: 0, total: 0, list: [] });
  const [hydration, setHydration] = useState<{ cups: number; goal: number }>({ cups: 0, goal: 8 });
  const [meals, setMeals] = useState<{ done: number; total: number }>({ done: 0, total: 4 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [todayLifeActivities, setTodayLifeActivities] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [vitals, setVitals] = useState<{ bp: string; glucose: string; saturation: string; temp: string; heartRate: string }>({
    bp: '120/80 mmHg',
    glucose: '98 mg/dL',
    saturation: '98%',
    temp: '36.5°C',
    heartRate: '72 bpm',
  });
  const [financialSummary, setFinancialSummary] = useState<{ balance: number; income: number; expenses: number } | null>(null);
  const [peopleInRoutineCount, setPeopleInRoutineCount] = useState<number>(2);

  // Modal dialog states
  const [vitalsModalOpen, setVitalsModalOpen] = useState(false);
  const [handoverModalOpen, setHandoverModalOpen] = useState(false);
  const [quickWaterLoading, setQuickWaterLoading] = useState(false);

  const today = new Date();
  const todayFormatted = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const todayCapitalized = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  const fetchData = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;

    // Get current user's name
    const { data: profile } = await supabase.auth.getUser();
    if (profile?.user) {
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('users(full_name)')
        .eq('user_id', profile.user.id)
        .eq('organization_id', currentOrganizationId)
        .maybeSingle();
      if (orgMember?.users?.full_name) {
        setUserName(orgMember.users.full_name.split(' ')[0]);
      }
    }

    // Organization team count
    try {
      const { count } = await supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationId);
      if (count) setPeopleInRoutineCount(count);
    } catch {}

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    // Medications
    if (isModuleEnabled('meds_scheduled')) {
      const { data: allMeds } = await supabase
        .from('medications')
        .select('id, name, dosage, unit, instructions, medication_schedules(id, time_of_day)')
        .eq('cared_person_id', selectedPerson.id)
        .eq('is_active', true);

      const { data: takenLogs } = await supabase
        .from('medication_logs')
        .select('medication_id, schedule_id')
        .eq('cared_person_id', selectedPerson.id)
        .eq('status', 'taken')
        .gte('taken_at', todayStart.toISOString())
        .lte('taken_at', todayEnd.toISOString());

      const totalSchedules = (allMeds || []).reduce((acc: number, m: any) => acc + (m.medication_schedules?.length || 1), 0);
      const takenCount = takenLogs?.length || 0;
      setMedsData({ taken: takenCount, total: totalSchedules || 0, list: allMeds || [] });
    }

    // Hydration
    if (isModuleEnabled('routine_hydration')) {
      const { data: hydLogs } = await supabase
        .from('hydration_logs')
        .select('amount_ml')
        .eq('cared_person_id', selectedPerson.id)
        .gte('logged_at', todayStart.toISOString());
      const totalMl = (hydLogs || []).reduce((acc: number, h: any) => acc + (h.amount_ml || 250), 0);
      setHydration({ cups: Math.round(totalMl / 250), goal: 8 });
    }

    // Meals
    if (isModuleEnabled('routine_meals')) {
      const { data: mealLogs } = await supabase
        .from('meals')
        .select('id, meal_type, description, consumed_at')
        .eq('cared_person_id', selectedPerson.id)
        .gte('created_at', todayStart.toISOString());
      setMeals({ done: mealLogs?.length || 0, total: 4 });
    }

    // Appointments
    if (isModuleEnabled('schedule_appointments')) {
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, title, starts_at, doctor_name, location, status')
        .eq('cared_person_id', selectedPerson.id)
        .gte('starts_at', todayStart.toISOString())
        .order('starts_at', { ascending: true })
        .limit(8);
      setAppointments(appts || []);
    }

    // Today's Life Activities (Physical, Courses, Rehab, Leisure)
    try {
      const todayDayOfWeek = today.getDay();
      const todayDateStr = format(today, 'yyyy-MM-dd');

      const { data: acts } = await supabase
        .from('life_activities')
        .select(`
          id, title, activity_type, category, schedule_time, recurrence_days,
          location_name, instructor_name, is_active,
          activity_occurrences(id, occurrence_date, participation_status, voluntary_perception)
        `)
        .eq('cared_person_id', selectedPerson.id)
        .eq('is_active', true);

      if (acts) {
        const todayActs = acts.filter((a: any) => {
          if (Array.isArray(a.recurrence_days) && a.recurrence_days.length > 0) {
            return a.recurrence_days.includes(todayDayOfWeek);
          }
          return true;
        }).map((a: any) => {
          const occ = (a.activity_occurrences || []).find((o: any) => o.occurrence_date === todayDateStr);
          return {
            ...a,
            todayOccurrence: occ || null,
          };
        });
        setTodayLifeActivities(todayActs);
      }
    } catch (e) {
      console.error('Error fetching today life activities:', e);
    }

    // Recent Activities (care_notes) and extract vitals
    const { data: notes } = await supabase
      .from('care_notes')
      .select('id, content, created_at, type')
      .eq('cared_person_id', selectedPerson.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (notes) {
      setRecentActivities(notes);
      // Look for latest vitals in care notes
      const vitalsNote = notes.find((n: any) => n.content?.includes('[Sinais Vitais]'));
      if (vitalsNote) {
        const bpMatch = vitalsNote.content.match(/PA:\s*([\d/]+)/);
        const glucMatch = vitalsNote.content.match(/Glicemia:\s*([\d]+)/);
        const spo2Match = vitalsNote.content.match(/SpO₂:\s*([\d%]+)/);
        const tempMatch = vitalsNote.content.match(/Temp:\s*([\d.,°C]+)/);
        const fcMatch = vitalsNote.content.match(/FC:\s*([\d]+)/);

        setVitals({
          bp: bpMatch ? `${bpMatch[1]} mmHg` : '120/80 mmHg',
          glucose: glucMatch ? `${glucMatch[1]} mg/dL` : '98 mg/dL',
          saturation: spo2Match ? (spo2Match[1].includes('%') ? spo2Match[1] : `${spo2Match[1]}%`) : '98%',
          temp: tempMatch ? (tempMatch[1].includes('°C') ? tempMatch[1] : `${tempMatch[1]}°C`) : '36.5°C',
          heartRate: fcMatch ? `${fcMatch[1]} bpm` : '72 bpm',
        });
      }
    }

    // Alerts
    try {
      const [{ data: openEm }, { data: openHr }, { data: contacts }] = await Promise.all([
        supabase
          .from('emergency_events')
          .select('id, created_at, description, severity')
          .eq('cared_person_id', selectedPerson.id)
          .is('resolved_at', null)
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('help_requests')
          .select('id, created_at, message')
          .eq('cared_person_id', selectedPerson.id)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(1),
        supabase
          .from('emergency_contacts')
          .select('phone')
          .eq('cared_person_id', selectedPerson.id)
          .order('is_primary', { ascending: false })
          .limit(1),
      ]);

      const lastDismissedEmTime = typeof window !== 'undefined' && selectedPerson?.id
        ? localStorage.getItem(`parentcare_resolved_emergency_${selectedPerson.id}`)
        : null;
      const lastDismissedHrTime = typeof window !== 'undefined' && selectedPerson?.id
        ? localStorage.getItem(`parentcare_resolved_help_${selectedPerson.id}`)
        : null;

      const isDismissed = (item: any, type: 'emergency' | 'help') => {
        if (!item || !item.id) return true;
        if (dismissedAlertIdsRef.current.has(item.id)) return true;
        if (dismissedAlertIds.has(item.id)) return true;
        if (item.created_at && (Date.now() - new Date(item.created_at).getTime() > 2 * 3600 * 1000)) return true;
        const cutoff = type === 'emergency' ? lastDismissedEmTime : lastDismissedHrTime;
        if (cutoff && item.created_at && new Date(item.created_at) <= new Date(cutoff)) return true;
        return false;
      };

      const validEm = (openEm || []).find((e: any) => !isDismissed(e, 'emergency'));
      setActiveEmergency(validEm || null);

      const validHr = (openHr || []).find((h: any) => !isDismissed(h, 'help'));
      setActiveHelpRequest(validHr || null);

      if (contacts && contacts[0]?.phone) setPrimaryContactPhone(contacts[0].phone);
    } catch (e) {
      console.error('Error fetching alerts:', e);
    }

    // Finances
    try {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
      const { data: exp } = await supabase
        .from('cared_person_expenses')
        .select('amount, type')
        .eq('cared_person_id', selectedPerson.id)
        .gte('spent_at', monthStart);

      if (exp) {
        const income = exp.filter((e: any) => e.type === 'income').reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
        const expenses = exp.filter((e: any) => e.type !== 'income').reduce((a: number, b: any) => a + Number(b.amount || 0), 0);
        setFinancialSummary({ balance: income - expenses, income, expenses });
      }
    } catch {}
  }, [selectedPerson, currentOrganizationId, isModuleEnabled, supabase, dismissedAlertIds]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    if (activeEmergency) playEmergencySiren();
  }, [activeEmergency?.id]);

  const handleResolveAlert = async (alertType: 'emergency' | 'help', id: string) => {
    setResolvingAlert(true);
    dismissedAlertIdsRef.current.add(id);
    const nowIso = new Date().toISOString();
    try {
      if (selectedPerson?.id) {
        localStorage.setItem(`parentcare_resolved_${alertType}_${selectedPerson.id}`, nowIso);
      }
    } catch {}
    setDismissedAlertIds((prev) => new Set(prev).add(id));
    if (alertType === 'emergency') setActiveEmergency(null);
    else setActiveHelpRequest(null);

    try {
      await fetch('/api/care/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resolve_alert',
          alert_type: alertType,
          id,
          cared_person_id: selectedPerson?.id,
        }),
      });
    } catch (err) {
      console.error('Error resolving alert:', err);
    } finally {
      setResolvingAlert(false);
    }
  };

  // Quick Action: +1 Glass of Water (+250ml)
  const handleQuickLogWater = async () => {
    if (!selectedPerson || !currentOrganizationId) return;
    setQuickWaterLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData?.user?.id || selectedPerson.id;

      const { error } = await supabase.from('hydration_logs').insert({
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        amount_ml: 250,
        logged_by: currentUserId,
      });

      if (error) throw error;

      setHydration((prev) => ({ ...prev, cups: prev.cups + 1 }));

      toast({
        title: 'Água Registrada! 💧',
        description: `+1 copo (250ml) computado para ${selectedPerson.full_name}. Meta: ${(hydration.cups + 1) * 250} / 2.000ml.`,
      });
    } catch (err: any) {
      console.error('Erro ao registrar água:', err);
      toast({
        title: 'Erro ao registrar água',
        description: err.message || 'Verifique sua conexão.',
        variant: 'destructive',
      });
    } finally {
      setQuickWaterLoading(false);
    }
  };

  // Metrics calculation
  const totalPredictedActivities = (appointments?.length || 0) + (todayLifeActivities?.length || 0);
  const pendingConfirmations = (medsData.total - medsData.taken > 0 ? medsData.total - medsData.taken : 0) +
    (todayLifeActivities?.filter(a => !a.todayOccurrence?.participation_status).length || 0);

  // Combined timeline items for today
  const timelineItems: Array<{
    id: string;
    time: string;
    title: string;
    subtitle: string;
    category: 'meds' | 'appts' | 'meals' | 'acts';
    icon: any;
    status: 'Confirmado' | 'Planejado' | 'Concluído';
    isGreenDot: boolean;
  }> = [];

  // 1. Appointments
  appointments.forEach((appt) => {
    const timeStr = format(new Date(appt.starts_at), 'HH:mm');
    timelineItems.push({
      id: `appt-${appt.id}`,
      time: timeStr,
      title: appt.title,
      subtitle: `${appt.location || 'Local a definir'}${appt.doctor_name ? ` · Dr(a). ${appt.doctor_name}` : ''}`,
      category: 'appts',
      icon: Stethoscope,
      status: appt.status === 'completed' ? 'Concluído' : 'Confirmado',
      isGreenDot: appt.status !== 'completed',
    });
  });

  // 2. Life activities
  todayLifeActivities.forEach((act) => {
    const timeStr = act.schedule_time ? act.schedule_time.slice(0, 5) : '10:00';
    const isDone = act.todayOccurrence?.participation_status === 'participated';
    timelineItems.push({
      id: `act-${act.id}`,
      time: timeStr,
      title: act.title,
      subtitle: `${act.location_name || 'Centro de convivência'}${act.instructor_name ? ` · ${act.instructor_name} acompanha` : ''}`,
      category: 'acts',
      icon: Activity,
      status: isDone ? 'Concluído' : 'Planejado',
      isGreenDot: isDone,
    });
  });

  // 3. Medications (scheduled)
  (medsData.list || []).forEach((med: any) => {
    const schedules = med.medication_schedules || [];
    schedules.forEach((sched: any) => {
      const timeStr = sched.time_of_day ? sched.time_of_day.slice(0, 5) : '08:00';
      timelineItems.push({
        id: `med-${med.id}-${sched.id}`,
        time: timeStr,
        title: `${med.name} ${med.dosage}${med.unit}`,
        subtitle: med.instructions || 'Tomar conforme prescrição médica',
        category: 'meds',
        icon: Pill,
        status: medsData.taken > 0 ? 'Concluído' : 'Planejado',
        isGreenDot: medsData.taken > 0,
      });
    });
  });

  // Sort timeline chronologically
  timelineItems.sort((a, b) => a.time.localeCompare(b.time));

  // Filtered timeline
  const filteredTimeline = timelineItems.filter((item) => {
    if (timelineFilter === 'all') return true;
    return item.category === timelineFilter;
  });

  const nextMedicationName = medsData.list?.[0]?.name || 'Nenhum pendente';

  return (
    <div className="space-y-6 pb-12 text-stone-900 dark:text-[#F1F5F9]">

      {/* ─── ALERTAS CRÍTICOS EM ABERTO (SE HOUVER) ─────────────────────────────── */}
      {activeEmergency && (
        <div className="bg-red-600 text-white rounded-3xl p-5 sm:p-6 shadow-2xl border-4 border-red-400 animate-pulse flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-red-600 flex items-center justify-center font-black text-3xl shrink-0 shadow-md">
              🚨
            </div>
            <div>
              <span className="bg-white/20 text-white px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider">
                Alerta Crítico em Aberto
              </span>
              <h2 className="text-xl sm:text-2xl font-black mt-1 leading-tight">
                {selectedPerson?.full_name} acionou EMERGÊNCIA / SOS!
              </h2>
              <p className="text-sm text-red-100 mt-1">
                {format(new Date(activeEmergency.created_at), "HH:mm 'de' dd/MM")} · {activeEmergency.description}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            {primaryContactPhone && (
              <a
                href={`tel:${primaryContactPhone}`}
                className="flex-1 md:flex-initial bg-white hover:bg-red-50 text-red-700 font-black px-5 py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 text-sm transition-all"
              >
                <Phone className="h-4 w-4" /> Ligar Agora
              </a>
            )}
            <Button
              disabled={resolvingAlert}
              onClick={() => handleResolveAlert('emergency', activeEmergency.id)}
              className="flex-1 md:flex-initial bg-red-800 hover:bg-red-900 text-white font-black px-5 py-3 rounded-2xl h-auto text-sm border border-red-400"
            >
              <Check className="h-4 w-4 mr-1" /> {resolvingAlert ? 'Salvando...' : 'Marcar como Atendido'}
            </Button>
          </div>
        </div>
      )}

      {activeHelpRequest && !activeEmergency && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white rounded-3xl p-5 sm:p-6 shadow-xl border-2 border-amber-300 flex flex-col md:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 text-white flex items-center justify-center text-2xl shrink-0">
              📞
            </div>
            <div>
              <span className="bg-black/15 text-amber-100 px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider">
                Pedido de Ajuda
              </span>
              <h2 className="text-lg sm:text-xl font-black mt-0.5 leading-tight">
                {selectedPerson?.full_name} pediu contato / quer conversar
              </h2>
              <p className="text-xs text-amber-100 mt-0.5">
                {format(new Date(activeHelpRequest.created_at), "HH:mm 'de' dd/MM")} · {activeHelpRequest.message}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            {primaryContactPhone && (
              <a
                href={`tel:${primaryContactPhone}`}
                className="flex-1 md:flex-initial bg-white hover:bg-amber-50 text-amber-800 font-black px-5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5"
              >
                <Phone className="h-3.5 w-3.5" /> Ligar
              </a>
            )}
            <Button
              disabled={resolvingAlert}
              onClick={() => handleResolveAlert('help', activeHelpRequest.id)}
              className="flex-1 md:flex-initial bg-amber-800 hover:bg-amber-900 text-white font-black px-5 py-2.5 rounded-xl h-auto text-xs"
            >
              <Check className="h-3.5 w-3.5 mr-1" /> {resolvingAlert ? '...' : 'Atendido'}
            </Button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📱 MOBILE VIEW: OS CARDS MACROS EXPANSÍVEIS COM MICRO CARDS COLORIDOS      */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4">
        
        {/* Person bar on mobile */}
        {selectedPerson && (
          <div className="flex items-center justify-between bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-2xl p-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#1D4ED8] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {selectedPerson.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[11px] text-stone-400 font-semibold leading-none">Acompanhando</p>
                <p className="text-sm font-black text-stone-900 dark:text-white leading-tight mt-0.5">
                  {selectedPerson.full_name}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <ThemeToggle className="h-8 w-8 min-h-[32px] min-w-[32px] rounded-xl" />
              <Link
                href={`/${locale}/care/${selectedPerson.id}`}
                target="_blank"
                className="px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-[#1D4ED8] dark:text-blue-300 text-xs font-bold border border-blue-200 dark:border-blue-500/30 flex items-center gap-1"
              >
                Modo Idoso <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ─── COMPONENTE DOS CARDS MACROS & MICROS COLORIDOS ───────────────────── */}
        <MobileMacroMicroCards
          locale={locale}
          selectedPerson={selectedPerson}
          caredPeople={caredPeople}
          medsData={medsData}
          hydration={hydration}
          userName={userName || 'Cuidador'}
          onQuickLogWater={handleQuickLogWater}
          onOpenVitalsModal={() => setVitalsModalOpen(true)}
        />

        {/* ─── RESUMO DA TIMELINE NO MOBILE ───────────────────────────────────── */}
        <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-white">Agenda de hoje</h3>
            <Link href={`/${locale}/dashboard/appointments`} className="text-xs text-[#1D4ED8] dark:text-blue-400 font-bold">
              Ver tudo
            </Link>
          </div>
          {timelineItems.length > 0 ? (
            <div className="space-y-2">
              {timelineItems.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-stone-50 dark:bg-[#16253C]">
                  <span className="text-xs font-bold text-stone-500 tabular-nums">{item.time}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-stone-900 dark:text-white truncate">{item.title}</p>
                    <p className="text-[10px] text-stone-400 truncate">{item.subtitle}</p>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold shrink-0">
                    {item.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-stone-400 text-center py-2">Tudo tranquilo por hoje.</p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 🖥️ DESKTOP (PC) VIEW: MODERNO, COLORIDO, ENERGÉTICO E CLÍNICO DE ALTO NÍVEL */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6">

        {/* ─── 1. HERO BANNER: TELEMETRIA EM TEMPO REAL & BOAS-VINDAS VIBRANTE ────── */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 dark:border-emerald-500/20 bg-gradient-to-br from-emerald-600 via-[#0F4C3A] to-[#0A2E24] text-white p-6 lg:p-7 shadow-xl">
          {/* Ambient Glows */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-10 w-60 h-60 bg-teal-400/15 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Person & Greeting */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-white text-emerald-800 flex items-center justify-center font-black text-2xl shadow-lg ring-4 ring-white/20">
                  {selectedPerson?.full_name ? selectedPerson.full_name.charAt(0).toUpperCase() : 'P'}
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 ring-2 ring-emerald-900 animate-pulse" />
              </div>

              <div>
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 backdrop-blur-xs border border-emerald-300/30 text-[11px] font-black uppercase tracking-wider text-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping" />
                    Monitoramento Ativo · Estável
                  </span>
                  <span className="text-xs text-emerald-200 font-medium">
                    {todayCapitalized}
                  </span>
                </div>

                <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight leading-tight mt-1">
                  Olá, {userName || 'Cuidador'}! Cuidado diário de {selectedPerson?.full_name || 'Idoso'}
                </h1>

                <p className="text-xs text-emerald-100/90 mt-1 max-w-xl">
                  {medsData.total > 0
                    ? `${medsData.taken} de ${medsData.total} medicamentos administrados (${Math.round((medsData.taken / medsData.total) * 100)}% concluído). Próxima dose programada: ${nextMedicationName}.`
                    : 'Rotina de cuidados em dia. Nenhum alerta crítico detectado no momento.'}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons in Hero */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {selectedPerson && (
                <Link
                  href={`/${locale}/care/${selectedPerson.id}`}
                  target="_blank"
                  className="bg-white hover:bg-emerald-50 text-emerald-900 font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <Footprints className="h-4 w-4 text-emerald-700" />
                  Abrir Modo Idoso ↗
                </Link>
              )}

              <Link
                href={`/${locale}/dashboard/nina`}
                className="bg-gradient-to-r from-sky-400 to-indigo-500 hover:from-sky-500 hover:to-indigo-600 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
              >
                <Sparkles className="h-4 w-4" />
                Nina IA (Enfermeira) 🩺
              </Link>

              {(selectedPerson?.whatsapp_phone || selectedPerson?.phone) && (
                <a
                  href={`https://wa.me/${(selectedPerson.whatsapp_phone || selectedPerson.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedPerson.full_name ? selectedPerson.full_name.split(' ')[0] : ''}, tudo bem? Como você está hoje?`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] hover:bg-[#20BA5C] text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
                >
                  <MessageSquare className="h-4 w-4 fill-white" />
                  WhatsApp
                </a>
              )}

              <Button
                type="button"
                onClick={() => setVitalsModalOpen(true)}
                className="bg-rose-500 hover:bg-rose-600 text-white font-black px-4 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-md active:scale-95 transition-all h-auto"
              >
                <HeartPulse className="h-4 w-4" />
                Registrar Sinais Vitais
              </Button>
            </div>
          </div>

          {/* Live Telemetry Pills Bar in Hero */}
          <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center font-bold text-sm shrink-0">
                💊
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-emerald-200 font-bold uppercase tracking-wider">Medicamentos</p>
                <p className="text-sm font-black text-white truncate">
                  {medsData.taken} de {medsData.total || '0'} tomadas
                </p>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-400/20 text-blue-300 flex items-center justify-center font-bold text-sm shrink-0">
                💧
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">Hidratação</p>
                <p className="text-sm font-black text-white truncate">
                  {hydration.cups * 250} ml ({hydration.cups}/8 copos)
                </p>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-400/20 text-rose-300 flex items-center justify-center font-bold text-sm shrink-0">
                🩺
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-rose-200 font-bold uppercase tracking-wider">Sinais Vitais</p>
                <p className="text-sm font-black text-white truncate">
                  PA {vitals.bp}
                </p>
              </div>
            </div>

            <div className="bg-black/20 backdrop-blur-xs rounded-2xl p-2.5 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-400/20 text-purple-300 flex items-center justify-center font-bold text-sm shrink-0">
                🎮
              </div>
              <div className="min-w-0">
                <p className="text-[10px] text-purple-200 font-bold uppercase tracking-wider">Cognitivo & Jogos</p>
                <p className="text-sm font-black text-white truncate">
                  7 Jogos com Níveis
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ─── 2. LINHA DE 4 CARDS KPI COLORIDOS & INTERATIVOS ───────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Medicamentos */}
          <div className="bg-white dark:bg-[#0C1728] border-2 border-emerald-500/30 dark:border-emerald-500/20 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full">
                  Prescrições
                </span>
                <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                  {medsData.taken}/{medsData.total || 0}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                  Doses tomadas hoje
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Pill className="h-6 w-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#1E293B] space-y-2">
              <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${medsData.total > 0 ? (medsData.taken / medsData.total) * 100 : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-stone-400">Próxima dose</span>
                <Link href={`/${locale}/dashboard/medications`} className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center">
                  Gerenciar <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>

          {/* Card 2: Sinais Vitais & Telemetria */}
          <div className="bg-white dark:bg-[#0C1728] border-2 border-rose-500/30 dark:border-rose-500/20 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 px-2.5 py-0.5 rounded-full">
                  Telemetria
                </span>
                <h3 className="text-xl font-black text-stone-900 dark:text-white mt-1 leading-tight">
                  {vitals.bp}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                  Glicemia {vitals.glucose} · SpO₂ {vitals.saturation}
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <HeartPulse className="h-6 w-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#1E293B] flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                Estável
              </span>
              <button
                onClick={() => setVitalsModalOpen(true)}
                className="text-[11px] font-black text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
              >
                + Aferir <Plus className="h-3 w-3" />
              </button>
            </div>
          </div>

          {/* Card 3: Hidratação do Dia com Botão Rápido */}
          <div className="bg-white dark:bg-[#0C1728] border-2 border-sky-500/30 dark:border-sky-500/20 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-sky-700 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2.5 py-0.5 rounded-full">
                  Hidratação
                </span>
                <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                  {hydration.cups * 250} ml
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                  {hydration.cups} de {hydration.goal} copos ingeridos
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Droplet className="h-6 w-6 stroke-[2.2] fill-sky-500/20" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#1E293B] flex items-center justify-between gap-2">
              <div className="flex-1 bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-sky-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (hydration.cups / hydration.goal) * 100)}%` }}
                />
              </div>
              <Button
                type="button"
                size="sm"
                disabled={quickWaterLoading}
                onClick={handleQuickLogWater}
                className="bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-[10px] font-black h-7 px-2.5 shrink-0"
              >
                {quickWaterLoading ? '...' : '+1 Copo'}
              </Button>
            </div>
          </div>

          {/* Card 4: Estímulo Cognitivo & Jogos */}
          <div className="bg-white dark:bg-[#0C1728] border-2 border-purple-500/30 dark:border-purple-500/20 rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/50 px-2.5 py-0.5 rounded-full">
                  Cérebro Ativo
                </span>
                <h3 className="text-2xl font-black text-stone-900 dark:text-white mt-1">
                  7 Jogos
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mt-0.5">
                  Forca, Palavras, Memória...
                </p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Gamepad2 className="h-6 w-6 stroke-[2.2]" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-stone-100 dark:border-[#1E293B] flex items-center justify-between">
              <span className="text-[11px] text-purple-600 dark:text-purple-400 font-bold">
                Fases & Dificuldade
              </span>
              <Link
                href={`/${locale}/dashboard/games`}
                className="text-[11px] font-black text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-0.5"
              >
                Jogar Agora <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>

        {/* ─── 3. GRID PRINCIPAL EM 2 COLUNAS (65% TIMELINE / 35% CENTRAL DE AÇÃO) ─ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (Linha do Tempo Visual & Hub Cognitivo - 7 cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* Timeline Interativa */}
            <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-6 shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#1E293B] pb-4">
                <div>
                  <h2 className="text-lg font-black text-stone-900 dark:text-white flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-emerald-600" />
                    Agenda & Linha do Tempo
                  </h2>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Horários e acompanhamentos de hoje ({todayCapitalized})
                  </p>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#16253C] p-1 rounded-2xl overflow-x-auto">
                  {[
                    { id: 'all', label: 'Todos' },
                    { id: 'meds', label: 'Remédios' },
                    { id: 'appts', label: 'Consultas' },
                    { id: 'acts', label: 'Atividades' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setTimelineFilter(filter.id as any)}
                      className={cn(
                        'text-xs font-bold px-3 py-1.5 rounded-xl transition-all shrink-0',
                        timelineFilter === filter.id
                          ? 'bg-white dark:bg-[#0C1728] text-emerald-700 dark:text-emerald-400 shadow-xs'
                          : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
                      )}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Timeline Items */}
              <div className="space-y-3">
                {filteredTimeline.length > 0 ? (
                  filteredTimeline.map((item) => {
                    const ItemIcon = item.icon;
                    return (
                      <div
                        key={item.id}
                        className="flex items-start gap-4 p-3.5 rounded-2xl border border-stone-100 dark:border-[#1E293B] bg-stone-50/50 dark:bg-[#0E1B2E] hover:border-emerald-300 dark:hover:border-emerald-700 transition-all group"
                      >
                        {/* Time */}
                        <div className="text-center shrink-0 w-12 pt-1">
                          <span className="text-sm font-black text-stone-800 dark:text-stone-200 tabular-nums">
                            {item.time}
                          </span>
                        </div>

                        {/* Icon */}
                        <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#16253C] border border-stone-200 dark:border-stone-700 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                          <ItemIcon className="h-5 w-5 stroke-[2]" />
                        </div>

                        {/* Text info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-black text-stone-900 dark:text-white leading-tight">
                            {item.title}
                          </p>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">
                            {item.subtitle}
                          </p>
                        </div>

                        {/* Status Badge */}
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-xl shrink-0',
                            item.status === 'Confirmado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : item.status === 'Concluído'
                              ? 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300'
                              : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300'
                          )}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8 bg-stone-50/50 dark:bg-[#0E1B2E] rounded-2xl border border-dashed border-stone-200 dark:border-[#1E293B]">
                    <Clock className="h-8 w-8 text-stone-300 dark:text-stone-600 mx-auto mb-2" />
                    <p className="text-xs font-bold text-stone-400">Nenhum evento para este filtro hoje.</p>
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-stone-100 dark:border-[#1E293B] flex items-center justify-between">
                <Link
                  href={`/${locale}/dashboard/appointments`}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
                >
                  Ver agenda completa da semana <ChevronRight className="h-3.5 w-3.5" />
                </Link>

                <Button
                  asChild
                  size="sm"
                  className="bg-[#0F4C3A] hover:bg-[#14532D] text-white rounded-xl text-xs font-bold h-8 px-3"
                >
                  <Link href={`/${locale}/dashboard/appointments`}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Novo Compromisso
                  </Link>
                </Button>
              </div>
            </div>

            {/* Central de Jogos Cognitivos & Memória (Destacada no PC!) */}
            <div className="bg-gradient-to-br from-purple-900/30 via-[#16132E] to-[#0C1728] border-2 border-purple-500/30 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 text-2xl shrink-0">
                    🧩
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 bg-purple-950/60 border border-purple-800 px-2 py-0.5 rounded-full">
                      Estímulo Cognitivo
                    </span>
                    <h3 className="text-lg font-black text-white mt-1">
                      7 Jogos Cognitivos com Fases & Dificuldade
                    </h3>
                    <p className="text-xs text-purple-200/80 mt-0.5">
                      Jogo da Forca dinâmico, Caça-Palavras com vocabulário infinito, Memória e Sudoku adaptativo.
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black text-xs px-5 py-2.5 h-auto shadow-md shrink-0"
                >
                  <Link href={`/${locale}/dashboard/games`}>
                    <Gamepad2 className="h-4 w-4 mr-1.5" /> Abrir Hub de Jogos
                  </Link>
                </Button>
              </div>
            </div>

          </div>

          {/* Right Column (Ações Rápidas, Alertas & Equipe - 5 cols) */}
          <div className="lg:col-span-5 space-y-6">

            {/* 1. Precisa de Atenção */}
            <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Precisa de Atenção
                </h3>
                <span className="text-[10px] font-bold text-stone-400">Tempo real</span>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    !
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-amber-900 dark:text-amber-200 leading-snug">
                      {medsData.total > medsData.taken
                        ? `Confirmar tomada de medicamento (${medsData.taken}/${medsData.total})`
                        : 'Confirmar rotina da tarde'}
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      {medsData.total > medsData.taken
                        ? `Próxima dose: ${nextMedicationName}. Verifique com o idoso.`
                        : 'Mantenha a hidratação e acompanhe as refeições do dia.'}
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full bg-[#0F4C3A] hover:bg-[#14532D] text-white rounded-xl text-xs font-bold h-9 shadow-xs"
                >
                  <Link href={`/${locale}/dashboard/medications`}>
                    Definir Responsável / Conferir
                  </Link>
                </Button>
              </div>
            </div>

            {/* Nina IA Banner Card */}
            <div className="bg-gradient-to-br from-sky-600 via-indigo-600 to-purple-700 text-white rounded-3xl p-5 shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-2xl shadow-inner shrink-0 border border-white/20">
                    🩺
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full border border-white/20">
                      IA Clínica 24h
                    </span>
                    <h3 className="text-base font-black text-white mt-1 leading-tight">
                      Nina IA — Enfermeira Virtual
                    </h3>
                    <p className="text-[11px] text-sky-100/90 mt-0.5">
                      Respostas rápidas e humanizadas para dúvidas em saúde
                    </p>
                  </div>
                </div>
                <Button
                  asChild
                  className="bg-white hover:bg-sky-50 text-indigo-900 rounded-2xl font-black text-xs px-4 py-2 h-auto shadow-md shrink-0 active:scale-95 transition-all"
                >
                  <Link href={`/${locale}/dashboard/nina`}>
                    Chatbot 🚀
                  </Link>
                </Button>
              </div>
            </div>

            {/* 2. Central de Micro Ações Rápidas (Coloridas como as do Mobile!) */}
            <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-500" />
                  Micro Ações Rápidas
                </h3>
                <span className="text-[10px] text-stone-400 font-semibold">1 clique</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. Registrar Sinais Vitais */}
                <button
                  type="button"
                  onClick={() => setVitalsModalOpen(true)}
                  className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 hover:border-rose-400 text-left flex flex-col justify-between transition-all group active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
                    <HeartPulse className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-rose-950 dark:text-rose-200 leading-tight">
                      Sinais Vitais
                    </p>
                    <p className="text-[10px] text-rose-700/80 dark:text-rose-300/80 mt-0.5">
                      PA, Glicemia, O₂
                    </p>
                  </div>
                </button>

                {/* 2. Passagem de Plantão */}
                <button
                  type="button"
                  onClick={() => setHandoverModalOpen(true)}
                  className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 hover:border-blue-400 text-left flex flex-col justify-between transition-all group active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-blue-950 dark:text-blue-200 leading-tight">
                      Passagem Plantão
                    </p>
                    <p className="text-[10px] text-blue-700/80 dark:text-blue-300/80 mt-0.5">
                      Anotar turno
                    </p>
                  </div>
                </button>

                {/* 3. Estoque & Compras */}
                <Link
                  href={`/${locale}/dashboard/shopping`}
                  className="p-3.5 rounded-2xl bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/50 hover:border-orange-400 text-left flex flex-col justify-between transition-all group active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
                    <ShoppingCart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-orange-950 dark:text-orange-200 leading-tight">
                      Compras & Estoque
                    </p>
                    <p className="text-[10px] text-orange-700/80 dark:text-orange-300/80 mt-0.5">
                      Itens & farmácia
                    </p>
                  </div>
                </Link>

                {/* 4. Relatórios Clínicos */}
                <Link
                  href={`/${locale}/dashboard/reports`}
                  className="p-3.5 rounded-2xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/50 hover:border-purple-400 text-left flex flex-col justify-between transition-all group active:scale-95"
                >
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center mb-2 group-hover:scale-105 transition-transform shadow-xs">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-purple-950 dark:text-purple-200 leading-tight">
                      Relatórios
                    </p>
                    <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">
                      Prontuário e PDF
                    </p>
                  </div>
                </Link>
              </div>
            </div>

            {/* 3. Equipe de Cuidados & Contatos Úteis */}
            <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-5 shadow-sm space-y-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-stone-900 dark:text-white flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-emerald-600" />
                  Equipe de Cuidados ({peopleInRoutineCount})
                </h3>
                <Link href={`/${locale}/dashboard/family`} className="text-[11px] text-emerald-600 font-bold hover:underline">
                  Gerenciar
                </Link>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-[#16253C]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                      {userName ? userName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <p className="text-xs font-black text-stone-900 dark:text-white leading-none">
                        {userName || 'Você (Cuidador)'}
                      </p>
                      <p className="text-[10px] text-stone-400 mt-0.5">Plantão Ativo</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                    Online
                  </Badge>
                </div>

                {primaryContactPhone && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-stone-50 dark:bg-[#16253C]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-stone-900 dark:text-white leading-none">
                          Contato de Emergência
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{primaryContactPhone}</p>
                      </div>
                    </div>
                    <a
                      href={`tel:${primaryContactPhone}`}
                      className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold"
                    >
                      Ligar
                    </a>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ─── MODAIS MONTADOS ─────────────────────────────────────────────────── */}
      {selectedPerson && currentOrganizationId && (
        <>
          <QuickVitalsModal
            isOpen={vitalsModalOpen}
            onClose={() => setVitalsModalOpen(false)}
            caredPersonId={selectedPerson.id}
            caredPersonName={selectedPerson.full_name}
            organizationId={currentOrganizationId}
            userId={user?.id}
            onSaved={(newVitals) => {
              setVitals(newVitals);
              fetchData();
            }}
          />

          <QuickHandoverModal
            isOpen={handoverModalOpen}
            onClose={() => setHandoverModalOpen(false)}
            caredPersonId={selectedPerson.id}
            caredPersonName={selectedPerson.full_name}
            organizationId={currentOrganizationId}
            onSaved={fetchData}
          />
        </>
      )}

    </div>
  );
}
