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
  ShieldCheck,
  Home,
  Bath,
  Bed,
  Footprints,
  CookingPot,
  Sofa,
  Layers,
  Trees,
  Plus,
  CheckCircle2,
  Clock,
  Wrench,
  AlertTriangle,
  Trash2,
  UserCheck,
  DollarSign,
  Calendar,
  Sparkles,
  PhoneCall,
  CheckCheck
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface HomeSafetyItem {
  id: string;
  organization_id: string;
  cared_person_id: string;
  area_name: string;
  item_description: string;
  status: 'identified' | 'in_progress' | 'completed' | 'verified';
  responsible_name: string | null;
  due_date: string | null;
  estimated_cost: number | null;
  notes: string | null;
  created_at: string;
}

const AREAS = [
  { id: 'all', name: 'Todas as Áreas', icon: Home },
  { id: 'Banheiro', name: 'Banheiro', icon: Bath },
  { id: 'Quarto', name: 'Quarto', icon: Bed },
  { id: 'Corredor', name: 'Corredor & Passagens', icon: Footprints },
  { id: 'Cozinha', name: 'Cozinha', icon: CookingPot },
  { id: 'Sala', name: 'Sala de Estar', icon: Sofa },
  { id: 'Escada', name: 'Escadas & Desníveis', icon: Layers },
  { id: 'Área Externa', name: 'Entrada & Jardim', icon: Trees },
  { id: 'Geral', name: 'Geral da Residência', icon: Home },
];

const PRESET_ADAPTATIONS: Record<string, string[]> = {
  Banheiro: [
    'Barras de apoio fixas no box e ao lado do vaso sanitário',
    'Tapete de sucção emborrachado / piso antiderrapante',
    'Cadeira ou banco articulado e firme para banho',
    'Iluminação adequada e interruptor de fácil alcance',
    'Elevação de assento sanitário se necessário'
  ],
  Quarto: [
    'Luz noturna com sensor de movimento no caminho do banheiro',
    'Retirada de tapetes soltos ou fita antiderrapante em toda a borda',
    'Cama em altura segura com apoio para os pés no chão ao sentar',
    'Desobstrução do caminho entre cama e porta',
    'Telefone ou campainha de fácil alcance na cabeceira'
  ],
  Corredor: [
    'Iluminação clara e contínua sem pontos escuros',
    'Eliminação de fios soltos ou extensões no piso',
    'Corrimão ou barra de apoio lateral se houver desnível'
  ],
  Cozinha: [
    'Itens de uso diário guardados entre altura da cintura e ombro',
    'Piso seco e antiderrapante sem tapetes soltos',
    'Válvula de corte de gás acessível e segura'
  ],
  Escada: [
    'Corrimão firme em ambos os lados',
    'Fita antiderrapante e contrastante no bordo dos degraus',
    'Interruptores de luz no topo e na base da escada'
  ],
  Geral: [
    'Revisão periódica de trancas e fechaduras (abertura externa de emergência)',
    'Manutenção preventiva da rede elétrica e disjuntores',
    'Ventilação e conforto térmico adequados'
  ]
};

