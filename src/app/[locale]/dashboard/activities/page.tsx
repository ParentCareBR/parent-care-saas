'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Palmtree,
  Users,
  Sparkles,
  Plus,
  Calendar,
  Clock,
  MapPin,
  Car,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Smile,
  ChevronRight,
  Phone,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ActivityItem {
  id: string;
  title: string;
  category: 'physical' | 'learning' | 'rehab' | 'leisure' | 'social' | 'spiritual';
  subcategory: string | null;
  personal_goal: string | null;
  person_choice: boolean;
  instructor_name: string | null;
  instructor_contact: string | null;
  location_name: string | null;
  location_address: string | null;
  modality: 'in_person' | 'online' | 'home';
  recurrence_type: string;
  recurrence_days: number[];
  time_of_day: string | null;
  duration_minutes: number;
  monthly_cost: number;
  cost_periodicity: string;
  payer_name: string | null;
  materials_needed: string | null;
  health_orientations: string | null;
  is_active: boolean;
  created_at: string;
}

interface OccurrenceItem {
  id: string;
  activity_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: 'scheduled' | 'participated' | 'missed' | 'canceled' | 'rescheduled';
  absence_reason: string | null;
  voluntary_perception: string | null;
  difficulty_reported: string | null;
  wants_to_continue: boolean | null;
  notes: string | null;
}

