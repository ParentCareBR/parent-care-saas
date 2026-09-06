'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { MONITORING_CATALOG } from '@/lib/monitoring/catalog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  AlertCircle,
  ArrowRight,
  Check,
  Copy,
  History,
  Plus,
  Search,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Sliders,
  Sparkles,
} from 'lucide-react';

export default function MonitoringSettingsPage() {
  const { user } = useAuth();
  const { caredPeople, selectedPerson, setSelectedPersonId } = useCaredPerson();
  const { settings, customFields, isModuleEnabled, saveSettings, copyFrom, refetch } = useMonitoring();
  const { toast } = useToast();

  const [localCodes, setLocalCodes] = useState<Set<string>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Copy modal state
  const [copyModalOpen, setCopyModalOpen] = useState(false);
  const [sourcePersonId, setSourcePersonId] = useState<string>('');
  const [copying, setCopying] = useState(false);

  // Custom Field modal state
  const [customFieldModalOpen, setCustomFieldModalOpen] = useState(false);
  const [creatingField, setCreatingField] = useState(false);
  const [fieldForm, setFieldForm] = useState({
    label: '',
    description: '',
    fieldType: 'boolean',
    categoryId: '',
  });

  // Audit Logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

  // Sync settings when selected person changes
  useEffect(() => {
    const codes = new Set<string>();
    settings.forEach((s) => {
      const code = s.definition?.code || (s as any).monitoring_definitions?.code;
      if (s.enabled && code) {
        codes.add(code);
      }
    });
    setLocalCodes(codes);
    setDirty(false);
  }, [settings]);

  const handleToggle = (code: string) => {
    setLocalCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    if (!selectedPerson) return;
    setSaving(true);
    const success = await saveSettings(Array.from(localCodes));
    setSaving(false);
    if (success) {
      setDirty(false);
      toast({
        title: 'Acompanhamentos atualizados!',
        description: `As alterações para ${selectedPerson.full_name} foram salvas com sucesso.`,
      });
    } else {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível atualizar as configurações de acompanhamento.',
        variant: 'destructive',
      });
    }
  };

  const handleCopySubmit = async () => {
    if (!sourcePersonId || !selectedPerson) return;
    setCopying(true);
    const success = await copyFrom(sourcePersonId);
    setCopying(false);
    if (success) {
      setCopyModalOpen(false);
      setDirty(false);
      toast({
        title: 'Configurações copiadas!',
        description: 'Os acompanhamentos foram duplicados para este familiar.',
      });
    } else {
      toast({
        title: 'Erro ao copiar',
        description: 'Falha ao copiar configurações do familiar selecionado.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateCustomField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPerson || !fieldForm.label.trim()) return;

    setCreatingField(true);
    try {
      const res = await fetch('/api/monitoring/custom-fields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caredPersonId: selectedPerson.id,
          label: fieldForm.label,
          description: fieldForm.description,
          fieldType: fieldForm.fieldType,
          categoryId: fieldForm.categoryId || null,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast({
          title: 'Campo criado com sucesso!',
          description: `"${fieldForm.label}" foi adicionado aos acompanhamentos de ${selectedPerson.full_name}.`,
        });
        setCustomFieldModalOpen(false);
        setFieldForm({ label: '', description: '', fieldType: 'boolean', categoryId: '' });
        await refetch();
      } else {
        toast({
          title: 'Não permitido',
          description: data.error || 'Erro ao criar campo personalizado.',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Erro de conexão',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setCreatingField(false);
    }
  };

  const fetchAuditLogs = async () => {
    if (!selectedPerson) return;
    setLoadingAudit(true);
    try {
      const res = await fetch(`/api/monitoring/records?caredPersonId=${selectedPerson.id}&limit=20`);
      const data = await res.json();
      if (res.ok && data.success) {
        setAuditLogs(data.records || []);
      }
    } catch {
      // benign
    } finally {
      setLoadingAudit(false);
    }
  };

  const otherPeople = useMemo(() => {
    return caredPeople.filter((p) => p.id !== selectedPerson?.id);
  }, [caredPeople, selectedPerson]);

  const filteredCatalog = useMemo(() => {
    if (!searchFilter.trim()) return MONITORING_CATALOG;
    const term = searchFilter.toLowerCase();
    return MONITORING_CATALOG.map((cat) => ({
      ...cat,
      definitions: cat.definitions.filter(
        (d) => d.name.toLowerCase().includes(term) || d.description.toLowerCase().includes(term)
      ),
    })).filter((cat) => cat.definitions.length > 0);
  }, [searchFilter]);

  if (!selectedPerson) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center space-y-4">
        <Sliders className="h-12 w-12 text-stone-400 mx-auto" />
        <h2 className="text-2xl font-bold">Nenhum familiar selecionado</h2>
        <p className="text-stone-500">Cadastre um familiar primeiro para configurar seus acompanhamentos.</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header with Person Selector & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
              Personalização do Acompanhamento
            </h1>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold">
              {localCodes.size} Ativos
            </Badge>
          </div>
          <p className="text-sm text-stone-500 mt-1">
            Configuração individual para <strong className="text-stone-800 dark:text-stone-200">{selectedPerson.full_name}</strong>. Desativar um item oculta do painel mas preserva todo o histórico.
          </p>
        </div>

        {/* Switch person selector if more than 1 */}
        {caredPeople.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium">Configurando:</span>
            <Select value={selectedPerson.id} onValueChange={(val) => setSelectedPersonId(val)}>
              <SelectTrigger className="w-[200px] h-10">
                <SelectValue placeholder="Selecione o familiar" />
              </SelectTrigger>
              <SelectContent>
                {caredPeople.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="modules" className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <TabsList className="bg-stone-200/60 dark:bg-stone-800/60 p-1 rounded-xl">
            <TabsTrigger value="modules" className="rounded-lg text-xs font-semibold px-4 py-2">
              Módulos e Categorias
            </TabsTrigger>
            <TabsTrigger value="custom_fields" className="rounded-lg text-xs font-semibold px-4 py-2">
              Campos Personalizados ({customFields.length})
            </TabsTrigger>
            <TabsTrigger value="audit" onClick={fetchAuditLogs} className="rounded-lg text-xs font-semibold px-4 py-2">
              Histórico de Alterações
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {otherPeople.length > 0 && (
              <Dialog open={copyModalOpen} onOpenChange={setCopyModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 text-xs">
                    <Copy className="h-3.5 w-3.5" /> Copiar de outro familiar
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Copiar configurações de acompanhamento</DialogTitle>
                    <DialogDescription>
                      Isso duplicará os acompanhamentos ativos de outro familiar para {selectedPerson.full_name}. Você poderá ajustar antes de salvar.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Copiar de quem?</Label>
                      <Select value={sourcePersonId} onValueChange={setSourcePersonId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o familiar de origem" />
                        </SelectTrigger>
                        <SelectContent>
                          {otherPeople.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setCopyModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      disabled={!sourcePersonId || copying}
                      onClick={handleCopySubmit}
                      className="bg-brand-green hover:bg-brand-green/90 text-white"
                    >
                      {copying ? 'Copiando...' : 'Confirmar e Copiar'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={customFieldModalOpen} onOpenChange={setCustomFieldModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Novo campo da família
                </Button>
              </DialogTrigger>
              <DialogContent>
                <form onSubmit={handleCreateCustomField}>
                  <DialogHeader>
                    <DialogTitle>Criar campo personalizado</DialogTitle>
                    <DialogDescription>
                      Crie um acompanhamento específico para a rotina de {selectedPerson.full_name} (ex: &quot;Fez palavras cruzadas?&quot;, &quot;Regou as plantas?&quot;).
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="cf-label">Nome do acompanhamento *</Label>
                      <Input
                        id="cf-label"
                        placeholder="Ex: Fez caminhada no jardim?"
                        value={fieldForm.label}
                        onChange={(e) => setFieldForm({ ...fieldForm, label: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cf-desc">Descrição / Instruções (Opcional)</Label>
                      <Input
                        id="cf-desc"
                        placeholder="Ex: Observar se utilizou calçado antiderrapante"
                        value={fieldForm.description}
                        onChange={(e) => setFieldForm({ ...fieldForm, description: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de resposta</Label>
                      <Select
                        value={fieldForm.fieldType}
                        onValueChange={(val) => setFieldForm({ ...fieldForm, fieldType: val })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="boolean">Sim / Não (Confirmação simples)</SelectItem>
                          <SelectItem value="number">Número (ex: contagem de vezes)</SelectItem>
                          <SelectItem value="scale_0_10">Escala de 0 a 10 (ex: nível de conforto)</SelectItem>
                          <SelectItem value="short_text">Texto curto (ex: anotação do dia)</SelectItem>
                          <SelectItem value="time">Horário (ex: hora da atividade)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="ghost" onClick={() => setCustomFieldModalOpen(false)}>
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={creatingField || !fieldForm.label.trim()}
                      className="bg-brand-green hover:bg-brand-green/90 text-white"
                    >
                      {creatingField ? 'Salvando...' : 'Criar Campo'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* TAB 1: Standard Categories and Definitions */}
        <TabsContent value="modules" className="space-y-6">
          {/* Filter */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
            <Input
              placeholder="Filtrar por nome ou descrição do acompanhamento..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          <div className="space-y-6">
            {filteredCatalog.map((category) => {
              const activeInCategory = category.definitions.filter((d) => localCodes.has(d.code)).length;
              return (
                <Card key={category.id} className="border-stone-200 dark:border-stone-800">
                  <CardHeader className="bg-stone-50 dark:bg-stone-900/50 py-3.5 px-6 border-b border-stone-200 dark:border-stone-800">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-stone-900 dark:text-stone-100">
                          {category.name}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {activeInCategory} de {category.definitions.length}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setLocalCodes((prev) => {
                              const next = new Set(prev);
                              category.definitions.forEach((d) => next.add(d.code));
                              return next;
                            });
                            setDirty(true);
                          }}
                          className="text-xs text-brand-green hover:underline font-medium"
                        >
                          Ativar todos
                        </button>
                        <span className="text-stone-300">|</span>
                        <button
                          type="button"
                          onClick={() => {
                            setLocalCodes((prev) => {
                              const next = new Set(prev);
                              category.definitions.forEach((d) => next.delete(d.code));
                              return next;
                            });
                            setDirty(true);
                          }}
                          className="text-xs text-stone-500 hover:underline"
                        >
                          Desativar
                        </button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {category.definitions.map((def) => {
                        const isEnabled = localCodes.has(def.code);
                        return (
                          <div
                            key={def.id}
                            className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                              isEnabled
                                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800'
                                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 opacity-80'
                            }`}
                          >
                            <Switch
                              id={`mod-${def.code}`}
                              checked={isEnabled}
                              onCheckedChange={() => handleToggle(def.code)}
                              className="mt-0.5"
                            />
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center justify-between">
                                <Label htmlFor={`mod-${def.code}`} className="font-semibold text-sm cursor-pointer">
                                  {def.name}
                                </Label>
                                {def.isCheckinButton && (
                                  <Badge variant="outline" className="text-[10px] text-amber-700 bg-amber-50">
                                    Botão Idoso
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-stone-500 dark:text-stone-400">
                                {def.description}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Sticky Save Bar */}
          {dirty && (
            <div className="sticky bottom-4 bg-white dark:bg-stone-900 p-4 rounded-2xl border-2 border-brand-green shadow-xl flex items-center justify-between z-30 animate-in slide-in-from-bottom-2">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-brand-green shrink-0" />
                <span className="text-sm font-semibold">
                  Existem alterações não salvas nas configurações de {selectedPerson.full_name}.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => refetch()}>
                  Descartar
                </Button>
                <Button
                  size="sm"
                  disabled={saving}
                  onClick={handleSave}
                  className="bg-brand-green hover:bg-brand-green/90 text-white font-bold px-5"
                >
                  {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Custom Fields */}
        <TabsContent value="custom_fields" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800">
            <CardHeader>
              <CardTitle>Campos Personalizados da Família</CardTitle>
              <CardDescription>
                Itens criados exclusivamente para {selectedPerson.full_name}. Cada campo aparece no registro diário e relatórios conforme configurado.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {customFields.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <Sparkles className="h-10 w-10 text-stone-300 mx-auto" />
                  <p className="text-sm text-stone-500">
                    Nenhum campo personalizado cadastrado para este familiar.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCustomFieldModalOpen(true)}
                    className="gap-2 text-xs"
                  >
                    <Plus className="h-3.5 w-3.5" /> Criar primeiro campo
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {customFields.map((cf) => (
                    <div key={cf.id} className="py-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">{cf.label}</p>
                        {cf.description && <p className="text-xs text-stone-500">{cf.description}</p>}
                        <Badge variant="outline" className="text-[10px] mt-1 capitalize">
                          Tipo: {cf.field_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Badge variant={cf.enabled ? 'default' : 'secondary'}>
                        {cf.enabled ? 'Ativo' : 'Arquivado'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Audit Log */}
        <TabsContent value="audit" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-stone-500" />
                Registros Recentes de Acompanhamento
              </CardTitle>
              <CardDescription>
                Auditoria de eventos e dados salvos no banco de dados para {selectedPerson.full_name}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingAudit ? (
                <p className="text-xs text-stone-500 py-6 text-center">Carregando histórico...</p>
              ) : auditLogs.length === 0 ? (
                <p className="text-xs text-stone-500 py-8 text-center">Nenhum registro encontrado ainda.</p>
              ) : (
                <div className="divide-y divide-stone-100 dark:divide-stone-800">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-stone-800 dark:text-stone-200">
                          {log.monitoring_definitions?.code || log.custom_monitoring_fields?.label || 'Evento registrado'}
                        </span>
                        {log.notes && <p className="text-stone-500">{log.notes}</p>}
                      </div>
                      <div className="text-right text-stone-400">
                        {new Date(log.occurred_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
