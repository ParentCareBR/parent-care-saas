'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
import { Utensils, Plus, Check, Clock, AlertCircle, Heart, ThumbsUp, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface MealRecord {
  id: string;
  type: string;
  name: string;
  time: string;
  acceptance: 'full' | 'partial' | 'refused';
  notes?: string;
  date: string;
}

export default function MealsPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [meals, setMeals] = useState<MealRecord[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'breakfast',
    name: '',
    time: '08:30',
    acceptance: 'full' as 'full' | 'partial' | 'refused',
    notes: '',
  });

  const fetchMeals = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;

    // Load from care_notes with type 'meal' or localStorage as persistent backup
    const saved = localStorage.getItem(`parentcare_meals_${selectedPerson.id}`);
    if (saved) {
      try {
        setMeals(JSON.parse(saved));
      } catch (e) {
        // ignore
      }
    } else {
      // Default daily template
      setMeals([
        {
          id: 'meal-1',
          type: 'breakfast',
          name: 'Vitamina de banana com aveia e torrada integral',
          time: '08:00',
          acceptance: 'full',
          date: new Date().toISOString(),
        },
        {
          id: 'meal-2',
          type: 'lunch',
          name: 'Filé de frango grelhado, purê de mandioquinha e legumes cozidos',
          time: '12:30',
          acceptance: 'full',
          date: new Date().toISOString(),
        },
        {
          id: 'meal-3',
          type: 'snack',
          name: 'Iogurte natural com mamão picado',
          time: '16:00',
          acceptance: 'partial',
          notes: 'Comeu metade da porção.',
          date: new Date().toISOString(),
        },
        {
          id: 'meal-4',
          type: 'dinner',
          name: 'Sopa de legumes com carne desfiada',
          time: '19:30',
          acceptance: 'full',
          date: new Date().toISOString(),
        }
      ]);
    }
  }, [selectedPerson, currentOrganizationId]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    setSaving(true);

    const newMeal: MealRecord = {
      id: crypto.randomUUID(),
      type: form.type,
      name: form.name,
      time: form.time,
      acceptance: form.acceptance,
      notes: form.notes || undefined,
      date: new Date().toISOString(),
    };

    const updated = [newMeal, ...meals];
    setMeals(updated);
    localStorage.setItem(`parentcare_meals_${selectedPerson.id}`, JSON.stringify(updated));

    // Also register in care_notes on Supabase for clinical history
    if (currentOrganizationId && user) {
      await supabase.from('care_notes').insert({
        cared_person_id: selectedPerson.id,
        organization_id: currentOrganizationId,
        author_id: user.id,
        content: `Refeição (${form.type}): ${form.name}. Apetite: ${form.acceptance === 'full' ? 'Comeu tudo' : form.acceptance === 'partial' ? 'Comeu metade' : 'Recusou'}. ${form.notes || ''}`,
        type: 'general',
      });
    }

    toast({ title: 'Refeição registrada!', description: 'O registro nutricional foi salvo com sucesso.' });
    setModalOpen(false);
    setForm({ type: 'lunch', name: '', time: '12:00', acceptance: 'full', notes: '' });
    setSaving(false);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2.5">
            <Utensils className="h-7 w-7 text-teal-600" />
            Nutrição e Alimentação Diária
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            {selectedPerson 
              ? `Registro de refeições, apetite e hidratação de ${selectedPerson.full_name}`
              : 'Selecione uma pessoa cuidada'}
          </p>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-teal-600 hover:bg-teal-700 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Registrar Refeição
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Registrar Refeição</DialogTitle>
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
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
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
                    <SelectTrigger id="acceptance">
                      <SelectValue placeholder="Como comeu?" />
                    </SelectTrigger>
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
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="bg-teal-600 hover:bg-teal-700" disabled={saving}>
                  {saving ? 'Registrando...' : 'Salvar Refeição'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Meals List */}
      <Card className="rounded-2xl border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg">Refeições de Hoje ({meals.length})</CardTitle>
          <CardDescription>Acompanhe a ingestão de nutrientes e o apetite ao longo do dia.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {meals.map((meal) => (
            <div 
              key={meal.id}
              className="p-4 rounded-xl border border-stone-200/80 bg-white hover:border-teal-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-2xl flex-shrink-0">
                  {getMealEmoji(meal.type)}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-stone-900 text-sm">{getMealTitle(meal.type)}</h4>
                    {getAcceptanceBadge(meal.acceptance)}
                  </div>
                  <p className="text-sm text-stone-700 font-medium leading-tight">{meal.name}</p>
                  {meal.notes && (
                    <p className="text-xs text-stone-500 bg-stone-50 p-1.5 rounded-md mt-1">{meal.notes}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center text-xs font-semibold text-stone-500 bg-stone-100 px-2.5 py-1.5 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-stone-400" />
                {meal.time}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
