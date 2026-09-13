'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Utensils, Plus, Clock, Pencil, Trash2, RefreshCw, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import RecurrenceSelector, { RecurrenceConfig, recurrenceLabel } from '@/components/ui/RecurrenceSelector';
import { getAlarmTexts } from '@/lib/i18n/care-translations';

interface MealRecord {
  id: string;
  type: string;
  name: string;
  time: string;
  acceptance: 'full' | 'partial' | 'refused';
  notes?: string;
  date: string;
  recurrence?: string;
  alarm?: string;
  isExample?: boolean;
}

// The single editable example that appears when no real data exists
const EXAMPLE_MEAL: MealRecord = {
  id: '__example__',
  type: 'breakfast',
  name: 'Vitamina de banana com aveia e torrada integral',
  time: '08:00',
  acceptance: 'full',
  notes: 'Este é um exemplo. Edite ou exclua e registre refeições reais.',
  date: new Date().toISOString(),
  isExample: true,
};

export default function MealsPage() {
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'pt-BR';
  const tAlarm = getAlarmTexts(currentLocale);
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editMeal, setEditMeal] = useState<MealRecord | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'breakfast',
    name: '',
    time: '08:30',
    acceptance: 'full' as 'full' | 'partial' | 'refused',
    notes: '',
  });

  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ type: 'none' });
  const [alarm, setAlarm] = useState<string>('15m');

  const fetchMeals = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fetch from care_notes where content starts with "Refeição"
    const { data, error } = await supabase
      .from('care_notes')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .like('content', 'Refeição%')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Erro ao buscar refeições:', error);
    }

    if (data && data.length > 0) {
      // Parse the stored content back into MealRecord shape
      const parsed: MealRecord[] = data.map((n: any) => {
        // Content format: "Refeição (type): name. Apetite: label. notes"
        const match = n.content.match(/^Refeição \((.+?)\): (.+?)\. Apetite: (.+?)(?:\. (.*))?$/);
        const typeMap: Record<string, string> = {
          breakfast: 'breakfast', lunch: 'lunch', snack: 'snack', dinner: 'dinner', supper: 'supper',
        };
        const accMap: Record<string, 'full' | 'partial' | 'refused'> = {
          'Comeu tudo': 'full', 'Comeu metade': 'partial', 'Recusou': 'refused',
        };

        let rawNotes = match && match[4] ? match[4] : undefined;
        let recurrenceText: string | undefined;
        let alarmText: string | undefined;
        if (rawNotes) {
          const recMatch = rawNotes.match(/\[(?:Recorrência|Recurrence|Wiederholung):\s*(.+?)\]/i);
          if (recMatch) {
            recurrenceText = recMatch[1];
            rawNotes = rawNotes.replace(/\[(?:Recorrência|Recurrence|Wiederholung):\s*(.+?)\]/gi, '').trim();
          }
          const alarmMatch = rawNotes.match(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/i);
          if (alarmMatch) {
            alarmText = alarmMatch[1];
            rawNotes = rawNotes.replace(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/gi, '').trim();
          }
          if (!rawNotes) rawNotes = undefined;
        }

        return {
          id: n.id,
          type: match ? (typeMap[match[1]] || match[1]) : 'lunch',
          name: match ? match[2] : n.content,
          time: new Date(n.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          acceptance: match ? (accMap[match[3]] || 'full') : 'full',
          notes: rawNotes,
          recurrence: recurrenceText,
          alarm: alarmText,
          date: n.created_at,
        };
      });
      setMeals(parsed);
    } else {
      // No real data — show single example entry
      setMeals([EXAMPLE_MEAL]);
    }

    setLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const openCreate = () => {
    setEditMeal(null);
    setForm({ type: 'breakfast', name: '', time: '08:30', acceptance: 'full', notes: '' });
    setRecurrence({ type: 'none' });
    setAlarm('15m');
    setModalOpen(true);
  };

  const openEdit = (meal: MealRecord) => {
    setEditMeal(meal);
    setForm({
      type: meal.type,
      name: meal.name,
      time: meal.time,
      acceptance: meal.acceptance,
      notes: meal.notes || '',
    });
    setRecurrence({ type: 'none' });
    setAlarm(meal.alarm ? '15m' : 'none');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
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

    const content = (`Refeição (${form.type}): ${form.name}. Apetite: ${
      form.acceptance === 'full' ? 'Comeu tudo' : form.acceptance === 'partial' ? 'Comeu metade' : 'Recusou'
    }. ${form.notes || ''}${recurrenceSuffix}${alarmSuffix}`).trim().replace(/\.$/, '');

    if (editMeal && !editMeal.isExample) {
      // Update existing note
      const { error } = await supabase
        .from('care_notes')
        .update({ content })
        .eq('id', editMeal.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      toast({ title: 'Refeição atualizada!' });
    } else {
      // Create new (or replacing example)
      if (!currentOrganizationId || !user) {
        setSaving(false);
        return;
      }
      const { error } = await supabase.from('care_notes').insert({
        cared_person_id: selectedPerson.id,
        organization_id: currentOrganizationId,
        author_id: user.id,
        content,
        type: 'general',
      });

      if (error) {
        toast({ title: 'Erro ao registrar', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      toast({ title: 'Refeição registrada!', description: 'O registro nutricional foi salvo.' });
    }

    setModalOpen(false);
    fetchMeals();
    setSaving(false);
  };

  const handleDelete = async (meal: MealRecord) => {
    if (meal.isExample) {
      // Just remove the example locally
      setMeals([]);
      return;
    }
    const { error } = await supabase.from('care_notes').delete().eq('id', meal.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Refeição removida.' });
      fetchMeals();
    }
  };

  const getMealTitle = (type: string) => {
    switch (type) {
      case 'breakfast': return 'Café da Manhã';
      case 'lunch': return 'Almoço';
      case 'snack': return 'Café da Tarde / Lanche';
      case 'dinner': return 'Jantar';
      default: return 'Ceia Noturna';
    }
  };

  const getMealEmoji = (type: string) => {
    switch (type) {
      case 'breakfast': return '🥣';
      case 'lunch': return '🥗';
      case 'snack': return '🍎';
      case 'dinner': return '🍲';
      default: return '🥛';
    }
  };

  const getAcceptanceBadge = (acc: string) => {
    switch (acc) {
      case 'full':
        return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Comeu tudo</Badge>;
      case 'partial':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Comeu parcial</Badge>;
      default:
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">Recusou refeição</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 overflow-x-hidden w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Utensils className="h-7 w-7 text-teal-600" />
            Nutrição e Alimentação Diária
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {selectedPerson
              ? `Registro de refeições, apetite e hidratação de ${selectedPerson.full_name}`
              : 'Selecione uma pessoa cuidada para ver as refeições'}
          </p>
        </div>

        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 rounded-xl"
          onClick={openCreate}
          disabled={!selectedPerson}
        >
          <Plus className="h-4 w-4 mr-2" /> Registrar Refeição
        </Button>
      </div>

      {/* Quick Meal Preset Chips */}
      {selectedPerson && (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <span className="text-xs font-bold text-stone-500 dark:text-stone-400 whitespace-nowrap">Registro rápido:</span>
          {[
            { type: 'breakfast', label: 'Café da Manhã', emoji: '🥣', defaultName: 'Café da manhã completo', defaultTime: '08:00' },
            { type: 'lunch', label: 'Almoço', emoji: '🥗', defaultName: 'Almoço balanceado', defaultTime: '12:30' },
            { type: 'snack', label: 'Lanche', emoji: '🍎', defaultName: 'Lanche da tarde com frutas', defaultTime: '16:00' },
            { type: 'dinner', label: 'Jantar', emoji: '🍲', defaultName: 'Jantar leve', defaultTime: '19:30' },
          ].map(preset => (
            <button
              key={preset.type}
              onClick={() => {
                setEditMeal(null);
                setForm({
                  type: preset.type,
                  name: preset.defaultName,
                  time: preset.defaultTime,
                  acceptance: 'full',
                  notes: '',
                });
                setModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-stone-100 hover:bg-teal-50 dark:bg-stone-800 dark:hover:bg-teal-950/40 text-stone-700 hover:text-teal-700 dark:text-stone-300 dark:hover:text-teal-300 border border-stone-200 dark:border-stone-700 transition-colors whitespace-nowrap active:scale-95"
            >
              <span>{preset.emoji}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Meals List */}
      <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <CardHeader>
          <CardTitle className="text-lg text-stone-900 dark:text-stone-100">
            Refeições de Hoje ({meals.filter(m => !m.isExample).length})
          </CardTitle>
          <CardDescription className="text-stone-500 dark:text-stone-400">Acompanhe a ingestão de nutrientes e o apetite ao longo do dia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
            </div>
          ) : !selectedPerson ? (
            <div className="py-12 text-center text-stone-400">
              <Utensils className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Selecione uma pessoa cuidada no menu lateral.</p>
            </div>
          ) : meals.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Utensils className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm mb-3">Nenhuma refeição registrada hoje.</p>
              <Button size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Registrar Primeira Refeição
              </Button>
            </div>
          ) : (
            meals.map((meal) => (
              <div
                key={meal.id}
                className={cn(
                  'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors',
                  meal.isExample
                    ? 'border-dashed border-stone-300 dark:border-stone-600 bg-stone-50/60 dark:bg-stone-800/40'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-teal-200 shadow-2xs'
                )}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900 flex items-center justify-center text-2xl flex-shrink-0">
                    {getMealEmoji(meal.type)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">{getMealTitle(meal.type)}</h4>
                      {getAcceptanceBadge(meal.acceptance)}
                      {meal.recurrence && (
                        <Badge variant="outline" className="bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium">
                          <RefreshCw className="h-2.5 w-2.5" />
                          {meal.recurrence}
                        </Badge>
                      )}
                      {meal.alarm && (
                        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium">
                          <BellRing className="h-2.5 w-2.5" />
                          {meal.alarm}
                        </Badge>
                      )}
                      {meal.isExample && (
                        <Badge variant="outline" className="text-stone-400 border-stone-300 text-[10px] px-1.5">
                          Exemplo — edite ou exclua
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-stone-700 dark:text-stone-300 font-medium leading-tight">{meal.name}</p>
                    {meal.notes && (
                      <p className="text-xs text-stone-500 bg-stone-50 dark:bg-stone-800 p-1.5 rounded-md mt-1">{meal.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <div className="flex items-center gap-2 text-xs font-semibold text-stone-500 bg-stone-100 dark:bg-stone-800 px-2.5 py-1.5 rounded-lg">
                    <Clock className="h-3.5 w-3.5 text-stone-400" />
                    {meal.time}
                  </div>
                  <button
                    onClick={() => openEdit(meal)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/30 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(meal)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editMeal && !editMeal.isExample ? 'Editar Refeição' : 'Registrar Refeição'}</DialogTitle>
              <DialogDescription>
                Informe os alimentos consumidos e o nível de aceitação do idoso.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo de Refeição</Label>
                  <Select
                    value={form.type}
                    onValueChange={(val) => setForm(prev => ({ ...prev, type: val }))}
                  >
                    <SelectTrigger id="type"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="breakfast">Café da Manhã</SelectItem>
                      <SelectItem value="lunch">Almoço</SelectItem>
                      <SelectItem value="snack">Café da Tarde</SelectItem>
                      <SelectItem value="dinner">Jantar</SelectItem>
                      <SelectItem value="supper">Ceia Noturna</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time">Horário</Label>
                  <Input
                    id="time"
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">O que foi servido? *</Label>
                <Input
                  id="name"
                  required
                  placeholder="Ex: Arroz, feijão, purê e carne moída"
                  value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="acceptance">Aceitação / Apetite</Label>
                <Select
                  value={form.acceptance}
                  onValueChange={(val: any) => setForm(prev => ({ ...prev, acceptance: val }))}
                >
                  <SelectTrigger id="acceptance"><SelectValue placeholder="Como comeu?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Comeu tudo (Excelente aceitação)</SelectItem>
                    <SelectItem value="partial">Comeu parcialmente (Metade do prato)</SelectItem>
                    <SelectItem value="refused">Recusou / Pouco apetite</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações nutricionais</Label>
                <Input
                  id="notes"
                  placeholder="Ex: Tomou 200ml de suco, boa mastigação"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
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
              <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Refeição'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
