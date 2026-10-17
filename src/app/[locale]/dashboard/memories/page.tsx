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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Smile,
  Sparkles,
  BookOpen,
  Plus,
  CheckCircle2,
  Calendar,
  DollarSign,
  Heart,
  Users,
  Compass,
  Camera,
  Layers
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProjectMemoryItem {
  id: string;
  item_type: 'wish_project' | 'memory_story' | 'personal_goal';
  title: string;
  description: string | null;
  target_date: string | null;
  estimated_cost: number | null;
  supporters: string | null;
  steps_json: any[];
  status: 'dream' | 'active' | 'completed' | 'archived';
  created_at: string;
}

export default function ProjectsAndMemoriesPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const supabase = createClient() as any;

  const [activeTab, setActiveTab] = useState<'wishes' | 'stories'>('wishes');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProjectMemoryItem[]>([]);

  // Modal creation state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<{
    item_type: 'wish_project' | 'memory_story' | 'personal_goal';
    title: string;
    description: string;
    target_date: string;
    estimated_cost: number;
    supporters: string;
    status: 'dream' | 'active' | 'completed' | 'archived';
  }>({
    item_type: 'wish_project',
    title: '',
    description: '',
    target_date: '',
    estimated_cost: 0,
    supporters: '',
    status: 'active',
  });

  const fetchItems = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('life_projects_memories')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching memories/projects:', error);
        setItems([]);
      } else {
        setItems(data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !currentOrganizationId || !formData.title.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase.from('life_projects_memories').insert({
        organization_id: currentOrganizationId,
        cared_person_id: selectedPerson.id,
        item_type: formData.item_type,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        target_date: formData.target_date || null,
        estimated_cost: Number(formData.estimated_cost) || 0,
        supporters: formData.supporters.trim() || null,
        status: formData.status,
        created_by: user?.id || null,
      });

      if (error) {
        alert('Erro ao salvar: ' + error.message);
      } else {
        setCreateModalOpen(false);
        setFormData({
          item_type: 'wish_project',
          title: '',
          description: '',
          target_date: '',
          estimated_cost: 0,
          supporters: '',
          status: 'active',
        });
        fetchItems();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleComplete = async (item: ProjectMemoryItem) => {
    const nextStatus = item.status === 'completed' ? 'active' : 'completed';
    await supabase
      .from('life_projects_memories')
      .update({ status: nextStatus })
      .eq('id', item.id);
    fetchItems();
  };

  const wishes = items.filter(i => i.item_type === 'wish_project' || i.item_type === 'personal_goal');
  const stories = items.filter(i => i.item_type === 'memory_story');

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-[#101D2B] p-6 rounded-3xl border border-stone-200 dark:border-[#172433] shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <Smile className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-stone-900 dark:text-[#F8FAFC]">Projetos & Memórias</h1>
              <Badge className="bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 border-rose-200 text-xs font-bold">
                Vida & Significado
              </Badge>
            </div>
            <p className="text-sm text-stone-500 dark:text-slate-400 mt-1">
              {selectedPerson ? `Desejos, metas pessoais e relatos da história de vida de ${selectedPerson.full_name}` : 'Selecione uma pessoa cuidada'}
            </p>
          </div>
        </div>

        <Button
          onClick={() => {
            setFormData(prev => ({ ...prev, item_type: activeTab === 'wishes' ? 'wish_project' : 'memory_story' }));
            setCreateModalOpen(true);
          }}
          disabled={!selectedPerson}
          className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl px-5 flex items-center gap-2 shadow-xs transition active:scale-95 shrink-0"
        >
          <Plus className="h-5 w-5" /> {activeTab === 'wishes' ? 'Novo Desejo / Meta' : 'Nova Memória / História'}
        </Button>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-stone-200 dark:border-[#172433] pb-2">
        <button
          onClick={() => setActiveTab('wishes')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'wishes'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <Compass className="h-4 w-4" /> Lista &ldquo;Quero Fazer&rdquo; & Metas ({wishes.length})
        </button>

        <button
          onClick={() => setActiveTab('stories')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
            activeTab === 'stories'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-stone-500 hover:text-stone-900 dark:hover:text-white'
          }`}
        >
          <BookOpen className="h-4 w-4" /> Baú de Histórias & Memórias ({stories.length})
        </button>
      </div>

      {/* CONTEÚDO 1: QUERO FAZER */}
      {activeTab === 'wishes' && (
        <div>
          {loading ? (
            <div className="py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-rose-500 border-t-transparent rounded-full" /></div>
          ) : wishes.length === 0 ? (
            <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-[#172433] space-y-3">
              <p className="text-4xl">🌱</p>
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">Nenhum projeto ou desejo cadastrado</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Registre os sonhos da pessoa: viajar para a praia, aprender um instrumento, cultivar uma horta de temperos, ou rever um amigo querido de infância.
              </p>
              <Button onClick={() => setCreateModalOpen(true)} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-2xl text-xs">
                Cadastrar Primeiro Desejo
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishes.map(wish => {
                const isCompleted = wish.status === 'completed';
                return (
                  <div
                    key={wish.id}
                    className={`bg-white dark:bg-[#101D2B] p-5 rounded-3xl border shadow-xs space-y-3 flex flex-col justify-between transition ${
                      isCompleted ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20' : 'border-stone-200 dark:border-[#172433]'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-2xl">✨</span>
                        <button
                          onClick={() => handleToggleComplete(wish)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition ${
                            isCompleted
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : 'bg-stone-100 hover:bg-emerald-50 text-stone-600 border-stone-200'
                          }`}
                        >
                          {isCompleted ? '✓ Conquistado!' : 'Marcar Concluído'}
                        </button>
                      </div>

                      <h4 className={`font-extrabold text-base leading-snug ${isCompleted ? 'line-through text-stone-400' : 'text-stone-900 dark:text-white'}`}>
                        {wish.title}
                      </h4>

                      {wish.description && (
                        <p className="text-xs text-stone-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {wish.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-stone-100 dark:border-[#172433] text-xs text-stone-500">
                      {wish.supporters && (
                        <p className="flex items-center gap-1.5 text-stone-600 dark:text-slate-300">
                          <Users className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                          <span><strong>Apoio:</strong> {wish.supporters}</span>
                        </p>
                      )}

                      {wish.target_date && (
                        <p className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                          <span>Previsão: {new Date(wish.target_date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                        </p>
                      )}

                      {wish.estimated_cost && wish.estimated_cost > 0 && (
                        <p className="flex items-center gap-1.5 font-semibold text-emerald-600">
                          <DollarSign className="h-3.5 w-3.5 shrink-0" />
                          <span>Estimativa: R$ {wish.estimated_cost.toFixed(2)}</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONTEÚDO 2: HISTÓRIAS & MEMÓRIAS */}
      {activeTab === 'stories' && (
        <div>
          {loading ? (
            <div className="py-20 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>
          ) : stories.length === 0 ? (
            <div className="bg-white dark:bg-[#101D2B] rounded-3xl p-12 text-center border-2 border-dashed border-stone-200 dark:border-[#172433] space-y-3">
              <p className="text-4xl">📖</p>
              <h3 className="text-lg font-bold text-stone-800 dark:text-stone-200">Baú de Histórias vazio</h3>
              <p className="text-xs text-stone-500 max-w-md mx-auto">
                Registre histórias de juventude, memórias marcantes, receitas de família ou causos contados pelo idoso para preservar o legado familiar com carinho.
              </p>
              <Button onClick={() => setCreateModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs">
                Registrar Primeira História
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stories.map(story => (
                <div
                  key={story.id}
                  className="bg-white dark:bg-[#101D2B] p-6 rounded-3xl border border-stone-200 dark:border-[#172433] shadow-xs space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">📜</span>
                    <h4 className="font-extrabold text-base text-stone-900 dark:text-white">{story.title}</h4>
                  </div>
                  <p className="text-xs text-stone-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap bg-stone-50 dark:bg-[#172433] p-4 rounded-2xl font-serif text-[13px]">
                    &ldquo;{story.description}&rdquo;
                  </p>
                  <span className="text-[10px] text-stone-400 block text-right">
                    Registrado em {new Date(story.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CRIAÇÃO */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-stone-900 dark:text-white">
              {formData.item_type === 'wish_project' ? 'Novo Desejo / Projeto Pessoal' : 'Nova História de Vida'}
            </DialogTitle>
            <DialogDescription className="text-xs text-stone-500">
              Preservar autonomia, sonhos e memórias familiares
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Tipo</Label>
              <Select
                value={formData.item_type}
                onValueChange={(val) => setFormData({ ...formData, item_type: val as any })}
              >
                <SelectTrigger className="rounded-xl h-10"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wish_project">✨ Desejo / Lista &ldquo;Quero Fazer&rdquo;</SelectItem>
                  <SelectItem value="personal_goal">🎯 Meta Pessoal da Pessoa</SelectItem>
                  <SelectItem value="memory_story">📖 História de Vida / Memória</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Título *</Label>
              <Input
                required
                placeholder="Ex: Aprender piano, Viagem para Paraty, História de quando chegou em SP"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-xl h-10"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Descrição / Detalhes / Relato</Label>
              <textarea
                rows={4}
                placeholder="Descreva o desejo ou transcreva o relato exato com as palavras da pessoa..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {formData.item_type !== 'memory_story' && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Quem vai apoiar?</Label>
                  <Input
                    placeholder="Ex: Netos Lucas e Bia"
                    value={formData.supporters}
                    onChange={(e) => setFormData({ ...formData, supporters: e.target.value })}
                    className="rounded-xl h-10"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Estimativa de Custo (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0.00"
                    value={formData.estimated_cost}
                    onChange={(e) => setFormData({ ...formData, estimated_cost: Number(e.target.value) })}
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateModalOpen(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button type="submit" disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl px-5">
                {saving ? 'Salvando...' : 'Salvar no Perfil'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
