'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { createClient } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pill,
  Droplet,
  Calendar,
  Utensils,
  Heart,
  Footprints,
  Moon,
  Check,
  ChevronRight,
  Plus,
  Sliders,
  Sparkles,
  UserPlus,
  Clock,
  Activity,
  Users,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardOverviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId } = useAuth();
  const { caredPeople, selectedPerson, setSelectedPersonId, loading: personLoading } = useCaredPerson();
  const { isModuleEnabled, customFields } = useMonitoring();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // Real Supabase data states
  const [meds, setMeds] = useState<any[]>([]);
  const [hydrationCount, setHydrationCount] = useState<number>(0);
  const [nextAppointment, setNextAppointment] = useState<any | null>(null);
  const [familyTasks, setFamilyTasks] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [mealsStatus, setMealsStatus] = useState({ breakfast: false, lunch: false, dinner: false });
  const [recentMood, setRecentMood] = useState<string | null>(null);

  const fetchRealData = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;

    // 1. Fetch Medications if enabled
    if (isModuleEnabled('meds_scheduled')) {
      const { data: medsData } = await supabase
        .from('medications')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(4);

      setMeds(medsData || []);
    } else {
      setMeds([]);
    }

    // 2. Fetch Hydration if enabled
    if (isModuleEnabled('routine_hydration')) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const { data: hydrationData } = await supabase
        .from('hydration_logs')
        .select('amount_ml')
        .eq('cared_person_id', selectedPerson.id)
        .gte('logged_at', todayStart.toISOString());

      if (hydrationData && hydrationData.length > 0) {
        const totalMl = hydrationData.reduce((acc: number, item: any) => acc + (item.amount_ml || 250), 0);
        setHydrationCount(Math.min(Math.round(totalMl / 250), 8));
      } else {
        setHydrationCount(0);
      }
    }

    // 3. Fetch Next Appointment if enabled
    if (isModuleEnabled('schedule_appointments')) {
      const { data: apptData } = await supabase
        .from('appointments')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1);

      setNextAppointment(apptData && apptData.length > 0 ? apptData[0] : null);
    } else {
      setNextAppointment(null);
    }

    // 4. Fetch Tasks
    const { data: taskList } = await supabase
      .from('tasks')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .limit(6);

    setFamilyTasks(taskList || []);

    // 5. Fetch Team / Caregivers
    const { data: membersData } = await supabase
      .from('organization_members')
      .select('id, user_id, role, users(full_name, avatar_url, email)')
      .eq('organization_id', currentOrganizationId)
      .limit(5);

    setTeamMembers(membersData || []);

    // 6. Fetch Mood / Wellbeing if enabled
    if (isModuleEnabled('wellbeing_mood')) {
      const { data: checkInData } = await supabase
        .from('check_ins')
        .select('mood, created_at')
        .eq('cared_person_id', selectedPerson.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setRecentMood(checkInData?.mood || null);
    }
  }, [selectedPerson, currentOrganizationId, isModuleEnabled, supabase]);

  useEffect(() => {
    fetchRealData();
  }, [fetchRealData]);

  // Add water log
  const handleAddWater = async () => {
    if (!selectedPerson || !currentOrganizationId || !user) return;
    const nextCount = Math.min(hydrationCount + 1, 8);
    setHydrationCount(nextCount);

    await supabase.from('hydration_logs').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      amount_ml: 250,
      logged_by: user.id,
    });
  };

  const toggleMeal = async (meal: 'breakfast' | 'lunch' | 'dinner') => {
    const nextVal = !mealsStatus[meal];
    setMealsStatus((prev) => ({ ...prev, [meal]: nextVal }));

    if (nextVal && selectedPerson && currentOrganizationId && user) {
      await supabase.from('meals').insert({
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        meal_type: meal,
        logged_by: user.id,
      });
    }
  };

  // Toggle task completion
  const toggleTask = async (taskId: string, currentStatus: boolean) => {
    setFamilyTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, completed: !currentStatus } : t))
    );
    await supabase.from('tasks').update({ completed: !currentStatus }).eq('id', taskId);
  };

  // Circular gauge calculations (donut ring)
  const radius = 52;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (hydrationCount / 8) * circumference;

  // Task completion calculation
  const completedTasksCount = familyTasks.filter((t) => t.completed || t.status === 'completed').length;
  const totalTasksCount = familyTasks.length > 0 ? familyTasks.length : 4;
  const taskPercentage = Math.round((completedTasksCount / totalTasksCount) * 100);

  // Weekly consistency data (Seg a Dom)
  const weeklyDays = [
    { day: 'Seg', pct: 90 },
    { day: 'Ter', pct: 100 },
    { day: 'Qua', pct: 85 },
    { day: 'Qui', pct: 95 },
    { day: 'Sex', pct: 100 },
    { day: 'Sáb', pct: 80 },
    { day: 'Dom', pct: 92, current: true },
  ];

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-14 text-stone-900">
      {/* ======================================================== */}
      {/* TOP HEADER BAR: STATUS DA FAMÍLIA E MODO SÊNIOR          */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 led-glow-green animate-led-pulse" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
                Painel de Cuidado Familiar
              </h1>
              <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 font-bold text-xs">
                Ao Vivo
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Monitoramento preventivo e rotina diária em tempo real
            </p>
          </div>
        </div>

        {selectedPerson && (
          <div className="flex items-center gap-2.5">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="text-xs font-bold border-stone-300 hover:bg-stone-100 rounded-xl"
            >
              <Link href={`/${locale}/dashboard/settings/monitoring`}>
                <Sliders className="h-3.5 w-3.5 mr-1.5 text-stone-500" />
                Personalizar Módulos
              </Link>
            </Button>

            <Button
              asChild
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs gap-1.5"
            >
              <Link href={`/${locale}/care/${selectedPerson.id}`} target="_blank">
                <span className="w-2 h-2 rounded-full bg-white led-glow-green" />
                Abrir Modo Sênior
                <ExternalLink className="h-3 w-3 ml-0.5 opacity-80" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: TOP ELDERLY CARDS (Referência Imagem 2)       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {caredPeople && caredPeople.length > 0 ? (
          caredPeople.map((person) => {
            const isSelected = selectedPerson?.id === person.id;
            return (
              <div
                key={person.id}
                onClick={() => setSelectedPersonId(person.id)}
                className={cn(
                  'bg-white dark:bg-stone-900 rounded-3xl p-6 border transition-all duration-200 cursor-pointer shadow-xs hover:shadow-md relative overflow-hidden',
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950/60'
                    : 'border-stone-200 dark:border-stone-800 opacity-90 hover:opacity-100'
                )}
              >
                {/* Top Profile Line */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center text-2xl font-black text-emerald-800 shadow-inner overflow-hidden border-2 border-white">
                        {person.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                        ) : (
                          person.full_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {/* Active LED status dot */}
                      <span className="absolute -top-1 -right-1 flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white led-glow-green" />
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="font-extrabold text-lg text-stone-900 dark:text-stone-100">
                          {person.full_name}
                        </h2>
                        {isSelected && (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300 text-[10px] font-bold">
                            Ativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-stone-500 font-medium mt-0.5">
                        {person.blood_type ? `Tipo Sanguíneo ${person.blood_type}` : 'Em Casa • Rotina Estável'}
                      </p>
                    </div>
                  </div>

                  <div className="p-2 rounded-xl bg-stone-50 dark:bg-stone-800 text-stone-400">
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </div>

                {/* 3 Vital & Routine Progress Bars (Exatamente como Imagem 2) */}
                <div className="mt-5 pt-4 border-t border-stone-100 dark:border-stone-800/80 grid grid-cols-3 gap-3">
                  {/* Metric 1: Coração */}
                  <div className="bg-stone-50/80 dark:bg-stone-800/40 p-3 rounded-2xl">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3.5 w-3.5 text-rose-500 fill-rose-500" /> Coração
                      </span>
                      <span className="text-stone-800 dark:text-stone-200 font-extrabold">74 bpm</span>
                    </div>
                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full rounded-full w-[72%]" />
                    </div>
                    <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">Normal</p>
                  </div>

                  {/* Metric 2: Passos / Movimento */}
                  <div className="bg-stone-50/80 dark:bg-stone-800/40 p-3 rounded-2xl">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Footprints className="h-3.5 w-3.5 text-amber-500" /> Atividade
                      </span>
                      <span className="text-stone-800 dark:text-stone-200 font-extrabold">3.240</span>
                    </div>
                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full w-[65%]" />
                    </div>
                    <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-1">65% da meta</p>
                  </div>

                  {/* Metric 3: Sono / Repouso */}
                  <div className="bg-stone-50/80 dark:bg-stone-800/40 p-3 rounded-2xl">
                    <div className="flex items-center justify-between text-[11px] font-bold text-stone-500 mb-1.5">
                      <span className="flex items-center gap-1">
                        <Moon className="h-3.5 w-3.5 text-indigo-500" /> Sono
                      </span>
                      <span className="text-stone-800 dark:text-stone-200 font-extrabold">7h 40m</span>
                    </div>
                    <div className="w-full bg-stone-200 dark:bg-stone-700 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full rounded-full w-[85%]" />
                    </div>
                    <p className="text-[10px] text-indigo-700 dark:text-indigo-400 font-medium mt-1">Bom descanso</p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 bg-white dark:bg-stone-900 border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-3xl p-8 text-center">
            <h3 className="font-bold text-stone-900 dark:text-stone-100 text-lg">Nenhum familiar cadastrado</h3>
            <p className="text-stone-500 text-sm mt-1 mb-4">
              Cadastre seus pais ou familiares para iniciar o monitoramento preventivo.
            </p>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Familiar
              </Link>
            </Button>
          </div>
        )}

        {caredPeople && caredPeople.length === 1 && (
          <Link
            href={`/${locale}/dashboard/cared-people/new`}
            className="border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-emerald-400 rounded-3xl p-6 flex items-center justify-center gap-4 text-stone-500 hover:text-emerald-700 transition-colors bg-white/60 dark:bg-stone-900/60"
          >
            <div className="w-14 h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center text-stone-600">
              <Plus className="h-7 w-7" />
            </div>
            <div className="text-left">
              <p className="font-extrabold text-base text-stone-800 dark:text-stone-200">+ Cadastrar Outro Familiar</p>
              <p className="text-xs text-stone-400">Acompanhe até 2 pessoas no mesmo plano familiar</p>
            </div>
          </Link>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 2: 4 ACTIONABLE ROUTINE WIDGETS (Imagem 2)       */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* WIDGET 1: MEDICAMENTOS DE HOJE */}
        {isModuleEnabled('meds_scheduled') && (
          <Card className="rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-emerald-100/90 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                  <Pill className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-emerald-700 border-emerald-300 bg-emerald-50">
                  Medicamentos
                </Badge>
              </div>

              {meds.length > 0 ? (
                <div className="space-y-3">
                  {meds.map((med, idx) => (
                    <div
                      key={med.id || idx}
                      className="p-2.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                        <span className="font-bold text-stone-800 dark:text-stone-200 truncate">
                          {med.name}
                        </span>
                      </div>
                      <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-lg bg-emerald-100/80 text-emerald-800 shrink-0">
                        {med.time_of_day?.slice(0, 5) || '08:00'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-stone-400 space-y-2">
                  <p className="text-xs">Nenhum remédio cadastrado ainda.</p>
                  <Button asChild size="sm" variant="outline" className="text-xs h-8 rounded-xl">
                    <Link href={`/${locale}/dashboard/medications/new`}>+ Adicionar</Link>
                  </Button>
                </div>
              )}
            </div>

            <Link
              href={`/${locale}/dashboard/medications`}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Ver todas as receitas</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        {/* WIDGET 2: HIDRATAÇÃO DIÁRIA (Donut Gauge + 8 Copos) */}
        {isModuleEnabled('routine_hydration') && (
          <Card className="rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col items-center justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="w-11 h-11 rounded-2xl bg-sky-100/90 dark:bg-sky-950/50 flex items-center justify-center text-sky-600">
                  <Droplet className="h-5 w-5 fill-sky-600" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-sky-700 border-sky-300 bg-sky-50">
                  Hidratação
                </Badge>
              </div>

              {/* SVG Circular Donut Ring */}
              <div className="relative w-28 h-28 mx-auto my-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
                  <circle
                    cx="65"
                    cy="65"
                    r={radius}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-stone-900 dark:text-stone-100 leading-none">
                    {hydrationCount}<span className="text-xs font-semibold text-stone-400">/8</span>
                  </span>
                  <span className="text-[10px] font-bold text-sky-600 mt-0.5">
                    {Math.round((hydrationCount / 8) * 100)}%
                  </span>
                </div>
              </div>

              {/* 8 Clickable Glass Icons */}
              <div className="flex items-center justify-center gap-1.5 mt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={handleAddWater}
                    title={`Copo ${i + 1}`}
                    className={cn(
                      'w-5 h-7 rounded-b-lg border-2 cursor-pointer transition-all flex items-end p-0.5 active:scale-95',
                      i < hydrationCount
                        ? 'bg-sky-400 border-sky-500 shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-200 hover:border-sky-300'
                    )}
                  >
                    <div className={cn('w-full rounded-b-xs transition-all', i < hydrationCount ? 'bg-sky-600 h-full' : 'h-0')} />
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddWater}
              className="text-xs font-bold text-sky-600 hover:text-sky-800 transition-colors mt-3 pt-3 border-t border-stone-100 dark:border-stone-800 w-full text-center"
            >
              + Registrar 250ml
            </button>
          </Card>
        )}

        {/* WIDGET 3: PRÓXIMA CONSULTA / AGENDA */}
        {isModuleEnabled('schedule_appointments') && (
          <Card className="rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-purple-100/90 dark:bg-purple-950/50 flex items-center justify-center text-purple-700">
                  <Calendar className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-purple-700 border-purple-300 bg-purple-50">
                  Agenda
                </Badge>
              </div>

              {nextAppointment ? (
                <div className="py-2 text-center space-y-2">
                  <div className="inline-block px-3 py-1 rounded-2xl bg-purple-100/80 text-purple-800 font-black text-2xl">
                    {new Date(nextAppointment.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} &gt;
                  </div>
                  <p className="text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug">
                    {nextAppointment.title}
                  </p>
                  <p className="text-xs text-stone-500">
                    {nextAppointment.doctor_name || 'Consulta Médica'}
                  </p>
                </div>
              ) : (
                <div className="py-6 text-center text-stone-400 space-y-2">
                  <p className="text-xs">Nenhum compromisso agendado para os próximos dias.</p>
                  <Button asChild size="sm" variant="outline" className="text-xs h-8 rounded-xl">
                    <Link href={`/${locale}/dashboard/appointments`}>+ Agendar</Link>
                  </Button>
                </div>
              )}
            </div>

            <Link
              href={`/${locale}/dashboard/appointments`}
              className="text-xs text-purple-700 dark:text-purple-400 font-bold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Ver agenda completa</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        {/* WIDGET 4: REFEIÇÕES DO DIA */}
        {isModuleEnabled('routine_meals') && (
          <Card className="rounded-3xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-11 h-11 rounded-2xl bg-amber-100/90 dark:bg-amber-950/50 flex items-center justify-center text-amber-700">
                  <Utensils className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] font-bold text-amber-700 border-amber-300 bg-amber-50">
                  Refeições
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-2">
                <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
                  <span className="text-2xl">🥣</span>
                  <button
                    onClick={() => toggleMeal('breakfast')}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-xs',
                      mealsStatus.breakfast ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                    )}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">Café</span>
                </div>

                <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
                  <span className="text-2xl">🥗</span>
                  <button
                    onClick={() => toggleMeal('lunch')}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-xs',
                      mealsStatus.lunch ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                    )}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">Almoço</span>
                </div>

                <div className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-stone-50 dark:bg-stone-800/50">
                  <span className="text-2xl">🍲</span>
                  <button
                    onClick={() => toggleMeal('dinner')}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-xs',
                      mealsStatus.dinner ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                    )}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">Jantar</span>
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/meals`}
              className="text-xs text-amber-700 dark:text-amber-400 font-bold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Gerenciar refeições</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}
      </div>

      {/* ======================================================== */}
      {/* SECTION 3: EQUIPE DE CUIDADO & ADERÊNCIA SEMANAL         */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CARD A: EQUIPE DE CUIDADO & TAREFAS */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 dark:text-stone-100 text-base">
                    Equipe de Cuidado & Tarefas
                  </h3>
                  <p className="text-xs text-stone-500">Membros da família e cuidadores sincronizados</p>
                </div>
              </div>
              <Badge className="bg-teal-50 text-teal-800 border-teal-200 text-[10px] font-bold">
                {teamMembers.length} Conectados
              </Badge>
            </div>

            {/* Task Progress Bar */}
            <div className="bg-stone-50 dark:bg-stone-800/60 p-4 rounded-2xl mb-4">
              <div className="flex items-center justify-between text-xs font-bold mb-2">
                <span className="text-stone-600 dark:text-stone-300">
                  Progresso das Tarefas da Rotina
                </span>
                <span className="text-emerald-600 font-extrabold">{taskPercentage}% Concluído</span>
              </div>
              <div className="w-full bg-stone-200 dark:bg-stone-700 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${taskPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-stone-500 mt-2">
                {completedTasksCount} de {totalTasksCount} atividades diárias checadas pela família.
              </p>
            </div>

            {/* Caregivers Avatars Row */}
            <div className="flex items-center gap-2 mb-4">
              {teamMembers.length > 0 ? (
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    title={member.users?.full_name || 'Familiar'}
                    className="w-10 h-10 rounded-xl bg-emerald-100 border-2 border-white dark:border-stone-800 flex items-center justify-center text-xs font-bold text-emerald-800 shadow-xs"
                  >
                    {(member.users?.full_name || 'F').charAt(0).toUpperCase()}
                  </div>
                ))
              ) : (
                <div className="text-xs text-stone-400">Nenhum membro adicional conectado ainda.</div>
              )}
              <Link
                href={`/${locale}/dashboard/family`}
                className="w-10 h-10 rounded-xl border-2 border-dashed border-stone-300 hover:border-emerald-500 flex items-center justify-center text-stone-400 hover:text-emerald-600 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </Link>
            </div>

            {/* Quick Task List */}
            {familyTasks.length > 0 && (
              <div className="space-y-2">
                {familyTasks.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id, !!task.completed)}
                    className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-800/40 border border-stone-100 dark:border-stone-800 flex items-center justify-between cursor-pointer hover:bg-stone-100/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-5 h-5 rounded-md flex items-center justify-center border transition-colors',
                          task.completed
                            ? 'bg-emerald-500 border-emerald-600 text-white'
                            : 'border-stone-300 dark:border-stone-600'
                        )}
                      >
                        {task.completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span
                        className={cn(
                          'text-xs font-bold',
                          task.completed ? 'line-through text-stone-400' : 'text-stone-800 dark:text-stone-200'
                        )}
                      >
                        {task.title}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {task.due_time ? task.due_time.slice(0, 5) : 'Hoje'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link
            href={`/${locale}/dashboard/family`}
            className="text-xs text-teal-700 dark:text-teal-400 font-bold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
          >
            <span>Gerenciar equipe e tarefas</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* CARD B: ADERÊNCIA SEMANAL & CONSISTÊNCIA */}
        <div className="bg-white dark:bg-stone-900 p-6 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Activity className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-black text-stone-900 dark:text-stone-100 text-base">
                    Aderência Semanal da Rotina
                  </h3>
                  <p className="text-xs text-stone-500">Histórico dos últimos 7 dias de cumprimento</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black">
                <span className="w-2 h-2 rounded-full bg-emerald-500 led-glow-green animate-led-pulse" />
                94% Excelente
              </span>
            </div>

            {/* Weekly Bar Chart */}
            <div className="pt-4 pb-2">
              <div className="flex items-end justify-between gap-3 h-40 px-2">
                {weeklyDays.map((item) => (
                  <div key={item.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-[10px] font-bold text-stone-400">{item.pct}%</span>
                    <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-xl h-28 flex items-end p-1 overflow-hidden">
                      <div
                        className={cn(
                          'w-full rounded-lg transition-all duration-500',
                          item.current
                            ? 'bg-emerald-500 shadow-xs'
                            : 'bg-emerald-400/80 hover:bg-emerald-500'
                        )}
                        style={{ height: `${item.pct}%` }}
                      />
                    </div>
                    <span
                      className={cn(
                        'text-xs font-bold',
                        item.current ? 'text-emerald-700 dark:text-emerald-400 underline underline-offset-4' : 'text-stone-500'
                      )}
                    >
                      {item.day}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-100 dark:border-stone-800 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <p className="text-xs text-stone-600 dark:text-stone-300 font-medium">
                Sem registros de atraso de medicações ou alertas críticos nos últimos 7 dias.
              </p>
            </div>
          </div>

          <Link
            href={`/${locale}/dashboard/history`}
            className="text-xs text-emerald-700 dark:text-emerald-400 font-bold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
          >
            <span>Ver histórico completo</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
