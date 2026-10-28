'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Users, UserPlus, Mail, Shield, Share2, Check, Copy, AlertCircle,
  ExternalLink, ShieldCheck, ShieldAlert, FileText, Heart, Globe, KeyRound
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';

interface Member {
  id: string;
  user_id: string;
  role: string;
  status: string;
  invited_email?: string | null;
  created_at: string;
  users?: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  };
}

interface EntitlementInfo {
  seatLimit: number;
  totalUsedSeats: number;
  availableSeats: number;
  canInvite: boolean;
  activeMembersCount: number;
  reservedInvitesCount: number;
  subscriptionStatus: string;
}

export default function FamilyPage() {
  const { user, currentOrganizationId } = useAuth();
  const { caredPeople: contextCaredPeople } = useCaredPerson();
  const router = useRouter();
  const supabase = createClient() as any;
  const { toast } = useToast();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';

  const [members, setMembers] = useState<Member[]>([]);
  const [caredPeople, setCaredPeople] = useState<any[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Member Invite Dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'collaborator',
  });

  // Senior (Cared Person) Invite Dialog - Option C
  const [seniorInviteOpen, setSeniorInviteOpen] = useState(false);
  const [seniorInviteLoading, setSeniorInviteLoading] = useState(false);
  const [seniorInviteError, setSeniorInviteError] = useState<string | null>(null);
  const [seniorForm, setSeniorForm] = useState({
    caredPersonId: '',
    email: '',
    phone: '',
    language: 'pt-BR',
    message: 'Olá! Criei seu acesso pessoal no Parent Care para você acompanhar suas rotinas e se divertir com os jogos.',
  });
  const [generatedInvite, setGeneratedInvite] = useState<{ inviteUrl: string; token: string } | null>(null);

  const [copied, setCopied] = useState(false);
  const [seniorCopied, setSeniorCopied] = useState(false);

  const fetchData = useCallback(async () => {
    if (!currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    try {
      const [membersRes, caredRes, entRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select(`
            id, user_id, role, status, invited_email, created_at,
            users (full_name, email, avatar_url)
          `)
          .eq('organization_id', currentOrganizationId),
        supabase
          .from('cared_people')
          .select('*')
          .eq('organization_id', currentOrganizationId),
        supabase
          .from('organization_entitlements')
          .select('*')
          .eq('organization_id', currentOrganizationId)
          .maybeSingle(),
      ]);

      if (membersRes.data) setMembers(membersRes.data);
      if (caredRes.data) {
        setCaredPeople(caredRes.data);
        if (caredRes.data.length > 0 && !seniorForm.caredPersonId) {
          setSeniorForm((prev) => ({ ...prev, caredPersonId: caredRes.data[0].id }));
        }
      }

      if (entRes.data) {
        const entData = entRes.data;
        const used = entData.active_members_count + entData.reserved_invites_count;
        setEntitlements({
          seatLimit: entData.seat_limit,
          totalUsedSeats: used,
          availableSeats: Math.max(0, entData.seat_limit - used),
          canInvite: entData.seat_limit > used,
          activeMembersCount: entData.active_members_count,
          reservedInvitesCount: entData.reserved_invites_count,
          subscriptionStatus: entData.subscription_status,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, supabase, seniorForm.caredPersonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const effectiveCaredPeople = (caredPeople && caredPeople.length > 0)
    ? caredPeople
    : (contextCaredPeople || []);

  useEffect(() => {
    if (effectiveCaredPeople.length > 0 && !seniorForm.caredPersonId) {
      setSeniorForm((prev) => ({ ...prev, caredPersonId: effectiveCaredPeople[0].id }));
    }
  }, [effectiveCaredPeople, seniorForm.caredPersonId]);

  // Handle Standard Member Invite
  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId) return;

    setInviteError(null);
    setInviteLoading(true);

    try {
      const res = await fetch('/api/organizations/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          email: inviteForm.email,
          role: inviteForm.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || 'Erro ao enviar convite');
        return;
      }

      toast({
        title: '✓ Convite enviado!',
        description: `Convite enviado para ${inviteForm.email}. 1 assento reservado.`,
      });
      setInviteOpen(false);
      setInviteForm({ email: '', role: 'collaborator' });
      await fetchData();
    } catch (err: any) {
      setInviteError(err.message || 'Falha ao enviar convite');
    } finally {
      setInviteLoading(false);
    }
  };

  // Handle Senior (Cared Person) Invite - Option C
  const handleCreateSeniorInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId) return;

    setSeniorInviteError(null);
    setSeniorInviteLoading(true);

    try {
      const res = await fetch('/api/invitations/cared-person', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          caredPersonId: seniorForm.caredPersonId,
          invitedEmail: seniorForm.email || null,
          invitedPhone: seniorForm.phone || null,
          preferredLanguage: seniorForm.language,
          personalMessage: seniorForm.message,
          role: 'cared_person',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setSeniorInviteError(data.error || 'Erro ao criar convite para a pessoa idosa');
        return;
      }

      const resolvedInviteUrl = (typeof window !== 'undefined' && data.invitation?.token)
        ? `${window.location.origin}/${seniorForm.language || 'pt-BR'}/auth/accept-invitation/${data.invitation.token}`
        : (data.invitation?.inviteUrl || '');

      setGeneratedInvite({
        ...data.invitation,
        inviteUrl: resolvedInviteUrl,
      });
      toast({
        title: '✓ Convite criado com sucesso!',
        description: 'Copie o link abaixo e compartilhe com o idoso ou familiar.',
      });
      await fetchData();
    } catch (err: any) {
      setSeniorInviteError(err.message || 'Falha ao gerar convite');
    } finally {
      setSeniorInviteLoading(false);
    }
  };

  const copySeniorInviteUrl = () => {
    if (!generatedInvite) return;
    navigator.clipboard.writeText(generatedInvite.inviteUrl);
    setSeniorCopied(true);
    toast({ title: 'Link copiado!', description: 'Envie para o idoso ou familiar.' });
    setTimeout(() => setSeniorCopied(false), 3000);
  };

  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareText, setShareText] = useState('');

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/${locale}/auth/signup?ref=${currentOrganizationId}`;
    const message = `Olá! Criei uma conta no Parent Care para cuidarmos juntos da nossa família. ❤️\n\nPara acessar:\n1. Abra o link: ${inviteUrl}\n2. Crie sua conta com seu e-mail\n3. Você já estará vinculado(a) à nossa família!`;
    setShareText(message);
    setShareDialogOpen(true);
  };

  const doCopyLink = () => {
    const inviteUrl = `${window.location.origin}/${locale}/auth/signup?ref=${currentOrganizationId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: 'Link copiado!', description: 'Envie este link para seu familiar.' });
    setTimeout(() => setCopied(false), 3000);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Coadministrador';
      case 'caregiver': return 'Cuidador Profissional';
      case 'cared_person': return 'Pessoa Cuidada (Conta Própria)';
      case 'professional': return 'Profissional Convidado';
      case 'emergency_contact': return 'Contato de Emergência';
      default: return 'Filho ou Irmão';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'admin': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'caregiver': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'cared_person': return 'bg-amber-50 text-amber-800 border-amber-300';
      case 'professional': return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      default: return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const seatsFull = entitlements ? !entitlements.canInvite : false;

  return (
    <div className="max-w-5xl mx-auto space-y-6 overflow-x-hidden w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Users className="h-7 w-7 text-emerald-600" />
            Círculo Familiar & Cuidadores
          </h1>
          <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
            Gerencie os familiares, médicos, cuidadores e o acesso individual da pessoa idosa.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Senior Invite (Option C) */}
          <Dialog open={seniorInviteOpen} onOpenChange={(open) => { setSeniorInviteOpen(open); if (!open) { setGeneratedInvite(null); setSeniorInviteError(null); } }}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold gap-1.5 shadow-sm">
                <Heart className="h-4 w-4 fill-white" />
                Convidar Idoso (Conta Própria)
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-3xl p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-black flex items-center gap-2">
                  <Heart className="h-6 w-6 text-amber-500 fill-amber-500" />
                  Conta Própria para a Pessoa Cuidada
                </DialogTitle>
                <DialogDescription className="font-medium text-stone-600 dark:text-stone-400">
                  A pessoa idosa terá login individual com total privacidade. Ela criará sua própria senha, escolherá seu idioma e acessará a interface adaptada com jogos e rotina. Não consome vagas do plano.
                </DialogDescription>
              </DialogHeader>

              {generatedInvite ? (
                <div className="space-y-4 py-3 animate-in fade-in">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border-2 border-emerald-300 dark:border-emerald-800 space-y-2">
                    <p className="text-xs font-black uppercase text-emerald-800 dark:text-emerald-300">
                      Link Pessoal de Acesso Gerado:
                    </p>
                    <div className="bg-white dark:bg-stone-900 p-2.5 rounded-xl border font-mono text-xs break-all text-stone-700 dark:text-stone-300 select-all">
                      {generatedInvite.inviteUrl}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button onClick={copySeniorInviteUrl} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl gap-2">
                      {seniorCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {seniorCopied ? 'Link Copiado!' : 'Copiar Link para Enviar'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        const msg = `Olá! Criei seu acesso pessoal no Parent Care: ${generatedInvite.inviteUrl}`;
                        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
                      }}
                      className="h-12 rounded-xl font-bold border-emerald-300 text-emerald-700"
                    >
                      WhatsApp
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCreateSeniorInvite} className="space-y-4 py-2">
                  {effectiveCaredPeople.length === 0 ? (
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 rounded-2xl space-y-3">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
                            Nenhuma pessoa cuidada cadastrada ainda
                          </p>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                            Para gerar o acesso e a conta própria do idoso, primeiro você precisa cadastrar o perfil dele na plataforma.
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        onClick={() => {
                          setSeniorInviteOpen(false);
                          router.push(`/${locale}/dashboard/cared-people/new`);
                        }}
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl h-11 gap-2 text-xs shadow-sm"
                      >
                        <UserPlus className="h-4 w-4" />
                        + Cadastrar Idoso / Pessoa Cuidada Agora
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label className="font-bold text-xs">Pessoa Cuidada *</Label>
                      <Select
                        value={seniorForm.caredPersonId}
                        onValueChange={(val) => setSeniorForm((prev) => ({ ...prev, caredPersonId: val }))}
                      >
                        <SelectTrigger className="h-11 rounded-xl font-semibold">
                          <SelectValue placeholder="Selecione a pessoa cuidada" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {effectiveCaredPeople.map((cp) => {
                            const displayName = cp.preferred_name || cp.nickname || cp.full_name;
                            return (
                              <SelectItem key={cp.id} value={cp.id} className="font-semibold">
                                {displayName} {cp.user_id ? '(Já possui conta)' : '(Sem conta vinculada)'}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">E-mail do Idoso (Opcional se enviar por link)</Label>
                    <Input
                      type="email"
                      placeholder="idoso@email.com"
                      value={seniorForm.email}
                      onChange={(e) => setSeniorForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-bold text-xs">Idioma Inicial Preferido</Label>
                    <Select
                      value={seniorForm.language}
                      onValueChange={(val) => setSeniorForm((prev) => ({ ...prev, language: val }))}
                    >
                      <SelectTrigger className="h-11 rounded-xl font-semibold">
                        <SelectValue placeholder="Idioma" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="pt-BR">🇧🇷 Português (Brasil)</SelectItem>
                        <SelectItem value="en">🇺🇸 English</SelectItem>
                        <SelectItem value="es">🇪🇸 Español</SelectItem>
                        <SelectItem value="fr">🇫🇷 Français</SelectItem>
                        <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {seniorInviteError && (
                    <Alert variant="destructive" className="text-xs">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{seniorInviteError}</AlertDescription>
                    </Alert>
                  )}

                  <DialogFooter className="pt-2">
                    <Button type="button" variant="ghost" onClick={() => setSeniorInviteOpen(false)}>Cancelar</Button>
                    <Button
                      type="submit"
                      disabled={seniorInviteLoading || effectiveCaredPeople.length === 0 || !seniorForm.caredPersonId}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl"
                    >
                      {seniorInviteLoading ? 'Gerando...' : 'Gerar Convite da Conta'}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Member Invite Dialog */}
          <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setInviteError(null); }}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className={`rounded-xl ${seatsFull ? 'bg-stone-400 hover:bg-stone-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 text-white font-bold'}`}
                onClick={(e) => {
                  if (seatsFull) {
                    e.preventDefault();
                    toast({
                      title: 'Limite de assentos atingido',
                      description: `O plano atual (${entitlements?.seatLimit} assentos) está cheio. Acesse Assinatura para adicionar mais.`,
                      variant: 'destructive',
                    });
                  }
                }}
              >
                <UserPlus className="h-4 w-4 mr-1.5" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px] rounded-3xl p-6">
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle className="text-xl font-black">Convidar Familiar ou Cuidador</DialogTitle>
                  <DialogDescription>
                    Envie um convite para colaborar nos cuidados da família.
                    {entitlements && (
                      <span className="block mt-1 text-emerald-700 font-bold text-xs">
                        Assentos disponíveis: {entitlements.availableSeats} de {entitlements.seatLimit}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="font-bold text-xs">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="familiar@email.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="h-11 rounded-xl"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="role" className="font-bold text-xs">Papel nos Cuidados</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(val) => setInviteForm((prev) => ({ ...prev, role: val }))}
                    >
                      <SelectTrigger id="role" className="h-11 rounded-xl font-semibold">
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="caregiver">Cuidador Profissional (Acesso operacional)</SelectItem>
                        <SelectItem value="collaborator">Filho ou Irmão (Acesso familiar autorizado)</SelectItem>
                        <SelectItem value="admin">Coadministrador da Família (Gestão autorizada)</SelectItem>
                        <SelectItem value="professional">Profissional Convidado (Médico/Terapeuta)</SelectItem>
                        <SelectItem value="emergency_contact">Contato de Emergência</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inviteError && (
                    <Alert variant="destructive" className="text-xs">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{inviteError}</AlertDescription>
                    </Alert>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                  <Button type="submit" disabled={inviteLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl">
                    {inviteLoading ? 'Enviando...' : 'Enviar Convite'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Governance & Permissions Action Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href={`/${locale}/dashboard/family/permissions`}
          className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-emerald-500 dark:hover:border-emerald-500 shadow-xs transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="font-black text-sm text-stone-900 dark:text-stone-100 block group-hover:text-emerald-600 transition-colors">
              Matriz de Permissões
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 block truncate">
              Regras por pessoa e módulo
            </span>
          </div>
        </Link>

        <Link
          href={`/${locale}/dashboard/approvals`}
          className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-amber-500 dark:hover:border-amber-500 shadow-xs transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="font-black text-sm text-stone-900 dark:text-stone-100 block group-hover:text-amber-600 transition-colors">
              Aprovações Críticas
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 block truncate">
              Medicamentos, agenda e alertas
            </span>
          </div>
        </Link>

        <Link
          href={`/${locale}/dashboard/audit`}
          className="p-4 rounded-2xl border-2 border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:border-indigo-500 dark:hover:border-indigo-500 shadow-xs transition-all flex items-center gap-3.5 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <span className="font-black text-sm text-stone-900 dark:text-stone-100 block group-hover:text-indigo-600 transition-colors">
              Central de Auditoria
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 block truncate">
              Histórico imutável de ações
            </span>
          </div>
        </Link>
      </div>

      {/* Seat Usage Badge */}
      {entitlements && (
        <Card className={`border ${seatsFull ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30' : 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/60 dark:bg-emerald-950/20'} rounded-2xl`}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Users className={`h-5 w-5 ${seatsFull ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
                <div>
                  <span className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                    {entitlements.totalUsedSeats} de {entitlements.seatLimit} assentos utilizados
                  </span>
                  <div className="text-xs text-stone-500 dark:text-slate-400 mt-0.5">
                    {entitlements.activeMembersCount} membro(s) ativo(s) + {entitlements.reservedInvitesCount} convite(s) pendente(s) • Acesso do idoso não consome assento
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {seatsFull ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs font-bold">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Plano Completo
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-xs font-bold">
                    {entitlements.availableSeats} vaga(s) disponível(is)
                  </Badge>
                )}
              </div>
            </div>

            {/* Seat Progress Bar */}
            <div className="mt-3">
              <div className="w-full bg-white/70 rounded-full h-2 overflow-hidden border border-stone-200/50">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${seatsFull ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, (entitlements.totalUsedSeats / entitlements.seatLimit) * 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members Grid / List */}
      <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <CardHeader>
          <CardTitle className="text-lg text-stone-900 dark:text-stone-100">
            Membros da Família ({members.length || 1})
          </CardTitle>
          <CardDescription className="text-stone-500 dark:text-stone-400">
            Pessoas com acesso autorizado aos cuidados, histórico e rotinas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
          ) : members.length > 0 ? (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {members.map((member) => {
                const displayName = member.users?.full_name || member.invited_email || user?.email || 'Membro';
                const displayEmail = member.users?.email || member.invited_email || user?.email;
                return (
                  <div key={member.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-emerald-100 to-teal-200 text-emerald-800 font-bold flex items-center justify-center text-base border">
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{displayName}</p>
                        <p className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1.5 mt-0.5">
                          <Mail className="h-3 w-3" />
                          {displayEmail}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={`text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        {getRoleLabel(member.role)}
                      </Badge>

                      {member.status === 'invited' ? (
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs font-bold">
                          Convite Pendente
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs font-bold">
                          Ativo
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm">{user?.user_metadata?.full_name || user?.email}</p>
                  <p className="text-xs text-stone-500 dark:text-slate-400">{user?.email}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Proprietário
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