const CATEGORY_MAP: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  physical: { label: 'Atividade Física', icon: Dumbbell, color: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800' },
  learning: { label: 'Aulas & Cursos', icon: GraduationCap, color: 'text-indigo-700 dark:text-indigo-300', bg: 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800' },
  rehab: { label: 'Reabilitação', icon: HeartPulse, color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800' },
  leisure: { label: 'Lazer & Cultura', icon: Palmtree, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' },
  social: { label: 'Social & Visitas', icon: Users, color: 'text-sky-700 dark:text-sky-300', bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800' },
  spiritual: { label: 'Espiritualidade', icon: Sparkles, color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800' },
};

const WEEK_DAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export default function ActivitiesPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [occurrences, setOccurrences] = useState<OccurrenceItem[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('all');

  // Modal creation state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'physical',
    subcategory: '',
    personal_goal: '',
    person_choice: true,
    instructor_name: '',
    instructor_contact: '',
    location_name: '',
    location_address: '',
    modality: 'in_person',
    recurrence_type: 'weekly',
    recurrence_days: [1, 3] as number[], // Seg e Qua default
    time_of_day: '09:00',
    duration_minutes: 60,
    monthly_cost: 0,
    cost_periodicity: 'monthly',
    payer_name: '',
    materials_needed: '',
    health_orientations: '',
    // Integrated transport fields (ida / volta)
    needs_outbound_transport: false,
    outbound_responsible: '',
    outbound_mode: 'family_car',
    needs_return_transport: false,
    return_responsible: '',
    return_mode: 'family_car',
  });

  // Modal check-in participation state
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [selectedActivityForCheckin, setSelectedActivityForCheckin] = useState<ActivityItem | null>(null);
  const [checkinStatus, setCheckinStatus] = useState<'participated' | 'missed' | 'canceled'>('participated');
  const [voluntaryPerception, setVoluntaryPerception] = useState<string>('loved');
  const [absenceReason, setAbsenceReason] = useState<string>('');
  const [checkinNotes, setCheckinNotes] = useState<string>('');
  const [wantsToContinue, setWantsToContinue] = useState<boolean>(true);

  const fetchActivities = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;
    setLoading(true);

    try {
      const { data: actData, error: actErr } = await supabase
        .from('life_activities')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (actErr) {
        console.error('Error fetching activities:', actErr);
        setActivities([]);
      } else {
        setActivities(actData || []);
      }

      // Fetch occurrences of current month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      const { data: occData } = await supabase
        .from('activity_occurrences')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .gte('scheduled_date', startOfMonth.toISOString().slice(0, 10))
        .order('scheduled_date', { ascending: false })
        .limit(100);

      setOccurrences(occData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const toggleDaySelection = (dayIdx: number) => {
    setFormData(prev => {
      const exists = prev.recurrence_days.includes(dayIdx);
      const updated = exists
        ? prev.recurrence_days.filter(d => d !== dayIdx)
        : [...prev.recurrence_days, dayIdx].sort();
      return { ...prev, recurrence_days: updated };
    });
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !formData.title.trim()) return;

    setSaving(true);
    try {
      const payload: any = {
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        title: formData.title.trim(),
        category: formData.category,
        subcategory: formData.subcategory.trim() || null,
        personal_goal: formData.personal_goal.trim() || null,
        person_choice: formData.person_choice,
        instructor_name: formData.instructor_name.trim() || null,
        instructor_contact: formData.instructor_contact.trim() || null,
        location_name: formData.location_name.trim() || null,
        location_address: formData.location_address.trim() || null,
        modality: formData.modality,
        recurrence_type: formData.recurrence_type,
        recurrence_days: formData.recurrence_days,
        time_of_day: formData.time_of_day || null,
        duration_minutes: Number(formData.duration_minutes) || 60,
        monthly_cost: Number(formData.monthly_cost) || 0,
        cost_periodicity: formData.cost_periodicity,
        payer_name: formData.payer_name.trim() || null,
        materials_needed: formData.materials_needed.trim() || null,
        health_orientations: formData.health_orientations.trim() || null,
        created_by: user?.id || null,
      };

      const { data: createdActivity, error } = await supabase
        .from('life_activities')
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert('Erro ao salvar atividade: ' + error.message);
        setSaving(false);
        return;
      }

      // Se tiver transporte configurado, inserir na tabela integrada de transportes (ida e volta separadas)
      if (formData.needs_outbound_transport && createdActivity) {
        await supabase.from('activity_transports').insert({
          organization_id: currentOrganizationId,
          cared_person_id: selectedPerson.id,
          activity_id: createdActivity.id,
          leg_type: 'outbound',
          responsible_name: formData.outbound_responsible.trim() || 'Familiar',
          transport_mode: formData.outbound_mode,
          pickup_location: 'Casa',
          dropoff_location: formData.location_name.trim() || 'Local da atividade',
          scheduled_time: null,
          status: 'to_arrange',
        });
      }

      if (formData.needs_return_transport && createdActivity) {
        await supabase.from('activity_transports').insert({
          organization_id: currentOrganizationId,
          cared_person_id: selectedPerson.id,
          activity_id: createdActivity.id,
          leg_type: 'return',
          responsible_name: formData.return_responsible.trim() || 'Familiar',
          transport_mode: formData.return_mode,
          pickup_location: formData.location_name.trim() || 'Local da atividade',
          dropoff_location: 'Casa',
          scheduled_time: null,
          status: 'to_arrange',
        });
      }

      // Se tiver custo mensal configurado e for pago, sugerir registrar despesa recorrente
      if (formData.monthly_cost > 0 && createdActivity) {
        await supabase.from('expenses').insert({
          organization_id: currentOrganizationId,
          cared_person_id: selectedPerson.id,
          category: 'activities',
          description: `Mensalidade: ${formData.title.trim()}`,
          amount: formData.monthly_cost,
          currency: 'BRL',
          created_by: user?.id || selectedPerson.id,
        }).catch((err: any) => console.warn('Despesa não registrada:', err));
      }

      setCreateModalOpen(false);
      // Reset form
      setFormData({
        title: '',
        category: 'physical',
        subcategory: '',
        personal_goal: '',
        person_choice: true,
        instructor_name: '',
        instructor_contact: '',
        location_name: '',
        location_address: '',
        modality: 'in_person',
        recurrence_type: 'weekly',
        recurrence_days: [1, 3],
        time_of_day: '09:00',
        duration_minutes: 60,
        monthly_cost: 0,
        cost_periodicity: 'monthly',
        payer_name: '',
        materials_needed: '',
        health_orientations: '',
        needs_outbound_transport: false,
        outbound_responsible: '',
        outbound_mode: 'family_car',
        needs_return_transport: false,
        return_responsible: '',
        return_mode: 'family_car',
      });
      fetchActivities();
    } catch (err: any) {
      alert('Falha na comunicação com o servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordOccurrence = async () => {
    if (!selectedActivityForCheckin || !selectedPerson || !currentOrganizationId) return;

    setSaving(true);
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const payload: any = {
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        activity_id: selectedActivityForCheckin.id,
        scheduled_date: todayStr,
        scheduled_time: selectedActivityForCheckin.time_of_day,
        status: checkinStatus,
        absence_reason: checkinStatus === 'missed' ? absenceReason.trim() : null,
        voluntary_perception: checkinStatus === 'participated' ? voluntaryPerception : null,
        wants_to_continue: wantsToContinue,
        notes: checkinNotes.trim() || null,
        logged_by: user?.id || null,
        logged_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('activity_occurrences').insert(payload);
      if (error) {
        alert('Erro ao registrar participação: ' + error.message);
      } else {
        setCheckinModalOpen(false);
        setSelectedActivityForCheckin(null);
        setCheckinNotes('');
        setAbsenceReason('');
        fetchActivities();
      }
    } finally {
      setSaving(false);
    }
  };

  const filteredActivities = activities.filter(act => {
    if (currentTab === 'all') return true;
    return act.category === currentTab;
  });

  const participatedCount = occurrences.filter(o => o.status === 'participated').length;

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#101D2B] p-6 rounded-3xl border border-stone-200 dark:border-[#172433] shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-[#19D3A2]/20 border border-emerald-300 dark:border-[#19D3A2]/40 flex items-center justify-center text-emerald-600 dark:text-[#19D3A2]">
            <Activity className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-900 dark:text-[#F8FAFC]">Atividades & Vida</h1>
              <Badge className="bg-emerald-50 dark:bg-[#19D3A2]/20 text-emerald-700 dark:text-[#5DE5BE] border-emerald-200 dark:border-[#19D3A2]/30 font-bold">
                Movimento & Autonomia
              </Badge>
            </div>
            <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
              {selectedPerson ? `Rotina de atividades, movimento e aprendizagem de ${selectedPerson.full_name}` : 'Selecione uma pessoa cuidada'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          disabled={!selectedPerson}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm transition active:scale-95 shrink-0"
        >
          <Plus className="h-5 w-5" /> Nova Atividade
        </Button>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-[#101D2B] border-stone-200 dark:border-[#172433] rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-stone-400 dark:text-slate-500">
              Atividades em Andamento
            </CardDescription>
            <CardTitle className="text-3xl font-black text-stone-900 dark:text-[#F8FAFC]">
              {activities.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-stone-500 dark:text-slate-400">
            Cadastradas com frequência regular
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#101D2B] border-stone-200 dark:border-[#172433] rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-stone-400 dark:text-slate-500">
              Presenças este Mês
            </CardDescription>
            <CardTitle className="text-3xl font-black text-emerald-600 dark:text-[#19D3A2]">
              {participatedCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-stone-500 dark:text-slate-400">
            Sessões realizadas com participação voluntária
          </CardContent>
        </Card>

        <Card className="bg-white dark:bg-[#101D2B] border-stone-200 dark:border-[#172433] rounded-3xl shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-bold text-stone-400 dark:text-slate-500">
              Autonomia & Escolha
            </CardDescription>
            <CardTitle className="text-3xl font-black text-indigo-600 dark:text-indigo-400">
              {activities.filter(a => a.person_choice).length} de {activities.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-stone-500 dark:text-slate-400">
            Escolhidas pelo próprio idoso
          </CardContent>
        </Card>
      </div>

      {/* TABS DE FILTRO */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        <TabsList className="bg-stone-100 dark:bg-[#172433] p-1 rounded-2xl flex flex-wrap gap-1 w-full justify-start border border-stone-200 dark:border-[#172433]">
          <TabsTrigger value="all" className="rounded-xl font-bold text-xs py-2 px-3">
            Todas ({activities.length})
          </TabsTrigger>
          <TabsTrigger value="physical" className="rounded-xl font-bold text-xs py-2 px-3 flex items-center gap-1.5">
            <Dumbbell className="h-3.5 w-3.5" /> Atividade Física
          </TabsTrigger>
          <TabsTrigger value="learning" className="rounded-xl font-bold text-xs py-2 px-3 flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Aulas & Cursos
          </TabsTrigger>
          <TabsTrigger value="rehab" className="rounded-xl font-bold text-xs py-2 px-3 flex items-center gap-1.5">
            <HeartPulse className="h-3.5 w-3.5" /> Reabilitação
          </TabsTrigger>
          <TabsTrigger value="leisure" className="rounded-xl font-bold text-xs py-2 px-3 flex items-center gap-1.5">
            <Palmtree className="h-3.5 w-3.5" /> Lazer & Cultura
          </TabsTrigger>
          <TabsTrigger value="social" className="rounded-xl font-bold text-xs py-2 px-3 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Social & Visitas
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* LISTAGEM DE ATIVIDADES */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
          <p className="text-xs text-stone-400">Carregando atividades...</p>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-[#172433] space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-stone-100 dark:bg-[#172433] flex items-center justify-center text-3xl mx-auto">
            🏃‍♂️
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">Sem registros recentes de atividades</h3>
            <p className="text-sm text-stone-500 dark:text-slate-400 max-w-md mx-auto mt-1">
              Cadastre caminhadas, hidroginástica, aulas de música, fisioterapia ou passeios para organizar a rotina, o transporte e a presença.
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl px-5"
          >
            Cadastrar Primeira Atividade
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredActivities.map((act) => {
            const cat = CATEGORY_MAP[act.category] || CATEGORY_MAP.physical;
            const Icon = cat.icon;

            return (
              <div
                key={act.id}
                className="bg-white dark:bg-[#101D2B] rounded-3xl p-5 border border-stone-200 dark:border-[#172433] shadow-xs flex flex-col justify-between gap-4 hover:border-emerald-300 dark:hover:border-[#19D3A2]/40 transition"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shrink-0 ${cat.bg}`}>
                        <Icon className={`h-6 w-6 ${cat.color}`} />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-lg text-stone-900 dark:text-[#F8FAFC] leading-tight">
                          {act.title}
                        </h4>
                        <span className="text-xs font-semibold text-stone-400 dark:text-slate-500">
                          {cat.label} {act.subcategory ? `· ${act.subcategory}` : ''}
                        </span>
                      </div>
                    </div>

                    {act.person_choice && (
                      <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold">
                        Escolha Pessoal
                      </Badge>
                    )}
                  </div>

                  {act.personal_goal && (
                    <div className="bg-stone-50 dark:bg-[#172433] rounded-xl p-2.5 text-xs text-stone-600 dark:text-slate-300 border-l-3 border-emerald-500">
                      <strong>Objetivo:</strong> &ldquo;{act.personal_goal}&rdquo;
                    </div>
                  )}

                  {/* Dias e horário */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 dark:text-slate-300 pt-1">
                    {act.time_of_day && (
                      <div className="flex items-center gap-1 font-semibold">
                        <Clock className="h-3.5 w-3.5 text-stone-400" />
                        <span>{act.time_of_day.slice(0, 5)}</span>
                        {act.duration_minutes ? <span className="text-stone-400">({act.duration_minutes} min)</span> : null}
                      </div>
                    )}

                    {act.recurrence_days && act.recurrence_days.length > 0 && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-stone-400" />
                        <span className="font-semibold">
                          {act.recurrence_days.map(d => WEEK_DAYS[d]).join(', ')}
                        </span>
                      </div>
                    )}

                    {act.location_name && (
                      <div className="flex items-center gap-1 truncate max-w-[200px]" title={act.location_address || act.location_name}>
                        <MapPin className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                        <span className="truncate">{act.location_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Instrutor e materiais */}
                  {(act.instructor_name || act.materials_needed) && (
                    <div className="text-xs text-stone-500 dark:text-slate-400 space-y-1 border-t border-stone-100 dark:border-[#172433] pt-2">
                      {act.instructor_name && (
                        <p>
                          <strong className="text-stone-700 dark:text-slate-300">Instrutor/Prof:</strong> {act.instructor_name} {act.instructor_contact ? `(${act.instructor_contact})` : ''}
                        </p>
                      )}
                      {act.materials_needed && (
                        <p>
                          <strong className="text-stone-700 dark:text-slate-300">Materiais:</strong> {act.materials_needed}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Custo mensal */}
                  {act.monthly_cost > 0 && (
                    <div className="flex items-center gap-1 text-xs font-semibold text-stone-700 dark:text-slate-300">
                      <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                      <span>R$ {act.monthly_cost.toFixed(2)} / mês {act.payer_name ? `(Pago por: ${act.payer_name})` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Footer do card com ação rápida */}
                <div className="pt-3 border-t border-stone-100 dark:border-[#172433] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-stone-400">
                    {occurrences.filter(o => o.activity_id === act.id && o.status === 'participated').length} presenças registradas
                  </span>

                  <Button
                    onClick={() => {
                      setSelectedActivityForCheckin(act);
                      setCheckinModalOpen(true);
                    }}
                    variant="outline"
                    className="h-8 px-3 text-xs font-bold border-emerald-400 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 rounded-xl flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Registrar Sessão
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE ATIVIDADE */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-stone-900 dark:text-white">
              Cadastrar Nova Atividade de Vida
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Atividade física, curso, reabilitação ou lazer. Configure horários, instrutor e transporte.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateActivity} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold">Título da Atividade *</Label>
                <Input
                  required
                  placeholder="Ex: Hidroginástica, Aula de Teclado, Caminhada Matinal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Categoria *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val as any })}
                >
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">🏃 Atividade Física</SelectItem>
                    <SelectItem value="learning">📚 Aulas & Aprendizagem</SelectItem>
                    <SelectItem value="rehab">🩺 Reabilitação Orientada</SelectItem>
                    <SelectItem value="leisure">🎨 Lazer, Cultura & Hobbies</SelectItem>
                    <SelectItem value="social">👥 Socialização & Encontros</SelectItem>
                    <SelectItem value="spiritual">🕊️ Espiritualidade & Práticas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Modalidade</Label>
                <Select
                  value={formData.modality}
                  onValueChange={(val) => setFormData({ ...formData, modality: val as any })}
                >
                  <SelectTrigger className="rounded-xl h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="in_person">Presencial (Clube / Academia / Escola)</SelectItem>
                    <SelectItem value="home">Domiciliar (Instrutor vai até a casa)</SelectItem>
                    <SelectItem value="online">Online (Vídeo chamada / Computador)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold">Objetivo Pessoal da Pessoa (O que ela espera?)</Label>
                <Input
                  placeholder="Ex: Fazer amigos, melhorar o fôlego, aprender a tocar teclado"
                  value={formData.personal_goal}
                  onChange={(e) => setFormData({ ...formData, personal_goal: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="flex items-center gap-2 sm:col-span-2 bg-stone-50 dark:bg-stone-900 p-3 rounded-xl border border-stone-200 dark:border-stone-800">
                <input
                  type="checkbox"
                  id="choice_check"
                  checked={formData.person_choice}
                  onChange={(e) => setFormData({ ...formData, person_choice: e.target.checked })}
                  className="rounded h-4 w-4 text-emerald-600 focus:ring-emerald-500"
                />
                <label htmlFor="choice_check" className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                  Esta atividade foi uma escolha voluntária da própria pessoa idosa
                </label>
              </div>

              {/* HORÁRIOS & DIAS DA SEMANA */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs font-bold">Dias da Semana Recorrentes</Label>
                <div className="flex items-center gap-1.5">
                  {WEEK_DAYS.map((day, idx) => {
                    const isSelected = formData.recurrence_days.includes(idx);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleDaySelection(idx)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                            : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-emerald-400'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Horário de Início</Label>
                <Input
                  type="time"
                  value={formData.time_of_day}
                  onChange={(e) => setFormData({ ...formData, time_of_day: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Duração (minutos)</Label>
                <Input
                  type="number"
                  min="15"
                  step="15"
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: Number(e.target.value) })}
                  className="rounded-xl h-10"
                />
              </div>

              {/* LOCAL & INSTRUTOR */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Local / Estabelecimento</Label>
                <Input
                  placeholder="Ex: SESC Pinheiros, Academia Viva, etc."
                  value={formData.location_name}
                  onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Endereço</Label>
                <Input
                  placeholder="Rua, número ou referência"
                  value={formData.location_address}
                  onChange={(e) => setFormData({ ...formData, location_address: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Professor(a) / Fisioterapeuta</Label>
                <Input
                  placeholder="Nome do profissional"
                  value={formData.instructor_name}
                  onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Contato do Profissional</Label>
                <Input
                  placeholder="Telefone / WhatsApp"
                  value={formData.instructor_contact}
                  onChange={(e) => setFormData({ ...formData, instructor_contact: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              {/* MATERIAIS & ORIENTAÇÕES */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Materiais Necessários</Label>
                <Input
                  placeholder="Ex: Tênis confortável, garrafinha, maiô"
                  value={formData.materials_needed}
                  onChange={(e) => setFormData({ ...formData, materials_needed: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Custo Mensal (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.monthly_cost}
                  onChange={(e) => setFormData({ ...formData, monthly_cost: Number(e.target.value) })}
                  className="rounded-xl h-10"
                />
              </div>

              {/* TRANSPORTE INTEGRADO (IDA E VOLTA SEPARADAS) */}
              <div className="sm:col-span-2 pt-2 border-t border-stone-200 dark:border-stone-800 space-y-3">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-emerald-600" />
                  <h5 className="font-bold text-xs text-stone-900 dark:text-stone-100">
                    Mobilidade & Transporte Integrado (Ida e Volta Separadas)
                  </h5>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="outbound_check"
                        checked={formData.needs_outbound_transport}
                        onChange={(e) => setFormData({ ...formData, needs_outbound_transport: e.target.checked })}
                        className="rounded h-4 w-4 text-emerald-600"
                      />
                      <label htmlFor="outbound_check" className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        Organizar Transporte de IDA
                      </label>
                    </div>
                    {formData.needs_outbound_transport && (
                      <div className="space-y-2 pt-1">
                        <Input
                          placeholder="Quem leva? (Ex: Filho Carlos)"
                          value={formData.outbound_responsible}
                          onChange={(e) => setFormData({ ...formData, outbound_responsible: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                        <Select
                          value={formData.outbound_mode}
                          onValueChange={(val) => setFormData({ ...formData, outbound_mode: val })}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="family_car">Carro da Família</SelectItem>
                            <SelectItem value="ride_app">Aplicativo (Uber/99)</SelectItem>
                            <SelectItem value="walk">A pé com acompanhante</SelectItem>
                            <SelectItem value="public_transit">Transporte público</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-2xl bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="return_check"
                        checked={formData.needs_return_transport}
                        onChange={(e) => setFormData({ ...formData, needs_return_transport: e.target.checked })}
                        className="rounded h-4 w-4 text-emerald-600"
                      />
                      <label htmlFor="return_check" className="text-xs font-bold text-stone-800 dark:text-stone-200">
                        Organizar Transporte de VOLTA
                      </label>
                    </div>
                    {formData.needs_return_transport && (
                      <div className="space-y-2 pt-1">
                        <Input
                          placeholder="Quem busca? (Pode ser outra pessoa!)"
                          value={formData.return_responsible}
                          onChange={(e) => setFormData({ ...formData, return_responsible: e.target.value })}
                          className="h-8 text-xs rounded-lg"
                        />
                        <Select
                          value={formData.return_mode}
                          onValueChange={(val) => setFormData({ ...formData, return_mode: val })}
                        >
                          <SelectTrigger className="h-8 text-xs rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="family_car">Carro da Família</SelectItem>
                            <SelectItem value="ride_app">Aplicativo (Uber/99)</SelectItem>
                            <SelectItem value="walk">A pé com acompanhante</SelectItem>
                            <SelectItem value="public_transit">Transporte público</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-stone-100 dark:border-stone-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-6"
              >
                {saving ? 'Salvando...' : 'Criar Atividade'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE REGISTRO DE SESSÃO / PRESENÇA */}
      <Dialog open={checkinModalOpen} onOpenChange={setCheckinModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-stone-900 dark:text-white">
              Registrar Participação na Sessão
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              {selectedActivityForCheckin?.title} · Registro simples sem julgamento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Status da Sessão</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setCheckinStatus('participated')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    checkinStatus === 'participated'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" /> Participou
                </button>
                <button
                  type="button"
                  onClick={() => setCheckinStatus('missed')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    checkinStatus === 'missed'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <AlertCircle className="h-4 w-4" /> Não foi
                </button>
                <button
                  type="button"
                  onClick={() => setCheckinStatus('canceled')}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1 ${
                    checkinStatus === 'canceled'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                  }`}
                >
                  <XCircle className="h-4 w-4" /> Cancelada
                </button>
              </div>
            </div>

            {checkinStatus === 'participated' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Percepção Voluntária da Pessoa</Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { val: 'loved', label: 'Adorou! 😍' },
                    { val: 'good', label: 'Gostou 🙂' },
                    { val: 'neutral', label: 'Normal 😐' },
                    { val: 'difficult', label: 'Cansativo 😮‍💨' },
                  ].map(p => (
                    <button
                      key={p.val}
                      type="button"
                      onClick={() => setVoluntaryPerception(p.val)}
                      className={`p-2 rounded-xl border text-center text-xs font-bold transition ${
                        voluntaryPerception === p.val
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-300'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {checkinStatus === 'missed' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Motivo (Opcional, sem cobrança)</Label>
                <Input
                  placeholder="Ex: Chuva forte, preferiu descansar, consulta de última hora"
                  value={absenceReason}
                  onChange={(e) => setAbsenceReason(e.target.value)}
                  className="rounded-xl h-10"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Observações / Comentários</Label>
              <Input
                placeholder="Ex: Fez 30 min de caminhada e conversou com vizinhos"
                value={checkinNotes}
                onChange={(e) => setCheckinNotes(e.target.value)}
                className="rounded-xl h-10"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCheckinModalOpen(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRecordOccurrence}
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl px-5"
            >
              {saving ? 'Gravando...' : 'Confirmar Presença'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
