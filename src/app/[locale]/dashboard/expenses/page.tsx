'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
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
import {
  Receipt, Plus, Pencil, Trash2, TrendingUp,
  Wallet, Landmark, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, DollarSign, Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { getFinanceTexts } from '@/lib/i18n/care-translations';

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

interface FinancialProfile {
  monthly_income: number;
  income_source: string;
  income_day: number;
  notes: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  medication: 'Medicamentos',
  appointment: 'Consultas e Exames',
  caregiver: 'Cuidador / Acompanhante',
  food: 'Alimentação / Mercado',
  equipment: 'Equipamentos e Insumos',
  transport: 'Transporte',
  housing: 'Contas da Casa',
  other: 'Outros',
};

const CATEGORY_COLORS: Record<string, string> = {
  medication: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  appointment: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  caregiver: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  food: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
  equipment: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  transport: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  housing: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  other: 'bg-stone-100 text-stone-600 border-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
};

export default function ExpensesPage() {
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'pt-BR';
  const tFin = getFinanceTexts(currentLocale);

  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const { toast } = useToast();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);

  // Month filtering state (e.g. "2026-09")
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Financial Profile & Summary state
  const [profile, setProfile] = useState<FinancialProfile>({
    monthly_income: 0,
    income_source: 'Aposentadoria INSS',
    income_day: 5,
    notes: '',
  });

  const [summary, setSummary] = useState({
    monthlyIncome: 0,
    totalExpenses: 0,
    totalAllExpenses: 0,
    balance: 0,
    percentageUsed: 0,
    isOverBudget: false,
    currency: 'BRL',
  });

  // Pension setup modal state
  const [pensionModalOpen, setPensionModalOpen] = useState(false);
  const [savingPension, setSavingPension] = useState(false);
  const [pensionForm, setPensionForm] = useState({
    monthly_income: '',
    income_source: 'Aposentadoria INSS',
    income_day: '5',
    notes: '',
  });

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

    try {
      const res = await fetch(`/api/expenses?caredPersonId=${selectedPerson.id}&month=${selectedMonth}`, {
        cache: 'no-store',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setExpenses(Array.isArray(data.expenses) ? data.expenses : []);
        if (data.financialProfile) {
          setProfile(data.financialProfile);
          setPensionForm({
            monthly_income: data.financialProfile.monthly_income > 0 ? String(data.financialProfile.monthly_income) : '',
            income_source: data.financialProfile.income_source || 'Aposentadoria INSS',
            income_day: String(data.financialProfile.income_day || 5),
            notes: data.financialProfile.notes || '',
          });
        }
        if (data.summary) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar despesas e finanças:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedPerson, currentOrganizationId, selectedMonth]);

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
      date: (expense.date || new Date().toISOString()).slice(0, 10),
      paid_by: expense.paid_by || '',
      notes: expense.notes || '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
    setSaving(true);

    const isEdit = Boolean(editExpense && !editExpense.isExample);
    const url = '/api/expenses';
    const method = isEdit ? 'PUT' : 'POST';

    const payload = {
      id: editExpense?.id,
      caredPersonId: selectedPerson.id,
      category: form.category,
      description: form.description,
      amount: form.amount,
      date: form.date,
      paid_by: form.paid_by || null,
      notes: form.notes || null,
    };

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast({
          title: isEdit ? 'Despesa atualizada!' : 'Despesa registrada!',
          description: `${form.description} abatido do saldo do mês.`,
        });
        setModalOpen(false);
        await fetchExpenses();
      } else {
        toast({
          title: isEdit ? 'Erro ao atualizar' : 'Erro ao registrar despesa',
          description: data.error || 'Não foi possível salvar a despesa.',
          variant: 'destructive',
        });
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({
        title: 'Erro ao salvar despesa',
        description: err.message || 'Falha na conexão.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expense: Expense) => {
    try {
      const res = await fetch(`/api/expenses?id=${expense.id}&caredPersonId=${selectedPerson?.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast({ title: 'Despesa excluída e saldo recalculado.' });
        fetchExpenses();
      } else {
        toast({ title: 'Erro ao excluir', description: data.error, variant: 'destructive' });
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({ title: 'Erro ao excluir', description: err.message, variant: 'destructive' });
    }
  };

  const handleSavePension = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson) return;
    setSavingPension(true);

    try {
      const res = await fetch('/api/finances/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caredPersonId: selectedPerson.id,
          monthly_income: pensionForm.monthly_income,
          income_source: pensionForm.income_source,
          income_day: pensionForm.income_day,
          notes: pensionForm.notes,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        toast({
          title: tFin.incomeUpdated,
          description: `Renda configurada: R$ ${Number(data.profile.monthly_income).toFixed(2)} / mês`,
        });
        setPensionModalOpen(false);

        // Immediate reactive update
        const updatedProfile = data.profile;
        setProfile(updatedProfile);
        setPensionForm({
          monthly_income: updatedProfile.monthly_income > 0 ? String(updatedProfile.monthly_income) : '',
          income_source: updatedProfile.income_source || 'Aposentadoria INSS',
          income_day: String(updatedProfile.income_day || 5),
          notes: updatedProfile.notes || '',
        });

        const newIncome = Number(updatedProfile.monthly_income) || 0;
        setSummary((prev) => {
          const newBal = newIncome - prev.totalExpenses;
          const newPct = newIncome > 0 ? (prev.totalExpenses / newIncome) * 100 : 0;
          return {
            ...prev,
            monthlyIncome: newIncome,
            balance: newBal,
            percentageUsed: Number(newPct.toFixed(1)),
            isOverBudget: newIncome > 0 && prev.totalExpenses > newIncome,
          };
        });

        await fetchExpenses();
      } else {
        toast({
          title: 'Erro ao salvar renda',
          description: data.error || 'Tente novamente.',
          variant: 'destructive',
        });
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      toast({
        title: 'Erro ao salvar renda',
        description: err.message || 'Falha na conexão.',
        variant: 'destructive',
      });
    } finally {
      setSavingPension(false);
    }
  };

  const navigateMonth = (direction: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + direction, 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    setSelectedMonth(`${y}-${m}`);
  };

  const formatCurrency = (val: number) =>
    val.toLocaleString(currentLocale === 'en' ? 'en-US' : 'pt-BR', {
      style: 'currency',
      currency: summary.currency || 'BRL',
    });

  // Filtered expenses for selected month & live reactive calculations
  const monthlyExpenses = expenses.filter((e) => {
    const d = (e.date || '').slice(0, 7);
    return d === selectedMonth;
  });

  const totalMonthExpenses = monthlyExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const monthlyIncome = Number(profile.monthly_income) || Number(summary.monthlyIncome) || 0;
  const currentBalance = monthlyIncome - totalMonthExpenses;
  const percentageUsed = monthlyIncome > 0 ? Math.min((totalMonthExpenses / monthlyIncome) * 100, 100) : 0;
  const isOverBudget = monthlyIncome > 0 && totalMonthExpenses > monthlyIncome;

  // Format month name for display
  const monthDisplay = (() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString(currentLocale === 'en' ? 'en-US' : 'pt-BR', {
      month: 'long',
      year: 'numeric',
    });
  })();

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Wallet className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100">
                {tFin.title}
              </h1>
              <p className="text-stone-500 dark:text-stone-400 text-sm">
                {selectedPerson
                  ? `Recursos, aposentadoria e custos de ${selectedPerson.full_name}`
                  : 'Selecione uma pessoa cuidada para ver a gestão financeira'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 gap-1.5 font-bold"
            onClick={() => setPensionModalOpen(true)}
            disabled={!selectedPerson}
          >
            <Landmark className="h-4 w-4" /> {tFin.pensionConfig}
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 font-bold shadow-sm"
            onClick={openCreate}
            disabled={!selectedPerson}
          >
            <Plus className="h-4 w-4" /> {tFin.addExpense}
          </Button>
        </div>
      </div>

      {/* Month Selector Bar */}
      <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 sm:p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-emerald-600" />
            <span className="text-sm font-bold text-stone-700 dark:text-stone-300">
              Período de Análise:
            </span>
            <span className="text-base font-black text-stone-900 dark:text-stone-100 capitalize">
              {monthDisplay}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigateMonth(-1)}
              className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
              className="px-3 py-1 text-xs font-bold rounded-xl bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
            >
              Mês Atual
            </button>
            <button
              onClick={() => navigateMonth(1)}
              className="p-1.5 rounded-xl border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* 3 Top Financial Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Monthly Income Card */}
        <Card className="rounded-3xl border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                {tFin.monthlyIncome}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-emerald-950 dark:text-emerald-100 mt-1">
                {formatCurrency(monthlyIncome)}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                {profile.income_source} · Dia {profile.income_day}
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
              <Landmark className="h-5 w-5" />
            </div>
          </div>
          {monthlyIncome === 0 && (
            <button
              onClick={() => setPensionModalOpen(true)}
              className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300 underline block"
            >
              + Informar valor da aposentadoria
            </button>
          )}
        </Card>

        {/* Deducted Expenses Card */}
        <Card className="rounded-3xl border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 p-5 relative overflow-hidden">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                {tFin.monthlyExpenses}
              </p>
              <h3 className="text-2xl sm:text-3xl font-black text-amber-950 dark:text-amber-100 mt-1">
                {formatCurrency(totalMonthExpenses)}
              </h3>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                {monthlyExpenses.length} custo(s) lançados neste mês
              </p>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
        </Card>

        {/* Available Balance Card */}
        <Card
          className={cn(
            'rounded-3xl border-2 p-5 relative overflow-hidden transition-all',
            isOverBudget
              ? 'border-red-300 dark:border-red-800 bg-red-50/60 dark:bg-red-950/30'
              : 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'
          )}
        >
          <div className="flex items-start justify-between">
            <div>
              <p
                className={cn(
                  'text-xs font-bold uppercase tracking-wider',
                  isOverBudget
                    ? 'text-red-700 dark:text-red-400'
                    : 'text-blue-700 dark:text-blue-400'
                )}
              >
                {tFin.availableBalance}
              </p>
              <h3
                className={cn(
                  'text-2xl sm:text-3xl font-black mt-1',
                  isOverBudget
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-blue-950 dark:text-blue-100'
                )}
              >
                {formatCurrency(currentBalance)}
              </h3>
              <p
                className={cn(
                  'text-xs mt-1 font-semibold flex items-center gap-1',
                  isOverBudget
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-blue-600 dark:text-blue-400'
                )}
              >
                {isOverBudget ? (
                  <>
                    <AlertCircle className="h-3.5 w-3.5" />
                    {tFin.overBudget}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {monthlyIncome > 0
                      ? `${(100 - percentageUsed).toFixed(0)}% ${tFin.remaining}`
                      : 'Saldo disponível'}
                  </>
                )}
              </p>
            </div>
            <div
              className={cn(
                'w-10 h-10 rounded-2xl flex items-center justify-center shrink-0',
                isOverBudget
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
                  : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
              )}
            >
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Budget Progress Bar */}
      {monthlyIncome > 0 && (
        <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-bold text-stone-800 dark:text-stone-200">
              Consumo do Benefício no Mês
            </span>
            <span
              className={cn(
                'font-black text-sm',
                isOverBudget
                  ? 'text-red-600'
                  : percentageUsed > 80
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              )}
            >
              {percentageUsed.toFixed(1)}% {tFin.budgetUsed}
            </span>
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 h-3.5 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                isOverBudget
                  ? 'bg-red-600'
                  : percentageUsed > 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-500'
              )}
              style={{ width: `${Math.min(percentageUsed, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs text-stone-400 mt-2">
            <span>R$ 0,00</span>
            <span>Renda Base: {formatCurrency(monthlyIncome)}</span>
          </div>
        </Card>
      )}

      {/* Expenses List */}
      <Card className="rounded-2xl border-stone-200 dark:border-stone-800 shadow-xs">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-lg dark:text-stone-100">
              Custos e Gastos de {monthDisplay}
            </CardTitle>
            <CardDescription>
              Lançamentos abatidos automaticamente da aposentadoria/renda do idoso.
            </CardDescription>
          </div>
          <span className="text-xs font-bold text-stone-500 bg-stone-100 dark:bg-stone-800 px-3 py-1 rounded-full">
            {monthlyExpenses.length} item(ns)
          </span>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
          ) : !selectedPerson ? (
            <div className="py-12 text-center text-stone-400">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Selecione uma pessoa cuidada no menu lateral.</p>
            </div>
          ) : monthlyExpenses.length === 0 ? (
            <div className="py-12 text-center text-stone-400">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm mb-3">{tFin.noExpensesThisMonth}</p>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                onClick={openCreate}
              >
                <Plus className="h-4 w-4 mr-2" /> {tFin.addExpense}
              </Button>
            </div>
          ) : (
            monthlyExpenses.map((expense) => (
              <div
                key={expense.id}
                className={cn(
                  'p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors',
                  expense.isExample
                    ? 'border-dashed border-stone-300 dark:border-stone-600 bg-stone-50/60 dark:bg-stone-800/40'
                    : 'border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 hover:border-emerald-200 shadow-2xs'
                )}
              >
                <div className="flex items-start gap-3.5 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 flex items-center justify-center text-xl shrink-0">
                    💰
                  </div>
                  <div className="space-y-1 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                        {expense.description}
                      </h4>
                      <Badge className={cn('text-[11px] border', CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other)}>
                        {CATEGORY_LABELS[expense.category] || expense.category}
                      </Badge>
                    </div>
                    {expense.notes && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                        {expense.notes}
                      </p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-stone-400 mt-1">
                      <span>📅 {new Date(expense.date).toLocaleDateString(currentLocale === 'en' ? 'en-US' : 'pt-BR')}</span>
                      {expense.paid_by && <span>· Pago por: {expense.paid_by}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-center">
                  <span className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400">
                    -{formatCurrency(expense.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(expense)}
                      className="p-1.5 rounded-lg text-stone-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
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
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Pension Configuration Dialog */}
      <Dialog open={pensionModalOpen} onOpenChange={setPensionModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <form onSubmit={handleSavePension}>
            <DialogHeader>
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 flex items-center justify-center mb-2">
                <Landmark className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-black">
                {tFin.pensionConfig}
              </DialogTitle>
              <DialogDescription>
                Informe o valor mensal que o idoso recebe (aposentadoria, pensão ou outros recursos) para abater os gastos automaticamente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pensionAmount" className="text-sm font-bold">
                  {tFin.incomeAmount} *
                </Label>
                <Input
                  id="pensionAmount"
                  type="number"
                  step="0.01"
                  placeholder="Ex: 3500.00"
                  required
                  value={pensionForm.monthly_income}
                  onChange={(e) => setPensionForm(prev => ({ ...prev, monthly_income: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pensionSource" className="text-sm font-bold">
                  {tFin.incomeSource}
                </Label>
                <Input
                  id="pensionSource"
                  placeholder="Ex: Aposentadoria INSS, Pensão, Aluguel"
                  value={pensionForm.income_source}
                  onChange={(e) => setPensionForm(prev => ({ ...prev, income_source: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pensionDay" className="text-sm font-bold">
                  {tFin.incomeDay} (1 a 31)
                </Label>
                <Input
                  id="pensionDay"
                  type="number"
                  min="1"
                  max="31"
                  placeholder="Ex: 5"
                  value={pensionForm.income_day}
                  onChange={(e) => setPensionForm(prev => ({ ...prev, income_day: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pensionNotes" className="text-sm font-bold">
                  Observações
                </Label>
                <Input
                  id="pensionNotes"
                  placeholder="Ex: Depositado no Banco do Brasil"
                  value={pensionForm.notes}
                  onChange={(e) => setPensionForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setPensionModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={savingPension}
              >
                {savingPension ? 'Salvando...' : tFin.saveIncome}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* New / Edit Expense Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle className="text-xl font-black">
                {editExpense ? 'Editar Despesa' : tFin.addExpense}
              </DialogTitle>
              <DialogDescription>
                O valor será automaticamente abatido do saldo do idoso no mês da data informada.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-bold">Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(val) => setForm(prev => ({ ...prev, category: val }))}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-bold">Descrição *</Label>
                <Input
                  id="description"
                  placeholder="Ex: Caixa de remédio, Compra de mercado"
                  required
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-bold">Valor (R$) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    required
                    value={form.amount}
                    onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date" className="text-sm font-bold">Data *</Label>
                  <Input
                    id="date"
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => setForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid_by" className="text-sm font-bold">Quem pagou?</Label>
                <Input
                  id="paid_by"
                  placeholder="Ex: O próprio idoso, Maria (filha)"
                  value={form.paid_by}
                  onChange={(e) => setForm(prev => ({ ...prev, paid_by: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm font-bold">Observações</Label>
                <Input
                  id="notes"
                  placeholder="Ex: Farmácia São Paulo, pago no débito"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                disabled={saving}
              >
                {saving ? 'Salvando...' : tFin.saveExpense}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
