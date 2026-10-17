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
import { Switch } from '@/components/ui/switch';
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
  ShieldCheck,
  Bot,
  MessageSquare,
  Send,
  Key
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
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [whatsappAiEnabled, setWhatsappAiEnabled] = useState(true);
  const [metaToken, setMetaToken] = useState('');
  const [showTokenConfig, setShowTokenConfig] = useState(false);
  const [testFallbackUrl, setTestFallbackUrl] = useState<string | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);
  const [savingWhatsApp, setSavingWhatsApp] = useState(false);
  const [sendingTestWhatsApp, setSendingTestWhatsApp] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [waLink, setWaLink] = useState('');
  const [waLinkExpiry, setWaLinkExpiry] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/cared-people/${id}`);
      if (!res.ok) throw new Error('Não foi possível carregar o perfil.');
      const data = await res.json();
      setProfile(data);
      setNotesText(data.notes || '');
      setWhatsappPhone(data.whatsapp_phone || data.phone || '');
      setWhatsappAiEnabled(data.whatsapp_ai_enabled !== false);
      if (data.whatsapp_meta_token) setMetaToken(data.whatsapp_meta_token);
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

  const handleSaveWhatsAppConfig = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setSavingWhatsApp(true);
      const res = await fetch(`/api/cared-people/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          whatsapp_phone: whatsappPhone,
          phone: whatsappPhone,
          whatsapp_ai_enabled: whatsappAiEnabled,
          whatsapp_meta_token: metaToken || undefined,
        }),
      });

      if (!res.ok) throw new Error('Não foi possível salvar as configurações de WhatsApp.');

      toast({
        title: 'WhatsApp e IA atualizados!',
        description: 'Configurações de atendimento e lembretes salvas com sucesso.',
      });
      await fetchProfile();
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSavingWhatsApp(false);
    }
  };

  const handleSendTestWhatsApp = async (useTemplate: boolean = false) => {
    if (!whatsappPhone) {
      toast({
        title: 'Número obrigatório',
        description: 'Digite o número do WhatsApp com DDD antes de enviar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setSendingTestWhatsApp(true);
      setTestFallbackUrl(null);
      setTestErrorMessage(null);
      // Auto-save changes first
      await handleSaveWhatsAppConfig();

      const res = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: whatsappPhone,
          elder_name: displayName,
          meta_token: metaToken || undefined,
          use_template: useTemplate,
          template_name: 'hello_world',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.waMeUrl) {
          setTestFallbackUrl(data.waMeUrl);
        }
        setTestErrorMessage(data.error || 'Erro ao enviar mensagem de teste.');
        throw new Error(data.error || 'Erro ao enviar mensagem de teste.');
      }

      toast({
        title: 'Mensagem enviada com sucesso! 🚀',
        description: useTemplate
          ? `Template oficial da Meta entregue para ${whatsappPhone}! Verifique seu WhatsApp.`
          : `Mensagem enviada para o WhatsApp de ${displayName} (${whatsappPhone}). Verifique o celular!`,
      });
    } catch (err: any) {
      toast({
        title: 'Aviso no envio automático',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setSendingTestWhatsApp(false);
    }
  };

  useEffect(() => {
    if (id) fetchProfile();
  }, [id]);

  const handleGenerateLink = async () => {
    try {
      setGeneratingLink(true);
      setWaLink('');
      const res = await fetch('/api/whatsapp/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caredPersonId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar link');
      setWaLink(data.waLink);
      const expiry = new Date(data.expiresAt);
      setWaLinkExpiry(expiry.toLocaleString('pt-BR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }));
      toast({ title: 'Link gerado!', description: `Compartilhe com ${data.personName}. Expira em 24h.` });
    } catch (err: any) {
      toast({ title: 'Erro ao gerar link', description: err.message, variant: 'destructive' });
    } finally {
      setGeneratingLink(false);
    }
  };

  const handleCopyLink = async () => {
    if (!waLink) return;
    await navigator.clipboard.writeText(waLink).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

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
      {/* ========================================================================= */}
      {/* NAVEGAÇÃO OBJETIVA EM 4 PILARES (SEM ROLAGEM HORIZONTAL CLUNKY)           */}
      {/* ========================================================================= */}
      <Tabs value={activeTab === 'settings' ? 'whatsapp' : activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full">
          <TabsList className="bg-stone-100 dark:bg-stone-900 p-1 rounded-2xl h-auto grid grid-cols-2 sm:grid-cols-5 gap-1 w-full border border-stone-200 dark:border-stone-800">
            <TabsTrigger value="overview" className="text-xs font-bold gap-2 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-stone-800 data-[state=active]:shadow-sm">
              <User className="h-4 w-4 text-emerald-600" /> Visão Geral
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="text-xs font-bold gap-2 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-stone-800 data-[state=active]:shadow-sm">
              <MessageSquare className="h-4 w-4 text-[#25D366]" /> WhatsApp & IA
            </TabsTrigger>
            <TabsTrigger value="health" className="text-xs font-bold gap-2 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-stone-800 data-[state=active]:shadow-sm">
              <Pill className="h-4 w-4 text-rose-500" /> Saúde & Remédios
            </TabsTrigger>
            <TabsTrigger value="routine" className="text-xs font-bold gap-2 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-stone-800 data-[state=active]:shadow-sm">
              <Clock className="h-4 w-4 text-indigo-500" /> Rotina & Hábitos
            </TabsTrigger>
            <TabsTrigger value="documents" className="text-xs font-bold gap-2 py-2.5 rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-stone-800 data-[state=active]:shadow-sm col-span-2 sm:col-span-1">
              <FileText className="h-4 w-4 text-amber-500" /> Documentos & Segurança
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ========================================================================= */}
        {/* ABA 1: VISÃO GERAL & FICHA                                                */}
        {/* ========================================================================= */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contatos de Emergência Imediata */}
            <Card className="border-stone-200 dark:border-stone-800 shadow-sm md:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Phone className="h-4 w-4 text-emerald-600" /> Contatos de Emergência Imediata
                </CardTitle>
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

            {/* Dados Críticos de Saúde */}
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

          {/* Rede de Apoio Familiar & Cuidadores */}
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Users className="h-4 w-4 text-emerald-600" /> Rede de Apoio Familiar & Cuidadores
              </CardTitle>
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
                    {c.phone && (
                      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
                        <a href={`tel:${c.phone}`}>Ligar</a>
                      </Button>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-xs text-stone-400">Nenhum contato cadastrado.</p>
              )}
            </CardContent>
          </Card>

          {/* Caderno de Recomendações e Cuidados */}
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
        {/* ABA 2: WHATSAPP & ASSISTENTE IA                                           */}
        {/* ========================================================================= */}
        <TabsContent value="whatsapp" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">WhatsApp & Assistente IA (Gemini)</CardTitle>
                  <CardDescription className="text-xs">
                    Configure o número pessoal do idoso para receber lembretes diretos e interagir com o assistente inteligente.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-xs">
              <form onSubmit={handleSaveWhatsAppConfig} className="space-y-4">
                <div className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <Label htmlFor="whatsapp-ai-switch" className="text-xs font-bold text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> Atendimento Conversacional por IA
                      </Label>
                      <p className="text-[11px] text-stone-500">
                        Permite que {displayName} mande mensagens ou áudios para criar consultas, checar remédios e avisar a família.
                      </p>
                    </div>
                    <Switch
                      id="whatsapp-ai-switch"
                      checked={whatsappAiEnabled}
                      onCheckedChange={setWhatsappAiEnabled}
                    />
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-stone-200/60 dark:border-stone-800">
                    <Label htmlFor="whatsapp-phone-input" className="text-xs font-semibold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp Próprio do Idoso (com DDD)
                    </Label>
                    <Input
                      id="whatsapp-phone-input"
                      type="text"
                      placeholder="Ex: (11) 98765-4321 ou 5511987654321"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="text-xs h-9 font-mono"
                    />
                    <p className="text-[10px] text-stone-400">
                      Os lembretes agendados de medicamentos e consultas serão enviados diretamente para este WhatsApp.
                    </p>
                  </div>

                  {testErrorMessage && (
                    <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs space-y-2">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-bold text-amber-900 dark:text-amber-200">
                            Aviso no Envio Automático Meta API
                          </p>
                          <p className="text-amber-800 dark:text-amber-300 mt-0.5">
                            {testErrorMessage}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {testFallbackUrl && (
                          <Button
                            asChild
                            size="sm"
                            className="bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs gap-1.5 h-8 font-bold"
                          >
                            <a href={testFallbackUrl} target="_blank" rel="noopener noreferrer">
                              <MessageSquare className="h-3.5 w-3.5" /> Enviar Agora Diretamente via WhatsApp
                            </a>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowTokenConfig(!showTokenConfig)}
                          className="text-xs h-8 border-amber-300 text-amber-900 hover:bg-amber-100"
                        >
                          <Key className="h-3 w-3 mr-1" />
                          {showTokenConfig ? 'Ocultar Chave Meta' : 'Atualizar Chave Meta'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {showTokenConfig && (
                    <div className="p-3.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="meta-token-input" className="text-xs font-bold text-stone-800 dark:text-stone-200 flex items-center gap-1.5">
                          <Key className="h-3.5 w-3.5 text-stone-500" /> Token de Acesso da Meta Cloud API (Opcional)
                        </Label>
                        <a
                          href="https://developers.facebook.com/apps"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-blue-600 hover:underline flex items-center gap-1"
                        >
                          Gerar no Facebook Developers <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </div>
                      <Input
                        id="meta-token-input"
                        type="password"
                        placeholder="Cole aqui seu token de acesso da Meta (EAAG...)"
                        value={metaToken}
                        onChange={(e) => setMetaToken(e.target.value)}
                        className="text-xs h-9 font-mono"
                      />
                      <p className="text-[10px] text-stone-400">
                        O token de desenvolvedor da Meta dura 24h. Cole o novo token aqui e clique em &quot;Salvar Configurações&quot;.
                      </p>
                    </div>
                  )}

                  {/* Guia Meta Sandbox "To" */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-blue-950 dark:text-blue-200 font-bold">
                      <span className="text-base">📌</span>
                      <span>Como receber as mensagens de teste no seu celular (Regra da Meta)</span>
                    </div>
                    <p className="text-blue-900/90 dark:text-blue-300/90 text-[11px] leading-relaxed">
                      Em modo de teste (Sandbox da Meta), o WhatsApp <strong>só entrega mensagens</strong> para números que foram adicionados e verificados na lista <strong>&quot;To&quot; (Para)</strong> dentro do painel do Facebook Developers.
                    </p>
                    <div className="bg-white/90 dark:bg-[#07111F]/90 p-3 rounded-xl border border-blue-200/60 dark:border-blue-800/50 text-[11px] space-y-1.5 text-stone-700 dark:text-slate-300">
                      <p className="font-bold text-stone-900 dark:text-white">Onde entrar no Facebook Developers:</p>
                      <p>1. Acesse <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold underline">developers.facebook.com/apps</a> e clique no aplicativo do Parent Care.</p>
                      <p>2. No menu lateral esquerdo, clique em <strong>WhatsApp</strong> &rarr; <strong>API Setup</strong> (ou <em>Início rápido</em>).</p>
                      <p>3. Na <strong>Etapa 1</strong>, procure o campo <strong>&quot;To&quot; (Para)</strong> &rarr; clique em <strong>&quot;Manage phone number list&quot;</strong> (Gerenciar lista de números de telefone).</p>
                      <p>4. Adicione seu número com código do país (ex: <code>+55 11 98987-8993</code>) e digite o código de 6 dígitos enviado ao seu WhatsApp.</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-200/60 dark:border-stone-800 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        onClick={() => handleSendTestWhatsApp(false)}
                        disabled={sendingTestWhatsApp || !whatsappPhone}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5 h-9 font-bold shadow-md active:scale-95 transition-all"
                      >
                        <Send className="h-3.5 w-3.5" />
                        {sendingTestWhatsApp ? 'Enviando...' : 'Enviar Mensagem de Teste'}
                      </Button>

                      <Button
                        type="button"
                        onClick={() => handleSendTestWhatsApp(true)}
                        disabled={sendingTestWhatsApp || !whatsappPhone}
                        variant="secondary"
                        className="text-xs gap-1.5 h-9 font-bold shadow-xs active:scale-95 transition-all bg-emerald-100 hover:bg-emerald-200 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-300/50"
                        title="Envia o template oficial hello_world aprovado pela Meta"
                      >
                        <span>⚡ Testar Template (hello_world)</span>
                      </Button>

                      {whatsappPhone && (
                        <Button
                          asChild
                          variant="outline"
                          size="sm"
                          className="text-xs h-9 gap-1.5 border-[#25D366] text-[#128C7E] dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        >
                          <a
                            href={`https://wa.me/${whatsappPhone.replace(/\D/g, '').startsWith('55') ? whatsappPhone.replace(/\D/g, '') : '55' + whatsappPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${displayName}! Aqui é o Parent Care ❤️ Mensagem de teste da família!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Abrir no WhatsApp
                          </a>
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowTokenConfig(!showTokenConfig)}
                        className="text-[11px] h-9 text-stone-500 hover:text-stone-800"
                      >
                        <Key className="h-3 w-3 mr-1" />
                        {showTokenConfig ? 'Ocultar Chave' : 'Configurar Chave Meta'}
                      </Button>
                    </div>

                    <Button
                      type="submit"
                      disabled={savingWhatsApp}
                      variant="outline"
                      className="text-xs gap-1.5 h-9 border-stone-300 hover:bg-stone-100 dark:border-stone-700"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {savingWhatsApp ? 'Salvando...' : 'Salvar Configurações'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Card: Vincular WhatsApp do Idoso (Magic Link) */}
          <Card className="border-emerald-200 dark:border-emerald-900 shadow-sm bg-emerald-50/30 dark:bg-emerald-950/10">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[#25D366]/15 text-[#128C7E]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold">Vincular WhatsApp do Idoso (1 Toque)</CardTitle>
                  <CardDescription className="text-xs">
                    Gere um link e compartilhe com {displayName}. Ao tocar, o WhatsApp abre e o número é vinculado automaticamente.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {profile.whatsapp_phone ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-emerald-800 dark:text-emerald-300">WhatsApp já vinculado!</p>
                    <p className="text-emerald-700 dark:text-emerald-400 font-mono">{profile.whatsapp_phone}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateLink}
                    disabled={generatingLink}
                    className="text-xs border-emerald-400 text-emerald-800 hover:bg-emerald-100 shrink-0"
                  >
                    Novo Link
                  </Button>
                </div>
              ) : (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
                  <p className="text-amber-800 dark:text-amber-300 font-semibold mb-2">
                    ⚠️ Nenhum WhatsApp vinculado ainda.
                  </p>
                  <p className="text-stone-500 text-[11px]">
                    Gere um link e compartilhe com {displayName} pelo seu próprio WhatsApp, SMS ou mostrando a tela.
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleGenerateLink}
                disabled={generatingLink}
                className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-2 text-xs"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                {generatingLink ? 'Gerando...' : '🔗 Gerar Link de Vinculação (1 Toque)'}
              </Button>

              {waLink && (
                <div className="space-y-2 pt-1">
                  <div className="p-3 rounded-xl border-2 border-[#25D366]/40 bg-white dark:bg-stone-900 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-bold text-stone-800 dark:text-stone-200 text-[11px]">
                        Link gerado! Compartilhe com {displayName}:
                      </p>
                      <span className="text-[10px] text-stone-400 shrink-0">Expira: {waLinkExpiry}</span>
                    </div>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={waLink}
                        className="flex-1 text-[11px] font-mono p-2 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-300 truncate"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="shrink-0 text-xs border-stone-300 gap-1"
                      >
                        {linkCopied ? '✓ Copiado!' : 'Copiar'}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#25D366] text-white text-xs font-bold hover:bg-[#20bd5a] transition"
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Testar Link
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (navigator.share) {
                            navigator.share({ title: 'Parent Care - Assistente WhatsApp', text: `Ola! Clique para vincular seu WhatsApp ao Parent Care: ${waLink}`, url: waLink });
                          } else {
                            handleCopyLink();
                          }
                        }}
                        className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border-2 border-[#25D366]/40 text-[#128C7E] dark:text-emerald-400 text-xs font-bold hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition"
                      >
                        📤 Compartilhar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: SAÚDE & REMÉDIOS                                                   */}
        {/* ========================================================================= */}
        <TabsContent value="health" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Pill className="h-4 w-4 text-rose-500" /> Medicamentos em Uso
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Prescrições ativas, posologias, horários programados e controle de estoque.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="bg-brand-green text-white text-xs">
                  <Link href={`/${locale}/dashboard/medications`}>Gerenciar Medicamentos</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-stone-500 space-y-2">
              <p>
                Acesse a central de medicamentos para cadastrar novos remédios, programar horários de tomada com alarmes falados e acompanhar as confirmações diárias.
              </p>
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-brand-green" /> Módulos de Acompanhamento de Saúde
                  </CardTitle>
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
        {/* ABA 4: ROTINA & HÁBITOS                                                   */}
        {/* ========================================================================= */}
        <TabsContent value="routine" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" /> Hábitos & Preferências do Dia a Dia
              </CardTitle>
              <CardDescription className="text-xs">
                Informações para garantir que {displayName} seja tratado(a) respeitando seus costumes.
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

          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Utensils className="h-4 w-4 text-amber-500" /> Alimentação & Hidratação
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cardápio diário, ingestão de líquidos e refeições assistidas.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="bg-brand-green text-white text-xs">
                  <Link href={`/${locale}/dashboard/meals`}>Acessar Cardápio</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Acompanhe as refeições registradas, o apetite e as metas diárias de ingestão de água da pessoa cuidada.
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" /> Compromissos & Consultas Médicas
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Agenda integrada de consultas, exames, retorno médico e transporte.
                  </CardDescription>
                </div>
                <Button asChild size="sm" className="bg-brand-green text-white text-xs">
                  <Link href={`/${locale}/dashboard/appointments`}>Abrir Agenda</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Gerencie consultas médicas, agende novos compromissos com alarmes antecipados e organize o responsável pelo transporte familiar.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 5: DOCUMENTOS & SEGURANÇA                                             */}
        {/* ========================================================================= */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-500" /> Documentos & Laudos Médicos
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Receitas médicas, carteirinha do convênio, laudos e exames laboratoriais anexados ao prontuário de {displayName}.
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-500" /> Registro de Ocorrências & Incidentes
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-stone-500">
              Quedas, mal-estar ou incidentes são registrados no histórico geral da pessoa cuidada para acompanhamento clínico.
            </CardContent>
          </Card>

          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <History className="h-4 w-4 text-purple-500" /> Histórico de Alterações do Perfil
              </CardTitle>
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

          <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Archive className="h-4 w-4 text-stone-500" /> Configurações & Status do Perfil
              </CardTitle>
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
