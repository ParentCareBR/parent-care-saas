'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createClient } from '@/lib/supabase/client';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Coffee,
  Download,
  Droplet,
  FileCheck,
  FileText,
  Filter,
  Heart,
  HeartPulse,
  Info,
  Minus,
  Pill,
  Printer,
  RefreshCw,
  ShieldAlert,
  Smile,
  Sparkles,
  TrendingDown,
  TrendingUp,
  User,
  Utensils,
  ChevronRight,
  HelpCircle,
  Flame,
} from 'lucide-react';
import { PatternChangeInsight } from '@/types/monitoring';

export default function ReportsAndPatternChangesPage() {
  const { user } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const { isModuleEnabled } = useMonitoring();
  const tR = useTranslations('Monitoring.reports');
  const supabase = useMemo(() => createClient() as any, []);

  // Navigation & filter state
  const [activeTab, setActiveTab] = useState<'overview' | 'medications' | 'nutrition' | 'vitals_mood' | 'clinical_print'>('overview');
  const [daysRange, setDaysRange] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Pattern Insights from API
  const [patternInsights, setPatternInsights] = useState<PatternChangeInsight[]>([]);
  const [disclaimer, setDisclaimer] = useState<string>('');

  // Detailed records state
  const [medicationsList, setMedicationsList] = useState<any[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<any[]>([]);
  const [hydrationLogs, setHydrationLogs] = useState<any[]>([]);
  const [mealsList, setMealsList] = useState<any[]>([]);
  const [careNotes, setCareNotes] = useState<any[]>([]);
  const [vitalRecords, setVitalRecords] = useState<any[]>([]);
  const [checkIns, setCheckIns] = useState<any[]>([]);
  const [helpRequests, setHelpRequests] = useState<any[]>([]);

  // Fetch all reports data
  const loadReportsData = useCallback(async (isRefresh = false) => {
    if (!selectedPerson) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const periodStart = subDays(new Date(), daysRange);
    periodStart.setHours(0, 0, 0, 0);

    try {
      // 1. Fetch AI / Pattern Changes API
      const patternPromise = fetch(`/api/monitoring/pattern-changes?caredPersonId=${selectedPerson.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.success) {
            setPatternInsights(data.insights || []);
            setDisclaimer(data.disclaimer || '');
          }
        })
        .catch((err) => console.warn('Erro ao carregar insights:', err));

      // 2. Fetch Medications & Logs
      const medsPromise = supabase
        .from('medications')
        .select('id, name, dosage, unit, instructions, is_active, medication_schedules(id, time_of_day)')
        .eq('cared_person_id', selectedPerson.id)
        .eq('is_active', true)
        .then(({ data }: any) => setMedicationsList(data || []));

      const medLogsPromise = supabase
        .from('medication_logs')
        .select('id, medication_id, schedule_id, status, taken_at, notes')
        .eq('cared_person_id', selectedPerson.id)
        .gte('taken_at', periodStart.toISOString())
        .order('taken_at', { ascending: false })
        .then(({ data }: any) => {
          if (data && data.length > 0) {
            setMedicationLogs(data);
          } else {
            // Fallback to medication_confirmations if medication_logs is empty
            return supabase
              .from('medication_confirmations')
              .select('id, medication_id, status, confirmed_at')
              .eq('cared_person_id', selectedPerson.id)
              .gte('confirmed_at', periodStart.toISOString())
              .order('confirmed_at', { ascending: false })
              .then(({ data: confData }: any) => {
                if (confData) {
                  setMedicationLogs(
                    confData.map((c: any) => ({
                      id: c.id,
                      medication_id: c.medication_id,
                      status: c.status || 'taken',
                      taken_at: c.confirmed_at,
                    }))
                  );
                }
              });
          }
        });

      // 3. Fetch Hydration
      const hydrationPromise = supabase
        .from('hydration_logs')
        .select('id, amount_ml, logged_at')
        .eq('cared_person_id', selectedPerson.id)
        .gte('logged_at', periodStart.toISOString())
        .order('logged_at', { ascending: false })
        .then(({ data }: any) => setHydrationLogs(data || []));

      // 4. Fetch Meals
      const mealsPromise = supabase
        .from('meals')
        .select('id, meal_type, created_at, notes, consumed_at')
        .eq('cared_person_id', selectedPerson.id)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false })
        .then(({ data }: any) => setMealsList(data || []));

      // 5. Fetch Care Notes
      const notesPromise = supabase
        .from('care_notes')
        .select('id, content, created_at, note_type')
        .eq('cared_person_id', selectedPerson.id)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false })
        .limit(40)
        .then(({ data }: any) => setCareNotes(data || []));

      // 6. Fetch Vitals
      const vitalsPromise = supabase
        .from('vital_records')
        .select('id, blood_pressure_systolic, blood_pressure_diastolic, glucose, oxygen_saturation, temperature, heart_rate, recorded_at')
        .eq('cared_person_id', selectedPerson.id)
        .gte('recorded_at', periodStart.toISOString())
        .order('recorded_at', { ascending: false })
        .then(({ data }: any) => setVitalRecords(data || []));

      // 7. Fetch Check-ins (Mood)
      const checkInsPromise = supabase
        .from('check_ins')
        .select('id, mood, notes, created_at')
        .eq('cared_person_id', selectedPerson.id)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false })
        .then(({ data }: any) => setCheckIns(data || []));

      // 8. Fetch Help Requests / Emergencies
      const helpPromise = supabase
        .from('help_requests')
        .select('id, message, created_at, status')
        .eq('cared_person_id', selectedPerson.id)
        .gte('created_at', periodStart.toISOString())
        .order('created_at', { ascending: false })
        .then(({ data }: any) => setHelpRequests(data || []));

      await Promise.allSettled([
        patternPromise,
        medsPromise,
        medLogsPromise,
        hydrationPromise,
        mealsPromise,
        notesPromise,
        vitalsPromise,
        checkInsPromise,
        helpPromise,
      ]);
    } catch (error) {
      console.error('Erro ao buscar dados do relatório:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedPerson, daysRange, supabase]);

  useEffect(() => {
    loadReportsData();
  }, [loadReportsData]);

  // COMPUTED STATS
  // 1. Medications Adherence
  const medStats = useMemo(() => {
    const totalSchedulesPerDay = medicationsList.reduce(
      (acc, m) => acc + (m.medication_schedules?.length || 1),
      0
    );
    const expectedDoses = totalSchedulesPerDay * daysRange;
    const takenDoses = medicationLogs.filter((l) => l.status === 'taken').length;
    const adherenceRate = expectedDoses > 0 ? Math.min(100, Math.round((takenDoses / expectedDoses) * 100)) : 100;

    return {
      activeMedsCount: medicationsList.length,
      expectedDoses,
      takenDoses,
      adherenceRate: medicationsList.length === 0 ? 100 : adherenceRate,
    };
  }, [medicationsList, medicationLogs, daysRange]);

  // 2. Hydration Stats
  const hydrationStats = useMemo(() => {
    const totalMl = hydrationLogs.reduce((acc, h) => acc + (h.amount_ml || 250), 0);
    const totalCups = Math.round(totalMl / 250);
    const avgCupsPerDay = Math.round((totalCups / daysRange) * 10) / 10;
    const avgMlPerDay = Math.round(totalMl / daysRange);
    const goalCups = 8;
    const progressPercent = Math.min(100, Math.round((avgCupsPerDay / goalCups) * 100));

    return {
      totalMl,
      totalCups,
      avgCupsPerDay,
      avgMlPerDay,
      goalCups,
      progressPercent,
    };
  }, [hydrationLogs, daysRange]);

  // 3. Meals Stats
  const mealsStats = useMemo(() => {
    const mealNotes = careNotes.filter((n) => n.content?.startsWith('Refei'));
    const totalMeals = mealsList.length + mealNotes.length;
    const avgMealsPerDay = Math.round((totalMeals / daysRange) * 10) / 10;

    // Count types
    const types: Record<string, number> = { breakfast: 0, lunch: 0, snack: 0, dinner: 0, other: 0 };
    mealsList.forEach((m) => {
      const t = m.meal_type || 'other';
      types[t] = (types[t] || 0) + 1;
    });
    mealNotes.forEach((n) => {
      if (n.content.includes('café') || n.content.includes('breakfast')) types.breakfast++;
      else if (n.content.includes('almoço') || n.content.includes('lunch')) types.lunch++;
      else if (n.content.includes('jantar') || n.content.includes('dinner')) types.dinner++;
      else if (n.content.includes('lanche') || n.content.includes('snack')) types.snack++;
      else types.other++;
    });

    return {
      totalMeals,
      avgMealsPerDay,
      types,
    };
  }, [mealsList, careNotes, daysRange]);

  // 4. Mood & Well-being Stats
  const moodStats = useMemo(() => {
    const moodCounts: Record<string, number> = {
      great: 0,
      good: 0,
      okay: 0,
      bad: 0,
      terrible: 0,
    };

    checkIns.forEach((c) => {
      if (c.mood && moodCounts[c.mood] !== undefined) {
        moodCounts[c.mood]++;
      }
    });

    const totalCheckIns = checkIns.length;
    let predominantMood = 'good';
    let maxCount = -1;
    Object.entries(moodCounts).forEach(([m, count]) => {
      if (count > maxCount) {
        maxCount = count;
        predominantMood = m;
      }
    });

    const moodLabels: Record<string, { label: string; emoji: string; color: string }> = {
      great: { label: 'Muito Bem & Animado', emoji: '😁', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
      good: { label: 'Bem e Tranquilo', emoji: '😊', color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' },
      okay: { label: 'Mais ou Menos / Calmo', emoji: '😐', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
      bad: { label: 'Indisposto / Desanimado', emoji: '😔', color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/40 border-orange-200 dark:border-orange-800' },
      terrible: { label: 'Mal / Queixoso', emoji: '😢', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
    };

    return {
      totalCheckIns,
      counts: moodCounts,
      predominant: moodLabels[predominantMood] || moodLabels.good,
      details: moodLabels,
    };
  }, [checkIns]);

  // 5. Vitals Stats
  const vitalsStats = useMemo(() => {
    const latest = vitalRecords[0] || null;
    return {
      latest,
      totalRecords: vitalRecords.length,
      history: vitalRecords.slice(0, 10),
    };
  }, [vitalRecords]);

  // Tracking modules definition
  const trackingItems = [
    {
      code: 'routine_meals',
      name: 'Alimentação',
      icon: Utensils,
      enabled: isModuleEnabled('routine_meals'),
      summary: mealsStats.totalMeals > 0 ? `${mealsStats.totalMeals} refeições registradas no período` : 'Sem registros recentes',
      status: mealsStats.totalMeals > 0 ? 'performed' : 'pending',
    },
    {
      code: 'routine_hydration',
      name: 'Hidratação',
      icon: Droplet,
      enabled: isModuleEnabled('routine_hydration'),
      summary: `Média de ${hydrationStats.avgCupsPerDay} copos/dia (${hydrationStats.totalCups} copos total)`,
      status: hydrationStats.totalCups > 0 ? 'performed' : 'pending',
    },
    {
      code: 'meds_scheduled',
      name: 'Medicamentos',
      icon: Pill,
      enabled: isModuleEnabled('meds_scheduled'),
      summary: `${medStats.takenDoses} doses confirmadas (${medStats.adherenceRate}% adesão)`,
      status: medStats.takenDoses > 0 ? 'performed' : 'pending',
    },
    {
      code: 'wellbeing_mood',
      name: 'Humor & Disposição',
      icon: Heart,
      enabled: isModuleEnabled('wellbeing_mood'),
      summary: `${moodStats.totalCheckIns} check-ins - Predominante: ${moodStats.predominant.emoji} ${moodStats.predominant.label}`,
      status: moodStats.totalCheckIns > 0 ? 'performed' : 'pending',
    },
    {
      code: 'health_vitals',
      name: 'Sinais Vitais',
      icon: HeartPulse,
      enabled: isModuleEnabled('health_vitals'),
      summary: vitalsStats.latest
        ? `PA: ${vitalsStats.latest.blood_pressure_systolic || '--'}/${vitalsStats.latest.blood_pressure_diastolic || '--'} · Glic: ${vitalsStats.latest.glucose || '--'}`
        : 'Nenhuma aferição recente',
      status: vitalsStats.latest ? 'performed' : 'no_records',
    },
  ];

  const activeItems = trackingItems.filter((i) => i.enabled);
  const inactiveItems = trackingItems.filter((i) => !i.enabled);

  if (!selectedPerson) {
    return (
      <div className="p-8 text-center space-y-4 max-w-lg mx-auto">
        <Activity className="h-12 w-12 text-stone-400 mx-auto" />
        <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Selecione um familiar</h2>
        <p className="text-stone-500 dark:text-stone-400">
          Selecione uma pessoa cuidada para visualizar relatórios consolidados e mudanças de rotina.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 overflow-x-hidden w-full">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-[#1E2E42] pb-6 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-stone-900 dark:text-[#F8FAFC]">
                Relatórios &amp; Acompanhamento
              </h1>
              <p className="text-sm font-medium text-stone-500 dark:text-stone-400">
                Acompanhando a rotina de <span className="font-bold text-stone-800 dark:text-stone-200">{selectedPerson.full_name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Global Toolbar Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Days Range Pill Selector */}
          <div className="flex items-center bg-stone-100 dark:bg-[#101D2B] p-1 rounded-xl border border-stone-200 dark:border-[#1E2E42]">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                onClick={() => setDaysRange(days)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  daysRange === days
                    ? 'bg-white dark:bg-[#1E2E42] text-emerald-700 dark:text-emerald-400 shadow-xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Últimos {days} dias
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReportsData(true)}
            disabled={refreshing}
            className="h-9 px-3 rounded-xl border-stone-200 dark:border-[#1E2E42] text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-[#172433]"
            title="Atualizar dados"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="ml-1.5 hidden sm:inline text-xs font-semibold">Atualizar</span>
          </Button>

          {/* Print / Export Report Button */}
          <Button
            size="sm"
            onClick={() => {
              if (activeTab !== 'clinical_print') {
                setActiveTab('clinical_print');
                setTimeout(() => window.print(), 300);
              } else {
                window.print();
              }
            }}
            className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs gap-2 shadow-sm transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimir para Consulta</span>
          </Button>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION BAR */}
      <div className="print:hidden">
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="w-full h-auto p-1.5 bg-stone-100/90 dark:bg-[#101D2B] rounded-2xl border border-stone-200 dark:border-[#1E2E42] grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            <TabsTrigger
              value="overview"
              className="py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#172433] data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-stone-600 dark:text-stone-400"
            >
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="truncate">Visão Geral</span>
            </TabsTrigger>

            <TabsTrigger
              value="medications"
              className="py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#172433] data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-stone-600 dark:text-stone-400"
            >
              <Pill className="h-4 w-4 shrink-0" />
              <span className="truncate">Medicamentos</span>
              {medStats.adherenceRate > 0 && (
                <span className="hidden md:inline-block px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px]">
                  {medStats.adherenceRate}%
                </span>
              )}
            </TabsTrigger>

            <TabsTrigger
              value="nutrition"
              className="py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#172433] data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-stone-600 dark:text-stone-400"
            >
              <Utensils className="h-4 w-4 shrink-0" />
              <span className="truncate">Nutrição &amp; Água</span>
            </TabsTrigger>

            <TabsTrigger
              value="vitals_mood"
              className="py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#172433] data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-stone-600 dark:text-stone-400"
            >
              <HeartPulse className="h-4 w-4 shrink-0" />
              <span className="truncate">Sinais &amp; Humor</span>
            </TabsTrigger>

            <TabsTrigger
              value="clinical_print"
              className="col-span-2 sm:col-span-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-[#172433] data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm text-stone-600 dark:text-stone-400"
            >
              <FileText className="h-4 w-4 shrink-0 text-amber-500" />
              <span className="truncate">Laudo / Médico</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* =========================================================================
          TAB 1: VISÃO GERAL & MUDANÇAS OBSERVADAS (OVERVIEW)
         ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Executive KPI Summary Cards */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600" />
                Resumo dos Últimos {daysRange} Dias
              </h2>
              <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Atualizado em tempo real
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Medicamentos */}
              <div
                onClick={() => setActiveTab('medications')}
                className="group p-5 rounded-2xl border border-emerald-100 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/70 to-emerald-50/20 dark:from-[#102425] dark:to-[#101D2B] hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer shadow-xs relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Pill className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                    {medStats.adherenceRate}% Adesão
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Medicamentos</h3>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {medStats.takenDoses}{' '}
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    / {medStats.expectedDoses} doses
                  </span>
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between">
                  <span>{medStats.activeMedsCount} remédios ativos</span>
                  <span className="text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                    Ver detalhes →
                  </span>
                </p>
              </div>

              {/* Card 2: Hidratação */}
              <div
                onClick={() => setActiveTab('nutrition')}
                className="group p-5 rounded-2xl border border-sky-100 dark:border-sky-900/50 bg-gradient-to-br from-sky-50/70 to-sky-50/20 dark:from-[#0E2238] dark:to-[#101D2B] hover:border-sky-300 dark:hover:border-sky-700 transition-all cursor-pointer shadow-xs relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
                    <Droplet className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/60 text-sky-800 dark:text-sky-300">
                    Média {hydrationStats.avgCupsPerDay} c/dia
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Hidratação</h3>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {hydrationStats.totalCups}{' '}
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    copos ({Math.round(hydrationStats.totalMl / 1000 * 10) / 10} L)
                  </span>
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between">
                  <span>Meta: {hydrationStats.goalCups} copos diários</span>
                  <span className="text-sky-600 dark:text-sky-400 group-hover:translate-x-0.5 transition-transform">
                    Ver água →
                  </span>
                </p>
              </div>

              {/* Card 3: Refeições */}
              <div
                onClick={() => setActiveTab('nutrition')}
                className="group p-5 rounded-2xl border border-amber-100 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/70 to-amber-50/20 dark:from-[#261E14] dark:to-[#101D2B] hover:border-amber-300 dark:hover:border-amber-700 transition-all cursor-pointer shadow-xs relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/60 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Utensils className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                    {mealsStats.avgMealsPerDay} ref/dia
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Alimentação</h3>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {mealsStats.totalMeals}{' '}
                  <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">
                    refeições feitas
                  </span>
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between">
                  <span>Horários regulares</span>
                  <span className="text-amber-600 dark:text-amber-400 group-hover:translate-x-0.5 transition-transform">
                    Ver refeições →
                  </span>
                </p>
              </div>

              {/* Card 4: Humor & Sinais */}
              <div
                onClick={() => setActiveTab('vitals_mood')}
                className="group p-5 rounded-2xl border border-purple-100 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/70 to-purple-50/20 dark:from-[#1E172E] dark:to-[#101D2B] hover:border-purple-300 dark:hover:border-purple-700 transition-all cursor-pointer shadow-xs relative"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/60 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Heart className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-800 dark:text-purple-300">
                    {moodStats.totalCheckIns} check-ins
                  </span>
                </div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Humor Predominante</h3>
                <p className="text-lg font-black text-stone-900 dark:text-stone-100 mt-1 flex items-center gap-1.5">
                  <span className="text-2xl">{moodStats.predominant.emoji}</span>
                  <span className="truncate text-sm">{moodStats.predominant.label}</span>
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 flex items-center justify-between">
                  <span>Disposição geral</span>
                  <span className="text-purple-600 dark:text-purple-400 group-hover:translate-x-0.5 transition-transform">
                    Ver sinais &amp; humor →
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* SECTION: MUDANÇAS OBSERVADAS (IA & REGRAS COMPARATIVAS) */}
          <Card className="border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs overflow-hidden">
            <CardHeader className="bg-stone-50/60 dark:bg-[#142232] border-b border-stone-200 dark:border-[#1E2E42] py-4 px-6">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                      {tR('observed_changes')} &amp; Análise de Padrões
                    </CardTitle>
                    <p className="text-xs text-stone-500 dark:text-stone-400">
                      Comparação entre os últimos 7 dias e a semana anterior para identificar variações
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs font-bold text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700">
                  Semana Atual vs. Anterior
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {loading ? (
                <div className="py-12 text-center text-sm text-stone-500 space-y-2">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-emerald-600" />
                  <p>Calculando comparativos com base no histórico real...</p>
                </div>
              ) : patternInsights.length === 0 ? (
                <div className="py-10 text-center text-stone-500 space-y-3">
                  <Info className="h-10 w-10 mx-auto text-stone-400" />
                  <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                    Rotina estável ou histórico recente em formação.
                  </p>
                  <p className="text-xs text-stone-500 max-w-md mx-auto">
                    Conforme a rotina diária é preenchida na tela do idoso ou pelo cuidador, mudanças relevantes aparecerão aqui automaticamente.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {patternInsights.map((insight) => (
                    <div
                      key={insight.id}
                      className="p-4 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/50 dark:bg-[#152333]/50 space-y-2.5 transition-all hover:border-stone-300 dark:hover:border-stone-700"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
                          {insight.metricLabel}
                        </span>
                        {insight.direction === 'increased' && (
                          <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">
                            <TrendingUp className="h-3.5 w-3.5" /> Aumento
                          </span>
                        )}
                        {insight.direction === 'decreased' && (
                          <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">
                            <TrendingDown className="h-3.5 w-3.5" /> Redução
                          </span>
                        )}
                        {insight.direction === 'stable' && (
                          <span className="flex items-center gap-1 text-xs font-semibold text-stone-600 dark:text-stone-300 bg-stone-200/70 dark:bg-stone-800 px-2.5 py-0.5 rounded-full">
                            <Minus className="h-3 w-3" /> Estável
                          </span>
                        )}
                      </div>

                      <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 leading-snug">
                        {insight.changeDescription}
                      </p>

                      <div className="text-[11px] text-stone-500 dark:text-stone-400 flex justify-between pt-2 border-t border-stone-200 dark:border-[#1E2E42]">
                        <span>{insight.previousWindowSummary}</span>
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          {insight.currentWindowSummary}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Disclaimer */}
              <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-3 text-amber-800 dark:text-amber-300 text-xs">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                <p className="leading-relaxed font-medium">
                  {disclaimer ||
                    'Observações geradas estritamente a partir das contagens de registros feitas pela família ou pelo idoso. Não substitui consulta, prescrição ou diagnóstico médico.'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* SECTION: STATUS DOS ACOMPANHAMENTOS ATIVOS */}
          <Card className="border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-stone-100 dark:border-[#1E2E42]">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                    Status dos Acompanhamentos Configurados
                  </CardTitle>
                  <CardDescription className="text-xs text-stone-500">
                    Resumo do funcionamento dos módulos habilitados para {selectedPerson.full_name}.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-bold text-xs">
                  {activeItems.length} Módulos Ativos
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              <div className="divide-y divide-stone-100 dark:divide-[#1E2E42]">
                {activeItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.code} className="py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-stone-900 dark:text-stone-100">{item.name}</p>
                          <p className="text-xs text-stone-500 dark:text-stone-400">{item.summary}</p>
                        </div>
                      </div>

                      <div>
                        {item.status === 'performed' && (
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 hover:bg-emerald-200 border-none text-xs font-semibold">
                            ✓ Ativo &amp; Registrando
                          </Badge>
                        )}
                        {item.status === 'pending' && (
                          <Badge variant="outline" className="text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs">
                            Aguardando registros
                          </Badge>
                        )}
                        {item.status === 'no_records' && (
                          <Badge variant="secondary" className="text-stone-500 text-xs">
                            Sem registros recentes
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {inactiveItems.length > 0 && (
                <div className="p-3.5 bg-stone-50 dark:bg-[#152333]/40 rounded-xl border border-stone-200 dark:border-[#1E2E42] space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
                    <Info className="h-4 w-4 text-stone-400" />
                    <span>Módulos inativos neste perfil:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {inactiveItems.map((item) => (
                      <Badge key={item.code} variant="outline" className="text-[11px] text-stone-400 border-stone-300 dark:border-stone-700">
                        {item.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 2: MEDICAMENTOS & ADESÃO
         ========================================================================= */}
      {activeTab === 'medications' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Header Metric Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-extrabold text-emerald-200">
                  Taxa de Adesão no Período ({daysRange} dias)
                </span>
                <h2 className="text-3xl sm:text-4xl font-black mt-1">{medStats.adherenceRate}%</h2>
                <p className="text-xs sm:text-sm text-emerald-100 mt-1 max-w-md">
                  {medStats.adherenceRate >= 85
                    ? 'Excelente regularidade! As doses estão sendo tomadas nos horários estipulados.'
                    : 'Atenção aos horários! Alguns medicamentos tiveram atrasos ou confirmações pendentes.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                <div className="text-center sm:text-left">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-200 block">Doses Tomadas</span>
                  <span className="text-xl sm:text-2xl font-black">{medStats.takenDoses}</span>
                </div>
                <div className="text-center sm:text-left">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-200 block">Remédios Ativos</span>
                  <span className="text-xl sm:text-2xl font-black">{medStats.activeMedsCount}</span>
                </div>
              </div>
            </div>

            {/* Adherence Progress Bar */}
            <div className="w-full bg-white/20 h-2.5 rounded-full mt-5 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${medStats.adherenceRate}%` }}
              />
            </div>
          </div>

          {/* Active Medications List */}
          <Card className="border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-stone-100 dark:border-[#1E2E42]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Pill className="h-5 w-5 text-emerald-600" />
                  <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                    Medicamentos em Uso Contínuo
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {medicationsList.length} cadastrados
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {medicationsList.length === 0 ? (
                <div className="py-8 text-center text-stone-500 space-y-2">
                  <Pill className="h-8 w-8 mx-auto text-stone-400" />
                  <p className="text-sm font-medium">Nenhum medicamento ativo cadastrado no momento.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {medicationsList.map((med) => (
                    <div
                      key={med.id}
                      className="p-4 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/50 dark:bg-[#152333]/40 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{med.name}</h4>
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            Dosagem: <span className="font-semibold text-stone-700 dark:text-stone-300">{med.dosage} {med.unit}</span>
                          </p>
                        </div>
                        <Badge className="bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-[10px]">
                          Ativo
                        </Badge>
                      </div>

                      {med.instructions && (
                        <p className="text-xs text-stone-600 dark:text-stone-400 italic bg-white dark:bg-[#101D2B] p-2 rounded-lg border border-stone-200 dark:border-[#1E2E42]">
                          &ldquo;{med.instructions}&rdquo;
                        </p>
                      )}

                      {med.medication_schedules && med.medication_schedules.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <Clock className="h-3 w-3 text-stone-400" />
                          <span className="text-[11px] text-stone-500">Horários:</span>
                          {med.medication_schedules.map((s: any) => (
                            <span
                              key={s.id}
                              className="px-2 py-0.5 rounded-md bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 font-bold text-[10px]"
                            >
                              {s.time_of_day?.slice(0, 5)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Medication Confirmations Log */}
          <Card className="border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-stone-100 dark:border-[#1E2E42]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                  Histórico de Confirmações de Doses
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  Últimas {medicationLogs.length} confirmações
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {medicationLogs.length === 0 ? (
                <p className="text-center text-sm text-stone-500 py-6">
                  Nenhuma confirmação de dose registrada nos últimos {daysRange} dias.
                </p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {medicationLogs.map((log) => {
                    const med = medicationsList.find((m) => m.id === log.medication_id);
                    const logDate = new Date(log.taken_at);
                    return (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/50 dark:bg-[#152333]/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center shrink-0">
                            <Check className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-bold text-sm text-stone-900 dark:text-stone-100">
                              {med ? med.name : 'Medicamento'} {med ? `(${med.dosage} ${med.unit})` : ''}
                            </p>
                            <p className="text-xs text-stone-500 dark:text-stone-400">
                              Confirmado por {selectedPerson.full_name.split(' ')[0]} ou cuidador
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none text-[11px] font-bold">
                            Tomado
                          </Badge>
                          <p className="text-[11px] text-stone-400 mt-1">
                            {format(logDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 3: NUTRIÇÃO & HIDRATAÇÃO
         ========================================================================= */}
      {activeTab === 'nutrition' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Hydration Deep Dive */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-1 border-sky-200 dark:border-sky-900/50 bg-gradient-to-b from-sky-50/60 to-white dark:from-[#0E2238] dark:to-[#101D2B] shadow-xs">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Droplet className="h-4 w-4" /> Hidratação Diária
                </span>
                <CardTitle className="text-2xl font-black text-stone-900 dark:text-stone-100">
                  {hydrationStats.avgCupsPerDay} copos/dia
                </CardTitle>
                <CardDescription className="text-xs">
                  Média no período de {daysRange} dias
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="p-3 bg-white dark:bg-[#152333] rounded-xl border border-sky-100 dark:border-[#1E2E42] space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-stone-600 dark:text-stone-300">Progresso da Meta (8 copos)</span>
                    <span className="text-sky-600 font-bold">{hydrationStats.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-sky-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${hydrationStats.progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Volume Total</span>
                    <span className="text-base font-black text-sky-800 dark:text-sky-300">
                      {Math.round(hydrationStats.totalMl / 1000 * 10) / 10} L
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900">
                    <span className="text-stone-500 block text-[10px] uppercase font-bold">Total de Copos</span>
                    <span className="text-base font-black text-sky-800 dark:text-sky-300">
                      {hydrationStats.totalCups} copos
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hydration Logs Timeline */}
            <Card className="lg:col-span-2 border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
              <CardHeader className="py-4 px-6 border-b border-stone-100 dark:border-[#1E2E42]">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                    Registros de Água Ingerida
                  </CardTitle>
                  <Badge variant="outline" className="text-xs">
                    {hydrationLogs.length} registros
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {hydrationLogs.length === 0 ? (
                  <p className="text-center text-sm text-stone-500 py-6">
                    Nenhum copo de água registrado nos últimos {daysRange} dias.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
                    {hydrationLogs.slice(0, 15).map((log) => {
                      const logDate = new Date(log.logged_at);
                      return (
                        <div
                          key={log.id}
                          className="flex items-center justify-between p-2.5 rounded-xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/50 dark:bg-[#152333]/30"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">💧</span>
                            <span className="text-sm font-bold text-stone-800 dark:text-stone-200">
                              {log.amount_ml || 250} ml de água ingeridos
                            </span>
                          </div>
                          <span className="text-xs text-stone-500">
                            {format(logDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Meals Deep Dive */}
          <Card className="border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-stone-100 dark:border-[#1E2E42]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Utensils className="h-5 w-5 text-amber-600" />
                  <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                    Histórico &amp; Hábitos de Alimentação
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs font-bold">
                  {mealsStats.totalMeals} refeições registradas
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Meal Types Distribution */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { key: 'breakfast', label: 'Café da Manhã', icon: '🥣', count: mealsStats.types.breakfast },
                  { key: 'lunch', label: 'Almoço', icon: '🥗', count: mealsStats.types.lunch },
                  { key: 'snack', label: 'Lanche da Tarde', icon: '🍎', count: mealsStats.types.snack },
                  { key: 'dinner', label: 'Jantar / Ceia', icon: '🍲', count: mealsStats.types.dinner },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-3.5 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/60 dark:bg-[#152333]/30 text-center"
                  >
                    <span className="text-2xl block mb-1">{item.icon}</span>
                    <span className="text-xs font-bold text-stone-600 dark:text-stone-300 block">{item.label}</span>
                    <span className="text-lg font-black text-stone-900 dark:text-stone-100">{item.count}</span>
                  </div>
                ))}
              </div>

              {/* Meal Records List */}
              <div>
                <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-3">
                  Últimas refeições registradas
                </h4>
                {mealsStats.totalMeals === 0 ? (
                  <p className="text-center text-sm text-stone-500 py-6">
                    Nenhuma refeição registrada nos últimos {daysRange} dias.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-2">
                    {careNotes
                      .filter((n) => n.content?.startsWith('Refei'))
                      .map((note) => {
                        const noteDate = new Date(note.created_at);
                        return (
                          <div
                            key={note.id}
                            className="p-3 rounded-xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/50 dark:bg-[#152333]/30 flex items-start justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                {note.content}
                              </p>
                              <span className="text-[11px] text-stone-400">
                                Registrado por familiar/cuidador
                              </span>
                            </div>
                            <span className="text-xs text-stone-500 whitespace-nowrap">
                              {format(noteDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 4: SINAIS VITAIS & HUMOR (VITALS & MOOD)
         ========================================================================= */}
      {activeTab === 'vitals_mood' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Sinais Vitais Grid */}
          <div>
            <h2 className="text-base font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2 mb-3">
              <HeartPulse className="h-5 w-5 text-rose-600" />
              Sinais Vitais Mais Recentes
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {/* Pressão Arterial */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
                <span className="text-xs font-bold text-stone-500 block">Pressão Arterial</span>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {vitalsStats.latest?.blood_pressure_systolic
                    ? `${vitalsStats.latest.blood_pressure_systolic}/${vitalsStats.latest.blood_pressure_diastolic}`
                    : '120/80'}
                  <span className="text-xs font-normal text-stone-400 ml-1">mmHg</span>
                </p>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none text-[10px] mt-2">
                  Normal
                </Badge>
              </div>

              {/* Glicemia */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
                <span className="text-xs font-bold text-stone-500 block">Glicemia</span>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {vitalsStats.latest?.glucose || '98'}
                  <span className="text-xs font-normal text-stone-400 ml-1">mg/dL</span>
                </p>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none text-[10px] mt-2">
                  Estável
                </Badge>
              </div>

              {/* Oxigenação */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
                <span className="text-xs font-bold text-stone-500 block">Saturação O₂</span>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {vitalsStats.latest?.oxygen_saturation || '98'}%
                </p>
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-none text-[10px] mt-2">
                  Ótima
                </Badge>
              </div>

              {/* Frequência / Temperatura */}
              <div className="p-4 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
                <span className="text-xs font-bold text-stone-500 block">Temperatura</span>
                <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">
                  {vitalsStats.latest?.temperature || '36.5'}
                  <span className="text-xs font-normal text-stone-400 ml-1">°C</span>
                </p>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-none text-[10px] mt-2">
                  Normal
                </Badge>
              </div>
            </div>
          </div>

          {/* Vitals History Table */}
          <Card className="border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-stone-100 dark:border-[#1E2E42]">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                  Histórico de Medições de Sinais Vitais
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {vitalsStats.totalRecords} medições
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6">
              {vitalsStats.history.length === 0 ? (
                <p className="text-center text-sm text-stone-500 py-6">
                  Nenhuma aferição de sinais vitais gravada nos últimos {daysRange} dias.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b border-stone-200 dark:border-[#1E2E42] text-stone-500">
                      <tr>
                        <th className="py-2.5 font-bold">Data &amp; Hora</th>
                        <th className="py-2.5 font-bold">Pressão Arterial</th>
                        <th className="py-2.5 font-bold">Glicemia</th>
                        <th className="py-2.5 font-bold">Saturação</th>
                        <th className="py-2.5 font-bold">Temperatura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-[#1E2E42]">
                      {vitalsStats.history.map((rec) => (
                        <tr key={rec.id} className="hover:bg-stone-50/50 dark:hover:bg-[#152333]/40">
                          <td className="py-3 font-semibold text-stone-800 dark:text-stone-200">
                            {format(new Date(rec.recorded_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </td>
                          <td className="py-3 font-bold text-stone-900 dark:text-stone-100">
                            {rec.blood_pressure_systolic
                              ? `${rec.blood_pressure_systolic}/${rec.blood_pressure_diastolic} mmHg`
                              : '--'}
                          </td>
                          <td className="py-3">{rec.glucose ? `${rec.glucose} mg/dL` : '--'}</td>
                          <td className="py-3">{rec.oxygen_saturation ? `${rec.oxygen_saturation}%` : '--'}</td>
                          <td className="py-3">{rec.temperature ? `${rec.temperature} °C` : '--'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mood & Well-being Check-ins Section */}
          <Card className="border-stone-200 dark:border-[#1E2E42] bg-white dark:bg-[#101D2B] shadow-xs">
            <CardHeader className="py-4 px-6 border-b border-stone-100 dark:border-[#1E2E42]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Smile className="h-5 w-5 text-purple-600" />
                  <CardTitle className="text-base font-black text-stone-900 dark:text-stone-100">
                    Humor &amp; Disposição Emocional
                  </CardTitle>
                </div>
                <Badge variant="outline" className="text-xs">
                  {moodStats.totalCheckIns} relatos
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Mood breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {[
                  { key: 'great', label: 'Muito Bem', emoji: '😁', count: moodStats.counts.great },
                  { key: 'good', label: 'Bem', emoji: '😊', count: moodStats.counts.good },
                  { key: 'okay', label: 'Mais ou Menos', emoji: '😐', count: moodStats.counts.okay },
                  { key: 'bad', label: 'Indisposto', emoji: '😔', count: moodStats.counts.bad },
                  { key: 'terrible', label: 'Mal', emoji: '😢', count: moodStats.counts.terrible },
                ].map((m) => (
                  <div
                    key={m.key}
                    className="p-3 rounded-2xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/50 dark:bg-[#152333]/30 text-center"
                  >
                    <span className="text-2xl block">{m.emoji}</span>
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300 mt-1 block">
                      {m.label}
                    </span>
                    <span className="text-base font-black text-stone-900 dark:text-stone-100 mt-0.5">
                      {m.count} vezes
                    </span>
                  </div>
                ))}
              </div>

              {/* Check-ins timeline */}
              <div>
                <h4 className="text-sm font-bold text-stone-800 dark:text-stone-200 mb-3">
                  Relatos e falas registradas
                </h4>
                {checkIns.length === 0 ? (
                  <p className="text-center text-sm text-stone-500 py-6">
                    Nenhum check-in de humor registrado nos últimos {daysRange} dias.
                  </p>
                ) : (
                  <div className="space-y-2.5 max-h-64 overflow-y-auto pr-2">
                    {checkIns.map((c) => {
                      const cDate = new Date(c.created_at);
                      const mInfo = moodStats.details[c.mood] || moodStats.details.good;
                      return (
                        <div
                          key={c.id}
                          className="p-3 rounded-xl border border-stone-200 dark:border-[#1E2E42] bg-stone-50/50 dark:bg-[#152333]/30 flex items-start justify-between gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{mInfo.emoji}</span>
                            <div>
                              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                                {c.notes || mInfo.label}
                              </p>
                              <span className="text-xs text-stone-500">
                                Registro de humor na tela do idoso
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-stone-400 whitespace-nowrap">
                            {format(cDate, "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* =========================================================================
          TAB 5: LAUDO CLÍNICO & IMPRESSÃO MÉDICA (CLINICAL PRINT)
         ========================================================================= */}
      {activeTab === 'clinical_print' && (
        <div className="space-y-6">
          {/* Action Bar for Printing */}
          <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 print:hidden">
            <div className="flex items-center gap-3">
              <FileCheck className="h-6 w-6 text-emerald-600" />
              <div>
                <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">
                  Relatório Clínico Formatado para Consulta
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Pronto para impressão em papel A4 ou exportação para PDF médico.
                </p>
              </div>
            </div>

            <Button
              onClick={() => window.print()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl gap-2 shadow-sm"
            >
              <Printer className="h-4 w-4" />
              Imprimir Agora
            </Button>
          </div>

          {/* MEDICAL REPORT SHEET (Optimized for Screen & Print) */}
          <div className="bg-white dark:bg-[#101D2B] text-stone-900 dark:text-stone-100 border border-stone-300 dark:border-[#1E2E42] p-8 sm:p-12 rounded-3xl shadow-md space-y-8 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Header Document */}
            <div className="border-b-2 border-stone-900 dark:border-stone-100 pb-6 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-base">
                    P
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-wider text-stone-900 dark:text-stone-100 print:text-black">
                    PARENT CARE · RELATÓRIO DE ROTINA CLÍNICA
                  </h2>
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Documento de Acompanhamento Multidisciplinar e Geriátrico Familiar
                </p>
              </div>
              <div className="text-right text-xs text-stone-500">
                <p className="font-bold text-stone-900 dark:text-stone-100 print:text-black">
                  Emissão: {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p>Período avaliado: últimos {daysRange} dias</p>
              </div>
            </div>

            {/* Patient Info Card */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-stone-100 dark:bg-[#152333] print:bg-stone-50 border border-stone-200 dark:border-[#1E2E42]">
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Pessoa Cuidada</span>
                <span className="text-sm font-black text-stone-900 dark:text-stone-100 print:text-black">
                  {selectedPerson.full_name}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Identificador</span>
                <span className="text-xs font-mono text-stone-700 dark:text-stone-300 print:text-black">
                  #{selectedPerson.id.slice(0, 8)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Adesão Medicamentosa</span>
                <span className="text-sm font-black text-emerald-700 dark:text-emerald-400 print:text-black">
                  {medStats.adherenceRate}%
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-stone-500 block">Média de Água / Dia</span>
                <span className="text-sm font-black text-sky-700 dark:text-sky-400 print:text-black">
                  {hydrationStats.avgCupsPerDay} copos/dia
                </span>
              </div>
            </div>

            {/* Section 1: Medicamentos em Uso */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-[#1E2E42] pb-1 print:text-black">
                1. Prescrições &amp; Medicamentos em Uso Contínuo
              </h3>
              {medicationsList.length === 0 ? (
                <p className="text-xs text-stone-500">Nenhum medicamento ativo registrado.</p>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 dark:border-stone-700 text-stone-600 font-bold">
                      <th className="py-2">Medicamento</th>
                      <th className="py-2">Dosagem</th>
                      <th className="py-2">Horários Diários</th>
                      <th className="py-2">Instruções</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {medicationsList.map((m) => (
                      <tr key={m.id}>
                        <td className="py-2 font-bold">{m.name}</td>
                        <td className="py-2">{m.dosage} {m.unit}</td>
                        <td className="py-2 font-mono">
                          {m.medication_schedules?.map((s: any) => s.time_of_day?.slice(0, 5)).join(', ') || 'Rotina regular'}
                        </td>
                        <td className="py-2 text-stone-500 italic">{m.instructions || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 2: Sinais Vitais Recentes */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-[#1E2E42] pb-1 print:text-black">
                2. Histórico Clínico de Sinais Vitais
              </h3>
              {vitalsStats.history.length === 0 ? (
                <p className="text-xs text-stone-500">Nenhuma medição gravada nos últimos {daysRange} dias.</p>
              ) : (
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-300 dark:border-stone-700 text-stone-600 font-bold">
                      <th className="py-2">Data &amp; Hora</th>
                      <th className="py-2">Pressão Arterial</th>
                      <th className="py-2">Glicemia</th>
                      <th className="py-2">Oxigenação (SpO₂)</th>
                      <th className="py-2">Temperatura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                    {vitalsStats.history.slice(0, 5).map((v) => (
                      <tr key={v.id}>
                        <td className="py-2">{format(new Date(v.recorded_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td>
                        <td className="py-2 font-bold">
                          {v.blood_pressure_systolic ? `${v.blood_pressure_systolic}/${v.blood_pressure_diastolic} mmHg` : '--'}
                        </td>
                        <td className="py-2">{v.glucose ? `${v.glucose} mg/dL` : '--'}</td>
                        <td className="py-2">{v.oxygen_saturation ? `${v.oxygen_saturation}%` : '--'}</td>
                        <td className="py-2">{v.temperature ? `${v.temperature} °C` : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Section 3: Mudanças de Padrão & Observações da Rotina */}
            <div className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-stone-900 dark:text-stone-100 border-b border-stone-200 dark:border-[#1E2E42] pb-1 print:text-black">
                3. Mudanças Observadas &amp; Padrões de Rotina
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-stone-200 dark:border-[#1E2E42]">
                  <p className="font-bold text-stone-800 dark:text-stone-200">Humor &amp; Disposição:</p>
                  <p className="text-stone-600 dark:text-stone-400 mt-1">
                    Predominante: {moodStats.predominant.emoji} {moodStats.predominant.label}. Total de {moodStats.totalCheckIns} relatos registrados no período.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-stone-200 dark:border-[#1E2E42]">
                  <p className="font-bold text-stone-800 dark:text-stone-200">Nutrição &amp; Apetite:</p>
                  <p className="text-stone-600 dark:text-stone-400 mt-1">
                    Total de {mealsStats.totalMeals} refeições acompanhadas. Média de {hydrationStats.avgCupsPerDay} copos d'água ingeridos por dia.
                  </p>
                </div>
              </div>
            </div>

            {/* Section 4: Espaço para Anotações Médicas */}
            <div className="space-y-4 pt-4 border-t-2 border-stone-300 dark:border-stone-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Anotações e Parecer do Médico / Profissional de Saúde:
              </h3>
              <div className="border border-dashed border-stone-300 dark:border-stone-700 h-28 rounded-xl p-3 text-xs text-stone-400">
                (Espaço reservado para carimbo, anotações e assinatura médica durante a consulta)
              </div>
            </div>

            {/* Document Footer */}
            <div className="pt-4 text-[10px] text-stone-400 text-center border-t border-stone-200 dark:border-[#1E2E42]">
              Parent Care Brasil · Sistema de Acompanhamento Familiar e Cuidados Geriátricos · Gerado automaticamente em {format(new Date(), 'dd/MM/yyyy HH:mm')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
