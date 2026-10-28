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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Stethoscope, Plus, MapPin, User, Clock, CheckCircle2,
  XCircle, Pencil, Trash2, Calendar, Loader2, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR, enUS, es as esLocale, fr as frLocale, de as deLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { getAlarmTexts } from '@/lib/i18n/care-translations';
import RecurrenceSelector, { RecurrenceConfig, recurrenceLabel } from '@/components/ui/RecurrenceSelector';

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
  doctor_name?: string;
  specialty?: string;
  location?: string;
  starts_at: string;
  description?: string;
  status: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendada', color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-700' },
  completed: { label: 'Concluída', color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700' },
  cancelled: { label: 'Cancelada', color: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-700' },
  confirmed: { label: 'Confirmada', color: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-300 dark:border-green-700' },
};

export default function ConsultasPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const tAlarm = getAlarmTexts(locale);
  const dateFnsLocale = getDateFnsLocale(locale);

  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'upcoming' | 'completed'>('upcoming');
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ type: 'none' });
  const [alarm, setAlarm] = useState<string>('15m');

  const [form, setForm] = useState({
    title: '',
    doctor_name: '',
    specialty: '',
    location: '',
    starts_at: '',
    description: '',
  });

  const resetForm = () => {
    setForm({ title: '', doctor_name: '', specialty: '', location: '', starts_at: '', description: '' });
    setRecurrence({ type: 'none' });
    setAlarm('15m');
    setEditingId(null);
  };

  const fetchAppointments = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) { setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('starts_at', { ascending: true });

    if (error) {
      toast({ title: 'Erro ao carregar consultas', description: error.message, variant: 'destructive' });
    } else {
      setAppointments(data || []);
    }
    setLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
    if (!form.title.trim() || !form.starts_at) {
      toast({ title: 'Preencha os campos obrigatórios', description: 'Nome da consulta e data/hora são necessários.', variant: 'destructive' });
      return;
    }
    setSaving(true);

    const alarmLabels: Record<string, string> = {
      exact: tAlarm.exact.replace('⏰ ', ''),
      '15m': tAlarm['15m'].replace('⏰ ', '').replace(/ \(.+?\)/, ''),
      '30m': tAlarm['30m'].replace('⏰ ', ''),
      '1h': tAlarm['1h'].replace('⏰ ', ''),
      morning: tAlarm.morning.replace('⏰ ', ''),
    };
    const recurrenceSuffix = recurrence.type !== 'none' ? ` [Recorrência: ${recurrenceLabel(recurrence, locale)}]` : '';
    const alarmSuffix = alarm !== 'none' ? ` [Alarme: ${alarmLabels[alarm] || alarm}]` : '';

    const payload = {
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      title: form.title.trim(),
      doctor_name: form.doctor_name.trim() || null,
      specialty: form.specialty.trim() || null,
      location: form.location.trim() || null,
      starts_at: new Date(form.starts_at).toISOString(),
      description: (form.description.trim() || '') + recurrenceSuffix + alarmSuffix || null,
      status: 'scheduled',
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from('appointments').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabase.from('appointments').insert({ ...payload, created_by: user.id }));
    }

    if (error) {
      toast({ title: 'Erro ao salvar consulta', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: editingId ? 'Consulta atualizada!' : 'Consulta agendada!', description: `${form.title} salva na agenda.` });
      setModalOpen(false);
      resetForm();
      fetchAppointments();
    }
    setSaving(false);
  };

  const handleEdit = (appt: Appointment) => {
    setForm({
      title: appt.title,
      doctor_name: appt.doctor_name || '',
      specialty: appt.specialty || '',
      location: appt.location || '',
      starts_at: format(new Date(appt.starts_at), "yyyy-MM-dd'T'HH:mm"),
      description: appt.description || '',
    });
    setEditingId(appt.id);
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir esta consulta?')) return;
    setDeleting(id);
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Consulta excluída', description: 'O registro foi removido da agenda.' });
      setAppointments((prev) => prev.filter((a) => a.id !== id));
    }
    setDeleting(null);
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    const { error } = await supabase.from('appointments').update({ status: newStatus }).eq('id', id);
    if (error) {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    } else {
      setAppointments((prev) => prev.map((a) => a.id === id ? { ...a, status: newStatus } : a));
    }
  };

  const now = new Date();
  const filtered = appointments.filter((a) => {
    if (statusFilter === 'upcoming') return new Date(a.starts_at) >= now || a.status === 'scheduled' || a.status === 'confirmed';
    if (statusFilter === 'completed') return a.status === 'completed' || a.status === 'cancelled';
    return true;
  });

  const upcoming = appointments.filter((a) => new Date(a.starts_at) >= now && a.status !== 'cancelled' && a.status !== 'completed').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-white flex items-center gap-2">
            <Stethoscope className="h-6 w-6 text-[#0284C7]" />
            Consultas e Exames
          </h1>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            {selectedPerson?.full_name
              ? `Agenda médica de ${selectedPerson.full_name}`
              : 'Selecione um idoso para ver as consultas'}
            {upcoming > 0 && (
              <span className="ml-2 text-[#0284C7] font-bold">· {upcoming} próxima{upcoming > 1 ? 's' : ''}</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAppointments}
            className="rounded-xl border-stone-200 dark:border-stone-700"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Dialog open={modalOpen} onOpenChange={(open) => { setModalOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold rounded-2xl flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Nova Consulta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-[#0284C7]" />
                  {editingId ? 'Editar Consulta' : 'Agendar Nova Consulta'}
                </DialogTitle>
                <DialogDescription>
                  Preencha os dados da consulta ou exame médico.
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Nome da consulta / exame *</Label>
                  <Input
                    id="title"
                    placeholder="Ex: Consulta cardiologia, Hemograma..."
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="doctor_name">Médico / Profissional</Label>
                    <Input
                      id="doctor_name"
                      placeholder="Dr(a). Nome"
                      value={form.doctor_name}
                      onChange={(e) => setForm((f) => ({ ...f, doctor_name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="specialty">Especialidade</Label>
                    <Input
                      id="specialty"
                      placeholder="Cardiologia, Ortopedia..."
                      value={form.specialty}
                      onChange={(e) => setForm((f) => ({ ...f, specialty: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">Local / Clínica / Hospital</Label>
                  <Input
                    id="location"
                    placeholder="Nome do local ou endereço"
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="starts_at">Data e horário *</Label>
                  <Input
                    id="starts_at"
                    type="datetime-local"
                    value={form.starts_at}
                    onChange={(e) => setForm((f) => ({ ...f, starts_at: e.target.value }))}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Observações</Label>
                  <Input
                    id="description"
                    placeholder="Orientações, documentos necessários..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <RecurrenceSelector value={recurrence} onChange={setRecurrence} locale={locale} />

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setModalOpen(false); resetForm(); }}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={saving} className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    {editingId ? 'Salvar alterações' : 'Agendar consulta'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 bg-stone-100 dark:bg-[#0C1728] p-1 rounded-2xl w-fit">
        {[
          { id: 'upcoming', label: 'Próximas' },
          { id: 'all', label: 'Todas' },
          { id: 'completed', label: 'Histórico' },
        ].map((f) => (
          <button
            key={f.id}
            onClick={() => setStatusFilter(f.id as any)}
            className={cn(
              'text-sm font-bold px-4 py-1.5 rounded-xl transition-all',
              statusFilter === f.id
                ? 'bg-white dark:bg-[#16253C] text-[#0284C7] shadow-sm'
                : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-[#0284C7]" />
        </div>
      )}

      {/* No person selected */}
      {!loading && !selectedPerson && (
        <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-12 text-center space-y-3">
          <Stethoscope className="h-10 w-10 text-stone-300 mx-auto" />
          <p className="text-stone-500 dark:text-stone-400 font-medium">
            Selecione um idoso no menu superior para ver as consultas.
          </p>
        </div>
      )}

      {/* Empty state */}
      {!loading && selectedPerson && filtered.length === 0 && (
        <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-500 flex items-center justify-center mx-auto">
            <Stethoscope className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-lg font-black text-stone-900 dark:text-white">
              {statusFilter === 'upcoming' ? 'Nenhuma consulta próxima' : 'Nenhuma consulta encontrada'}
            </h3>
            <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
              {statusFilter === 'upcoming' ? 'Clique em "Nova Consulta" para agendar.' : 'Ainda não há registros de consultas.'}
            </p>
          </div>
        </div>
      )}

      {/* Appointments list */}
      {!loading && selectedPerson && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((appt) => {
            const statusCfg = STATUS_CONFIG[appt.status] || STATUS_CONFIG['scheduled'];
            const apptDate = new Date(appt.starts_at);
            const isPast = apptDate < now;

            return (
              <div
                key={appt.id}
                className={cn(
                  'bg-white dark:bg-[#0C1728] border rounded-3xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-start gap-4',
                  isPast && appt.status !== 'completed'
                    ? 'border-amber-200 dark:border-amber-800'
                    : 'border-stone-200 dark:border-[#1E293B]'
                )}
              >
                {/* Date block */}
                <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-[#0284C7]/10 dark:bg-[#0284C7]/20 flex flex-col items-center justify-center text-[#0284C7] dark:text-blue-300">
                  <span className="text-xs font-bold uppercase">
                    {format(apptDate, 'MMM', { locale: dateFnsLocale })}
                  </span>
                  <span className="text-2xl font-black leading-none">
                    {format(apptDate, 'dd')}
                  </span>
                  <span className="text-[10px] font-semibold">
                    {format(apptDate, 'HH:mm')}
                  </span>
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="text-base font-black text-stone-900 dark:text-white truncate">
                      {appt.title}
                    </h3>
                    <Badge variant="outline" className={cn('text-xs font-bold px-2 py-0.5 rounded-lg border', statusCfg.color)}>
                      {statusCfg.label}
                    </Badge>
                    {isPast && appt.status === 'scheduled' && (
                      <Badge variant="outline" className="text-xs font-bold px-2 py-0.5 rounded-lg border bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700">
                        No horário exato do agendamento
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-stone-500 dark:text-stone-400 mt-1">
                    {appt.doctor_name && (
                      <span className="flex items-center gap-1">
                        <User className="h-3.5 w-3.5" />
                        {appt.doctor_name}{appt.specialty ? ` · ${appt.specialty}` : ''}
                      </span>
                    )}
                    {appt.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {appt.location}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {format(apptDate, "EEEE, dd/MM/yyyy 'às' HH:mm", { locale: dateFnsLocale })}
                    </span>
                  </div>

                  {appt.description && (
                    <p className="text-xs text-stone-400 dark:text-stone-500 mt-2 line-clamp-2">
                      {appt.description}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 sm:flex-col sm:items-end shrink-0">
                  {appt.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(appt.id, 'completed')}
                      className="flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1"
                      title="Marcar como concluída"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="hidden sm:inline">Concluída</span>
                    </button>
                  )}
                  {appt.status !== 'cancelled' && appt.status !== 'completed' && (
                    <button
                      onClick={() => handleStatusChange(appt.id, 'cancelled')}
                      className="flex items-center gap-1 text-xs font-bold text-red-500 dark:text-red-400 hover:underline px-2 py-1"
                      title="Cancelar"
                    >
                      <XCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Cancelar</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleEdit(appt)}
                    className="flex items-center gap-1 text-xs font-bold text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white px-2 py-1"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(appt.id)}
                    disabled={deleting === appt.id}
                    className="flex items-center gap-1 text-xs font-bold text-red-400 hover:text-red-600 px-2 py-1 disabled:opacity-50"
                    title="Excluir"
                  >
                    {deleting === appt.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
