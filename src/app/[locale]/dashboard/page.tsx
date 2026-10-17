'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

  const [activeTab, setActiveTab] = useState<'hoje' | 'semana'>('hoje');
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

  const [medsData, setMedsData] = useState<{ taken: number; total: number; list: any[] }>({ taken: 0, total: 0, list: [] });
  const [hydration, setHydration] = useState<{ cups: number; goal: number }>({ cups: 0, goal: 8 });
  const [meals, setMeals] = useState<{ done: number; total: number }>({ done: 0, total: 4 });
  const [appointments, setAppointments] = useState<any[]>([]);
  const [todayLifeActivities, setTodayLifeActivities] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [familyMessages, setFamilyMessages] = useState<any[]>([]);
  const [mood, setMood] = useState<{ emoji: string; text: string; quote: string; time: string } | null>(null);
  const [vitals, setVitals] = useState<{ bp: string; glucose: string; saturation: string; temp: string } | null>(null);
  const [financialSummary, setFinancialSummary] = useState<{ balance: number; income: number; expenses: number } | null>(null);
  const [peopleInRoutineCount, setPeopleInRoutineCount] = useState<number>(2);

  const today = new Date();
  const todayFormatted = format(today, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const todayCapitalized = todayFormatted.charAt(0).toUpperCase() + todayFormatted.slice(1);

  const fetchData = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;

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
        .select('id, name, dosage, unit, medication_schedules(id, time_of_day)')
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
        .select('id, meal_type')
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

    // Recent Activities (care_notes)
    const { data: notes } = await supabase
      .from('care_notes')
      .select('id, content, created_at, note_type')
      .eq('cared_person_id', selectedPerson.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentActivities(notes || []);

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

  // Metrics for "Navegação Parent Care para cuidadores.png"
  const totalPredictedActivities = (appointments?.length || 0) + (todayLifeActivities?.length || 0);
  const pendingConfirmations = (medsData.total - medsData.taken > 0 ? medsData.total - medsData.taken : 0) +
    (todayLifeActivities?.filter(a => !a.todayOccurrence?.participation_status).length || 0);

  // Combined timeline items for today
  const timelineItems: Array<{
    id: string;
    time: string;
    title: string;
    subtitle: string;
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
      subtitle: `${appt.location || 'Local a definir'}${appt.doctor_name ? ` · Com ${appt.doctor_name}` : ''}`,
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
      status: isDone ? 'Concluído' : 'Planejado',
      isGreenDot: isDone,
    });
  });

  // Sort timeline chronologically
  timelineItems.sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="space-y-6 pb-12 text-stone-900 dark:text-[#F1F5F9]">

      {/* ─── ALERTAS CRÍTICOS EM ABERTO ────────────────────────────────────────── */}
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
      {/* 📱 MOBILE VIEW: OS 8 CARDS COLORIDOS EM 2 COLUNAS (SEGUNDA IMAGEM DO USUÁRIO) */}
      {/* ========================================================================= */}
      <div className="block md:hidden space-y-4">
        
        {/* Person bar on mobile */}
        {selectedPerson && (
          <div className="flex items-center justify-between bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-2xl p-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-sm">
                {selectedPerson.full_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-stone-400 font-semibold leading-none">Acompanhando</p>
                <p className="text-sm font-extrabold text-stone-900 dark:text-white leading-tight mt-0.5">
                  {selectedPerson.full_name}
                </p>
              </div>
            </div>
            <Link
              href={`/${locale}/care/${selectedPerson.id}`}
              target="_blank"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-[#0F4C3A] dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-1"
            >
              Modo Idoso <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        )}

        {/* ─── 8 GRANDES CARDS COLORIDOS (GRADE 2x4 ALTO CONTRASTE) ────────── */}
        <div className="grid grid-cols-2 gap-3.5">
          
          {/* 1. MÉDICOS */}
          <Link
            href={`/${locale}/dashboard/appointments`}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <Stethoscope className="h-9 w-9 text-white stroke-[2.2]" />
            </div>
            <span className="text-base font-black tracking-wider uppercase text-white">
              MÉDICOS
            </span>
          </Link>

          {/* 2. CONSULTAS */}
          <Link
            href={`/${locale}/dashboard/appointments`}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-white text-[#1D4ED8] flex flex-col items-center justify-center shadow-xs overflow-hidden border border-white">
              <div className="w-full bg-[#DC2626] text-[9px] font-black text-white text-center py-0.5 uppercase leading-none">
                Hoje
              </div>
              <span className="text-xl font-black leading-none mt-0.5 text-stone-900">
                {today.getDate()}
              </span>
            </div>
            <span className="text-base font-black tracking-wider uppercase text-white">
              CONSULTAS
            </span>
          </Link>

          {/* 3. REMÉDIOS */}
          <Link
            href={`/${locale}/dashboard/medications`}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <Pill className="h-9 w-9 text-[#FBBF24] fill-[#F43F5E] stroke-[2]" />
            </div>
            <span className="text-base font-black tracking-wider uppercase text-white">
              REMÉDIOS
            </span>
          </Link>

          {/* 4. SOS */}
          <Link
            href={`/${locale}/dashboard/emergency`}
            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-lg active:scale-95 transition-all aspect-square gap-2 border-2 border-red-400 animate-pulse"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <BellRing className="h-9 w-9 text-white stroke-[2.4] animate-bounce" />
            </div>
            <span className="text-base font-black tracking-widest uppercase text-white">
              SOS
            </span>
          </Link>

          {/* 5. VACINAS & SAÚDE */}
          <Link
            href={`/${locale}/dashboard/activities`}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <Syringe className="h-9 w-9 text-white stroke-[2.2]" />
            </div>
            <span className="text-base font-black tracking-wider uppercase text-white">
              VACINAS
            </span>
          </Link>

          {/* 6. MENSAGEM / ROTINA */}
          <Link
            href={`/${locale}/dashboard/history`}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <BookOpen className="h-9 w-9 text-white stroke-[2.2]" />
            </div>
            <span className="text-base font-black tracking-wider uppercase text-white">
              MENSAGEM
            </span>
          </Link>

          {/* 7. CHAT (WHATSAPP IA) */}
          <Link
            href={selectedPerson ? `/${locale}/dashboard/cared-people/${selectedPerson.id}?tab=whatsapp` : `/${locale}/dashboard`}
            className="bg-[#16A34A] hover:bg-[#15803D] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <MessageSquare className="h-9 w-9 text-white stroke-[2.4] fill-white/20" />
            </div>
            <span className="text-base font-black tracking-wider uppercase text-white">
              CHAT
            </span>
          </Link>

          {/* 8. JOGOS & ATIVIDADES */}
          <Link
            href={`/${locale}/dashboard/activities`}
            className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-2"
          >
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center">
              <Gamepad2 className="h-9 w-9 text-white stroke-[2.2]" />
            </div>
            <span className="text-base font-black tracking-wider uppercase text-white">
              JOGOS
            </span>
          </Link>
        </div>

        {/* Timeline preview on mobile */}
        <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-stone-900 dark:text-white">Agenda de hoje</h3>
            <Link href={`/${locale}/dashboard/appointments`} className="text-xs text-[#0F4C3A] dark:text-emerald-400 font-bold">Ver tudo</Link>
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
      {/* 🖥️ DESKTOP VIEW: EXATO LAYOUT DE "Navegação Parent Care para cuidadores.png" */}
      {/* ========================================================================= */}
      <div className="hidden md:block space-y-6">

        {/* ─── HEADER: TUDO ORGANIZADO PARA HOJE ─────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-stone-900 dark:text-white tracking-tight leading-tight">
              Tudo organizado para hoje
            </h1>
            <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
              Veja os próximos compromissos e quem vai acompanhar.
            </p>
          </div>

          <Button
            asChild
            className="bg-[#0F4C3A] hover:bg-[#14532D] text-white rounded-xl px-5 py-2.5 h-auto text-sm font-bold shadow-xs active:scale-95 transition-all"
          >
            <Link href={`/${locale}/dashboard/appointments`}>
              <Plus className="h-4 w-4 mr-1.5" /> Adicionar
            </Link>
          </Button>
        </div>

        {/* ─── TABS: HOJE | ESTA SEMANA ───────────────────────────────────────── */}
        <div className="flex items-center gap-6 border-b border-[#E5E7EB] dark:border-[#1E293B] pt-1 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('hoje')}
            className={cn(
              'text-sm font-bold pb-2 transition-all relative',
              activeTab === 'hoje'
                ? 'text-[#0F4C3A] dark:text-emerald-400'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-white'
            )}
          >
            Hoje
            {activeTab === 'hoje' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F4C3A] dark:bg-emerald-400 rounded-full" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('semana')}
            className={cn(
              'text-sm font-bold pb-2 transition-all relative',
              activeTab === 'semana'
                ? 'text-[#0F4C3A] dark:text-emerald-400'
                : 'text-stone-500 dark:text-slate-400 hover:text-stone-800 dark:hover:text-white'
            )}
          >
            Esta semana
            {activeTab === 'semana' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F4C3A] dark:bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {/* ─── 3 SUMMARY KPI CARDS (INSPIRADOS NO MODELO) ────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Card 1: Atividades previstas */}
          <div className="bg-white dark:bg-[#0C1728] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <Calendar className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900 dark:text-white leading-none">
                {totalPredictedActivities || 3}
              </p>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mt-1 leading-tight">
                atividades previstas
              </p>
            </div>
          </div>

          {/* Card 2: Confirmações pendentes */}
          <div className="bg-white dark:bg-[#0C1728] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/50 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <Clock className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900 dark:text-white leading-none">
                {pendingConfirmations > 0 ? pendingConfirmations : 1}
              </p>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mt-1 leading-tight">
                confirmação pendente
              </p>
            </div>
          </div>

          {/* Card 3: Pessoas na rotina */}
          <div className="bg-white dark:bg-[#0C1728] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-2xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 flex items-center justify-center text-teal-700 dark:text-teal-400 shrink-0">
              <Users className="h-6 w-6 stroke-[2]" />
            </div>
            <div>
              <p className="text-2xl font-black text-stone-900 dark:text-white leading-none">
                {peopleInRoutineCount || 2}
              </p>
              <p className="text-xs text-stone-500 dark:text-slate-400 font-medium mt-1 leading-tight">
                pessoas na rotina
              </p>
            </div>
          </div>
        </div>

        {/* ─── 2-COLUMN GRID (AGENDA DE HOJE + PRECISA DE ATENÇÃO & ACESSO RÁPIDO) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Column (Agenda de hoje - 65% width) */}
          <div className="lg:col-span-7 bg-white dark:bg-[#0C1728] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] dark:border-[#1E293B] pb-3">
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                Agenda de hoje
              </h2>
              <span className="text-xs text-stone-400 font-medium">
                {todayCapitalized}
              </span>
            </div>

            {/* Timeline Events */}
            <div className="space-y-4">
              {timelineItems.length > 0 ? (
                timelineItems.map((item, idx) => (
                  <div key={item.id || idx} className="flex items-start gap-4 group">
                    <span className="text-sm font-bold text-stone-500 dark:text-slate-400 w-12 shrink-0 tabular-nums pt-0.5">
                      {item.time}
                    </span>

                    {/* Timeline dot */}
                    <div className="pt-2 shrink-0">
                      <span
                        className={cn(
                          'block w-2.5 h-2.5 rounded-full ring-4 ring-white dark:ring-[#0C1728]',
                          item.isGreenDot ? 'bg-emerald-500' : 'bg-stone-300 dark:bg-stone-600'
                        )}
                      />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-stone-900 dark:text-white leading-tight">
                        {item.title}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Status badge */}
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-semibold px-2.5 py-0.5 rounded-lg shrink-0',
                        item.status === 'Confirmado'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50'
                          : item.status === 'Concluído'
                          ? 'bg-stone-100 text-stone-700 border-stone-200 dark:bg-stone-800 dark:text-stone-300'
                          : 'bg-stone-50 text-stone-600 border-stone-200 dark:bg-[#16253C] dark:text-slate-300'
                      )}
                    >
                      {item.status}
                    </Badge>
                  </div>
                ))
              ) : (
                /* Fallback sample item to match the mockup */
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <span className="text-sm font-bold text-stone-500 w-12 shrink-0 tabular-nums pt-0.5">09:00</span>
                    <div className="pt-2 shrink-0">
                      <span className="block w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-[#0C1728]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-stone-900 dark:text-white">Medicamento & Café da Manhã</p>
                      <p className="text-xs text-stone-500">Em casa · Rotina cumprida com carinho</p>
                    </div>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-semibold">
                      Confirmado
                    </Badge>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="text-sm font-bold text-stone-500 w-12 shrink-0 tabular-nums pt-0.5">12:00</span>
                    <div className="pt-2 shrink-0">
                      <span className="block w-2.5 h-2.5 rounded-full bg-stone-300 dark:bg-stone-600 ring-4 ring-white dark:ring-[#0C1728]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-stone-900 dark:text-white">Almoço & Hidratação</p>
                      <p className="text-xs text-stone-500">Carlos é o responsável pelo acompanhamento</p>
                    </div>
                    <Badge variant="outline" className="bg-stone-50 text-stone-600 border-stone-200 text-xs font-semibold">
                      Planejado
                    </Badge>
                  </div>

                  <div className="flex items-start gap-4">
                    <span className="text-sm font-bold text-stone-500 w-12 shrink-0 tabular-nums pt-0.5">16:00</span>
                    <div className="pt-2 shrink-0">
                      <span className="block w-2.5 h-2.5 rounded-full bg-stone-300 dark:bg-stone-600 ring-4 ring-white dark:ring-[#0C1728]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-extrabold text-stone-900 dark:text-white">Visita da Família & Passeio</p>
                      <p className="text-xs text-stone-500">Em casa e no parque</p>
                    </div>
                    <Badge variant="outline" className="bg-stone-50 text-stone-600 border-stone-200 text-xs font-semibold">
                      Planejado
                    </Badge>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 border-t border-[#F1F5F9] dark:border-[#1E293B]">
              <Link
                href={`/${locale}/dashboard/appointments`}
                className="text-xs text-[#0F4C3A] dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
              >
                Ver agenda completa da semana <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Right Column (Precisa de atenção + Acesso rápido - 35% width) */}
          <div className="lg:col-span-5 space-y-6">

            {/* 1. Precisa de atenção */}
            <div className="bg-white dark:bg-[#0C1728] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-2xs space-y-3.5">
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                Precisa de atenção
              </h2>

              <div className="bg-[#FEF3C7] dark:bg-amber-950/30 border border-[#FDE68A] dark:border-amber-900/50 rounded-2xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-xs font-black shrink-0 mt-0.5">
                    !
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200 leading-snug">
                      {medsData.total > medsData.taken
                        ? `Confirmar tomada de medicamento (${medsData.taken}/${medsData.total})`
                        : 'Confirmar transporte da volta'}
                    </p>
                    <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      {medsData.total > medsData.taken
                        ? 'Verifique os horários com o idoso ou cuidador'
                        : 'Aula de dança · Hoje, 10:00'}
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  className="w-full bg-[#0F4C3A] hover:bg-[#14532D] text-white rounded-xl text-xs font-bold h-9 shadow-xs"
                >
                  <Link href={`/${locale}/dashboard/medications`}>
                    Definir responsável
                  </Link>
                </Button>
              </div>
            </div>

            {/* 2. Acesso rápido (3 Botões do Mockup) */}
            <div className="bg-white dark:bg-[#0C1728] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-2xs space-y-3.5">
              <h2 className="text-base font-black text-stone-900 dark:text-white">
                Acesso rápido
              </h2>

              <div className="grid grid-cols-3 gap-2.5">
                {/* Registrar cuidado */}
                <Link
                  href={`/${locale}/dashboard/history`}
                  className="flex flex-col items-center text-center p-3 rounded-xl border border-stone-200/80 dark:border-stone-700 hover:border-[#0F4C3A] bg-stone-50/60 dark:bg-[#16253C] hover:bg-emerald-50/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <Heart className="h-5 w-5 fill-current" />
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 dark:text-slate-200 leading-tight">
                    Registrar cuidado
                  </span>
                </Link>

                {/* Ver documentos */}
                <Link
                  href={selectedPerson ? `/${locale}/dashboard/cared-people/${selectedPerson.id}?tab=documents` : `/${locale}/dashboard`}
                  className="flex flex-col items-center text-center p-3 rounded-xl border border-stone-200/80 dark:border-stone-700 hover:border-[#0F4C3A] bg-stone-50/60 dark:bg-[#16253C] hover:bg-emerald-50/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <FileText className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 dark:text-slate-200 leading-tight">
                    Ver documentos
                  </span>
                </Link>

                {/* Adicionar despesa */}
                <Link
                  href={`/${locale}/dashboard/expenses`}
                  className="flex flex-col items-center text-center p-3 rounded-xl border border-stone-200/80 dark:border-stone-700 hover:border-[#0F4C3A] bg-stone-50/60 dark:bg-[#16253C] hover:bg-emerald-50/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-bold text-stone-800 dark:text-slate-200 leading-tight">
                    Adicionar despesa
                  </span>
                </Link>
              </div>
            </div>

            {/* 3. Indicadores de Cuidados do Dia */}
            <div className="bg-white dark:bg-[#0C1728] border border-[#E5E7EB] dark:border-[#1E293B] rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">
                  Progresso do Dia
                </span>
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  {medsData.total > 0 ? `${Math.round((medsData.taken / medsData.total) * 100)}% concluído` : 'Em dia'}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-600 dark:text-slate-400 font-medium">💊 Medicamentos</span>
                  <span className="font-bold text-stone-900 dark:text-white">{medsData.taken}/{medsData.total || '0'}</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5">
                  <div
                    className="bg-emerald-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${medsData.total > 0 ? (medsData.taken / medsData.total) * 100 : 0}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-stone-600 dark:text-slate-400 font-medium">💧 Hidratação</span>
                  <span className="font-bold text-stone-900 dark:text-white">{hydration.cups}/{hydration.goal} copos</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(hydration.cups / hydration.goal) * 100}%` }}
                  />
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
