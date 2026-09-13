'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Plus, MapPin, User, CheckCircle2, Clock, XCircle, RefreshCw, BellRing, ChevronLeft, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import RecurrenceSelector, { RecurrenceConfig, recurrenceLabel } from '@/components/ui/RecurrenceSelector';
import { getAlarmTexts } from '@/lib/i18n/care-translations';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addDays, addWeeks, addMonths, subWeeks, subMonths, isSameDay, isToday, isSameMonth } from 'date-fns';
import { ptBR, enUS, es as esLocale, fr as frLocale, de as deLocale } from 'date-fns/locale';

type ViewMode = 'day' | 'week' | 'month';

function getDateFnsLocale(locale: string) {
  switch (locale) {
    case 'en': return enUS;
    case 'es': return esLocale;
    case 'fr': return frLocale;
    case 'de': return deLocale;
    default: return ptBR;
  }
}

interface Appointment {
  id: string;
  title: string;
  description?: string | null;
  doctor_name?: string | null;
  specialty?: string | null;
  location?: string | null;
  starts_at: string;
  status: 'scheduled' | 'completed' | 'canceled';
}

export default function AppointmentsPage() {
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'pt-BR';
  const tAlarm = getAlarmTexts(currentLocale);
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [navDate, setNavDate] = useState(new Date());

  const dateFnsLocale = getDateFnsLocale(currentLocale);
  const displayLocale = currentLocale === 'en' ? 'en-US' : currentLocale;

  const [form, setForm] = useState({
    title: '',
    doctor_name: '',
    specialty: '',
    location: '',
    starts_at: '',
    description: '',
  });

  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ type: 'none' });
  const [alarm, setAlarm] = useState<string>('15m');

  const fetchAppointments = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('starts_at', { ascending: true });

    if (error) {
      console.error('Erro ao buscar consultas:', error);
    } else if (data) {
      setAppointments(data);
    }
    setLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
    setSaving(true);

    const recurrenceSuffix = recurrence.type !== 'none'
      ? ` [Recorrência: ${recurrenceLabel(recurrence, currentLocale)}]`
      : '';

    const alarmLabels: Record<string, string> = {
      exact: tAlarm.exact.replace('⏰ ', ''),
      '15m': tAlarm['15m'].replace('⏰ ', '').replace(/ \(.+?\)/, ''),
      '30m': tAlarm['30m'].replace('⏰ ', ''),
      '1h': tAlarm['1h'].replace('⏰ ', ''),
      morning: tAlarm.morning.replace('⏰ ', ''),
    };

    const alarmSuffix = alarm !== 'none'
      ? ` [${tAlarm.badgePrefix}: ${alarmLabels[alarm] || alarm}]`
      : '';

    const { error } = await supabase
      .from('appointments')
      .insert({
        cared_person_id: selectedPerson.id,
        organization_id: currentOrganizationId,
        title: form.title,
        doctor_name: form.doctor_name || null,
        specialty: form.specialty || null,
        location: form.location || null,
        starts_at: new Date(form.starts_at).toISOString(),
        description: (form.description || '') + recurrenceSuffix + alarmSuffix || null,
        status: 'scheduled',
        created_by: user.id,
      });

    if (error) {
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Consulta agendada!', description: 'O compromisso foi adicionado à agenda familiar com alarme ativado.' });
      setModalOpen(false);
      setForm({ title: '', doctor_name: '', specialty: '', location: '', starts_at: '', description: '' });
      setRecurrence({ type: 'none' });
      setAlarm('15m');
      fetchAppointments();
    }
    setSaving(false);
  };

  const updateStatus = async (id: string, status: 'scheduled' | 'completed' | 'canceled') => {
    const { error } = await supabase
      .from('appointments')
      .update({ status })
      .eq('id', id);

    if (error) {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    } else {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      toast({ title: 'Status atualizado com sucesso' });
    }
  };

  // Filter appointments based on current view
  const getViewAppointments = () => {
    if (viewMode === 'day') {
      return appointments.filter(a => isSameDay(new Date(a.starts_at), navDate));
    } else if (viewMode === 'week') {
      const wStart = startOfWeek(navDate, { weekStartsOn: 1 });
      const wEnd = endOfWeek(navDate, { weekStartsOn: 1 });
      return appointments.filter(a => {
        const d = new Date(a.starts_at);
        return d >= wStart && d <= wEnd;
      });
    } else {
      return appointments.filter(a => isSameMonth(new Date(a.starts_at), navDate));
    }
  };

  const navigate = (dir: 1 | -1) => {
    if (viewMode === 'day') setNavDate(prev => addDays(prev, dir));
    else if (viewMode === 'week') setNavDate(prev => dir === 1 ? addWeeks(prev, 1) : subWeeks(prev, 1));
    else setNavDate(prev => dir === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const navLabel = () => {
    if (viewMode === 'day') return format(navDate, "EEEE, d 'de' MMMM", { locale: dateFnsLocale });
    else if (viewMode === 'week') {
      const ws = startOfWeek(navDate, { weekStartsOn: 1 });
      const we = endOfWeek(navDate, { weekStartsOn: 1 });
      return `${format(ws, 'd MMM', { locale: dateFnsLocale })} – ${format(we, 'd MMM yyyy', { locale: dateFnsLocale })}`;
    } else {
      return format(navDate, "MMMM yyyy", { locale: dateFnsLocale });
    }
  };

  const viewAppts = getViewAppointments();

  return (
    <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-indigo-600" />
            Agenda de Consultas e Exames
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {selectedPerson 
              ? `Compromissos e consultas médicas de ${selectedPerson.full_name}`
              : 'Selecione uma pessoa cuidada para gerenciar a agenda'}
          </p>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Agendar Consulta / Exame
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[480px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Agendar Novo Compromisso</DialogTitle>
                <DialogDescription>
                  Adicione consultas médicas, exames, retorno ou sessões de terapia.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título do Compromisso *</Label>
                  <Input 
                    id="title" 
                    required
                    placeholder="Ex: Consulta Cardiologista, Exame de Sangue"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="doctor">Médico / Especialista</Label>
                    <Input 
                      id="doctor" 
                      placeholder="Ex: Dr. Roberto"
                      value={form.doctor_name}
                      onChange={(e) => setForm(prev => ({ ...prev, doctor_name: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Input 
                      id="specialty" 
                      placeholder="Ex: Cardiologia, Geriatria"
                      value={form.specialty}
                      onChange={(e) => setForm(prev => ({ ...prev, specialty: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="starts_at">Data e Horário *</Label>
                  <Input 
                    id="starts_at" 
                    type="datetime-local" 
                    required
                    value={form.starts_at}
                    onChange={(e) => setForm(prev => ({ ...prev, starts_at: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Local / Endereço</Label>
                  <Input 
                    id="location" 
                    placeholder="Ex: Hospital Samaritano, Clínica São Lucas"
                    value={form.location}
                    onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Observações / Recomendações</Label>
                  <Input 
                    id="desc" 
                    placeholder="Ex: Levar exames anteriores, jejum de 8 horas"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                {/* Recurrence */}
                <div className="pt-1 border-t border-stone-100 dark:border-stone-800">
                  <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
                </div>

                {/* Alarm / Reminder for Elder */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-2">
                  <div className="flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-amber-500" />
                    <Label className="text-sm font-medium">{tAlarm.label}</Label>
                  </div>
                  <Select value={alarm} onValueChange={setAlarm}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder={tAlarm.label} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{tAlarm.none}</SelectItem>
                      <SelectItem value="exact">{tAlarm.exact}</SelectItem>
                      <SelectItem value="15m">{tAlarm['15m']}</SelectItem>
                      <SelectItem value="30m">{tAlarm['30m']}</SelectItem>
                      <SelectItem value="1h">{tAlarm['1h']}</SelectItem>
                      <SelectItem value="morning">{tAlarm.morning}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {tAlarm.subtext}
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                  {saving ? 'Agendando...' : 'Confirmar Agendamento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* View Mode Toggle + Navigation */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* View Mode Buttons */}
        <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 gap-1">
          {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === mode
                  ? 'bg-white dark:bg-stone-700 shadow-sm text-indigo-700 dark:text-indigo-300'
                  : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
              }`}
            >
              {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        {/* Navigation */}
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

        {/* Hoje */}
        <Button
          variant="outline"
          size="sm"
          className="shrink-0 text-indigo-600 border-indigo-300 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-700 dark:hover:bg-indigo-950/30"
          onClick={() => setNavDate(new Date())}
        >
          Hoje
        </Button>
      </div>

      <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-stone-900 dark:text-stone-100">
            {viewAppts.length} compromisso{viewAppts.length !== 1 ? 's' : ''} neste período
          </CardTitle>
          <CardDescription className="text-stone-500 dark:text-stone-400">
            Acompanhe datas, locais e marque as consultas concluídas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : viewAppts.length > 0 ? (
            <div className="space-y-3.5">
              {viewAppts.map((appt) => {
                const dateObj = new Date(appt.starts_at);
                const recMatch = appt.description?.match(/\[(?:Recorrência|Recurrence|Récurrence|Wiederholung):\s*(.+?)\]/i);
                const alarmMatch = appt.description?.match(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/i);
                const cleanDesc = appt.description
                  ?.replace(/\[(?:Recorrência|Recurrence|Récurrence|Wiederholung):\s*(.+?)\]/gi, '')
                  ?.replace(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/gi, '')
                  ?.trim();

                return (
                  <div
                    key={appt.id}
                    className={`p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      appt.status === 'completed'
                        ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : appt.status === 'canceled'
                        ? 'border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800/30 opacity-60'
                        : 'border-indigo-100 dark:border-stone-700 bg-white dark:bg-stone-800/50 hover:border-indigo-300 dark:hover:border-indigo-700'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center font-bold flex-shrink-0 border border-indigo-100">
                        <span className="text-[10px] uppercase font-semibold text-indigo-500">
                          {dateObj.toLocaleDateString(displayLocale, { month: 'short' })}
                        </span>
                        <span className="text-base leading-none">
                          {dateObj.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-stone-900 text-sm">{appt.title}</h4>
                          {recMatch && (
                            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium">
                              <RefreshCw className="h-2.5 w-2.5" />
                              {recMatch[1]}
                            </Badge>
                          )}
                          {alarmMatch && (
                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium">
                              <BellRing className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                              {tAlarm.badgePrefix}: {alarmMatch[1]}
                            </Badge>
                          )}
                          {appt.status === 'completed' && (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                              Realizada
                            </Badge>
                          )}
                          {appt.status === 'canceled' && (
                            <Badge variant="secondary" className="bg-rose-50 text-rose-700 text-xs">
                              Cancelada
                            </Badge>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
                          <span className="flex items-center gap-1 font-medium text-stone-700">
                            <Clock className="h-3.5 w-3.5 text-stone-400" />
                            {dateObj.toLocaleTimeString(displayLocale, { hour: '2-digit', minute: '2-digit' })}
                          </span>

                          {appt.doctor_name && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5 text-stone-400" />
                              {appt.doctor_name} {appt.specialty && `(${appt.specialty})`}
                            </span>
                          )}

                          {appt.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-stone-400" />
                              {appt.location}
                            </span>
                          )}
                        </div>

                        {cleanDesc && (
                          <p className="text-xs text-stone-600 mt-1 bg-stone-50 p-1.5 rounded-md">
                            {cleanDesc}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 self-end sm:self-center">
                      {appt.status === 'scheduled' && (
                        <>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => updateStatus(appt.id, 'completed')}
                            className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400 dark:hover:bg-emerald-950/30 rounded-lg"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Concluir
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => updateStatus(appt.id, 'canceled')}
                            className="text-xs text-stone-400 hover:text-rose-600 rounded-lg"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 dark:text-stone-500">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-medium text-stone-600 dark:text-stone-400">
                Nenhuma consulta neste período.
              </p>
              <p className="text-xs text-stone-400 mt-1 mb-3">
                Navegue para outro período ou agende uma nova consulta.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setModalOpen(true)}
                className="text-indigo-600 border-indigo-200 dark:text-indigo-400 dark:border-indigo-700"
              >
                + Agendar Consulta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
