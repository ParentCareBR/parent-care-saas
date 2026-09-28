'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar, Plus, MapPin, User, CheckCircle2, Clock, XCircle,
  RefreshCw, BellRing, ChevronLeft, ChevronRight, Pill, CheckSquare,
  Stethoscope,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RecurrenceSelector, { RecurrenceConfig, recurrenceLabel } from '@/components/ui/RecurrenceSelector';
import { getAlarmTexts } from '@/lib/i18n/care-translations';
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addDays, addWeeks, addMonths, subWeeks, subMonths,
  isSameDay, isSameMonth,
} from 'date-fns';
import { ptBR, enUS, es as esLocale, fr as frLocale, de as deLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type ViewMode = 'day' | 'week' | 'month';
type EventType = 'appointment' | 'medication' | 'task';
type NewItemType = 'appointment' | 'task';

interface AgendaEvent {
  id: string;
  type: EventType;
  title: string;
  time: string;         // HH:MM
  date: Date;
  status?: string;
  subtitle?: string;
  raw?: any;
}

function getDateFnsLocale(locale: string) {
  switch (locale) {
    case 'en': return enUS;
    case 'es': return esLocale;
    case 'fr': return frLocale;
    case 'de': return deLocale;
    default: return ptBR;
  }
}

const TYPE_CONFIG: Record<EventType, { color: string; bgLight: string; bgDark: string; border: string; label: string; Icon: any }> = {
  appointment: {
    color: 'text-indigo-700 dark:text-indigo-300',
    bgLight: 'bg-indigo-50',
    bgDark: 'dark:bg-indigo-950/30',
    border: 'border-indigo-200 dark:border-indigo-800',
    label: 'Consulta',
    Icon: Stethoscope,
  },
  medication: {
    color: 'text-emerald-700 dark:text-emerald-300',
    bgLight: 'bg-emerald-50',
    bgDark: 'dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    label: 'Medicamento',
    Icon: Pill,
  },
  task: {
    color: 'text-amber-700 dark:text-amber-300',
    bgLight: 'bg-amber-50',
    bgDark: 'dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    label: 'Tarefa',
    Icon: CheckSquare,
  },
};

export default function AppointmentsPage() {
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'pt-BR';
  const tAlarm = getAlarmTexts(currentLocale);
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [newItemType, setNewItemType] = useState<NewItemType>('appointment');
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [navDate, setNavDate] = useState(new Date());

  const dateFnsLocale = getDateFnsLocale(currentLocale);
  const displayLocale = currentLocale === 'en' ? 'en-US' : currentLocale;

  const [apptForm, setApptForm] = useState({
    title: '', doctor_name: '', specialty: '', location: '', starts_at: '', description: '',
  });
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', priority: 'medium', due_date: '',
  });
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ type: 'none' });
  const [alarm, setAlarm] = useState<string>('15m');

  // ── Fetch all 3 sources ──────────────────────────────────────
  const fetchEvents = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) { setLoading(false); return; }
    setLoading(true);

    const rangeStart = new Date();
    rangeStart.setMonth(rangeStart.getMonth() - 2);
    const rangeEnd = new Date();
    rangeEnd.setMonth(rangeEnd.getMonth() + 3);

    const all: AgendaEvent[] = [];

    // 1. Appointments
    const { data: appts } = await supabase
      .from('appointments')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('starts_at', { ascending: true });

    (appts || []).forEach((a: any) => {
      const d = new Date(a.starts_at);
      all.push({
        id: `appt-${a.id}`,
        type: 'appointment',
        title: a.title,
        subtitle: [a.doctor_name, a.location].filter(Boolean).join(' · '),
        time: format(d, 'HH:mm'),
        date: d,
        status: a.status,
        raw: a,
      });
    });

    // 2. Medications — generate occurrences for the range based on schedules
    const { data: meds } = await supabase
      .from('medications')
      .select('id, name, dosage, unit, medication_schedules(id, time_of_day)')
      .eq('cared_person_id', selectedPerson.id)
      .eq('is_active', true);

    (meds || []).forEach((med: any) => {
      const schedules: any[] = med.medication_schedules || [];
      schedules.forEach((sched: any) => {
        const timeStr: string = (sched.time_of_day || '00:00:00').slice(0, 5);
        // Generate one event per day for the next 30 days
        for (let i = -7; i <= 30; i++) {
          const d = addDays(new Date(), i);
          const [h, m] = timeStr.split(':').map(Number);
          d.setHours(h, m, 0, 0);
          all.push({
            id: `med-${med.id}-${sched.id}-${i}`,
            type: 'medication',
            title: `${med.name} ${med.dosage}${med.unit}`,
            subtitle: timeStr,
            time: timeStr,
            date: new Date(d),
            status: 'scheduled',
            raw: { ...med, scheduleId: sched.id },
          });
        }
      });
    });

    // 3. Tasks with due_date
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .not('due_date', 'is', null)
      .order('due_date', { ascending: true });

    (tasks || []).forEach((t: any) => {
      if (!t.due_date) return;
      const d = new Date(t.due_date);
      all.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        subtitle: t.priority ? `Prioridade: ${t.priority}` : undefined,
        time: format(d, 'HH:mm'),
        date: d,
        status: t.status,
        raw: t,
      });
    });

    // Sort by date+time
    all.sort((a, b) => a.date.getTime() - b.date.getTime());
    setEvents(all);
    setLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // ── Create Appointment ───────────────────────────────────────
  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
    setSaving(true);
    const recurrenceSuffix = recurrence.type !== 'none' ? ` [Recorrência: ${recurrenceLabel(recurrence, currentLocale)}]` : '';
    const alarmLabels: Record<string, string> = {
      exact: tAlarm.exact.replace('⏰ ', ''),
      '15m': tAlarm['15m'].replace('⏰ ', '').replace(/ \(.+?\)/, ''),
      '30m': tAlarm['30m'].replace('⏰ ', ''),
      '1h': tAlarm['1h'].replace('⏰ ', ''),
      morning: tAlarm.morning.replace('⏰ ', ''),
    };
    const alarmSuffix = alarm !== 'none' ? ` [${tAlarm.badgePrefix}: ${alarmLabels[alarm] || alarm}]` : '';
    const { error } = await supabase.from('appointments').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      title: apptForm.title,
      doctor_name: apptForm.doctor_name || null,
      specialty: apptForm.specialty || null,
      location: apptForm.location || null,
      starts_at: new Date(apptForm.starts_at).toISOString(),
      description: (apptForm.description || '') + recurrenceSuffix + alarmSuffix || null,
      status: 'scheduled',
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Consulta agendada!', description: 'Compromisso adicionado à agenda.' });
      setModalOpen(false);
      setApptForm({ title: '', doctor_name: '', specialty: '', location: '', starts_at: '', description: '' });
      setRecurrence({ type: 'none' });
      setAlarm('15m');
      fetchEvents();
    }
    setSaving(false);
  };

  // ── Create Task ──────────────────────────────────────────────
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
    setSaving(true);
    const recurrenceSuffix = recurrence.type !== 'none' ? ` [Recorrência: ${recurrenceLabel(recurrence, currentLocale)}]` : '';
    const alarmLabels: Record<string, string> = {
      exact: tAlarm.exact.replace('⏰ ', ''),
      '15m': tAlarm['15m'].replace('⏰ ', '').replace(/ \(.+?\)/, ''),
      '30m': tAlarm['30m'].replace('⏰ ', ''),
      '1h': tAlarm['1h'].replace('⏰ ', ''),
      morning: tAlarm.morning.replace('⏰ ', ''),
    };
    const alarmSuffix = alarm !== 'none' ? ` [${tAlarm.badgePrefix}: ${alarmLabels[alarm] || alarm}]` : '';
    const { error } = await supabase.from('tasks').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      title: taskForm.title,
      description: (taskForm.description || '') + recurrenceSuffix + alarmSuffix || null,
      priority: taskForm.priority,
      due_date: taskForm.due_date ? new Date(taskForm.due_date).toISOString() : null,
      status: 'pending',
      created_by: user.id,
    });
    if (error) {
      toast({ title: 'Erro ao criar tarefa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tarefa criada!', description: 'A tarefa foi adicionada à agenda.' });
      setModalOpen(false);
      setTaskForm({ title: '', description: '', priority: 'medium', due_date: '' });
      setRecurrence({ type: 'none' });
      setAlarm('15m');
      fetchEvents();
    }
    setSaving(false);
  };

  // ── Update Appointment Status ─────────────────────────────────
  const updateApptStatus = async (rawId: string, status: string) => {
    await supabase.from('appointments').update({ status }).eq('id', rawId);
    fetchEvents();
    toast({ title: 'Status atualizado' });
  };

  // ── View Filtering ────────────────────────────────────────────
  const getViewEvents = () => {
    if (viewMode === 'day') return events.filter(e => isSameDay(e.date, navDate));
    if (viewMode === 'week') {
      const ws = startOfWeek(navDate, { weekStartsOn: 1 });
      const we = endOfWeek(navDate, { weekStartsOn: 1 });
      return events.filter(e => e.date >= ws && e.date <= we);
    }
    return events.filter(e => isSameMonth(e.date, navDate));
  };

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'day') setNavDate(prev => addDays(prev, dir));
    else if (viewMode === 'week') setNavDate(prev => dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setNavDate(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const navLabel = () => {
    if (viewMode === 'day') return format(navDate, "EEEE, d 'de' MMMM", { locale: dateFnsLocale });
    if (viewMode === 'week') {
      const ws = startOfWeek(navDate, { weekStartsOn: 1 });
      const we = endOfWeek(navDate, { weekStartsOn: 1 });
      return `${format(ws, 'd MMM', { locale: dateFnsLocale })} – ${format(we, 'd MMM yyyy', { locale: dateFnsLocale })}`;
    }
    return format(navDate, 'MMMM yyyy', { locale: dateFnsLocale });
  };

  // Month grid helpers
  const getMonthDays = () => {
    const ms = startOfMonth(navDate);
    const me = endOfMonth(navDate);
    const gs = startOfWeek(ms, { weekStartsOn: 1 });
    const ge = endOfWeek(me, { weekStartsOn: 1 });
    const days: Date[] = [];
    let cur = gs;
    while (cur <= ge) { days.push(cur); cur = addDays(cur, 1); }
    return days;
  };

  const viewEvents = getViewEvents();

  return (
    <div className="max-w-4xl mx-auto space-y-5 overflow-x-hidden w-full">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-indigo-600" />
            Agenda Centralizada
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {selectedPerson
              ? `Consultas, medicamentos e tarefas de ${selectedPerson.full_name}`
              : 'Selecione uma pessoa cuidada para ver a agenda'}
          </p>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> + Agendar
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            {/* Tab selector */}
            <DialogHeader>
              <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 gap-1 mb-1">
                {(['appointment', 'task'] as NewItemType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setNewItemType(t); setRecurrence({ type: 'none' }); setAlarm('15m'); }}
                    className={cn(
                      'flex-1 py-2 rounded-lg text-xs font-bold transition-all',
                      newItemType === t
                        ? 'bg-white dark:bg-stone-700 shadow text-indigo-700 dark:text-indigo-300'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-700'
                    )}
                  >
                    {t === 'appointment' ? '🩺 Consulta / Exame' : '✅ Tarefa'}
                  </button>
                ))}
              </div>
              <DialogTitle>{newItemType === 'appointment' ? 'Novo Compromisso Médico' : 'Nova Tarefa'}</DialogTitle>
              <DialogDescription>
                {newItemType === 'appointment'
                  ? 'Adicione consultas, exames, retornos ou sessões de terapia.'
                  : 'Crie uma tarefa com data e hora para aparecer na agenda.'}
              </DialogDescription>
            </DialogHeader>

            {newItemType === 'appointment' ? (
              <form onSubmit={handleCreateAppointment}>
                <div className="grid gap-3 py-3">
                  <div className="space-y-1.5">
                    <Label>Título *</Label>
                    <Input required placeholder="Ex: Consulta Cardiologista" value={apptForm.title}
                      onChange={e => setApptForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Médico / Especialista</Label>
                      <Input placeholder="Dr. Roberto" value={apptForm.doctor_name}
                        onChange={e => setApptForm(p => ({ ...p, doctor_name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Especialidade</Label>
                      <Input placeholder="Cardiologia" value={apptForm.specialty}
                        onChange={e => setApptForm(p => ({ ...p, specialty: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Data e Horário *</Label>
                    <Input type="datetime-local" required value={apptForm.starts_at}
                      onChange={e => setApptForm(p => ({ ...p, starts_at: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Local</Label>
                    <Input placeholder="Hospital Samaritano, Clínica São Lucas…" value={apptForm.location}
                      onChange={e => setApptForm(p => ({ ...p, location: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Observações</Label>
                    <Input placeholder="Levar exames, jejum de 8h…" value={apptForm.description}
                      onChange={e => setApptForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                    <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
                  </div>
                  <div className="pt-1 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-amber-500" />
                      <Label>{tAlarm.label}</Label>
                    </div>
                    <Select value={alarm} onValueChange={setAlarm}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tAlarm.none}</SelectItem>
                        <SelectItem value="exact">{tAlarm.exact}</SelectItem>
                        <SelectItem value="15m">{tAlarm['15m']}</SelectItem>
                        <SelectItem value="30m">{tAlarm['30m']}</SelectItem>
                        <SelectItem value="1h">{tAlarm['1h']}</SelectItem>
                        <SelectItem value="morning">{tAlarm.morning}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                    {saving ? 'Salvando...' : 'Confirmar Agendamento'}
                  </Button>
                </DialogFooter>
              </form>
            ) : (
              <form onSubmit={handleCreateTask}>
                <div className="grid gap-3 py-3">
                  <div className="space-y-1.5">
                    <Label>Título da tarefa *</Label>
                    <Input required placeholder="Ex: Buscar receita na farmácia" value={taskForm.title}
                      onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição (opcional)</Label>
                    <Input placeholder="Detalhes adicionais…" value={taskForm.description}
                      onChange={e => setTaskForm(p => ({ ...p, description: e.target.value }))} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Prioridade</Label>
                      <Select value={taskForm.priority} onValueChange={v => setTaskForm(p => ({ ...p, priority: v }))}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Baixa</SelectItem>
                          <SelectItem value="medium">Média</SelectItem>
                          <SelectItem value="high">Alta</SelectItem>
                          <SelectItem value="urgent">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Data e hora</Label>
                      <Input type="datetime-local" value={taskForm.due_date}
                        onChange={e => setTaskForm(p => ({ ...p, due_date: e.target.value }))} />
                    </div>
                  </div>
                  <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                    <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
                  </div>
                  <div className="pt-1 border-t border-stone-100 dark:border-stone-800 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-amber-500" />
                      <Label>{tAlarm.label}</Label>
                    </div>
                    <Select value={alarm} onValueChange={setAlarm}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">{tAlarm.none}</SelectItem>
                        <SelectItem value="exact">{tAlarm.exact}</SelectItem>
                        <SelectItem value="15m">{tAlarm['15m']}</SelectItem>
                        <SelectItem value="30m">{tAlarm['30m']}</SelectItem>
                        <SelectItem value="1h">{tAlarm['1h']}</SelectItem>
                        <SelectItem value="morning">{tAlarm.morning}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-amber-600 hover:bg-amber-700" disabled={saving}>
                    {saving ? 'Salvando...' : 'Criar Tarefa'}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Legend ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {(Object.entries(TYPE_CONFIG) as [EventType, typeof TYPE_CONFIG[EventType]][]).map(([type, cfg]) => (
          <span key={type} className={cn('inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border', cfg.bgLight, cfg.bgDark, cfg.border, cfg.color)}>
            <cfg.Icon className="h-3 w-3" />
            {cfg.label}
          </span>
        ))}
      </div>

      {/* ── View Mode + Navigation ──────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 gap-1">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button key={mode} onClick={() => setViewMode(mode)}
              className={cn(
                'flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                viewMode === mode
                  ? 'bg-white dark:bg-stone-700 shadow-sm text-indigo-700 dark:text-indigo-300'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              )}>
              {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="flex-1 text-center text-sm font-semibold text-stone-800 dark:text-stone-200 capitalize truncate">
            {navLabel()}
          </span>
          <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="outline" size="sm"
          className="shrink-0 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-950/30"
          onClick={() => setNavDate(new Date())}>
          Hoje
        </Button>
      </div>

      {/* ── Month Grid ─────────────────────────────────────────── */}
      {viewMode === 'month' && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-stone-100 dark:border-stone-800">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
              <div key={d} className="py-2 text-center text-[11px] font-bold text-stone-400 dark:text-stone-500 uppercase">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {getMonthDays().map((day, idx) => {
              const dayEvents = events.filter(e => isSameDay(e.date, day));
              const isNow = isSameDay(day, new Date());
              const isCurrentMonth = isSameMonth(day, navDate);
              return (
                <div
                  key={idx}
                  onClick={() => { setNavDate(day); setViewMode('day'); }}
                  className={cn(
                    'min-h-[72px] p-1.5 border-r border-b border-stone-100 dark:border-stone-800 cursor-pointer transition-colors',
                    'hover:bg-stone-50 dark:hover:bg-stone-800/50',
                    !isCurrentMonth && 'opacity-30',
                    isNow && 'bg-indigo-50/60 dark:bg-indigo-950/20'
                  )}
                >
                  <span className={cn(
                    'text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1',
                    isNow ? 'bg-indigo-600 text-white' : 'text-stone-700 dark:text-stone-300'
                  )}>
                    {format(day, 'd')}
                  </span>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map(ev => {
                      const cfg = TYPE_CONFIG[ev.type];
                      return (
                        <div key={ev.id} className={cn('text-[9px] font-semibold px-1 py-0.5 rounded truncate', cfg.bgLight, cfg.bgDark, cfg.color)}>
                          {ev.time} {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[9px] text-stone-400 font-medium">+{dayEvents.length - 3} mais</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day / Week Event List ───────────────────────────────── */}
      {(viewMode === 'day' || viewMode === 'week') && (
        <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800">
            <p className="text-sm font-bold text-stone-800 dark:text-stone-200">
              {viewEvents.length} evento{viewEvents.length !== 1 ? 's' : ''} neste período
            </p>
          </div>

          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : viewEvents.length > 0 ? (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {viewEvents.map(ev => {
                const cfg = TYPE_CONFIG[ev.type];
                const IconCmp = cfg.Icon;
                const recMatch = ev.raw?.description?.match(/\[(?:Recorrência|Recurrence|Récurrence|Wiederholung):\s*(.+?)\]/i);
                const alarmMatch = ev.raw?.description?.match(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/i);

                return (
                  <div key={ev.id} className={cn(
                    'flex items-center gap-4 px-5 py-3.5 transition-colors hover:bg-stone-50 dark:hover:bg-stone-800/50',
                    ev.status === 'completed' && 'opacity-60',
                    ev.status === 'canceled' && 'opacity-40',
                  )}>
                    {/* Icon */}
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', cfg.bgLight, cfg.bgDark, cfg.border, 'border')}>
                      <IconCmp className={cn('h-4 w-4', cfg.color)} />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', cfg.bgLight, cfg.bgDark, cfg.color)}>{cfg.label}</span>
                        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{ev.title}</span>
                        {ev.status === 'completed' && <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">Concluído</Badge>}
                        {ev.status === 'canceled' && <Badge variant="secondary" className="text-[10px] bg-rose-50 text-rose-700">Cancelado</Badge>}
                        {ev.status === 'done' && <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700">Feita</Badge>}
                        {recMatch && <span className="text-[10px] bg-stone-100 dark:bg-stone-700 text-stone-600 dark:text-stone-300 px-1.5 py-0.5 rounded">{recMatch[1]}</span>}
                        {alarmMatch && <span className="inline-flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300 px-1.5 py-0.5 rounded"><BellRing className="h-2.5 w-2.5" />{alarmMatch[1]}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-stone-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {viewMode === 'week'
                            ? `${format(ev.date, "EEEE, d 'de' MMMM", { locale: dateFnsLocale })} às ${ev.time}`
                            : `${ev.time}`}
                        </span>
                        {ev.subtitle && <span className="text-xs text-stone-400">{ev.subtitle}</span>}
                      </div>
                    </div>

                    {/* Actions — only for appointments */}
                    {ev.type === 'appointment' && ev.status === 'scheduled' && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button size="sm" variant="outline"
                          onClick={() => updateApptStatus(ev.raw.id, 'completed')}
                          className="h-8 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 rounded-lg">
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                        </Button>
                        <Button size="sm" variant="ghost"
                          onClick={() => updateApptStatus(ev.raw.id, 'canceled')}
                          className="h-8 w-8 text-stone-400 hover:text-rose-600 rounded-lg p-0">
                          <XCircle className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Calendar className="h-10 w-10 mx-auto mb-2 text-stone-300 dark:text-stone-600" />
              <p className="text-sm font-medium text-stone-600 dark:text-stone-400">Nenhum evento neste período.</p>
              <p className="text-xs text-stone-400 mt-1 mb-4">Navegue para outro período ou adicione um novo evento.</p>
              <Button variant="outline" size="sm" onClick={() => setModalOpen(true)}
                className="text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-700">
                + Agendar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
