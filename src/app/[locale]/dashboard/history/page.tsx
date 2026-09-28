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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Droplet, Pill, Calendar, Heart, AlertTriangle, Filter, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HistoryItem {
  id: string;
  type: 'medication' | 'hydration' | 'note' | 'appointment';
  title: string;
  description?: string;
  timestamp: string;
  author_name?: string;
  category?: string;
}

export default function HistoryPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filterType, setFilterType] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [noteOpen, setNoteOpen] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const [noteForm, setNoteForm] = useState({
    category: 'observation',
    content: '',
  });

  const fetchHistory = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    const events: HistoryItem[] = [];

    // 1. Fetch Care Notes
    const { data: notesData } = await supabase
      .from('care_notes')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('created_at', { ascending: false })
      .limit(30);

    if (notesData) {
      notesData.forEach((n: any) => {
        events.push({
          id: n.id,
          type: 'note',
          title: n.type === 'incident' ? 'Incidente / Alerta' : 'Anotação de Cuidado',
          description: n.content,
          timestamp: n.created_at,
          category: n.type,
        });
      });
    }

    // 2. Fetch Hydration
    const { data: hydrationData } = await supabase
      .from('hydration_logs')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('logged_at', { ascending: false })
      .limit(20);

    if (hydrationData) {
      hydrationData.forEach((h: any) => {
        events.push({
          id: h.id,
          type: 'hydration',
          title: `Hidratação: ${h.amount_ml || 250}ml ingeridos`,
          description: 'Registro de ingestão de água',
          timestamp: h.logged_at,
        });
      });
    }

    // 3. Fetch Appointments
    const { data: apptData } = await supabase
      .from('appointments')
      .select('*')
      .eq('cared_person_id', selectedPerson.id)
      .order('starts_at', { ascending: false })
      .limit(20);

    if (apptData) {
      apptData.forEach((a: any) => {
        events.push({
          id: a.id,
          type: 'appointment',
          title: `Consulta: ${a.title}`,
          description: `${a.doctor_name || 'Médico'} • ${a.specialty || 'Clínica'}`,
          timestamp: a.starts_at || a.created_at,
        });
      });
    }

    // Sort all events descending by timestamp
    events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setItems(events);
    setLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !user) return;
    setSavingNote(true);

    const { error } = await supabase
      .from('care_notes')
      .insert({
        cared_person_id: selectedPerson.id,
        organization_id: currentOrganizationId,
        author_id: user.id,
        content: noteForm.content,
        type: noteForm.category,
      });

    if (error) {
      toast({ title: 'Erro ao salvar anotação', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Anotação salva!', description: 'O registro foi adicionado à timeline clínica.' });
      setNoteOpen(false);
      setNoteForm({ category: 'observation', content: '' });
      fetchHistory();
    }
    setSavingNote(false);
  };

  const filteredItems = items.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  const getEventIcon = (type: string, category?: string) => {
    switch (type) {
      case 'medication':
        return <Pill className="h-5 w-5 text-emerald-600" />;
      case 'hydration':
        return <Droplet className="h-5 w-5 text-blue-500 fill-blue-500" />;
      case 'appointment':
        return <Calendar className="h-5 w-5 text-indigo-600" />;
      default:
        return category === 'incident' 
          ? <AlertTriangle className="h-5 w-5 text-rose-500" />
          : <FileText className="h-5 w-5 text-amber-600" />;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-[#F8FAFC] flex items-center gap-2.5">
            <FileText className="h-7 w-7 text-emerald-500" />
            Histórico Clínico e Linha do Tempo
          </h1>
          <p className="text-stone-500 dark:text-slate-400 text-sm mt-1">
            {selectedPerson 
              ? `Linha cronológica de cuidados de ${selectedPerson.full_name}`
              : 'Selecione uma pessoa cuidada para ver o histórico'}
          </p>
        </div>

        <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
              <Plus className="h-4 w-4 mr-2" /> Nova Anotação Clínica
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[450px] dark:bg-[#101D2B] dark:border-[#172433] dark:text-[#F8FAFC]">
            <form onSubmit={handleAddNote}>
              <DialogHeader>
                <DialogTitle className="text-stone-900 dark:text-[#F8FAFC]">Registrar Anotação de Cuidado</DialogTitle>
                <DialogDescription className="text-stone-500 dark:text-slate-400">
                  Adicione observações diárias, sintomas, alterações de humor ou incidentes.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category" className="text-stone-700 dark:text-slate-300">Categoria do Registro</Label>
                  <Select 
                    value={noteForm.category} 
                    onValueChange={(val) => setNoteForm(prev => ({ ...prev, category: val }))}
                  >
                    <SelectTrigger id="category" className="dark:bg-[#172433] dark:border-[#23354d] dark:text-[#F8FAFC]">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-[#101D2B] dark:border-[#172433] dark:text-[#F8FAFC]">
                      <SelectItem value="observation">Observação Geral / Rotina</SelectItem>
                      <SelectItem value="health">Sintoma / Queixa de Saúde</SelectItem>
                      <SelectItem value="mood">Humor e Comportamento</SelectItem>
                      <SelectItem value="incident">Incidente / Queda / Alerta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content" className="text-stone-700 dark:text-slate-300">Descrição da Ocorrência *</Label>
                  <textarea 
                    id="content" 
                    rows={4}
                    required
                    placeholder="Descreva o que foi observado, medicamentos tomados fora de hora, pressão aferida, etc."
                    className="w-full rounded-md border border-stone-200 dark:border-[#23354d] dark:bg-[#172433] dark:text-[#F8FAFC] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={noteForm.content}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, content: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setNoteOpen(false)} className="dark:text-slate-300 dark:hover:bg-[#172433]">Cancelar</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={savingNote}>
                  {savingNote ? 'Salvando...' : 'Salvar Registro'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-semibold text-stone-400 dark:text-slate-400 uppercase tracking-wider mr-2 flex items-center gap-1">
          <Filter className="h-3.5 w-3.5" /> Filtrar:
        </span>
        {[
          { key: 'all', label: 'Todos' },
          { key: 'medication', label: 'Medicamentos' },
          { key: 'hydration', label: 'Hidratação' },
          { key: 'note', label: 'Anotações' },
          { key: 'appointment', label: 'Consultas' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilterType(f.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              filterType === f.key 
                ? 'bg-emerald-600 text-white shadow-xs' 
                : 'bg-white dark:bg-[#101D2B] border border-stone-200 dark:border-[#172433] text-stone-600 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-[#172433]'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Timeline Card */}
      <Card className="rounded-3xl border-stone-200 dark:border-[#172433] bg-white dark:bg-[#101D2B] shadow-xs">
        <CardContent className="p-6">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
            </div>
          ) : filteredItems.length > 0 ? (
            <div className="relative pl-6 space-y-6">
              {/* Connecting line */}
              <div className="absolute left-2.5 top-3 bottom-3 w-0.5 bg-stone-200 dark:bg-[#172433]" />

              {filteredItems.map((item) => (
                <div key={item.id} className="relative flex items-start gap-4">
                  {/* Bullet */}
                  <div className="absolute -left-6 mt-1 w-6 h-6 rounded-full bg-white dark:bg-[#08162A] border-2 border-emerald-500 flex items-center justify-center shadow-xs">
                    {getEventIcon(item.type, item.category)}
                  </div>

                  <div className="flex-1 bg-stone-50/70 dark:bg-[#172433] hover:bg-stone-100/80 dark:hover:bg-[#172433]/80 p-4 rounded-2xl border border-stone-100 dark:border-[#1e3046] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <h4 className="font-bold text-stone-900 dark:text-[#F8FAFC] text-sm">{item.title}</h4>
                      <span className="text-xs text-stone-400 dark:text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.timestamp).toLocaleString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    {item.description && (
                      <p className="text-stone-600 dark:text-slate-300 text-sm mt-1 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 dark:text-slate-500">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum evento registrado nesta categoria.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
