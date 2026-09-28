'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pill, Clock, CheckCircle2, AlertCircle, RefreshCw, BellRing, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { getAlarmTexts } from '@/lib/i18n/care-translations';
import { useToast } from '@/hooks/use-toast';


export default function MedicationsPage() {
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'pt-BR';
  const tAlarm = getAlarmTexts(currentLocale);
  const { user, currentOrganizationId } = useAuth();
  const { toast } = useToast();
  const { selectedPerson, loading: personLoading } = useCaredPerson();
  const [medications, setMedications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deleteConfirmMed, setDeleteConfirmMed] = useState<{id: string; name: string} | null>(null);
  const [deleting, setDeleting] = useState(false);
  const supabase = createClient() as any;


  const handleConfirmMedication = async (medicationId: string, medName: string) => {
    if (!user || !selectedPerson || !currentOrganizationId) return;
    setConfirmingId(medicationId);
    try {
      const { error } = await supabase.from('medication_confirmations').insert({
        medication_id: medicationId,
        cared_person_id: selectedPerson.id,
        organization_id: currentOrganizationId,
        confirmed_by: user.id,
        status: 'taken',
      });
      if (error) {
        toast({ title: 'Erro ao confirmar', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '✅ Dose confirmada!', description: `${medName} registrado com sucesso.` });
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDeleteMedication = async () => {
    if (!deleteConfirmMed) return;
    setDeleting(true);
    try {
      // Delete schedules first
      await supabase.from('medication_schedules').delete().eq('medication_id', deleteConfirmMed.id);
      // Then delete the medication (soft delete by setting is_active=false, or hard delete)
      const { error } = await supabase.from('medications').delete().eq('id', deleteConfirmMed.id);
      if (error) {
        toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: '🗑️ Medicamento excluído', description: `${deleteConfirmMed.name} foi removido da lista.` });
        setMedications(prev => prev.filter(m => m.id !== deleteConfirmMed.id));
        setDeleteConfirmMed(null);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    async function fetchMedications() {
      if (!selectedPerson) return;
      
      setLoading(true);
      const { data, error } = await supabase
        .from('medications')
        .select('*, medication_schedules(id, time_of_day)')
        .eq('cared_person_id', selectedPerson.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
        
      if (!error && data) {
        setMedications(data);
      }
      setLoading(false);
    }
    
    fetchMedications();
  }, [selectedPerson, supabase]);

  if (personLoading) return <div className="p-8 text-center text-stone-500">Carregando...</div>;

  if (!selectedPerson) {
    return <div className="p-8 text-center text-stone-500">Selecione uma pessoa cuidada primeiro.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto overflow-x-hidden w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Medicamentos</h1>
          <p className="text-stone-500 dark:text-stone-400">Controle e horários de {selectedPerson.full_name}</p>
        </div>
        <Button asChild className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
          <Link href={`/${currentLocale}/dashboard/medications/new`}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Medicamento
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><div className="animate-spin inline-block w-6 h-6 border-2 border-brand-green border-t-transparent rounded-full" /></div>
      ) : medications.length === 0 ? (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-lg p-12 text-center shadow-sm">
          <div className="mx-auto w-16 h-16 bg-stone-100 dark:bg-stone-800 rounded-full flex items-center justify-center mb-4">
            <Pill className="h-8 w-8 text-stone-400 dark:text-stone-500" />
          </div>
          <h3 className="text-lg font-medium text-stone-900 dark:text-stone-100">Nenhum medicamento</h3>
          <p className="text-stone-500 dark:text-stone-400 mt-1 max-w-sm mx-auto mb-6">
            Adicione os medicamentos de {selectedPerson.full_name} para acompanhar horários e confirmações.
          </p>
          <Button asChild variant="outline">
            <Link href={`/${currentLocale}/dashboard/medications/new`}>Adicionar o primeiro</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {medications.map(med => (
            <Card key={med.id} className="overflow-hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800">
              <div className="flex flex-col sm:flex-row">
                <div className="bg-stone-50 dark:bg-stone-800/70 p-4 sm:w-48 border-r border-stone-100 dark:border-stone-700 flex flex-col justify-center">
                  <span className="text-sm text-stone-500 dark:text-stone-400 font-medium">Horários previstos</span>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {med.medication_schedules?.map((sched: any) => (
                      <span key={sched.id} className="bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 text-stone-700 dark:text-stone-200 text-xs px-2 py-1 rounded-md font-medium">
                        {sched.time_of_day.slice(0, 5)}
                      </span>
                    ))}
                    {(!med.medication_schedules || med.medication_schedules.length === 0) && (
                      <span className="text-xs text-stone-400 dark:text-stone-500 italic">Sem horário definido</span>
                    )}
                  </div>
                </div>
                <div className="flex-1 p-5 flex justify-between items-center">
                  <div>
                    {(() => {
                      const recMatch = med.instructions?.match(/\[(?:Recorrência|Recurrence|Wiederholung):\s*(.+?)\]/i);
                      const alarmMatch = med.instructions?.match(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/i);
                      const cleanInstructions = med.instructions
                        ?.replace(/\[(?:Recorrência|Recurrence|Wiederholung):\s*(.+?)\]/gi, '')
                        ?.replace(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/gi, '')
                        .trim();
                      return (
                        <>
                          <h3 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2 flex-wrap">
                            {med.name}
                            <span className="text-sm font-normal text-stone-500 dark:text-stone-400">{med.dosage} {med.unit}</span>
                            {recMatch && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2 py-0.5 rounded-md font-medium border border-teal-200 dark:border-teal-800">
                                <RefreshCw className="h-3 w-3" />
                                {recMatch[1]}
                              </span>
                            )}
                            {alarmMatch && (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md font-medium border border-amber-200 dark:border-amber-800">
                                <BellRing className="h-3 w-3" />
                                {alarmMatch[1]}
                              </span>
                            )}
                          </h3>
                          <p className="text-sm text-stone-600 dark:text-stone-400 mt-1">{cleanInstructions || 'Uso contínuo'}</p>
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={confirmingId === med.id}
                      onClick={() => handleConfirmMedication(med.id, med.name)}
                      className="text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl min-h-[38px] px-3 font-semibold"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1.5" />
                      {confirmingId === med.id ? 'Registrando...' : 'Confirmar Dose'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDeleteConfirmMed({ id: med.id, name: med.name })}
                      className="text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl min-h-[38px] px-2.5"
                      title="Excluir medicamento"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmMed} onOpenChange={(open) => { if (!open) setDeleteConfirmMed(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              Excluir Medicamento
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirmMed?.name}</strong>? Esta ação não pode ser desfeita e todos os horários cadastrados serão removidos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmMed(null)}
              disabled={deleting}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteMedication}
              disabled={deleting}
              className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              {deleting ? 'Excluindo...' : 'Sim, excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
