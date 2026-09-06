'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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
  ShieldAlert,
  UserPlus,
  Clock,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardOverviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId } = useAuth();
  const { caredPeople, selectedPerson, setSelectedPersonId, loading: personLoading } = useCaredPerson();
  const { isModuleEnabled, customFields, loading: monitoringLoading } = useMonitoring();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // Real Supabase data states (NO mock fallbacks!)
  const [meds, setMeds] = useState<any[]>([]);
  const [hydrationCount, setHydrationCount] = useState<number>(0);
  const [nextAppointment, setNextAppointment] = useState<any | null>(null);
  const [familyTasks, setFamilyTasks] = useState<any[]>([]);
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
      .limit(4);

    setFamilyTasks(taskList || []);

    // 5. Fetch Mood / Wellbeing if enabled
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

  // SVG Gauge calculations (donut chart)
  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (hydrationCount / 8) * circumference;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ======================================================== */}
      {/* TOP ROW: PERSON SELECTOR CARDS                          */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {caredPeople && caredPeople.length > 0 ? (
          caredPeople.map((person, idx) => {
            const isSelected = selectedPerson?.id === person.id;
            return (
              <div
                key={person.id}
                onClick={() => setSelectedPersonId(person.id)}
                className={cn(
                  'bg-white dark:bg-stone-900 rounded-2xl p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-xs hover:shadow-md',
                  isSelected
                    ? 'border-emerald-500 ring-2 ring-emerald-100 dark:ring-emerald-950'
                    : 'border-stone-200 dark:border-stone-800'
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-xl font-bold text-emerald-800 shadow-inner overflow-hidden border-2 border-white">
                      {person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                      ) : (
                        person.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <span
                      className={cn(
                        'absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white',
                        isSelected ? 'bg-emerald-500' : 'bg-stone-400'
                      )}
                    />
                  </div>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-stone-800 dark:text-stone-100 text-base">{person.full_name}</h2>
                      {isSelected && (
                        <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300 bg-emerald-50">
                          Selecionado
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-stone-500">
                      {person.blood_type ? `Tipo Sanguíneo: ${person.blood_type}` : 'Rotina Familiar'}
                    </p>
                  </div>
                </div>

                <div className="pl-3 text-stone-400">
                  <ChevronRight className="h-6 w-6" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-2 bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-emerald-900 text-lg">Nenhuma pessoa cuidada cadastrada</h3>
              <p className="text-emerald-700 text-sm mt-1">
                Cadastre seus pais ou familiares para iniciar o acompanhamento diário.
              </p>
            </div>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Pessoa
              </Link>
            </Button>
          </div>
        )}

        {caredPeople && caredPeople.length === 1 && (
          <Link
            href={`/${locale}/dashboard/cared-people/new`}
            className="border-2 border-dashed border-stone-200 dark:border-stone-800 hover:border-emerald-400 rounded-2xl p-5 flex items-center justify-center gap-3 text-stone-500 hover:text-emerald-700 transition-colors bg-white/50 dark:bg-stone-900/50"
          >
            <div className="w-12 h-12 rounded-full bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-stone-800 dark:text-stone-200">+ Cadastrar Outro Familiar</p>
              <p className="text-xs text-stone-400">Acompanhe até 2 pessoas no mesmo plano de cuidado</p>
            </div>
          </Link>
        )}
      </div>

      {/* Personalized Monitoring Header Bar */}
      {selectedPerson && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-stone-900 p-4 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-green/10 text-brand-green rounded-xl">
              <Sliders className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Acompanhamentos de {selectedPerson.full_name.split(' ')[0]}
              </p>
              <p className="text-xs text-stone-500">
                Apenas os módulos ativos abaixo são exibidos para este familiar.
              </p>
            </div>
          </div>
          <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
            <Link href={`/${locale}/dashboard/settings/monitoring`}>
              <Sliders className="h-3.5 w-3.5" /> Personalizar Módulos
            </Link>
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* DYNAMIC WIDGET GRID (Only Activated Modules are Rendered) */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {/* MODULE 1: MEDICAMENTOS (Rendered only if enabled) */}
        {isModuleEnabled('meds_scheduled') && (
          <Card className="rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100/80 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                  <Pill className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] text-emerald-700 border-emerald-300">
                  Medicamentos
                </Badge>
              </div>

              {meds.length > 0 ? (
                <div className="relative pl-6 space-y-4">
                  <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-emerald-500" />
                  {meds.map((med, idx) => (
                    <div key={med.id || idx} className="relative flex items-center justify-between text-xs">
                      <div className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                      <div className="font-semibold text-stone-800 dark:text-stone-200 truncate pr-2">
                        {med.name} {med.dosage}
                      </div>
                      <span className="text-stone-400 shrink-0 font-medium">
                        {med.time_of_day?.slice(0, 5) || 'Horário'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-stone-400 space-y-2">
                  <p className="text-xs">Nenhum medicamento ativo cadastrado ainda.</p>
                  <Button asChild size="sm" variant="outline" className="text-xs h-8">
                    <Link href={`/${locale}/dashboard/medications/new`}>+ Adicionar Remédio</Link>
                  </Button>
                </div>
              )}
            </div>

            <Link
              href={`/${locale}/dashboard/medications`}
              className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Ver receitas</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        {/* MODULE 2: HIDRATAÇÃO (Rendered only if enabled) */}
        {isModuleEnabled('routine_hydration') && (
          <Card className="rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col items-center justify-between">
            <div className="w-full">
              <div className="flex items-center justify-between mb-2">
                <div className="w-10 h-10 rounded-full bg-sky-100/80 dark:bg-sky-950/50 flex items-center justify-center text-sky-600">
                  <Droplet className="h-5 w-5 fill-sky-600" />
                </div>
                <Badge variant="outline" className="text-[10px] text-sky-700 border-sky-300">
                  Hidratação
                </Badge>
              </div>

              <div className="relative w-28 h-28 mx-auto my-2">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
                  <circle cx="65" cy="65" r={radius} fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth} />
                  <circle
                    cx="65"
                    cy="65"
                    r={radius}
                    fill="none"
                    stroke="#0ea5e9"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-stone-900 dark:text-stone-100">
                    {hydrationCount}<span className="text-sm font-normal text-stone-400">/8 copos</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-1 mt-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    onClick={handleAddWater}
                    title={`Copo ${i + 1}`}
                    className={cn(
                      'w-4 h-6 rounded-b-md border cursor-pointer transition-colors flex items-end p-0.5',
                      i < hydrationCount
                        ? 'bg-sky-400 border-sky-500 text-white shadow-xs'
                        : 'bg-stone-100 dark:bg-stone-800 border-stone-200 hover:bg-sky-100'
                    )}
                  >
                    <div className={cn('w-full rounded-b-xs', i < hydrationCount ? 'bg-sky-500 h-full' : 'h-0')} />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={handleAddWater}
              className="text-xs font-semibold text-sky-600 hover:text-sky-800 transition-colors mt-3"
            >
              + Registrar 250ml
            </button>
          </Card>
        )}

        {/* MODULE 3: AGENDA / CONSULTAS (Rendered only if enabled) */}
        {isModuleEnabled('schedule_appointments') && (
          <Card className="rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-purple-100/80 dark:bg-purple-950/50 flex items-center justify-center text-purple-700">
                  <Calendar className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] text-purple-700 border-purple-300">
                  Agenda
                </Badge>
              </div>

              {nextAppointment ? (
                <div className="py-2 text-center space-y-1">
                  <p className="text-xl font-bold text-stone-900 dark:text-stone-100">
                    {new Date(nextAppointment.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">{nextAppointment.title}</p>
                  <p className="text-xs text-stone-400">{nextAppointment.doctor_name || 'Especialista'}</p>
                </div>
              ) : (
                <div className="py-6 text-center text-stone-400 space-y-2">
                  <p className="text-xs">Nenhum compromisso agendado para os próximos dias.</p>
                  <Button asChild size="sm" variant="outline" className="text-xs h-8">
                    <Link href={`/${locale}/dashboard/appointments`}>+ Agendar Consulta</Link>
                  </Button>
                </div>
              )}
            </div>

            <Link
              href={`/${locale}/dashboard/appointments`}
              className="text-xs text-purple-700 dark:text-purple-400 font-semibold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Ver agenda completa</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        {/* MODULE 4: ALIMENTAÇÃO (Rendered only if enabled) */}
        {isModuleEnabled('routine_meals') && (
          <Card className="rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-teal-100/80 dark:bg-teal-950/50 flex items-center justify-center text-teal-700">
                  <Utensils className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] text-teal-700 border-teal-300">
                  Refeições
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center py-2">
                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-2xl">🥣</span>
                  <button
                    onClick={() => toggleMeal('breakfast')}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-xs',
                      mealsStatus.breakfast ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                    )}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">Café</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-2xl">🥗</span>
                  <button
                    onClick={() => toggleMeal('lunch')}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-xs',
                      mealsStatus.lunch ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                    )}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">Almoço</span>
                </div>

                <div className="flex flex-col items-center gap-1.5">
                  <span className="text-2xl">🍲</span>
                  <button
                    onClick={() => toggleMeal('dinner')}
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-xs',
                      mealsStatus.dinner ? 'bg-emerald-500 text-white' : 'bg-stone-200 dark:bg-stone-700 text-stone-400'
                    )}
                  >
                    <Check className="h-3.5 w-3.5 stroke-[3]" />
                  </button>
                  <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">Jantar</span>
                </div>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/meals`}
              className="text-xs text-teal-700 dark:text-teal-400 font-semibold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Gerenciar refeições</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        {/* MODULE 5: BEM-ESTAR & HUMOR (Rendered if enabled) */}
        {isModuleEnabled('wellbeing_mood') && (
          <Card className="rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-rose-100/80 dark:bg-rose-950/50 flex items-center justify-center text-rose-600">
                  <Heart className="h-5 w-5 fill-rose-600" />
                </div>
                <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300">
                  Humor Observado
                </Badge>
              </div>

              <div className="py-4 text-center space-y-1">
                <p className="text-3xl">
                  {recentMood === 'great' ? '😊' : recentMood === 'okay' ? '😐' : recentMood === 'bad' ? '😔' : '✨'}
                </p>
                <p className="text-sm font-semibold text-stone-800 dark:text-stone-200 capitalize">
                  {recentMood ? `Último estado: ${recentMood}` : 'Sem check-in hoje'}
                </p>
                <p className="text-xs text-stone-400">Observações registradas pela família</p>
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/history`}
              className="text-xs text-rose-700 dark:text-rose-400 font-semibold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Ver histórico</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}

        {/* MODULE 6: CAMPOS PERSONALIZADOS DA FAMÍLIA (Rendered if family created custom fields) */}
        {customFields.length > 0 && (
          <Card className="rounded-2xl border border-stone-200/90 dark:border-stone-800 shadow-xs bg-white dark:bg-stone-900 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100/80 dark:bg-amber-950/50 flex items-center justify-center text-amber-700">
                  <Sparkles className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300">
                  Família
                </Badge>
              </div>

              <div className="space-y-2">
                {customFields.slice(0, 3).map((cf) => (
                  <div key={cf.id} className="text-xs p-2 rounded-lg bg-stone-50 dark:bg-stone-800/50 flex items-center justify-between">
                    <span className="font-semibold text-stone-800 dark:text-stone-200 truncate">{cf.label}</span>
                    <Badge variant="secondary" className="text-[9px]">Ativo</Badge>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href={`/${locale}/dashboard/settings/monitoring`}
              className="text-xs text-amber-700 dark:text-amber-400 font-semibold hover:underline mt-4 flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800"
            >
              <span>Gerenciar campos</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
