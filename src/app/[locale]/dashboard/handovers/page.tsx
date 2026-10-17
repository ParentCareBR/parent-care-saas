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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeftRight,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  ShieldCheck,
  Plus,
  Sun,
  Sunset,
  Moon,
  Clock4
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ShiftHandover {
  id: string;
  shift_date: string;
  shift_period: 'morning' | 'afternoon' | 'night' | '24h' | 'custom';
  summary_notes: string;
  pending_tasks: string | null;
  incidents_noted: string | null;
  outgoing_caregiver_id: string | null;
  incoming_caregiver_id: string | null;
  acknowledged_at: string | null;
  created_at: string;
}

const PERIOD_CONFIG: Record<string, { label: string; icon: any; color: string; badge: string }> = {
  morning: { label: 'Manhã (07h às 13h)', icon: Sun, color: 'text-amber-500', badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200' },
  afternoon: { label: 'Tarde (13h às 19h)', icon: Sunset, color: 'text-orange-500', badge: 'bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border-orange-200' },
  night: { label: 'Noite / Plantão (19h às 07h)', icon: Moon, color: 'text-indigo-500', badge: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200' },
  '24h': { label: 'Plantão 24h', icon: Clock4, color: 'text-emerald-500', badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200' },
  custom: { label: 'Horário Especial', icon: Clock, color: 'text-slate-500', badge: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200' },
};

export default function ShiftHandoversPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [handovers, setHandovers] = useState<ShiftHandover[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    shift_date: new Date().toISOString().slice(0, 10),
    shift_period: 'morning' as const,
    summary_notes: '',
    pending_tasks: '',
    incidents_noted: '',
  });

  const fetchHandovers = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('shift_handovers')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .order('shift_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching handovers:', error);
        setHandovers([]);
      } else {
        setHandovers(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchHandovers();
  }, [fetchHandovers]);

  const handleCreateHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !formData.summary_notes.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('shift_handovers').insert({
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        outgoing_caregiver_id: user?.id || null,
        shift_date: formData.shift_date,
        shift_period: formData.shift_period,
        summary_notes: formData.summary_notes.trim(),
        pending_tasks: formData.pending_tasks.trim() || null,
        incidents_noted: formData.incidents_noted.trim() || null,
      });

      if (error) {
        alert('Erro ao registrar passagem de turno: ' + error.message);
      } else {
        setCreateModalOpen(false);
        setFormData({
          shift_date: new Date().toISOString().slice(0, 10),
          shift_period: 'morning',
          summary_notes: '',
          pending_tasks: '',
          incidents_noted: '',
        });
        fetchHandovers();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAcknowledge = async (handoverId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from('shift_handovers')
      .update({
        acknowledged_at: new Date().toISOString(),
        incoming_caregiver_id: user.id,
      })
      .eq('id', handoverId);

    if (error) {
      alert('Falha ao confirmar ciência: ' + error.message);
    } else {
      fetchHandovers();
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#101D2B] p-6 rounded-3xl border border-stone-200 dark:border-[#172433] shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <ArrowLeftRight className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-900 dark:text-[#F8FAFC]">Passagem de Turno</h1>
              <Badge className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 border-indigo-200 text-xs font-bold">
                Continuidade do Cuidado
              </Badge>
            </div>
            <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
              {selectedPerson ? `Registro claro de rotina, pendências e confirmação de ciência para ${selectedPerson.full_name}` : 'Selecione uma pessoa cuidada'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setCreateModalOpen(true)}
          disabled={!selectedPerson}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl px-5 flex items-center gap-2 shadow-xs transition active:scale-95 shrink-0"
        >
          <Plus className="h-5 w-5" /> Registrar Passagem
        </Button>
      </div>

      {/* LISTAGEM DE PASSAGENS */}
      {loading ? (
        <div className="py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
      ) : handovers.length === 0 ? (
        <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-[#172433] space-y-3">
          <p className="text-4xl">📋</p>
          <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">Sem registros recentes de passagem de turno</h3>
          <p className="text-xs text-stone-500 max-w-md mx-auto">
            Quando um cuidador ou familiar encerra um turno ou dia de cuidado, registre o resumo das ocorrências e pendências para quem assume o próximo período.
          </p>
          <Button onClick={() => setCreateModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs">
            Registrar Primeira Passagem
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {handovers.map((item) => {
            const period = PERIOD_CONFIG[item.shift_period] || PERIOD_CONFIG.custom;
            const Icon = period.icon;
            const isAck = !!item.acknowledged_at;

            return (
              <div
                key={item.id}
                className={`bg-white dark:bg-[#101D2B] p-6 rounded-3xl border shadow-xs space-y-4 transition ${
                  isAck ? 'border-stone-200 dark:border-[#172433]' : 'border-indigo-400 dark:border-indigo-600 bg-indigo-50/10'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 dark:border-[#172433] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
                      <Icon className={`h-5 w-5 ${period.color}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-base text-stone-900 dark:text-white">
                          Turno: {format(new Date(item.shift_date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </span>
                        <Badge className={`text-[10px] font-bold ${period.badge}`}>
                          {period.label}
                        </Badge>
                      </div>
                      <span className="text-xs text-stone-400">
                        Registrado em {format(new Date(item.created_at), "dd/MM 'às' HH:mm")}
                      </span>
                    </div>
                  </div>

                  {/* Status de Ciência */}
                  <div>
                    {isAck ? (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 text-xs font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Ciência confirmada em {format(new Date(item.acknowledged_at!), "HH:mm 'de' dd/MM")}</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => handleAcknowledge(item.id)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs h-9 px-4 flex items-center gap-2"
                      >
                        <ShieldCheck className="h-4 w-4" /> Confirmar Ciência do Turno
                      </Button>
                    )}
                  </div>
                </div>

                {/* Resumo do turno */}
                <div className="space-y-1">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wide">Resumo das Atividades & Bem-estar:</p>
                  <p className="text-sm text-stone-800 dark:text-stone-200 leading-relaxed whitespace-pre-wrap bg-stone-50 dark:bg-[#172433] p-3 rounded-2xl">
                    {item.summary_notes}
                  </p>
                </div>

                {/* Pendências e Incidentes em colunas */}
                {(item.pending_tasks || item.incidents_noted) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {item.pending_tasks && (
                      <div className="p-3 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" /> Pendências para o próximo cuidador:
                        </p>
                        <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap">{item.pending_tasks}</p>
                      </div>
                    )}

                    {item.incidents_noted && (
                      <div className="p-3 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                        <p className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5" /> Ocorrências & Observações:
                        </p>
                        <p className="text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap">{item.incidents_noted}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO DE PASSAGEM DE TURNO */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-stone-900 dark:text-white">
              Registrar Passagem de Turno
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Descreva o que ocorreu no período para garantir a continuidade segura do cuidado
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateHandover} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Data do Turno</Label>
                <Input
                  type="date"
                  required
                  value={formData.shift_date}
                  onChange={(e) => setFormData({ ...formData, shift_date: e.target.value })}
                  className="rounded-xl h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Período</Label>
                <Select
                  value={formData.shift_period}
                  onValueChange={(val) => setFormData({ ...formData, shift_period: val as any })}
                >
                  <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">🌅 Manhã (07h às 13h)</SelectItem>
                    <SelectItem value="afternoon">☀️ Tarde (13h às 19h)</SelectItem>
                    <SelectItem value="night">🌙 Noite (19h às 07h)</SelectItem>
                    <SelectItem value="24h">⏱️ Plantão 24 horas</SelectItem>
                    <SelectItem value="custom">⚙️ Especial / Customizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Resumo do Período *</Label>
              <textarea
                required
                rows={4}
                placeholder="Como a pessoa passou o turno? Refeições, humor, passeios e medicação administrada..."
                value={formData.summary_notes}
                onChange={(e) => setFormData({ ...formData, summary_notes: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Pendências para o próximo cuidador (Opcional)</Label>
              <Input
                placeholder="Ex: Dar antibiótico às 21h, trocar curativo amanhã cedo"
                value={formData.pending_tasks}
                onChange={(e) => setFormData({ ...formData, pending_tasks: e.target.value })}
                className="rounded-xl h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Ocorrências / Avisos Importantes (Opcional)</Label>
              <Input
                placeholder="Ex: Sentiu leve tontura ao levantar, reclamou de dor no joelho"
                value={formData.incidents_noted}
                onChange={(e) => setFormData({ ...formData, incidents_noted: e.target.value })}
                className="rounded-xl h-10"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl px-5">
                {saving ? 'Registrando...' : 'Concluir Passagem'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
