'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  User,
  Heart,
  Calendar,
  Pill,
  Utensils,
  Users,
  AlertTriangle,
  AlertCircle,
  FileText,
  History,
  Settings,
  Phone,
  MapPin,
  ExternalLink,
  Archive,
  RotateCcw,
  Camera,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  Sliders,
  ShieldCheck
} from 'lucide-react';
import type { CaredPersonFullProfile } from '@/types/cared-person';

export default function CaredPersonProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const locale = (params?.locale as string) || 'pt-BR';

  const { refreshCaredPeople } = useCaredPerson();
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<CaredPersonFullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState('');

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cared-people/${id}`);
      if (!res.ok) throw new Error('Não foi possível carregar o perfil.');
      const data = await res.json();
      setProfile(data);
      setNotesText(data.notes || '');
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar perfil',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const calculateAge = (birthDateString?: string | null): string => {
    if (!birthDateString) return '';
    const birth = new Date(birthDateString);
    if (isNaN(birth.getTime())) return '';
    const diffMs = Date.now() - birth.getTime();
    const ageDate = new Date(diffMs);
    const years = Math.abs(ageDate.getUTCFullYear() - 1970);
    return `${years} anos`;
  };

  const handleArchiveToggle = async () => {
    if (!profile) return;
    const isArchived = profile.status === 'archived' || Boolean(profile.archived_at);
    const action = isArchived ? 'restore' : 'archive';

    try {
      const res = await fetch(`/api/cared-people/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) throw new Error('Falha ao alterar o status do perfil.');

      toast({
        title: isArchived ? 'Perfil Restaurado' : 'Perfil Arquivado',
        description: isArchived
          ? `${profile.full_name} voltou para a lista de pessoas ativas.`
          : `${profile.full_name} foi arquivado(a) com histórico preservado.`,
      });

      await fetchProfile();
      await refreshCaredPeople();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append('photo', file);

      const res = await fetch(`/api/cared-people/${id}/photo`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upload da foto.');

      toast({
        title: 'Foto Atualizada!',
        description: 'A foto do perfil foi alterada com sucesso.',
      });

      await fetchProfile();
      await refreshCaredPeople();
    } catch (err: any) {
      toast({ title: 'Erro no upload', description: err.message, variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      const res = await fetch(`/api/cared-people/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notesText }),
      });
      if (!res.ok) throw new Error('Não foi possível salvar as anotações.');
      toast({ title: 'Anotações salvas!' });
      setEditingNotes(false);
      await fetchProfile();
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="h-32 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-2xl" />
        <div className="h-64 bg-stone-200 dark:bg-stone-800 animate-pulse rounded-2xl" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto p-12 text-center space-y-4">
        <AlertCircle className="h-12 w-12 text-stone-400 mx-auto" />
        <h2 className="text-xl font-bold">Pessoa cuidada não encontrada</h2>
        <Button asChild variant="outline">
          <Link href={`/${locale}/dashboard`}>Voltar ao Painel</Link>
        </Button>
      </div>
    );
  }

  const isArchived = profile.status === 'archived' || Boolean(profile.archived_at);
  const displayName = profile.preferred_name || profile.full_name;
  const ageString = calculateAge(profile.birth_date);
  const photo = profile.photo_url || (profile as any).avatar_url;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* ========================================================================= */}
      {/* HEADER BANNER                                                             */}
      {/* ========================================================================= */}
      <Card className="border-stone-200 dark:border-stone-800 overflow-hidden shadow-sm">
        <div className="h-20 bg-gradient-to-r from-emerald-600 to-brand-green relative" />
        <CardContent className="p-6 relative pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-10">
            {/* Avatar with upload */}
            <div className="flex items-end gap-4">
              <div className="relative group">
                <Avatar className="h-24 w-24 border-4 border-white dark:border-stone-900 shadow-md">
                  <AvatarImage src={photo || undefined} alt={displayName} />
                  <AvatarFallback className="text-2xl font-bold bg-brand-soft text-brand-green">
                    {displayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <label className="absolute bottom-0 right-0 p-1.5 bg-stone-900/80 hover:bg-stone-900 text-white rounded-full cursor-pointer shadow-md transition-all">
                  <Camera className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="hidden"
                    title="Alterar foto"
                  />
                </label>
              </div>

              {/* Names & Metadata */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">{displayName}</h1>
                  {profile.relationship && (
                    <Badge variant="secondary" className="text-xs font-semibold">
                      {profile.relationship}
                    </Badge>
                  )}
                  {isArchived ? (
                    <Badge variant="outline" className="text-stone-500 border-stone-400 bg-stone-100">
                      Arquivado
                    </Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                      Ativo
                    </Badge>
                  )}
                </div>
                {displayName !== profile.full_name && (
                  <p className="text-xs text-stone-500">Nome civil: {profile.full_name}</p>
                )}
                <div className="flex items-center gap-3 text-xs text-stone-500 pt-0.5">
                  {ageString && <span>🎂 {ageString}</span>}
                  {profile.blood_type && <span>🩸 Tipo {profile.blood_type}</span>}
                  {profile.country_code && <span>📍 {profile.country_code}</span>}
                </div>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button asChild size="sm" className="bg-brand-green hover:bg-brand-green/90 text-white gap-1.5 text-xs">
                <Link href={`/${locale}/care/${id}`} target="_blank">
                  <ExternalLink className="h-3.5 w-3.5" /> Tela Simplificada (Idoso)
                </Link>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleArchiveToggle}
                className="gap-1.5 text-xs text-stone-600 hover:text-stone-900"
              >
                {isArchived ? (
                  <>
                    <RotateCcw className="h-3.5 w-3.5" /> Restaurar
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" /> Arquivar
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 11-TAB NAVIGATION                                                         */}
      {/* ========================================================================= */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto pb-1">
          <TabsList className="bg-stone-100 dark:bg-stone-900 p-1 rounded-xl h-auto flex gap-1 min-w-max">
            <TabsTrigger value="overview" className="text-xs gap-1.5 py-2">
              <User className="h-3.5 w-3.5" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="routine" className="text-xs gap-1.5 py-2">
              <Clock className="h-3.5 w-3.5" /> Rotina & Gostos
            </TabsTrigger>
            <TabsTrigger value="monitoring" className="text-xs gap-1.5 py-2">
              <Activity className="h-3.5 w-3.5" /> Acompanhamentos
            </TabsTrigger>
            <TabsTrigger value="medications" className="text-xs gap-1.5 py-2">
              <Pill className="h-3.5 w-3.5" /> Medicamentos
            </TabsTrigger>
            <TabsTrigger value="meals" className="text-xs gap-1.5 py-2">
              <Utensils className="h-3.5 w-3.5" /> Alimentação
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs gap-1.5 py-2">
              <Calendar className="h-3.5 w-3.5" /> Agenda
            </TabsTrigger>
            <TabsTrigger value="family" className="text-xs gap-1.5 py-2">
              <Users className="h-3.5 w-3.5" /> Contatos & Cuidador
            </TabsTrigger>
            <TabsTrigger value="occurrences" className="text-xs gap-1.5 py-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Ocorrências
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs gap-1.5 py-2">
              <FileText className="h-3.5 w-3.5" /> Documentos
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs gap-1.5 py-2">
              <History className="h-3.5 w-3.5" /> Auditoria
            </TabsTrigger>
            <TabsTrigger value="settings" className="text-xs gap-1.5 py-2">
              <Settings className="h-3.5 w-3.5" /> Configurações
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: VISÃO GERAL                                                        */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Quick Contacts */}
            <Card className="border-stone-200 dark:border-stone-800 shadow-sm md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Phone className="h-4 w-4 text-emerald-600" /> Contatos de Emergência Imediata
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab('family')} className="text-xs text-brand-green h-7">
                    Gerenciar todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {profile.contacts && profile.contacts.length > 0 ? (
                  profile.contacts.slice(0, 3).map((c: any) => (
                    <div key={c.id || c.name} className="flex items-center justify-between p-3 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-800 dark:text-stone-200">{c.name}</span>
                          <span className="text-stone-400">({c.relationship || 'Familiar'})</span>
                          {c.is_emergency && <Badge variant="destructive" className="text-[9px] px-1 py-0 h-4">SOS</Badge>}
                        </div>
                        <p className="text-stone-500 font-mono mt-0.5">{c.phone || c.whatsapp || 'Sem telefone'}</p>
                      </div>
                      {c.phone && (
                        <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                          <a href={`tel:${c.phone}`}>Ligar</a>
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-400">Nenhum contato cadastrado ainda.</p>
                )}
              </CardContent>
            </Card>

            {/* Quick Info / Health Summary */}
            <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-brand-green" /> Dados Críticos de Saúde
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                <div>
                  <span className="text-stone-400 uppercase text-[10px] tracking-wider font-semibold">Tipo Sanguíneo</span>
                  <p className="font-bold text-stone-800 dark:text-stone-200 text-sm">{profile.blood_type || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-stone-400 uppercase text-[10px] tracking-wider font-semibold">Alergias</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(() => {
                      const allergiesItem = profile.important_information?.find((i: any) => i.information_type === 'allergies');
                      const list = (allergiesItem?.value_json as any);
                      if (Array.isArray(list) && list.length > 0) {
                        return list.map((a: string, idx: number) => (
                          <Badge key={idx} variant="destructive" className="text-[10px]">{a}</Badge>
                        ));
                      }
                      return <span className="text-stone-500">Nenhuma alergia conhecida</span>;
                    })()}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Card */}
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-brand-green" /> Caderno de Recomendações e Cuidados
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingNotes(!editingNotes)}
                  className="text-xs text-brand-green h-7"
                >
                  {editingNotes ? 'Cancelar' : 'Editar'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {editingNotes ? (
                <div className="space-y-3">
                  <Input
                    value={notesText}
                    onChange={(e) => setNotesText(e.target.value)}
                    placeholder="Instruções gerais sobre o dia a dia, particularidades e preferências..."
                  />
                  <Button size="sm" onClick={handleSaveNotes} className="bg-brand-green text-white text-xs">
                    Salvar Alterações
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                  {profile.notes || 'Nenhuma anotação registrada ainda. Clique em "Editar" para adicionar particularidades do cuidado.'}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 2: ROTINA & GOSTOS                                                    */}
        {/* ========================================================================= */}
        <TabsContent value="routine" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Hábitos & Preferências do Dia a Dia</CardTitle>
              <CardDescription className="text-xs">
                Informações para garantir que o idoso seja tratado respeitando seus costumes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800">
                  <span className="text-stone-400 font-semibold uppercase text-[10px]">Horários de Sono</span>
                  <p className="font-bold text-stone-800 dark:text-stone-200 mt-1">
                    Acorda: {(profile.preferences?.find((p: any) => p.preference_type === 'sleep_schedule')?.value_json as any)?.wake || '07:00'} • Dorme: {(profile.preferences?.find((p: any) => p.preference_type === 'sleep_schedule')?.value_json as any)?.sleep || '21:30'}
                  </p>
                </div>

                <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800">
                  <span className="text-stone-400 font-semibold uppercase text-[10px]">Comunicação Recomendada</span>
                  <p className="font-bold text-stone-800 dark:text-stone-200 mt-1">
                    {(profile.preferences?.find((p: any) => p.preference_type === 'communication')?.value_json as any)?.style || 'Tranquila, com calma e olho no olho.'}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-stone-50 dark:bg-stone-900 rounded-xl border border-stone-100 dark:border-stone-800">
                <span className="text-stone-400 font-semibold uppercase text-[10px]">O que Acalma e Conforta</span>
                <p className="text-stone-700 dark:text-stone-300 mt-1 leading-relaxed">
                  {(profile.preferences?.find((p: any) => p.preference_type === 'comforts')?.value_json as any)?.actions || 'Música suave, fotos da família, conversas sobre o passado.'}
                </p>
              </div>

              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900">
                <span className="text-amber-800 dark:text-amber-300 font-semibold uppercase text-[10px]">O que Evitar (Gatilhos de Estresse)</span>
                <p className="text-amber-900 dark:text-amber-200 mt-1 leading-relaxed">
                  {(profile.preferences?.find((p: any) => p.preference_type === 'triggers')?.value_json as any)?.dislikes || 'Muitas pessoas falando alto ao mesmo tempo, pressa ou interrupções abruptas.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 3: ACOMPANHAMENTOS                                                    */}
        {/* ========================================================================= */}
        <TabsContent value="monitoring" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Módulos de Acompanhamento</CardTitle>
                  <CardDescription className="text-xs">
                    Itens da rotina que geram pendências e registros diários no painel.
                  </CardDescription>
                </div>
                <Button asChild size="sm" variant="outline" className="text-xs gap-1.5">
                  <Link href={`/${locale}/dashboard/settings/monitoring`}>
                    <Sliders className="h-3.5 w-3.5" /> Ajustar Acompanhamentos
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-stone-500">
                Os acompanhamentos configurados garantem que apenas a rotina relevante apareça no painel e na tela simplificada de {displayName}.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 4: MEDICAMENTOS                                                       */}
        {/* ========================================================================= */}
        <TabsContent value="medications" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Medicamentos em Uso</CardTitle>
                <Button asChild size="sm" className="bg-brand-green text-white text-xs">
                  <Link href={`/${locale}/dashboard/medications`}>Gerenciar Remédios</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Gerencie posologias, horários de tomada e confirmações no módulo de Medicamentos.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 5: ALIMENTAÇÃO                                                        */}
        {/* ========================================================================= */}
        <TabsContent value="meals" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Alimentação & Hidratação</CardTitle>
                <Button asChild size="sm" className="bg-brand-green text-white text-xs">
                  <Link href={`/${locale}/dashboard/meals`}>Acessar Cardápio</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Acompanhe as refeições registradas e as metas diárias de ingestão de água.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 6: AGENDA                                                             */}
        {/* ========================================================================= */}
        <TabsContent value="schedule" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-bold">Compromissos & Consultas Médicas</CardTitle>
                <Button asChild size="sm" className="bg-brand-green text-white text-xs">
                  <Link href={`/${locale}/dashboard/appointments`}>Abrir Agenda</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Gerencie consultas, exames e organize o transporte familiar.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 7: FAMÍLIA & CONTATOS                                                 */}
        {/* ========================================================================= */}
        <TabsContent value="family" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Rede de Apoio Familiar & Cuidadores</CardTitle>
              <CardDescription className="text-xs">
                Contatos prioritários vinculados exclusivamente ao cuidado de {displayName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {profile.contacts && profile.contacts.length > 0 ? (
                profile.contacts.map((c: any, i: number) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 dark:text-stone-100">{c.name}</span>
                        <Badge variant="secondary" className="text-[10px]">{c.relationship || 'Familiar'}</Badge>
                        {c.is_primary && <Badge className="bg-emerald-600 text-white text-[9px]">Principal</Badge>}
                        {c.is_emergency && <Badge variant="destructive" className="text-[9px]">SOS</Badge>}
                      </div>
                      <p className="text-stone-500 font-mono mt-0.5">{c.phone || c.whatsapp || c.email}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400">Nenhum contato cadastrado.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 8: OCORRÊNCIAS                                                        */}
        {/* ========================================================================= */}
        <TabsContent value="occurrences" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Registro de Ocorrências & Incidentes</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Quedas, mal-estar ou incidentes são registrados no histórico geral da pessoa cuidada.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 9: DOCUMENTOS                                                         */}
        {/* ========================================================================= */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Documentos & Laudos</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Receitas médicas, carteirinha do convênio e exames laboratoriais anexados.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 10: AUDITORIA                                                         */}
        {/* ========================================================================= */}
        <TabsContent value="history" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Histórico de Alterações do Perfil</CardTitle>
              <CardDescription className="text-xs">
                Auditoria de quem modificou campos cadastrais e dados críticos de saúde.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {profile.audit_logs && profile.audit_logs.length > 0 ? (
                profile.audit_logs.map((log: any, idx: number) => (
                  <div key={idx} className="p-2.5 rounded-xl border border-stone-100 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-stone-800 dark:text-stone-200">{log.action}</span>
                      {log.field_name && <span className="text-stone-400"> ({log.field_name})</span>}
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {new Date(log.occurred_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400">Nenhum evento registrado ainda.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* TAB 11: CONFIGURAÇÕES DO PERFIL                                           */}
        {/* ========================================================================= */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Configurações & Status do Perfil</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 space-y-2">
                <p className="font-bold text-stone-800 dark:text-stone-200">Arquivamento do Perfil</p>
                <p className="text-stone-500">
                  Ao arquivar, a pessoa cuidada deixará de aparecer no seletor do cabeçalho, mas todos os registros históricos (medicamentos, refeições, consultas) permanecerão gravados para consulta futura da família.
                </p>
                <Button
                  type="button"
                  variant={isArchived ? 'default' : 'destructive'}
                  size="sm"
                  onClick={handleArchiveToggle}
                  className="mt-2 text-xs"
                >
                  {isArchived ? 'Restaurar Pessoa Cuidada' : 'Arquivar Pessoa Cuidada'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
