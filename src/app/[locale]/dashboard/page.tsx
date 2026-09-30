'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Pill, Droplet, Calendar, Utensils, Heart, Footprints,
  Moon, BedDouble, Check, ChevronRight, Plus, Activity,
  MessageSquare, Send, Clock, ExternalLink, Stethoscope,
  Dumbbell, Phone, AlertCircle, TrendingUp, Eye, Thermometer,
  Wind, Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DashboardOverviewPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId } = useAuth();
  const { caredPeople, selectedPerson, loading: personLoading } = useCaredPerson();
  const { isModuleEnabled } = useMonitoring();
  const supabase = createClient() as any;

  const [userName, setUserName] = useState('');
  const [medsData, setMedsData] = useState<{ taken: number; total: number; list: any[] }>({ taken: 0, total: 0, list: [] });
  const [hydration, setHydration] = useState<{ cups: number; goal: number }>({ cups: 0, goal: 8 });
  const [meals, setMeals] = useState<{ done: number; total: number }>({ done: 0, total: 4 });
  const [sleep, setSleep] = useState<{ hours: number; quality: string } | null>(null);
  const [steps, setSteps] = useState<{ count: number; goal: number } | null>(null);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [familyMessages, setFamilyMessages] = useState<any[]>([]);
  const [mood, setMood] = useState<{ emoji: string; text: string; quote: string; time: string } | null>(null);
  const [vitals, setVitals] = useState<{ bp: string; glucose: string; saturation: string; temp: string } | null>(null);
  const [financialSummary, setFinancialSummary] = useState<{ balance: number; income: number; expenses: number } | null>(null);
  const [newNote, setNewNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [reactions, setReactions] = useState<Record<string, number>>({});

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Bom dia' : today.getHours() < 18 ? 'Boa tarde' : 'Boa noite';
  const todayFormatted = format(today, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
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
        .limit(5);
      setAppointments(appts || []);
    }

    // Recent Activities (care_notes)
    const { data: notes } = await supabase
      .from('care_notes')
      .select('id, content, created_at, note_type')
      .eq('cared_person_id', selectedPerson.id)
      .order('created_at', { ascending: false })
      .limit(5);
    setRecentActivities(notes || []);

    // Family messages
    const { data: msgs } = await supabase
      .from('family_messages')
      .select('id, content, created_at, sender_name')
      .eq('cared_person_id', selectedPerson.id)
      .order('created_at', { ascending: false })
      .limit(3);
    setFamilyMessages(msgs || []);

    // Mood / Check-in
    if (isModuleEnabled('wellbeing_mood')) {
      const { data: checkIn } = await supabase
        .from('check_ins')
        .select('mood, notes, created_at')
        .eq('cared_person_id', selectedPerson.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (checkIn) {
        const moodMap: Record<string, { emoji: string; text: string }> = {
          great: { emoji: '😁', text: 'se sente muito bem' },
          good: { emoji: '😊', text: 'se sente bem' },
          okay: { emoji: '😐', text: 'está mais ou menos' },
          bad: { emoji: '😔', text: 'não está se sentindo bem' },
          terrible: { emoji: '😢', text: 'está mal hoje' },
        };
        const m = moodMap[checkIn.mood] || { emoji: '😊', text: 'se sente bem' };
        setMood({
          emoji: m.emoji,
          text: m.text,
          quote: checkIn.notes || '"Hoje acordei bem e animada!"',
          time: format(new Date(checkIn.created_at), 'HH:mm'),
        });
      }
    }

    // Vitals
    if (isModuleEnabled('health_vitals')) {
      const { data: vitalRec } = await supabase
        .from('vital_records')
        .select('blood_pressure_systolic, blood_pressure_diastolic, glucose, oxygen_saturation, temperature, recorded_at')
        .eq('cared_person_id', selectedPerson.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (vitalRec) {
        setVitals({
          bp: vitalRec.blood_pressure_systolic ? `${vitalRec.blood_pressure_systolic}/${vitalRec.blood_pressure_diastolic}` : '120/80',
          glucose: vitalRec.glucose ? `${vitalRec.glucose}` : '98',
          saturation: vitalRec.oxygen_saturation ? `${vitalRec.oxygen_saturation}%` : '98%',
          temp: vitalRec.temperature ? `${vitalRec.temperature}°C` : '36,5°C',
        });
      }
    }

    // Financial
    try {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const [profRes, expRes] = await Promise.all([
        fetch(`/api/finances/profile?caredPersonId=${selectedPerson.id}`, { cache: 'no-store' }),
        fetch(`/api/expenses?caredPersonId=${selectedPerson.id}`, { cache: 'no-store' }),
      ]);
      const profData = await profRes.json();
      const expData = await expRes.json();
      const income = profData?.profile?.monthly_income || 0;
      const allExp = expData?.expenses || [];
      const monthExp = allExp.filter((e: any) => e.expense_date?.startsWith(currentMonth));
      const totalExp = monthExp.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0);
      setFinancialSummary({ balance: income - totalExp, income, expenses: totalExp });
    } catch { /* silent */ }
  }, [selectedPerson, currentOrganizationId, isModuleEnabled, supabase]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAddWater = async () => {
    if (!selectedPerson || !currentOrganizationId || !user) return;
    setHydration(prev => ({ ...prev, cups: Math.min(prev.cups + 1, prev.goal) }));
    await supabase.from('hydration_logs').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      amount_ml: 250,
      logged_by: user.id,
    });
  };

  const handleSendQuickNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim() || !selectedPerson || !currentOrganizationId || !user) return;
    setSubmittingNote(true);
    const content = newNote.trim();
    const sender = userName || user.email?.split('@')[0] || 'Família';
    const { data: inserted, error } = await supabase.from('care_notes').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      author_id: user.id,
      content: `${sender}: ${content}`,
      type: 'general',
      note_type: 'family',
    }).select().single();

    if (!error && inserted) {
      setRecentActivities(prev => [inserted, ...prev]);
      setNewNote('');
    }
    setSubmittingNote(false);
  };

  const handleToggleReaction = (id: string) => {
    setReactions(prev => ({
      ...prev,
      [id]: (prev[id] || 0) + 1,
    }));
  };

  const medsPercent = medsData.total > 0 ? Math.round((medsData.taken / medsData.total) * 100) : 0;
  const hydPercent = Math.round((hydration.cups / hydration.goal) * 100);
  const mealsPercent = Math.round((meals.done / meals.total) * 100);

  const quickActions = [
    { label: 'Registrar Medicamento', icon: Pill, color: '#19D3A2', bg: '#19D3A2', href: `/${locale}/dashboard/medications` },
    { label: 'Registrar Refeição', icon: Utensils, color: '#F59E0B', bg: '#F59E0B', href: `/${locale}/dashboard/meals` },
    { label: 'Registrar Água', icon: Droplet, color: '#3B82F6', bg: '#3B82F6', href: '#', onClick: handleAddWater },
    { label: 'Registrar Sono', icon: BedDouble, color: '#8B5CF6', bg: '#8B5CF6', href: `/${locale}/dashboard/history` },
    { label: 'Registrar Atividade', icon: Dumbbell, color: '#10B981', bg: '#10B981', href: `/${locale}/dashboard/history` },
    { label: 'Pedir Ajuda', icon: Phone, color: '#F43F5E', bg: '#F43F5E', href: `/${locale}/dashboard/emergency` },
  ];

  const activityIcon = (type: string) => {
    if (type?.includes('med') || type === 'medication') return { icon: Pill, color: '#19D3A2' };
    if (type?.includes('meal') || type === 'meal') return { icon: Utensils, color: '#F59E0B' };
    if (type?.includes('appt') || type === 'appointment') return { icon: Calendar, color: '#8B5CF6' };
    if (type?.includes('hydrat') || type === 'hydration') return { icon: Droplet, color: '#3B82F6' };
    return { icon: Activity, color: '#5DE5BE' };
  };

  const apptColor = (idx: number) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#F43F5E'];
    return colors[idx % colors.length];
  };

  return (
    <div className="space-y-5 pb-12 text-stone-900 dark:text-[#F8FAFC]">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Greeting + quote */}
        <div className="lg:col-span-2 bg-white dark:bg-[#101D2B] rounded-3xl p-6 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">👋</span>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-[#F8FAFC]">
                {greeting}{userName ? `, ${userName}` : ''}!
              </h1>
            </div>
            <p className="text-stone-500 dark:text-slate-400 text-sm mt-1">
              Tudo bem por aí? Vamos cuidar juntos de quem sempre cuidou de você.
            </p>
          </div>

          {/* Quote */}
          <div className="bg-stone-50 dark:bg-[#172433] rounded-2xl p-4 border-l-4 border-[#19D3A2]">
            <p className="text-stone-600 dark:text-slate-300 text-sm italic leading-relaxed">
              &ldquo;Cuidar de um idoso é preservar histórias, valores e o que há de mais importante: vida.&rdquo;
            </p>
          </div>

          {/* Person card */}
          {selectedPerson && (
            <div className="flex items-center gap-4 bg-stone-50 dark:bg-[#172433] rounded-2xl p-4 border border-stone-100 dark:border-transparent">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-[#19D3A2]/20 border-2 border-emerald-300 dark:border-[#19D3A2]/40 flex items-center justify-center text-2xl font-black text-emerald-700 dark:text-[#5DE5BE] shrink-0 overflow-hidden">
                {selectedPerson.avatar_url
                  ? <img src={selectedPerson.avatar_url} alt={selectedPerson.full_name} className="w-full h-full object-cover" />
                  : selectedPerson.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-stone-900 dark:text-[#F8FAFC] text-base truncate">{selectedPerson.full_name}</span>
                  <span className="w-2 h-2 rounded-full bg-[#19D3A2] animate-pulse shrink-0 shadow-[0_0_6px_#19D3A2]" />
                </div>
                <p className="text-xs text-emerald-600 dark:text-[#5DE5BE] font-medium">Viva bem, sempre!</p>
                <div className="flex items-center gap-1 mt-1">
                  <Heart className="h-3.5 w-3.5 text-[#F43F5E] fill-[#F43F5E]" />
                </div>
              </div>
              <Link
                href={`/${locale}/care/${selectedPerson.id}`}
                target="_blank"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-[#19D3A2]/20 hover:bg-emerald-100 dark:hover:bg-[#19D3A2]/30 border border-emerald-200 dark:border-[#19D3A2]/40 text-emerald-700 dark:text-[#5DE5BE] text-xs font-bold transition"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Tela do Idoso
              </Link>
            </div>
          )}

          {!selectedPerson && !personLoading && (
            <Link href={`/${locale}/dashboard/cared-people/new`} className="flex items-center gap-3 bg-stone-50 dark:bg-[#172433] rounded-2xl p-4 border-2 border-dashed border-stone-200 dark:border-[#172433] hover:border-emerald-400 dark:hover:border-[#19D3A2]/40 transition">
              <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-[#172433] flex items-center justify-center text-stone-400 dark:text-slate-500">
                <Plus className="h-6 w-6" />
              </div>
              <div>
                <p className="font-bold text-stone-900 dark:text-[#F8FAFC]">Cadastrar Familiar</p>
                <p className="text-xs text-stone-400 dark:text-slate-500">Nenhum familiar cadastrado ainda.</p>
              </div>
            </Link>
          )}
        </div>

        {/* Date + Trial */}
        <div className="flex flex-col gap-4">
          {/* Date card */}
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-[#3B82F6]/20 flex items-center justify-center text-blue-600 dark:text-[#3B82F6] shrink-0">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] text-stone-400 dark:text-slate-500 font-semibold uppercase tracking-wide">Hoje</p>
              <p className="font-extrabold text-stone-900 dark:text-[#F8FAFC] text-sm leading-snug">{todayCapitalized}</p>
            </div>
          </div>

          {/* Financial snapshot */}
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs flex-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-stone-500 dark:text-slate-400 uppercase tracking-wide">Saldo do Mês</p>
              <Badge className="text-[10px] bg-emerald-50 dark:bg-[#19D3A2]/20 text-emerald-700 dark:text-[#5DE5BE] border-emerald-200 dark:border-[#19D3A2]/40">Finanças</Badge>
            </div>
            <div>
              <p className={`text-2xl font-black ${(financialSummary?.balance ?? 0) >= 0 ? 'text-emerald-600 dark:text-[#19D3A2]' : 'text-rose-600 dark:text-[#F43F5E]'}`}>
                R$ {(financialSummary?.balance ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <div className="flex justify-between text-[11px] text-stone-500 dark:text-slate-400 mt-2 border-t border-stone-100 dark:border-[#172433] pt-2">
                <span>Renda: <strong className="text-stone-800 dark:text-slate-300">R$ {(financialSummary?.income ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</strong></span>
                <span>Gastos: <strong className="text-stone-800 dark:text-slate-300">R$ {(financialSummary?.expenses ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</strong></span>
              </div>
            </div>
            <Link href={`/${locale}/dashboard/expenses`} className="text-xs text-emerald-600 dark:text-[#5DE5BE] font-bold hover:underline mt-3 flex items-center gap-1">
              Ver controle financeiro <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── DAILY SUMMARY ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Meds */}
        {isModuleEnabled('meds_scheduled') && (
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-4 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#19D3A2]/20 flex items-center justify-center text-emerald-600 dark:text-[#19D3A2]">
                <Pill className="h-4 w-4" />
              </div>
              <span className="text-lg font-black text-stone-900 dark:text-[#F8FAFC]">
                {medsData.taken}/{medsData.total || '—'}
              </span>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-700 dark:text-slate-300">Medicamentos</p>
              <p className="text-[10px] text-stone-400 dark:text-slate-500">Tomados hoje</p>
            </div>
            <div className="w-full bg-stone-100 dark:bg-[#172433] rounded-full h-1.5">
              <div className="bg-[#19D3A2] h-1.5 rounded-full transition-all" style={{ width: `${medsPercent}%` }} />
            </div>
            <p className="text-[10px] text-emerald-600 dark:text-[#5DE5BE] font-bold">{medsPercent}%</p>
          </div>
        )}

        {/* Hydration — read-only on overview */}
        {isModuleEnabled('routine_hydration') && (
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-4 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-[#3B82F6]/20 flex items-center justify-center text-blue-600 dark:text-[#3B82F6]">
                <Droplet className="h-4 w-4 fill-current" />
              </div>
              <span className="text-lg font-black text-stone-900 dark:text-[#F8FAFC]">{hydration.cups}/{hydration.goal}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-700 dark:text-slate-300">Copos de água</p>
              <p className="text-[10px] text-stone-400 dark:text-slate-500">Hoje</p>
            </div>
            <div className="w-full bg-stone-100 dark:bg-[#172433] rounded-full h-1.5">
              <div className="bg-[#3B82F6] h-1.5 rounded-full transition-all" style={{ width: `${hydPercent}%` }} />
            </div>
            <p className="text-[10px] text-blue-600 dark:text-[#3B82F6] font-bold">{hydPercent}%</p>
          </div>
        )}

        {/* Meals */}
        {isModuleEnabled('routine_meals') && (
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-4 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-[#F59E0B]/20 flex items-center justify-center text-amber-600 dark:text-[#F59E0B]">
                <Utensils className="h-4 w-4" />
              </div>
              <span className="text-lg font-black text-stone-900 dark:text-[#F8FAFC]">{meals.done}/{meals.total}</span>
            </div>
            <div>
              <p className="text-xs font-bold text-stone-700 dark:text-slate-300">Refeições</p>
              <p className="text-[10px] text-stone-400 dark:text-slate-500">Realizadas</p>
            </div>
            <div className="w-full bg-stone-100 dark:bg-[#172433] rounded-full h-1.5">
              <div className="bg-[#F59E0B] h-1.5 rounded-full transition-all" style={{ width: `${mealsPercent}%` }} />
            </div>
            <p className="text-[10px] text-amber-600 dark:text-[#F59E0B] font-bold">{mealsPercent}%</p>
          </div>
        )}

        {/* Sleep */}
        <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-4 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-[#8B5CF6]/20 flex items-center justify-center text-purple-600 dark:text-[#8B5CF6]">
              <BedDouble className="h-4 w-4" />
            </div>
            <span className="text-lg font-black text-stone-900 dark:text-[#F8FAFC]">7h</span>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-700 dark:text-slate-300">Sono</p>
            <p className="text-[10px] text-stone-400 dark:text-slate-500">Boa qualidade</p>
          </div>
          <div className="w-full bg-stone-100 dark:bg-[#172433] rounded-full h-1.5">
            <div className="bg-[#8B5CF6] h-1.5 rounded-full w-[80%]" />
          </div>
          <p className="text-[10px] text-purple-600 dark:text-[#8B5CF6] font-bold">80%</p>
        </div>

        {/* Steps */}
        <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-4 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-[#10B981]/20 flex items-center justify-center text-emerald-600 dark:text-[#10B981]">
              <Footprints className="h-4 w-4" />
            </div>
            <span className="text-lg font-black text-stone-900 dark:text-[#F8FAFC]">3.240</span>
          </div>
          <div>
            <p className="text-xs font-bold text-stone-700 dark:text-slate-300">Passos</p>
            <p className="text-[10px] text-stone-400 dark:text-slate-500">Hoje</p>
          </div>
          <div className="w-full bg-stone-100 dark:bg-[#172433] rounded-full h-1.5">
            <div className="bg-[#10B981] h-1.5 rounded-full w-[65%]" />
          </div>
          <p className="text-[10px] text-emerald-600 dark:text-[#10B981] font-bold">65% da meta</p>
        </div>
      </div>

      {/* ─── QUICK ACCESS ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs">
        <h2 className="text-sm font-black text-stone-900 dark:text-[#F8FAFC] mb-4">Acesso rápido</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map((action, idx) => {
            const Icon = action.icon;
            const content = (
              <div className="flex flex-col items-center gap-2.5 p-3 rounded-2xl border border-stone-200/80 dark:border-[#172433] hover:border-current bg-stone-50/50 dark:bg-transparent transition-colors cursor-pointer group"
                style={{ borderColor: `${action.color}30` }}>
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs dark:shadow-lg transition-transform group-hover:scale-105"
                  style={{ background: `${action.color}25`, color: action.color }}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[11px] font-bold text-center text-stone-700 dark:text-slate-300 leading-tight">{action.label}</span>
              </div>
            );
            if (action.onClick) {
              return <button key={idx} onClick={action.onClick} className="w-full text-left">{content}</button>;
            }
            return <Link key={idx} href={action.href}>{content}</Link>;
          })}
        </div>
      </div>

      {/* ─── BOTTOM SECTION ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Left 2/3: Mood + Vitals + Activities + Motivational */}
        <div className="lg:col-span-2 space-y-5">

          {/* Mood */}
          {isModuleEnabled('wellbeing_mood') && (
            <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-stone-900 dark:text-[#F8FAFC]">Como está hoje?</h2>
                <Link href={`/${locale}/dashboard/history`} className="text-xs text-emerald-600 dark:text-[#5DE5BE] hover:underline font-bold">+ Registrar</Link>
              </div>
              {mood ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 bg-stone-50 dark:bg-[#172433] rounded-2xl p-3 border border-stone-100 dark:border-transparent">
                    <span className="text-3xl">{mood.emoji}</span>
                    <div>
                      <p className="text-sm font-extrabold text-stone-900 dark:text-[#F8FAFC]">
                        {selectedPerson?.full_name.split(' ')[0]} {mood.text}
                      </p>
                      <p className="text-[11px] text-stone-400 dark:text-slate-500">Último registro: hoje às {mood.time}</p>
                    </div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-[#19D3A2]/10 border border-emerald-200 dark:border-[#19D3A2]/30 rounded-2xl px-4 py-3 text-sm text-emerald-800 dark:text-[#5DE5BE] italic font-medium">
                    {mood.quote}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-stone-400 dark:text-slate-500 text-sm">
                  <p>Nenhum check-in registrado hoje.</p>
                  <Link href={`/${locale}/dashboard/history`} className="text-emerald-600 dark:text-[#5DE5BE] text-xs hover:underline font-bold mt-1 block">Registrar agora</Link>
                </div>
              )}
            </div>
          )}

          {/* Vitals */}
          {isModuleEnabled('health_vitals') && (
            <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-stone-900 dark:text-[#F8FAFC]">Sinais vitais <span className="text-stone-400 dark:text-slate-500 font-normal">(últimos registros)</span></h2>
                <Link href={`/${locale}/dashboard/history`} className="text-xs text-emerald-600 dark:text-[#5DE5BE] hover:underline font-bold">Ver histórico</Link>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Pressão arterial', value: vitals?.bp || '—', sub: 'mmHg', icon: Heart, color: '#F43F5E' },
                  { label: 'Glicemia', value: vitals?.glucose || '—', sub: 'mg/dL', icon: Gauge, color: '#F59E0B' },
                  { label: 'Saturação', value: vitals?.saturation || '—', sub: 'SpO₂', icon: Wind, color: '#3B82F6' },
                  { label: 'Temperatura', value: vitals?.temp || '—', sub: '', icon: Thermometer, color: '#8B5CF6' },
                ].map((v, i) => (
                  <div key={i} className="bg-stone-50 dark:bg-[#172433] rounded-2xl p-3 flex flex-col gap-1 border border-stone-100 dark:border-transparent">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center mb-1" style={{ background: `${v.color}20`, color: v.color }}>
                      <v.icon className="h-4 w-4" />
                    </div>
                    <p className="text-base font-black text-stone-900 dark:text-[#F8FAFC]">{v.value}</p>
                    <p className="text-[10px] text-stone-500 dark:text-slate-400 font-semibold">{v.label}</p>
                    {v.sub && <p className="text-[10px] text-stone-400 dark:text-slate-600">{v.sub}</p>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Linha do Tempo da Família */}
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-sm font-black text-stone-900 dark:text-[#F8FAFC]">Linha do Tempo da Família</h2>
              </div>
              <Link href={`/${locale}/dashboard/history`} className="text-xs text-emerald-600 dark:text-[#5DE5BE] hover:underline font-bold">Ver tudo</Link>
            </div>

            {/* Quick post to family feed */}
            <form onSubmit={handleSendQuickNote} className="flex gap-2">
              <input
                type="text"
                placeholder={selectedPerson ? `Deixe um recado com carinho para ${selectedPerson.full_name.split(' ')[0]}...` : "Deixe um recado para a família..."}
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="flex-1 bg-stone-50 dark:bg-[#172433] border border-stone-200 dark:border-[#22354a] rounded-xl px-3 py-2 text-xs text-stone-900 dark:text-[#F8FAFC] placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <Button
                type="submit"
                size="sm"
                disabled={submittingNote || !newNote.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs px-3 h-8 shrink-0 font-bold"
              >
                {submittingNote ? '...' : <Send className="h-3.5 w-3.5" />}
              </Button>
            </form>

            {/* Activities list */}
            {recentActivities.length > 0 ? (
              <div className="space-y-2">
                {recentActivities.map((act, idx) => {
                  const { icon: Icon, color } = activityIcon(act.note_type);
                  const time = format(new Date(act.created_at), 'HH:mm');
                  const count = reactions[act.id] || 0;
                  const isElderReply = act.content?.includes('[Resposta de') || act.content?.includes('❤️');
                  return (
                    <div
                      key={act.id || idx}
                      className={cn(
                        'flex items-center gap-3 py-2.5 px-3 rounded-2xl border transition-all',
                        isElderReply
                          ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 shadow-2xs'
                          : 'bg-stone-50/60 dark:bg-[#172433]/40 border-stone-100 dark:border-transparent hover:bg-stone-50 dark:hover:bg-[#172433]'
                      )}
                    >
                      <div className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs" style={{ background: isElderReply ? '#f43f5e20' : `${color}20`, color: isElderReply ? '#f43f5e' : color }}>
                        {isElderReply ? <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" /> : <Icon className="h-3.5 w-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-xs truncate", isElderReply ? "font-bold text-rose-900 dark:text-rose-200" : "font-medium text-stone-800 dark:text-slate-200")}>
                          {act.content}
                        </p>
                        <span className="text-[10px] text-stone-400 dark:text-slate-500">{time}</span>
                      </div>
                      <button
                        onClick={() => handleToggleReaction(act.id)}
                        className="flex items-center gap-1 text-[11px] text-stone-400 hover:text-rose-500 transition-colors px-2 py-1 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        title="Enviar carinho"
                      >
                        <Heart className={cn('h-3.5 w-3.5', count > 0 ? 'fill-rose-500 text-rose-500' : '')} />
                        {count > 0 && <span className="font-bold text-rose-500">{count}</span>}
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-400 dark:text-slate-500 text-center py-4">Nenhuma atividade registrada ainda.</p>
            )}
          </div>

          {/* Motivational */}
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-6 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col items-center justify-center gap-3 text-center min-h-[120px]">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-[#19D3A2]/20 flex items-center justify-center text-2xl">🌱</div>
            <p className="text-base font-extrabold text-stone-900 dark:text-[#F8FAFC]">Pequenos cuidados,</p>
            <p className="text-base font-extrabold text-stone-900 dark:text-[#F8FAFC] -mt-2">grandes dias.</p>
            <Heart className="h-5 w-5 text-[#F43F5E] fill-[#F43F5E]" />
          </div>
        </div>

        {/* Right 1/3: Appointments + Messages */}
        <div className="space-y-5">

          {/* Upcoming Appointments */}
          {isModuleEnabled('schedule_appointments') && (
            <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-black text-stone-900 dark:text-[#F8FAFC]">Próximos compromissos</h2>
                <Link href={`/${locale}/dashboard/appointments`} className="text-xs text-emerald-600 dark:text-[#5DE5BE] hover:underline font-bold">Ver todos</Link>
              </div>
              {appointments.length > 0 ? (
                <div className="space-y-3">
                  {appointments.map((appt, idx) => {
                    const color = apptColor(idx);
                    const time = format(new Date(appt.starts_at), 'HH:mm');
                    return (
                      <div key={appt.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${color}20`, color }}>
                          <Clock className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-extrabold text-stone-900 dark:text-[#F8FAFC] truncate">{appt.title}</p>
                            <span className="text-[10px] font-bold shrink-0" style={{ color }}>{time}</span>
                          </div>
                          <p className="text-[10px] text-stone-400 dark:text-slate-500 truncate">{appt.doctor_name || appt.location || 'Consulta'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-stone-400 dark:text-slate-500">Nenhum compromisso hoje.</p>
                  <Link href={`/${locale}/dashboard/appointments`} className="text-xs text-emerald-600 dark:text-[#5DE5BE] hover:underline font-bold mt-1 block">+ Agendar</Link>
                </div>
              )}
            </div>
          )}

          {/* Family Messages */}
          <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-black text-stone-900 dark:text-[#F8FAFC]">Mensagens da família</h2>
              <Link href={`/${locale}/dashboard/family`} className="text-xs text-emerald-600 dark:text-[#5DE5BE] hover:underline font-bold">Ver todas</Link>
            </div>
            {familyMessages.length > 0 ? (
              <div className="space-y-3 mb-4">
                {familyMessages.map((msg, idx) => (
                  <div key={msg.id || idx} className="flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-[#172433] flex items-center justify-center text-xs font-bold text-emerald-700 dark:text-[#5DE5BE] shrink-0">
                      {(msg.sender_name || 'F').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between gap-1">
                        <p className="text-xs font-bold text-stone-900 dark:text-[#F8FAFC]">{msg.sender_name || 'Familiar'}</p>
                        <span className="text-[10px] text-stone-400 dark:text-slate-500 shrink-0">
                          {format(new Date(msg.created_at), 'HH:mm')}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-600 dark:text-slate-400 line-clamp-2">{msg.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-stone-400 dark:text-slate-500 text-center py-3 mb-3">Nenhuma mensagem ainda.</p>
            )}
            <Link
              href={`/${locale}/dashboard/family`}
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl bg-blue-50 dark:bg-[#3B82F6]/20 hover:bg-blue-100 dark:hover:bg-[#3B82F6]/30 border border-blue-200 dark:border-[#3B82F6]/30 text-blue-600 dark:text-[#3B82F6] text-xs font-bold transition"
            >
              <Send className="h-3.5 w-3.5" /> Enviar mensagem
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
