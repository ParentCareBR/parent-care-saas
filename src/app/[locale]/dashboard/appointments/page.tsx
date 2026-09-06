'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Plus, MapPin, User, CheckCircle2, Clock, XCircle, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    doctor_name: '',
    specialty: '',
    location: '',
    starts_at: '',
    description: '',
  });

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
        description: form.description || null,
        status: 'scheduled',
        created_by: user.id,
      });

    if (error) {
      toast({ title: 'Erro ao agendar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Consulta agendada!', description: 'O compromisso foi adicionado à agenda familiar.' });
      setModalOpen(false);
      setForm({
        title: '',
        doctor_name: '',
        specialty: '',
        location: '',
        starts_at: '',
        description: '',
      });
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2.5">
            <Calendar className="h-7 w-7 text-indigo-600" />
            Agenda de Consultas e Exames
          </h1>
          <p className="text-stone-500 text-sm mt-1">
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

      <Card className="rounded-2xl border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg">Compromissos Cadastrados ({appointments.length})</CardTitle>
          <CardDescription>Acompanhe datas, locais e marque as consultas concluídas.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : appointments.length > 0 ? (
            <div className="space-y-3.5">
              {appointments.map((appt) => {
                const dateObj = new Date(appt.starts_at);
                const isPast = dateObj < new Date();
                return (
                  <div 
                    key={appt.id} 
                    className="p-4 rounded-xl border border-stone-200/80 bg-white hover:border-indigo-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex flex-col items-center justify-center font-bold flex-shrink-0 border border-indigo-100">
                        <span className="text-[10px] uppercase font-semibold text-indigo-500">
                          {dateObj.toLocaleDateString('pt-BR', { month: 'short' })}
                        </span>
                        <span className="text-base leading-none">
                          {dateObj.getDate()}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-stone-900 text-sm">{appt.title}</h4>
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
                            {dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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

                        {appt.description && (
                          <p className="text-xs text-stone-600 mt-1 bg-stone-50 p-1.5 rounded-md">
                            {appt.description}
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
                            className="text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg"
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
            <div className="py-12 text-center text-stone-400">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma consulta agendada.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setModalOpen(true)}
                className="mt-3 text-indigo-600 border-indigo-200"
              >
                + Agendar a Primeira Consulta
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
