'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Pill, 
  Droplet, 
  Calendar, 
  Utensils, 
  Users, 
  BarChart3, 
  Heart, 
  Footprints, 
  Moon, 
  Check, 
  ChevronRight, 
  Plus, 
  ShoppingCart, 
  Sparkles, 
  Car, 
  FileText,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardOverviewPage() {
  const { user, currentOrganizationId } = useAuth();
  const { caredPeople, selectedPerson, setSelectedPersonId, loading: personLoading } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  // Real Supabase data states
  const [meds, setMeds] = useState<any[]>([]);
  const [hydrationCount, setHydrationCount] = useState(6); // default 6 glasses
  const [nextAppointment, setNextAppointment] = useState<any | null>(null);
  const [familyTasks, setFamilyTasks] = useState<any[]>([]);
  const [mealsStatus, setMealsStatus] = useState({ breakfast: true, lunch: true, dinner: true });

  const fetchRealData = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;

    // 1. Fetch Medications
    const { data: medsData } = await supabase
      .from('medications')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .eq('is_active', true)
      .order('time_of_day', { ascending: true })
      .limit(4);

    if (medsData && medsData.length > 0) {
      setMeds(medsData);
    } else {
      // Default standard timeline if none in db yet
      setMeds([
        { id: '1', name: 'Losartana 50mg', time_of_day: '08:00', type: 'capsule', taken: true },
        { id: '2', name: 'Metformina 850mg', time_of_day: '12:00', type: 'tablet', taken: true },
        { id: '3', name: 'Sinvastatina 20mg', time_of_day: '18:00', type: 'golden_capsule', taken: true },
      ]);
    }

    // 2. Fetch Hydration
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
    }

    // 3. Fetch Next Appointment
    const { data: apptData } = await supabase
      .from('appointments')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at', { ascending: true })
      .limit(1);

    if (apptData && apptData.length > 0) {
      setNextAppointment(apptData[0]);
    } else {
      setNextAppointment({
        title: 'Cardiologista',
        doctor_name: 'Dr. Carlos Mendes',
        time: '15:30',
      });
    }

    // 4. Fetch Tasks
    const { data: taskList } = await supabase
      .from('tasks')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .limit(4);

    if (taskList && taskList.length > 0) {
      setFamilyTasks(taskList);
    }
  }, [selectedPerson, currentOrganizationId, supabase]);

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

  const toggleMedTaken = (index: number) => {
    setMeds(prev => prev.map((m, i) => i === index ? { ...m, taken: !m.taken } : m));
  };

  const toggleMeal = (meal: 'breakfast' | 'lunch' | 'dinner') => {
    setMealsStatus(prev => ({ ...prev, [meal]: !prev[meal] }));
  };

  // SVG Gauge calculations (donut chart)
  const radius = 54;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (hydrationCount / 8) * circumference;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* ======================================================== */}
      {/* 1. TOP ROW: PERSON CARDS (Matches Image 2 exactly)       */}
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
                  "bg-white rounded-2xl p-5 border cursor-pointer transition-all duration-200 flex items-center justify-between shadow-xs hover:shadow-md",
                  isSelected ? "border-sky-400 ring-2 ring-sky-100" : "border-stone-200"
                )}
              >
                <div className="flex items-center gap-4 flex-1">
                  {/* Avatar with Status Dot */}
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 flex items-center justify-center text-xl font-bold text-emerald-800 shadow-inner overflow-hidden border-2 border-white">
                      {person.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={person.avatar_url} alt={person.full_name} className="w-full h-full object-cover" />
                      ) : (
                        person.full_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    {/* Status Dot (Green for Active/Selected, Gray for others) */}
                    <span 
                      className={cn(
                        "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white",
                        isSelected || idx === 0 ? "bg-emerald-500" : "bg-stone-400"
                      )} 
                    />
                  </div>

                  {/* Metrics Column */}
                  <div className="flex-1 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-stone-800 text-base">{person.full_name}</h2>
                    </div>

                    {/* ECG / Heart Rate Line */}
                    <div className="flex items-center gap-2">
                      <Heart className="h-4 w-4 text-rose-500 fill-rose-500 flex-shrink-0" />
                      <svg className="w-40 h-5 text-emerald-500 stroke-current" viewBox="0 0 100 20" fill="none" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M0 10 L25 10 L30 3 L35 18 L40 5 L45 14 L50 10 L100 10" />
                      </svg>
                    </div>

                    {/* Activity Bar */}
                    <div className="flex items-center gap-2">
                      <Footprints className="h-4 w-4 text-sky-600 flex-shrink-0" />
                      <div className="w-40 bg-stone-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: idx === 0 ? '75%' : '60%' }} />
                      </div>
                    </div>

                    {/* Sleep Bar */}
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                      <div className="w-40 bg-stone-100 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-sky-500 h-full rounded-full transition-all duration-500" style={{ width: idx === 0 ? '85%' : '50%' }} />
                      </div>
                    </div>
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
              <p className="text-emerald-700 text-sm mt-1">Cadastre seus pais ou familiares para iniciar o acompanhamento diário.</p>
            </div>
            <Button asChild className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
              <Link href="/pt-BR/dashboard/cared-people/new">
                <UserPlus className="h-4 w-4 mr-2" /> Cadastrar Pessoa
              </Link>
            </Button>
          </div>
        )}

        {/* If only 1 person, show a secondary invitation / add card */}
        {caredPeople && caredPeople.length === 1 && (
          <Link 
            href="/pt-BR/dashboard/cared-people/new"
            className="border-2 border-dashed border-stone-200 hover:border-emerald-400 rounded-2xl p-5 flex items-center justify-center gap-3 text-stone-500 hover:text-emerald-700 transition-colors bg-white/50"
          >
            <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-sm text-stone-800">+ Cadastrar Outro Familiar</p>
              <p className="text-xs text-stone-400">Acompanhe mais de uma pessoa no mesmo painel</p>
            </div>
          </Link>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2. MIDDLE ROW: 4 WIDGET CARDS (Matches Image 2 exactly)   */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CARD 1: MEDICAMENTOS (Timeline Vertical) */}
        <Card className="rounded-2xl border border-stone-200/90 shadow-xs bg-white p-5 flex flex-col justify-between">
          <div>
            {/* Header Icon */}
            <div className="w-10 h-10 rounded-full bg-emerald-100/80 flex items-center justify-center text-emerald-700 mb-4">
              <Pill className="h-5 w-5" />
            </div>

            {/* Vertical Timeline */}
            <div className="relative pl-6 space-y-6">
              {/* Connecting vertical line */}
              <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-emerald-500" />

              {meds.map((med, idx) => (
                <div key={med.id || idx} className="relative flex items-center justify-between">
                  {/* Timeline bullet check */}
                  <div 
                    onClick={() => toggleMedTaken(idx)}
                    className="absolute -left-6 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center cursor-pointer shadow-xs hover:scale-110 transition-transform"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </div>

                  {/* Pill icon / shape */}
                  <div className="flex items-center gap-2">
                    {idx === 0 && (
                      <div className="w-9 h-4.5 rounded-full bg-gradient-to-r from-stone-200 to-stone-400 border border-stone-300 shadow-inner" />
                    )}
                    {idx === 1 && (
                      <div className="w-5 h-5 rounded-full bg-rose-300 border border-rose-400 shadow-inner" />
                    )}
                    {idx === 2 && (
                      <div className="w-9 h-4.5 rounded-full bg-amber-400 border border-amber-500 shadow-inner" />
                    )}
                    <span className="text-sm font-semibold text-stone-800 ml-1">
                      {med.time_of_day?.slice(0, 5) || '08:00'}
                    </span>
                  </div>

                  {/* Status Checkbox */}
                  <button 
                    onClick={() => toggleMedTaken(idx)}
                    className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 transition-colors"
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <Link href="/pt-BR/dashboard/medications" className="text-xs text-emerald-700 font-semibold hover:underline mt-4 flex items-center justify-between">
            <span>Ver receitas</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* CARD 2: HIDRATAÇÃO (Circular Donut Gauge + 8 Glasses) */}
        <Card className="rounded-2xl border border-stone-200/90 shadow-xs bg-white p-5 flex flex-col items-center justify-between">
          <div className="w-full">
            <div className="w-10 h-10 rounded-full bg-sky-100/80 flex items-center justify-center text-sky-600 mb-2">
              <Droplet className="h-5 w-5 fill-sky-600" />
            </div>

            {/* Circular Gauge */}
            <div className="relative w-32 h-32 mx-auto my-2">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 130 130">
                <circle 
                  cx="65" 
                  cy="65" 
                  r={radius} 
                  fill="none" 
                  stroke="#e2e8f0" 
                  strokeWidth={strokeWidth} 
                />
                <circle
                  cx="65"
                  cy="65"
                  r={radius}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-stone-900 tracking-tight">
                  <span className="text-3xl">{hydrationCount}</span>/8
                </span>
              </div>
            </div>

            {/* Row of 8 Glass Icons */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div 
                  key={i}
                  onClick={handleAddWater}
                  title={`Copo ${i + 1}`}
                  className={cn(
                    "w-5 h-7 rounded-b-md border cursor-pointer transition-colors flex items-end justify-center p-0.5",
                    i < hydrationCount 
                      ? "bg-sky-400 border-sky-500 text-white shadow-xs" 
                      : "bg-stone-100 border-stone-200 hover:bg-sky-100"
                  )}
                >
                  <div className={cn("w-full rounded-b-xs", i < hydrationCount ? "bg-sky-500 h-full" : "h-0")} />
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

        {/* CARD 3: AGENDA / PRÓXIMO EVENTO */}
        <Card className="rounded-2xl border border-stone-200/90 shadow-xs bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-indigo-100/80 flex items-center justify-center text-indigo-700 mb-4">
              <Calendar className="h-5 w-5" />
            </div>

            {/* Large Calendar Icon + Time Display */}
            <div className="flex items-center justify-center py-6 gap-3">
              <div className="w-14 h-14 rounded-xl border-2 border-stone-200 bg-stone-50 flex flex-col items-center justify-center shadow-xs">
                <div className="w-full bg-rose-500 h-3.5 rounded-t-lg" />
                <div className="grid grid-cols-3 gap-1 p-1.5 flex-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="w-1.5 h-1.5 bg-stone-300 rounded-full" />
                  ))}
                </div>
              </div>

              <div className="flex items-center text-2xl font-bold text-stone-900">
                <span>{nextAppointment?.time || '15:30'}</span>
                <ChevronRight className="h-6 w-6 text-stone-400 ml-1" />
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-stone-800">{nextAppointment?.title || 'Consulta Médica'}</p>
              <p className="text-xs text-stone-400 mt-0.5">{nextAppointment?.doctor_name || 'Dr. Especialista'}</p>
            </div>
          </div>

          <Link href="/pt-BR/dashboard/appointments" className="text-xs text-indigo-700 font-semibold hover:underline mt-4 flex items-center justify-between">
            <span>Ver agenda completa</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>

        {/* CARD 4: ALIMENTAÇÃO (Refeições com Checkmarks) */}
        <Card className="rounded-2xl border border-stone-200/90 shadow-xs bg-white p-5 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-full bg-teal-100/80 flex items-center justify-center text-teal-700 mb-4">
              <Utensils className="h-5 w-5" />
            </div>

            {/* 3 Circular Food Thumbnails with Checks */}
            <div className="grid grid-cols-3 gap-2 text-center py-2">
              {/* Breakfast */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-100 to-orange-200 border-2 border-white shadow-md flex items-center justify-center text-2xl">
                  🥣
                </div>
                <button 
                  onClick={() => toggleMeal('breakfast')}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-xs",
                    mealsStatus.breakfast ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-400"
                  )}
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </button>
                <span className="text-[11px] font-medium text-stone-600">Café</span>
              </div>

              {/* Lunch */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 border-2 border-white shadow-md flex items-center justify-center text-2xl">
                  🥗
                </div>
                <button 
                  onClick={() => toggleMeal('lunch')}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-xs",
                    mealsStatus.lunch ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-400"
                  )}
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </button>
                <span className="text-[11px] font-medium text-stone-600">Almoço</span>
              </div>

              {/* Dinner */}
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-100 to-pink-200 border-2 border-white shadow-md flex items-center justify-center text-2xl">
                  🍲
                </div>
                <button 
                  onClick={() => toggleMeal('dinner')}
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center transition-colors shadow-xs",
                    mealsStatus.dinner ? "bg-emerald-500 text-white" : "bg-stone-200 text-stone-400"
                  )}
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </button>
                <span className="text-[11px] font-medium text-stone-600">Jantar</span>
              </div>
            </div>
          </div>

          <Link href="/pt-BR/dashboard/meals" className="text-xs text-teal-700 font-semibold hover:underline mt-4 flex items-center justify-between">
            <span>Registrar refeição</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Card>

      </div>

      {/* ======================================================== */}
      {/* 3. BOTTOM ROW: 2 WIDE CARDS (Matches Image 2 exactly)     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* CARD 5: FAMÍLIA E TAREFAS (Caregivers) */}
        <Card className="rounded-2xl border border-stone-200/90 shadow-xs bg-white p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="w-10 h-10 rounded-full bg-sky-100/80 flex items-center justify-center text-sky-700">
              <Users className="h-5 w-5" />
            </div>
            <Link href="/pt-BR/dashboard/tasks" className="text-xs text-brand-green font-semibold hover:underline">
              Gerenciar Tarefas →
            </Link>
          </div>

          <div className="space-y-4">
            {/* Caregiver 1 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-sm border">
                👩
              </div>
              <ShoppingCart className="h-5 w-5 text-sky-600 flex-shrink-0" />
              <div className="flex-1 bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[65%]" />
              </div>
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            </div>

            {/* Caregiver 2 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center flex-shrink-0 text-sm border">
                👨
              </div>
              <Sparkles className="h-5 w-5 text-sky-600 flex-shrink-0" />
              <div className="flex-1 bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[80%]" />
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-stone-300 flex-shrink-0" />
            </div>

            {/* Caregiver 3 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center flex-shrink-0 text-sm border">
                👵
              </div>
              <Car className="h-5 w-5 text-sky-600 flex-shrink-0" />
              <div className="flex-1 bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full w-[60%]" />
              </div>
              <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
                <Check className="h-3 w-3 stroke-[3]" />
              </div>
            </div>

            {/* Caregiver 4 */}
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-bold flex items-center justify-center flex-shrink-0 text-sm border">
                🧑
              </div>
              <FileText className="h-5 w-5 text-amber-500 flex-shrink-0" />
              <div className="flex-1 bg-stone-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-400 h-full rounded-full w-[35%]" />
              </div>
              <div className="w-5 h-5 rounded-full border-2 border-stone-300 flex-shrink-0" />
            </div>
          </div>
        </Card>

        {/* CARD 6: ATIVIDADE SEMANAL (Weekly Bar Chart) */}
        <Card className="rounded-2xl border border-stone-200/90 shadow-xs bg-white p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-full bg-sky-100/80 flex items-center justify-center text-sky-700">
              <BarChart3 className="h-5 w-5" />
            </div>
            <span className="text-xs text-stone-400">Últimos 7 dias</span>
          </div>

          {/* Chart with Y-Axis and Bars */}
          <div className="flex items-end gap-3 h-44 pt-4">
            {/* Y-axis Labels */}
            <div className="flex flex-col justify-between h-full text-[11px] text-stone-400 font-mono pr-2 pb-5 select-none">
              <span>120</span>
              <span>90</span>
              <span>60</span>
              <span>30</span>
              <span>0</span>
            </div>

            {/* Grid & Bars Container */}
            <div className="flex-1 h-full flex items-end justify-between border-b border-stone-200 pb-2 px-2">
              {[
                { day: 'Seg', height: '45%' },
                { day: 'Ter', height: '70%' },
                { day: 'Qua', height: '55%' },
                { day: 'Qui', height: '95%' },
                { day: 'Sex', height: '65%' },
                { day: 'Sáb', height: '40%' },
                { day: 'Dom', height: '85%' },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 group flex-1">
                  <div className="w-full flex justify-center items-end h-32">
                    <div 
                      className="w-5 sm:w-7 bg-sky-500 group-hover:bg-sky-600 rounded-t-md transition-all duration-300 shadow-xs" 
                      style={{ height: item.height }}
                    />
                  </div>
                  <span className="text-[11px] text-stone-500 font-medium">{item.day}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

      </div>
    </div>
  );
}
