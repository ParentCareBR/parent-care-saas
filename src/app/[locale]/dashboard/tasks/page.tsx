'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
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
import { CheckSquare, Plus, Check, Calendar, AlertTriangle, Filter, Trash2, RefreshCw, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import RecurrenceSelector, { RecurrenceConfig, recurrenceLabel } from '@/components/ui/RecurrenceSelector';
import { getAlarmTexts } from '@/lib/i18n/care-translations';

interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: 'pending' | 'in_progress' | 'done' | 'completed' | 'canceled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string | null;
  created_at: string;
}

export default function TasksPage() {
  const params = useParams();
  const currentLocale = (params?.locale as string) || 'pt-BR';
  const tAlarm = getAlarmTexts(currentLocale);
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    due_date: '',
  });

  const [recurrence, setRecurrence] = useState<RecurrenceConfig>({ type: 'none' });
  const [alarm, setAlarm] = useState<string>('15m');

  const fetchTasks = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erro ao buscar tarefas:', error);
    } else if (data) {
      setTasks(data);
    }
    setLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
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

    const { error } = await supabase
      .from('tasks')
      .insert({
        cared_person_id: selectedPerson.id,
        organization_id: currentOrganizationId,
        title: form.title,
        description: (form.description || '') + recurrenceSuffix + alarmSuffix || null,
        priority: form.priority,
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        status: 'pending',
        created_by: user.id,
      });

    if (error) {
      toast({ title: 'Erro ao criar tarefa', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Tarefa criada!', description: 'A tarefa foi adicionada à lista da família.' });
      setModalOpen(false);
      setForm({ title: '', description: '', priority: 'medium', due_date: '' });
      setRecurrence({ type: 'none' });
      setAlarm('15m');
      fetchTasks();
    }
    setSaving(false);
  };

  const isDone = (status: string) => status === 'done' || status === 'completed';

  const toggleTaskStatus = async (task: Task) => {
    const currentlyDone = isDone(task.status);
    const newStatus = currentlyDone ? 'pending' : 'done';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));

    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: newStatus,
        completed_at: newStatus === 'done' ? new Date().toISOString() : null,
      })
      .eq('id', task.id);

    if (error) {
      toast({ title: 'Erro ao atualizar tarefa', description: error.message, variant: 'destructive' });
      fetchTasks();
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (filter === 'pending') return !isDone(t.status);
    if (filter === 'completed') return isDone(t.status);
    return true;
  });

  const completedCount = tasks.filter(t => isDone(t.status)).length;
  const progressPercent = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
      case 'high':
        return <Badge variant="secondary" className="bg-rose-50 text-rose-700 text-xs">Alta Prioridade</Badge>;
      case 'low':
        return <Badge variant="secondary" className="bg-stone-100 text-stone-600 text-xs">Baixa</Badge>;
      default:
        return <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">Média</Badge>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <CheckSquare className="h-7 w-7 text-indigo-600" />
            Divisão de Tarefas da Família
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            {selectedPerson 
              ? `Organize as tarefas de compras, cuidados e transporte para ${selectedPerson.full_name}`
              : 'Selecione uma pessoa cuidada para ver as tarefas'}
          </p>
        </div>

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Nova Tarefa
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px]">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Adicionar Tarefa de Cuidado</DialogTitle>
                <DialogDescription>
                  Distribua as tarefas da rotina entre os membros da família.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Título da Tarefa *</Label>
                  <Input 
                    id="title" 
                    required
                    placeholder="Ex: Comprar fraldas, Buscar receita médica"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="desc">Detalhes / Instruções</Label>
                  <Input 
                    id="desc" 
                    placeholder="Ex: Farmácia da esquina aceita convênio"
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select 
                      value={form.priority} 
                      onValueChange={(val) => setForm(prev => ({ ...prev, priority: val }))}
                    >
                      <SelectTrigger id="priority">
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="medium">Média</SelectItem>
                        <SelectItem value="high">Alta / Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="due">Data Limite</Label>
                    <Input 
                      id="due" 
                      type="date"
                      value={form.due_date}
                      onChange={(e) => setForm(prev => ({ ...prev, due_date: e.target.value }))}
                    />
                  </div>
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
                <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar Tarefa'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Progress Bar Card */}
      {tasks.length > 0 && (
        <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="font-semibold text-stone-800 dark:text-stone-200">Progresso Geral</span>
            <span className="text-stone-500 dark:text-stone-400 font-medium">{completedCount} de {tasks.length} concluídas ({progressPercent}%)</span>
          </div>
          <div className="w-full bg-stone-100 dark:bg-stone-800 h-3 rounded-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-full rounded-full transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors",
            filter === 'all' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
          )}
        >
          Todas ({tasks.length})
        </button>
        <button
          onClick={() => setFilter('pending')}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors",
            filter === 'pending' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
          )}
        >
          Pendentes ({tasks.filter(t => !isDone(t.status)).length})
        </button>
        <button
          onClick={() => setFilter('completed')}
          className={cn(
            "px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors",
            filter === 'completed' 
              ? 'bg-indigo-600 text-white' 
              : 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
          )}
        >
          Concluídas ({completedCount})
        </button>
      </div>

      {/* Task List */}
      <Card className="rounded-2xl border-stone-200">
        <CardContent className="p-6">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const isCompleted = isDone(task.status);
                const recMatch = task.description?.match(/\[(?:Recorrência|Recurrence|Wiederholung):\s*(.+?)\]/i);
                const alarmMatch = task.description?.match(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/i);
                const cleanDesc = task.description
                  ?.replace(/\[(?:Recorrência|Recurrence|Wiederholung):\s*(.+?)\]/gi, '')
                  ?.replace(/\[(?:Alarme|Alarm|Wecker):\s*(.+?)\]/gi, '')
                  .trim();

                return (
                  <div 
                    key={task.id}
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-200 flex items-start justify-between gap-4",
                      isCompleted 
                        ? "bg-stone-50/60 dark:bg-stone-800/40 border-stone-200/60 dark:border-stone-700/60 opacity-80" 
                        : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-indigo-200 shadow-2xs"
                    )}
                  >
                    <div className="flex items-start gap-3.5 flex-1">
                      <button
                        onClick={() => toggleTaskStatus(task)}
                        className={cn(
                          "mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors flex-shrink-0",
                          isCompleted ? "bg-emerald-500 border-emerald-500 text-white" : "border-stone-300 dark:border-stone-600 hover:border-indigo-500 bg-white dark:bg-stone-800"
                        )}
                      >
                        {isCompleted && <Check className="h-4 w-4 stroke-[3]" />}
                      </button>

                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className={cn("font-semibold text-sm", isCompleted ? "line-through text-stone-400" : "text-stone-900")}>
                            {task.title}
                          </h4>
                          {getPriorityBadge(task.priority)}
                          {recMatch && (
                            <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium">
                              <RefreshCw className="h-2.5 w-2.5" />
                              {recMatch[1]}
                            </Badge>
                          )}
                          {alarmMatch && (
                            <Badge variant="outline" className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium">
                              <BellRing className="h-2.5 w-2.5" />
                              {alarmMatch[1]}
                            </Badge>
                          )}
                        </div>

                        {cleanDesc && (
                          <p className={cn("text-xs leading-relaxed", isCompleted ? "text-stone-400 line-through" : "text-stone-600")}>
                            {cleanDesc}
                          </p>
                        )}

                        {task.due_date && (
                          <span className="inline-flex items-center gap-1 text-[11px] text-stone-400 font-medium">
                            <Calendar className="h-3 w-3" />
                            Prazo: {new Date(task.due_date).toLocaleDateString(currentLocale === 'en' ? 'en-US' : currentLocale)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400">
              <CheckSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhuma tarefa encontrada neste filtro.</p>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setModalOpen(true)}
                className="mt-3 text-indigo-600 border-indigo-200"
              >
                + Adicionar a Primeira Tarefa
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
