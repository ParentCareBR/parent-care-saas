'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { HeartPulse, Activity, Thermometer, Wind, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface QuickVitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  caredPersonId: string;
  caredPersonName: string;
  organizationId: string;
  userId?: string;
  onSaved?: (vitals: { bp: string; glucose: string; saturation: string; temp: string; heartRate: string }) => void;
}

export function QuickVitalsModal({
  isOpen,
  onClose,
  caredPersonId,
  caredPersonName,
  organizationId,
  userId,
  onSaved,
}: QuickVitalsModalProps) {
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [glucose, setGlucose] = useState('98');
  const [heartRate, setHeartRate] = useState('72');
  const [saturation, setSaturation] = useState('98');
  const [temperature, setTemperature] = useState('36.5');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caredPersonId || !organizationId) return;

    setSaving(true);
    const bp = `${systolic}/${diastolic}`;

    try {
      // Save as care_notes observation with structured metadata
      const summaryText = `[Sinais Vitais] PA: ${bp} mmHg | Glicemia: ${glucose} mg/dL | FC: ${heartRate} bpm | SpO₂: ${saturation}% | Temp: ${temperature}°C${notes ? ` · Obs: ${notes}` : ''}`;

      const { error } = await supabase.from('care_notes').insert({
        organization_id: organizationId,
        cared_person_id: caredPersonId,
        content: summaryText,
        type: 'observation',
      });

      if (error) throw error;

      toast({
        title: 'Sinais Vitais Registrados!',
        description: `PA ${bp} mmHg e Glicemia ${glucose} mg/dL gravados no prontuário de ${caredPersonName}.`,
      });

      if (onSaved) {
        onSaved({
          bp,
          glucose: `${glucose} mg/dL`,
          saturation: `${saturation}%`,
          temp: `${temperature}°C`,
          heartRate: `${heartRate} bpm`,
        });
      }

      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar sinais vitais:', err);
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível gravar os dados. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-md bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-6 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <HeartPulse className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-stone-900 dark:text-white leading-tight">
                Registrar Sinais Vitais
              </DialogTitle>
              <DialogDescription className="text-xs text-stone-500 dark:text-stone-400">
                Aferição para {caredPersonName}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Pressão Arterial */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Pressão Arterial (mmHg)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Input
                  type="number"
                  placeholder="Máx (ex: 120)"
                  value={systolic}
                  onChange={(e) => setSystolic(e.target.value)}
                  className="rounded-xl h-10 text-sm font-bold bg-stone-50 dark:bg-[#16253C]"
                  required
                />
                <span className="text-[10px] text-stone-400 pl-1">Sistólica (máx)</span>
              </div>
              <div>
                <Input
                  type="number"
                  placeholder="Mín (ex: 80)"
                  value={diastolic}
                  onChange={(e) => setDiastolic(e.target.value)}
                  className="rounded-xl h-10 text-sm font-bold bg-stone-50 dark:bg-[#16253C]"
                  required
                />
                <span className="text-[10px] text-stone-400 pl-1">Diastólica (mín)</span>
              </div>
            </div>
          </div>

          {/* Glicemia e Frequência Cardíaca */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Glicemia (mg/dL)
              </Label>
              <Input
                type="number"
                placeholder="Ex: 98"
                value={glucose}
                onChange={(e) => setGlucose(e.target.value)}
                className="rounded-xl h-10 text-sm font-bold bg-stone-50 dark:bg-[#16253C]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Batimentos (bpm)
              </Label>
              <Input
                type="number"
                placeholder="Ex: 72"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value)}
                className="rounded-xl h-10 text-sm font-bold bg-stone-50 dark:bg-[#16253C]"
              />
            </div>
          </div>

          {/* Saturação e Temperatura */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Saturação O₂ (%)
              </Label>
              <Input
                type="number"
                placeholder="Ex: 98"
                value={saturation}
                onChange={(e) => setSaturation(e.target.value)}
                className="rounded-xl h-10 text-sm font-bold bg-stone-50 dark:bg-[#16253C]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
                Temperatura (°C)
              </Label>
              <Input
                type="number"
                step="0.1"
                placeholder="Ex: 36.5"
                value={temperature}
                onChange={(e) => setTemperature(e.target.value)}
                className="rounded-xl h-10 text-sm font-bold bg-stone-50 dark:bg-[#16253C]"
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-stone-700 dark:text-stone-300">
              Observação / Sintomas
            </Label>
            <Input
                placeholder="Ex: Aferido em repouso após o almoço"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-xl h-10 text-xs bg-stone-50 dark:bg-[#16253C]"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="rounded-xl h-10 text-xs font-bold"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-xl h-10 text-xs font-bold px-5"
            >
              {saving ? 'Gravando...' : 'Salvar Aferição'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
