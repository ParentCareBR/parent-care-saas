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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Receipt, Plus, Pencil, Trash2, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface Expense {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  paid_by?: string | null;
  notes?: string | null;
  isExample?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  medication: 'Medicamentos',
  appointment: 'Consultas e Exames',
  caregiver: 'Cuidador / Acompanhante',
  food: 'Alimentação',
  equipment: 'Equipamentos e Insumos',
  transport: 'Transporte',
  other: 'Outros',
};

const CATEGORY_COLORS: Record<string, string> = {
  medication: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  appointment: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  caregiver: 'bg-purple-50 text-purple-700 border-purple-200',
  food: 'bg-teal-50 text-teal-700 border-teal-200',
  equipment: 'bg-amber-50 text-amber-700 border-amber-200',
  transport: 'bg-blue-50 text-blue-700 border-blue-200',
  other: 'bg-stone-100 text-stone-600 border-stone-200',
};

const EXAMPLE_EXPENSE: Expense = {
  id: '__example__',
  category: 'medication',
  description: 'Losartana 50mg — caixa com 30 comprimidos',
  amount: 38.90,
  date: new Date().toISOString(),
  paid_by: 'Maria (filha)',
  notes: 'Este é um exemplo editável. Exclua e cadastre as despesas reais.',
  isExample: true,
};

export default function ExpensesPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    category: 'medication',
    description: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    paid_by: '',
    notes: '',
  });

  const fetchExpenses = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('date', { ascending: false })
      .limit(100);

    if (error) {
      // Table may not exist yet
      console.error('Erro ao buscar despesas:', error.message);
      setExpenses([EXAMPLE_EXPENSE]);
      setLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setExpenses(data);
    } else {
      setExpenses([EXAMPLE_EXPENSE]);
    }
    setLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const resetForm = () =>
    setForm({
      category: 'medication',
      description: '',
      amount: '',
      date: new Date().toISOString().slice(0, 10),
      paid_by: '',
      notes: '',
    });

  const openCreate = () => {
    setEditExpense(null);
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (expense: Expense) => {
    setEditExpense(expense);
    setForm({
      category: expense.category,
      description: expense.description,
      amount: String(expense.amount),
      date: expense.date.slice(0, 10),
      paid_by: expense.paid_by || '',
      notes: expense.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
    setSaving(true);

    const payload = {
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      date: new Date(form.date).toISOString(),
      paid_by: form.paid_by || null,
      notes: form.notes || null,
      created_by: user.id,
    };

    if (editExpense && !editExpense.isExample) {
      const { error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', editExpense.id);

      if (error) {
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      toast({ title: 'Despesa atualizada!' });
    } else {
      const { error } = await supabase.from('expenses').insert(payload);
      if (error) {
        toast({ title: 'Erro ao registrar despesa', description: error.message, variant: 'destructive' });
        setSaving(false);
        return;
      }
      toast({ title: 'Despesa registrada!' });
    }

    setModalOpen(false);
    fetchExpenses();
    setSaving(false);
  };

  const handleDelete = async (expense: Expense) => {
    if (expense.isExample) {
      setExpenses([]);
      return;
    }
    const { error } = await supabase.from('expenses').delete().eq('id', expense.id);
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Despesa excluída.' });
      fetchExpenses();
    }
  };

  const totalReal = expenses
    .filter(e => !e.isExample)
    .reduce((sum, e) => sum + e.amount, 0);

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Receipt className="h-7 w-7 text-violet-600" />
            Controle de Despesas
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {selectedPerson
              ? `Gastos com medicamentos, consultas e cuidados de ${selectedPerson.full_name}`
              : 'Selecione uma pessoa cuidada para ver as despesas'}
          </p>
        </div>
        <Button
          size="sm"
          className="bg-violet-600 hover:bg-violet-700 rounded-xl"
          onClick={openCreate}
          disabled={!selectedPerson}
        >
          <Plus className="h-4 w-4 mr-2" /> Nova Despesa
        </Button>
      </div>

      {/* Summary Card */}
      {!loading && expenses.filter(e => !e.isExample).length > 0 && (
        <Card className="rounded-2xl border-violet-100 dark:border-violet-900/40 bg-violet-50 dark:bg-violet-950/20">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Total Registrado</p>
                <p className="text-2xl font-bold text-violet-800 dark:text-violet-200">{formatCurrency(totalReal)}</p>
              </div>
            </div>
            <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">
              {expenses.filter(e => !e.isExample).length} lançamento(s)
            </p>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      <Card className="rounded-2xl border-stone-200 dark:border-stone-800">
        <CardHeader>
          <CardTitle className="text-lg dark:text-stone-100">Lançamentos</CardTitle>
          <CardDescription>Histórico de despesas e gastos com cuidado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-violet-600 border-t-transparent rounded-full" />
            </div>
          ) : !selectedPerson ? (
            <div className="py-12 text-center text-stone-400">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Selecione uma pessoa cuidada no menu lateral.</p>
            </div>
          ) : expenses.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm mb-3">Nenhuma despesa registrada ainda.</p>
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 rounded-xl" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" /> Registrar Primeira Despesa
              </Button>
            </div>
          ) : (
            expenses.map((expense) => (
              <div
                key={expense.id}
                className={cn(
                  'p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                  expense.isExample
                    ? 'border-dashed border-stone-300 dark:border-stone-600 bg-stone-50/60 dark:bg-stone-800/40'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-violet-200 shadow-2xs'
                )}
              >
                <div className="flex items-start gap-3 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-950/40 border border-violet-100 dark:border-violet-900 flex items-center justify-center text-xl flex-shrink-0">
                    💰
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{expense.description}</h4>
                      <Badge className={cn('text-[11px] border', CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other)}>
                        {CATEGORY_LABELS[expense.category] || expense.category}
                      </Badge>
                      {expense.isExample && (
                        <Badge variant="outline" className="text-stone-400 border-stone-300 text-[10px] px-1.5">
                          Exemplo — edite ou exclua
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
                      <span>{new Date(expense.date).toLocaleDateString('pt-BR')}</span>
                      {expense.paid_by && <span>Pago por: <span className="font-medium">{expense.paid_by}</span></span>}
                    </div>
                    {expense.notes && (
                      <p className="text-xs text-stone-500 bg-stone-50 dark:bg-stone-800 p-1.5 rounded-md">{expense.notes}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <span className="text-base font-bold text-stone-900 dark:text-stone-100">
                    {formatCurrency(expense.amount)}
                  </span>
                  <button
                    onClick={() => openEdit(expense)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(expense)}
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
        <DialogContent className="sm:max-w-[480px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editExpense && !editExpense.isExample ? 'Editar Despesa' : 'Registrar Nova Despesa'}</DialogTitle>
              <DialogDescription>
                Registre gastos com medicamentos, consultas, cuidadores e insumos.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(val) => setForm(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger id="category"><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Valor (R\$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Input
                  id="description"
                  required
                  placeholder="Ex: Losartana 50mg, Consulta cardiologista"
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paid_by">Quem pagou</Label>
                  <Input
                    id="paid_by"
                    placeholder="Ex: João (filho)"
                    value={form.paid_by}
                    onChange={(e) => setForm(prev => ({ ...prev, paid_by: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input
                  id="notes"
                  placeholder="Nota fiscal, farmácia, convênio, etc."
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-violet-600 hover:bg-violet-700" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Despesa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
