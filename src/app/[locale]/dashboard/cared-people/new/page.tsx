'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  AlertCircle, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  CheckSquare, 
  ChevronRight, 
  Search, 
  ShieldCheck, 
  Sparkles, 
  UserPlus 
} from 'lucide-react';
import { MONITORING_CATALOG, validateDependencies, getDefinitionByCode } from '@/lib/monitoring/catalog';

export default function NewCaredPersonPage() {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId, setCurrentOrganizationId } = useAuth();
  const { refreshCaredPeople, setSelectedPersonId } = useCaredPerson();
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1 Form Data
  const [formData, setFormData] = useState({
    full_name: '',
    nickname: '',
    birth_date: '',
    gender: '',
    blood_type: '',
  });

  // Step 2 Monitoring Selection: default to empty set (User must choose consciously)
  const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
  const [searchFilter, setSearchFilter] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Toggle single item
  const handleToggleCode = (code: string) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
        // If it has a dependency, also auto-suggest or include it
        const def = getDefinitionByCode(code);
        if (def?.dependencyCode && !next.has(def.dependencyCode)) {
          next.add(def.dependencyCode);
          toast({
            title: 'Módulo vinculado ativado',
            description: `Ativado automaticamente "${def.dependencyCode}" necessário para este acompanhamento.`,
          });
        }
      }
      return next;
    });
  };

  // Select all in category
  const handleSelectAllCategory = (categoryCode: string) => {
    const category = MONITORING_CATALOG.find((c) => c.code === categoryCode);
    if (!category) return;
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      category.definitions.forEach((d) => next.add(d.code));
      return next;
    });
  };

  // Clear category
  const handleClearCategory = (categoryCode: string) => {
    const category = MONITORING_CATALOG.find((c) => c.code === categoryCode);
    if (!category) return;
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      category.definitions.forEach((d) => next.delete(d.code));
      return next;
    });
  };

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

  const getOrCreateOrganization = async (): Promise<string | null> => {
    if (currentOrganizationId) return currentOrganizationId;
    if (!user) return null;

    const { data: existingMemberships } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (existingMemberships && existingMemberships.length > 0) {
      const orgId = existingMemberships[0].organization_id;
      setCurrentOrganizationId(orgId);
      return orgId;
    }

    const { data: ownedOrgs } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner_id', user.id)
      .limit(1);

    if (ownedOrgs && ownedOrgs.length > 0) {
      const orgId = ownedOrgs[0].id;
      setCurrentOrganizationId(orgId);
      return orgId;
    }

    const newOrgId = crypto.randomUUID();
    const uniqueSlug = `familia-${user.id.slice(0, 5)}-${Date.now()}`;
    const orgName = formData.full_name
      ? `Família de ${formData.full_name.split(' ')[0]}`
      : 'Minha Família';

    const { error: orgError } = await supabase.from('organizations').insert({
      id: newOrgId,
      name: orgName,
      slug: uniqueSlug,
      owner_id: user.id,
    });

    if (orgError) {
      setErrorMessage(`Erro ao criar família: ${orgError.message}`);
      return null;
    }

    await supabase.from('organization_members').insert({
      organization_id: newOrgId,
      user_id: user.id,
      role: 'owner',
      status: 'active',
    });

    setCurrentOrganizationId(newOrgId);
    return newOrgId;
  };

  const handleProceedToStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.full_name.trim()) {
      setErrorMessage('Por favor, informe o nome completo.');
      return;
    }
    setErrorMessage(null);
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFinalSubmit = async () => {
    setErrorMessage(null);
    if (!user) {
      setErrorMessage('Você precisa estar autenticado para continuar.');
      return;
    }

    // Validate dependencies before submitting
    const depCheck = validateDependencies(Array.from(selectedCodes));
    if (!depCheck.valid) {
      setErrorMessage('Alguns acompanhamentos selecionados requerem módulos vinculados que não foram ativados.');
      return;
    }

    setLoading(true);

    try {
      const orgId = await getOrCreateOrganization();
      if (!orgId) {
        setLoading(false);
        return;
      }

      // 1. Insert Cared Person
      const payload: Record<string, any> = {
        organization_id: orgId,
        full_name: formData.full_name.trim(),
        birth_date: formData.birth_date || null,
        blood_type: formData.blood_type || null,
        created_by: user.id,
      };

      if (formData.nickname?.trim()) {
        payload.nickname = formData.nickname.trim();
      }
      if (formData.gender) {
        payload.gender = formData.gender;
      }

      let createdPersonId: string | null = null;
      const { data, error } = await supabase
        .from('cared_people')
        .insert(payload)
        .select('id')
        .single();

      if (error) {
        if (error.message?.includes('nickname') || error.message?.includes('gender')) {
          delete payload.nickname;
          delete payload.gender;
          const { data: retryData, error: retryError } = await supabase
            .from('cared_people')
            .insert(payload)
            .select('id')
            .single();

          if (retryError) {
            setErrorMessage(`Erro no cadastro: ${retryError.message}`);
            setLoading(false);
            return;
          }
          createdPersonId = retryData?.id || null;
        } else {
          setErrorMessage(`Erro ao cadastrar: ${error.message}`);
          setLoading(false);
          return;
        }
      } else {
        createdPersonId = data?.id || null;
      }

      if (!createdPersonId) {
        setErrorMessage('Não foi possível obter o identificador da pessoa cuidada.');
        setLoading(false);
        return;
      }

      // 2. Persist Selected Monitoring Settings via API
      const saveRes = await fetch('/api/monitoring/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caredPersonId: createdPersonId,
          enabledCodes: Array.from(selectedCodes),
          settingsPayload: {},
        }),
      });

      if (!saveRes.ok) {
        console.warn('Configurações de acompanhamento serão ajustadas posteriormente.');
      }

      toast({
        title: 'Pessoa cuidada cadastrada com sucesso!',
        description: `${formData.full_name} foi adicionado(a) com ${selectedCodes.size} acompanhamento(s) personalizado(s).`,
      });

      await refreshCaredPeople();
      setSelectedPersonId(createdPersonId);
      router.push(`/${locale}/dashboard`);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Ocorreu um erro ao salvar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Progress Bar */}
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-4">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 1 ? 'bg-brand-green text-white' : 'bg-emerald-100 text-emerald-800'}`}>
              {step > 1 ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <span className={`text-sm font-semibold ${step === 1 ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500'}`}>
              Dados Básicos
            </span>
            <ChevronRight className="h-4 w-4 text-stone-400" />
            <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm ${step === 2 ? 'bg-brand-green text-white' : 'bg-stone-200 text-stone-600'}`}>
              2
            </div>
            <span className={`text-sm font-semibold ${step === 2 ? 'text-stone-900 dark:text-stone-100' : 'text-stone-500'}`}>
              Personalizar Acompanhamentos
            </span>
          </div>
          {step === 2 && (
            <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold px-3 py-1">
              {selectedCodes.size} selecionado(s)
            </Badge>
          )}
        </div>

        {errorMessage && (
          <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-4 rounded-xl flex items-center gap-3 text-red-700 dark:text-red-300">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{errorMessage}</p>
          </div>
        )}

        {/* STEP 1: Basic Information */}
        {step === 1 && (
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-brand-green/10 rounded-xl text-brand-green">
                  <UserPlus className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Cadastrar Pessoa Cuidada</CardTitle>
                  <CardDescription>
                    Insira os dados cadastrais do seu familiar. Na próxima etapa você escolherá os acompanhamentos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <form onSubmit={handleProceedToStep2}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleChange}
                    placeholder="Ex: Maria dos Santos Silva"
                    required
                    className="h-11"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nickname">Como prefere ser chamado(a)? (Opcional)</Label>
                    <Input
                      id="nickname"
                      name="nickname"
                      value={formData.nickname}
                      onChange={handleChange}
                      placeholder="Ex: Mãe, Dona Maria"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="birth_date">Data de Nascimento (Opcional)</Label>
                    <Input
                      id="birth_date"
                      name="birth_date"
                      type="date"
                      value={formData.birth_date}
                      onChange={handleChange}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gênero (Opcional)</Label>
                    <Select value={formData.gender} onValueChange={(val) => handleSelectChange('gender', val)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="female">Feminino</SelectItem>
                        <SelectItem value="male">Masculino</SelectItem>
                        <SelectItem value="other">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="blood_type">Tipo Sanguíneo (Opcional)</Label>
                    <Select value={formData.blood_type} onValueChange={(val) => handleSelectChange('blood_type', val)}>
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione se souber" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between border-t border-stone-200 dark:border-stone-800 pt-6">
                <Button type="button" variant="ghost" onClick={() => router.back()}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-brand-green hover:bg-brand-green/90 text-white gap-2">
                  Próximo: Personalizar Acompanhamentos <ArrowRight className="h-4 w-4" />
                </Button>
              </CardFooter>
            </form>
          </Card>
        )}

        {/* STEP 2: Personalized Monitoring Selection */}
        {step === 2 && (
          <div className="space-y-6">
            <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-2xl font-bold">
                      O que você deseja acompanhar na rotina de {formData.nickname || formData.full_name.split(' ')[0]}?
                    </CardTitle>
                    <CardDescription className="text-base mt-1">
                      Selecione apenas o que faz parte da rotina de cuidado. O que não for marcado não gerará pendências nem poluirá o painel. Você poderá alterar depois.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const all = new Set<string>();
                        MONITORING_CATALOG.forEach((cat) => cat.definitions.forEach((d) => all.add(d.code)));
                        setSelectedCodes(all);
                      }}
                      className="text-xs"
                    >
                      Selecionar Todos
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCodes(new Set())}
                      className="text-xs"
                    >
                      Limpar Tudo
                    </Button>
                  </div>
                </div>

                {/* Filter / Search input */}
                <div className="relative mt-4">
                  <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-stone-400" />
                  <Input
                    placeholder="Buscar acompanhamento (ex: medicação, água, sono, humor, banho)..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </CardHeader>
            </Card>

            {/* Categories List */}
            <div className="space-y-6">
              {filteredCatalog.map((category) => {
                const categorySelectedCount = category.definitions.filter((d) => selectedCodes.has(d.code)).length;
                return (
                  <Card key={category.id} className="border-stone-200 dark:border-stone-800 overflow-hidden">
                    <CardHeader className="bg-stone-100/50 dark:bg-stone-900/50 py-4 px-6 border-b border-stone-200 dark:border-stone-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-stone-900 dark:text-stone-100 text-lg">
                            {category.name}
                          </span>
                          <Badge variant="secondary" className="text-xs font-semibold">
                            {categorySelectedCount} de {category.definitions.length}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectAllCategory(category.code)}
                            className="text-xs text-brand-green hover:underline font-medium px-2 py-1"
                          >
                            Marcar todos
                          </button>
                          <span className="text-stone-300">|</span>
                          <button
                            type="button"
                            onClick={() => handleClearCategory(category.code)}
                            className="text-xs text-stone-500 hover:underline px-2 py-1"
                          >
                            Limpar
                          </button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 sm:p-6 divide-y divide-stone-100 dark:divide-stone-800">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {category.definitions.map((def) => {
                          const isChecked = selectedCodes.has(def.code);
                          return (
                            <label
                              key={def.id}
                              htmlFor={def.code}
                              className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${
                                isChecked
                                  ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs'
                                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-stone-300'
                              }`}
                            >
                              <Switch
                                id={def.code}
                                checked={isChecked}
                                onCheckedChange={() => handleToggleCode(def.code)}
                                className="mt-0.5"
                              />
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center justify-between">
                                  <span className={`text-sm font-semibold ${isChecked ? 'text-emerald-950 dark:text-emerald-200' : 'text-stone-900 dark:text-stone-100'}`}>
                                    {def.name}
                                  </span>
                                  {def.isCheckinButton && (
                                    <Badge variant="outline" className="text-[10px] text-amber-700 border-amber-300 bg-amber-50">
                                      Botão Idoso
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                                  {def.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Summary & Actions */}
            <Card className="border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 sticky bottom-4 shadow-xl z-20">
              <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 rounded-xl">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                      {selectedCodes.size === 0
                        ? 'Nenhum acompanhamento selecionado'
                        : `${selectedCodes.size} acompanhamento(s) ativo(s) para ${formData.nickname || formData.full_name.split(' ')[0]}`}
                    </p>
                    <p className="text-xs text-stone-500">
                      O histórico de qualquer item ativado é preservado permanentemente.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="flex-1 sm:flex-none gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" /> Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={handleFinalSubmit}
                    disabled={loading}
                    className="bg-brand-green hover:bg-brand-green/90 text-white flex-1 sm:flex-none gap-2 px-6"
                  >
                    {loading ? 'Salvando...' : 'Concluir Cadastro'} <Check className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