export default function HomeSafetyPage() {
  const { currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const supabase = createClient() as any;

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<HomeSafetyItem[]>([]);
  const [selectedArea, setSelectedArea] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    area_name: 'Banheiro',
    item_description: '',
    status: 'identified' as 'identified' | 'in_progress' | 'completed' | 'verified',
    responsible_name: '',
    due_date: '',
    estimated_cost: 0,
    notes: '',
  });

  const fetchItems = useCallback(async () => {
    if (!currentOrganizationId || !selectedPerson?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('home_safety_items')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .eq('cared_person_id', selectedPerson.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching home safety items:', error);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error('Exception fetching home safety:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, selectedPerson?.id, supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId || !selectedPerson?.id || !form.item_description.trim()) return;

    setSaving(true);
    try {
      const payload = {
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        area_name: form.area_name,
        item_description: form.item_description.trim(),
        status: form.status,
        responsible_name: form.responsible_name.trim() || null,
        due_date: form.due_date || null,
        estimated_cost: Number(form.estimated_cost) || 0,
        notes: form.notes.trim() || null,
      };

      const { data, error } = await supabase
        .from('home_safety_items')
        .insert(payload)
        .select()
        .single();

      if (error) {
        alert('Erro ao salvar item de adaptação.');
        console.error(error);
      } else if (data) {
        setItems([data, ...items]);
        setModalOpen(false);
        setForm({
          area_name: 'Banheiro',
          item_description: '',
          status: 'identified',
          responsible_name: '',
          due_date: '',
          estimated_cost: 0,
          notes: '',
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateStatus = async (item: HomeSafetyItem, newStatus: 'identified' | 'in_progress' | 'completed' | 'verified') => {
    try {
      const { error } = await supabase
        .from('home_safety_items')
        .update({ status: newStatus })
        .eq('id', item.id);

      if (!error) {
        setItems(items.map(i => i.id === item.id ? { ...i, status: newStatus } : i));
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Deseja excluir este item de adaptação/manutenção?')) return;
    try {
      const { error } = await supabase
        .from('home_safety_items')
        .delete()
        .eq('id', id);

      if (!error) {
        setItems(items.filter(i => i.id !== id));
      }
    } catch (err) {
      console.error('Error deleting item:', err);
    }
  };

  const handleSelectPreset = (desc: string, area: string) => {
    setForm(prev => ({
      ...prev,
      area_name: area,
      item_description: desc
    }));
    setModalOpen(true);
  };

  const filteredItems = items.filter(item => {
    const matchesArea = selectedArea === 'all' || item.area_name.toLowerCase() === selectedArea.toLowerCase();
    const matchesStatus = selectedStatus === 'all' || item.status === selectedStatus;
    return matchesArea && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'identified':
        return <Badge variant="outline" className="border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40 font-bold">Identificado</Badge>;
      case 'in_progress':
        return <Badge variant="outline" className="border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40 font-bold">Em Andamento</Badge>;
      case 'completed':
        return <Badge variant="outline" className="border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 font-bold">Concluído</Badge>;
      case 'verified':
        return <Badge variant="outline" className="border-indigo-500 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 font-bold">Verificado em Uso</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
                Casa, Segurança e Adaptações
              </h1>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                Organização do lar, adaptações preventivas de acessibilidade e manutenções para {selectedPerson?.full_name || 'a pessoa cuidada'}.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={() => {
            setForm({
              area_name: selectedArea !== 'all' ? selectedArea : 'Banheiro',
              item_description: '',
              status: 'identified',
              responsible_name: '',
              due_date: '',
              estimated_cost: 0,
              notes: '',
            });
            setModalOpen(true);
          }}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold h-11 px-5 rounded-xl shadow-xs flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Adicionar Adaptação ou Reparo
        </Button>
      </div>

      {/* ETHICAL DISCLAIMER BANNER */}
      <div className="p-4 rounded-2xl bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 flex items-start gap-3">
        <Home className="h-5 w-5 text-teal-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-bold text-stone-800 dark:text-stone-200">
            Registro organizado de apoio residencial e prevenção de barreiras
          </p>
          <p>
            As anotações e checklists aqui registrados refletem observações da família e recomendações informadas por profissionais (como fisioterapeutas ou terapeutas ocupacionais). Este módulo não emite certificação de segurança estrutural nem substitui vistorias especializadas.
          </p>
        </div>
      </div>

      {/* METRICS SUMMARY */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Total de Itens</p>
            <p className="text-2xl font-black text-stone-900 dark:text-stone-100 mt-1">{items.length}</p>
          </CardContent>
        </Card>
        <Card className="border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Identificados</p>
            <p className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
              {items.filter(i => i.status === 'identified').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Em Andamento</p>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-400 mt-1">
              {items.filter(i => i.status === 'in_progress').length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-stone-200 dark:border-stone-800 shadow-xs">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Concluídos / Verificados</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
              {items.filter(i => i.status === 'completed' || i.status === 'verified').length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* AREA SELECTOR BUTTONS */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase text-stone-500 tracking-wider">Filtrar por Cômodo / Ambiente</Label>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {AREAS.map(area => {
            const Icon = area.icon;
            const count = area.id === 'all'
              ? items.length
              : items.filter(i => i.area_name.toLowerCase() === area.id.toLowerCase()).length;
            const isSelected = selectedArea.toLowerCase() === area.id.toLowerCase();

            return (
              <button
                key={area.id}
                onClick={() => setSelectedArea(area.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition-all shrink-0 ${
                  isSelected
                    ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                    : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:border-teal-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{area.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-stone-100 dark:bg-stone-800 text-stone-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LIST OF ADAPTATIONS & REPAIRS (2 COLS) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
              Registros da Residência ({filteredItems.length})
            </h2>

            {/* STATUS FILTER */}
            <div className="flex items-center gap-2">
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger className="h-8 text-xs w-[140px] rounded-lg">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="identified">Identificado</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="verified">Verificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="py-16 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-teal-600 border-t-transparent rounded-full" />
            </div>
          ) : filteredItems.length === 0 ? (
            <Card className="border-dashed border-2 border-stone-200 dark:border-stone-800 p-8 text-center bg-stone-50/50 dark:bg-stone-900/50">
              <div className="max-w-sm mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 flex items-center justify-center mx-auto">
                  <Home className="h-6 w-6" />
                </div>
                <h3 className="text-base font-bold text-stone-800 dark:text-stone-200">
                  Sem registros recentes
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400">
                  Nenhuma adaptação, reparo ou observação registrada para este filtro. Você pode adicionar um item ou usar as sugestões preventivas ao lado.
                </p>
                <Button
                  onClick={() => setModalOpen(true)}
                  variant="outline"
                  className="rounded-xl text-xs font-bold"
                >
                  <Plus className="h-4 w-4 mr-1" /> Criar Primeiro Registro
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredItems.map(item => (
                <Card key={item.id} className="border-stone-200 dark:border-stone-800 hover:border-teal-300 dark:hover:border-teal-700 transition-all shadow-xs">
                  <CardContent className="p-4 sm:p-5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
                            {item.area_name}
                          </span>
                          {getStatusBadge(item.status)}
                        </div>
                        <h3 className="text-base font-black text-stone-900 dark:text-stone-100 leading-snug">
                          {item.item_description}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5 self-end sm:self-start">
                        {item.status !== 'completed' && item.status !== 'verified' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(item, 'completed')}
                            className="h-8 text-xs font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 rounded-lg gap-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Marcar Concluído
                          </Button>
                        ) : item.status === 'completed' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUpdateStatus(item, 'verified')}
                            className="h-8 text-xs font-bold border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-lg gap-1"
                          >
                            <CheckCheck className="h-3.5 w-3.5" />
                            Confirmar em Uso
                          </Button>
                        ) : null}

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-8 w-8 text-stone-400 hover:text-rose-600 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* METADATA: RESPONSIBLE, DATE, COST */}
                    <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-stone-500 pt-2 border-t border-stone-100 dark:border-stone-800">
                      {item.responsible_name && (
                        <div className="flex items-center gap-1">
                          <UserCheck className="h-3.5 w-3.5 text-teal-600" />
                          <span>Responsável: <strong className="text-stone-700 dark:text-stone-300">{item.responsible_name}</strong></span>
                        </div>
                      )}
                      {item.due_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-stone-400" />
                          <span>Previsão: {format(new Date(item.due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
                        </div>
                      )}
                      {item.estimated_cost && item.estimated_cost > 0 ? (
                        <div className="flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-400">
                          <DollarSign className="h-3.5 w-3.5" />
                          <span>Custo: R$ {Number(item.estimated_cost).toFixed(2)}</span>
                        </div>
                      ) : null}
                    </div>

                    {item.notes && (
                      <p className="text-xs text-stone-600 dark:text-stone-400 bg-stone-50 dark:bg-stone-900 p-2.5 rounded-xl border border-stone-100 dark:border-stone-800">
                        {item.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* SIDEBAR: PREVENTIVE SUGGESTIONS & GUIDELINES (1 COL) */}
        <div className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-xs">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <CardTitle className="text-sm font-bold">Sugestões de Boas Práticas</CardTitle>
              </div>
              <CardDescription className="text-xs">
                Adaptações recomendadas para conforto e prevenção no dia a dia.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              {Object.entries(PRESET_ADAPTATIONS).slice(0, 3).map(([area, presetList]) => (
                <div key={area} className="space-y-2">
                  <p className="font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between">
                    <span>{area}</span>
                  </p>
                  <div className="space-y-1.5">
                    {presetList.slice(0, 2).map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectPreset(preset, area)}
                        className="w-full text-left p-2 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 hover:border-teal-400 transition-colors flex items-center justify-between gap-2 group"
                      >
                        <span className="text-[11px] text-stone-600 dark:text-stone-400 leading-tight">
                          {preset}
                        </span>
                        <Plus className="h-3.5 w-3.5 text-teal-600 opacity-60 group-hover:opacity-100 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-800 shadow-xs bg-teal-50/40 dark:bg-teal-950/20">
            <CardContent className="p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 font-bold text-teal-800 dark:text-teal-300">
                <Wrench className="h-4 w-4" />
                <span>Prestadores de Confiança</span>
              </div>
              <p className="text-stone-600 dark:text-stone-400 leading-relaxed">
                Mantenha no cadastro os contatos dos prestadores (eletricista, marceneiro, chaveiro) de confiança da sua família, sem taxas ou intermediações comerciais.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* MODAL: ADICIONAR ITEM */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-stone-900 dark:text-stone-100">
              Registrar Adaptação ou Reparo
            </DialogTitle>
            <DialogDescription className="text-xs">
              Cadastre uma manutenção, melhoria de acessibilidade ou prevenção para o ambiente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateItem} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Cômodo / Área</Label>
              <Select
                value={form.area_name}
                onValueChange={(val) => setForm({ ...form, area_name: val })}
              >
                <SelectTrigger className="h-10 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS.filter(a => a.id !== 'all').map(a => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Descrição da Adaptação ou Tarefa *</Label>
              <Input
                required
                value={form.item_description}
                onChange={(e) => setForm({ ...form, item_description: e.target.value })}
                placeholder="Ex: Instalar barra de apoio lateral no box"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Responsável / Prestador</Label>
                <Input
                  value={form.responsible_name}
                  onChange={(e) => setForm({ ...form, responsible_name: e.target.value })}
                  placeholder="Ex: Filho João ou Marceneiro"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Status Inicial</Label>
                <Select
                  value={form.status}
                  onValueChange={(val: any) => setForm({ ...form, status: val })}
                >
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="identified">Identificado</SelectItem>
                    <SelectItem value="in_progress">Em Andamento</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="verified">Verificado em Uso</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Data Prevista</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Custo Estimado (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.estimated_cost || ''}
                  onChange={(e) => setForm({ ...form, estimated_cost: parseFloat(e.target.value) || 0 })}
                  placeholder="0,00"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Anotações / Instruções</Label>
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Ex: Verificar parafusos em inox adequados para alvenaria."
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="text-xs rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving || !form.item_description.trim()}
                className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl"
              >
                {saving ? 'Salvando...' : 'Salvar Adaptação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
