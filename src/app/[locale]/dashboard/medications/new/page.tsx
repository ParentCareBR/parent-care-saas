'use client';

import React, { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BellRing, Clock, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import RecurrenceSelector, { RecurrenceConfig, recurrenceLabel } from '@/components/ui/RecurrenceSelector';
import { getAlarmTexts } from '@/lib/i18n/care-translations';

export default function NewMedicationPage() {
  const router = useRouter();
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'pt-BR';
  const tAlarm = getAlarmTexts(currentLocale);
  const { selectedPerson } = useCaredPerson();
  const { user, currentOrganizationId } = useAuth();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    dosage: '',
    unit: 'mg',
    instructions: '',
  });
  const [schedules, setSchedules] = useState<string[]>(['08:00']);
  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ type: 'none' });
  const [alarm, setAlarm] = useState('exact');

  const addSchedule = () => setSchedules(prev => [...prev, '12:00']);
  const removeSchedule = (idx: number) => setSchedules(prev => prev.filter((_, i) => i !== idx));
  const updateSchedule = (idx: number, val: string) =>
    setSchedules(prev => prev.map((s, i) => (i === idx ? val : s)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !user || !currentOrganizationId) return;
    if (schedules.length === 0) {
      alert('Adicione pelo menos um horário para o medicamento.');
      return;
    }

    setLoading(true);

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

    const cleanSchedules = schedules.filter(t => t.trim());
    const schedulesSuffix = cleanSchedules.length > 0
      ? ` [Horários: ${cleanSchedules.join(', ')}]`
      : '';

    const { data: med, error } = await (supabase as any).from('medications').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId!,
      name: formData.name,
      dosage: formData.dosage,
      unit: formData.unit,
      instructions: ((formData.instructions || '') + recurrenceSuffix + alarmSuffix + schedulesSuffix).trim() || null,
      created_by: user.id,
      is_active: true,
    }).select('id').single();

    if (error || !med) {
      setLoading(false);
      alert('Erro ao salvar medicamento: ' + (error?.message || 'Tente novamente.'));
      return;
    }

    // Save schedules with organization_id
    if (cleanSchedules.length > 0) {
      const scheduleRows = cleanSchedules.map(t => ({
        medication_id: med.id,
        organization_id: currentOrganizationId!,
        time_of_day: t.length === 5 ? `${t}:00` : t,
        days_of_week: [1, 2, 3, 4, 5, 6, 7],
        is_active: true,
      }));

      const { error: schedError } = await (supabase as any).from('medication_schedules').insert(scheduleRows);
      if (schedError) {
        console.error('Error inserting schedules:', schedError);
      }
    }

    setLoading(false);
    router.push(`/${currentLocale}/dashboard/medications`);
  };

  if (!selectedPerson) return <div className="p-8 text-center text-stone-500">Selecione uma pessoa cuidada primeiro.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/${currentLocale}/dashboard/medications`}><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Novo Medicamento</h1>
          <p className="text-stone-500 dark:text-stone-400">Para {selectedPerson.full_name}</p>
        </div>
      </div>

      <Card className="dark:bg-stone-900 dark:border-stone-800">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">

              {/* Name */}
              <div>
                <Label htmlFor="name">Nome do medicamento</Label>
                <Input
                  id="name"
                  required
                  placeholder="Ex: Losartana"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              {/* Dosage + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dosage">Dosagem</Label>
                  <Input
                    id="dosage"
                    required
                    placeholder="Ex: 50"
                    value={formData.dosage}
                    onChange={e => setFormData({ ...formData, dosage: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unidade</Label>
                  <select
                    id="unit"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                  >
                    <option value="mg">mg</option>
                    <option value="ml">ml</option>
                    <option value="g">g</option>
                    <option value="gotas">gotas</option>
                    <option value="cp">comprimido(s)</option>
                  </select>
                </div>
              </div>

              {/* Schedules — REQUIRED for alarm */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <Label className="text-sm font-semibold">Horários de administração</Label>
                    <span className="text-xs text-rose-500 font-bold">*</span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSchedule}
                    className="h-8 text-xs rounded-lg gap-1 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Adicionar horário
                  </Button>
                </div>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Defina os horários em que o medicamento deve ser tomado. O alarme será disparado nestes horários.
                </p>
                <div className="space-y-2">
                  {schedules.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="flex items-center gap-2 flex-1 bg-stone-50 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 px-3 py-2">
                        <Clock className="h-4 w-4 text-stone-400 shrink-0" />
                        <input
                          type="time"
                          value={s}
                          onChange={e => updateSchedule(idx, e.target.value)}
                          className="flex-1 bg-transparent text-sm text-stone-900 dark:text-stone-100 focus:outline-none"
                          required
                        />
                      </div>
                      {schedules.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSchedule(idx)}
                          className="h-9 w-9 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Instructions */}
              <div>
                <Label htmlFor="instructions">Instruções de uso (Opcional)</Label>
                <textarea
                  id="instructions"
                  className="flex min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Ex: Tomar após as refeições"
                  value={formData.instructions}
                  onChange={e => setFormData({ ...formData, instructions: e.target.value })}
                />
              </div>

              {/* Recurrence */}
              <div className="pt-2 border-t border-stone-100 dark:border-stone-800">
                <RecurrenceSelector value={recurrence} onChange={setRecurrence} />
              </div>

              {/* Alarm */}
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
                <p className="text-xs text-stone-500 dark:text-stone-400">{tAlarm.subtext}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
              <Button variant="outline" type="button" asChild>
                <Link href={`/${currentLocale}/dashboard/medications`}>Cancelar</Link>
              </Button>
              <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Medicamento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
