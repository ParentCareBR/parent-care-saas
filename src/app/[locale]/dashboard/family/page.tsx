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
import { Users, UserPlus, Mail, Shield, Share2, Check, Copy, AlertCircle, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';

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
  const supabase = createClient() as any;
  const { toast } = useToast();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';

  const [members, setMembers] = useState<Member[]>([]);
  const [entitlements, setEntitlements] = useState<EntitlementInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'collaborator',
  });

  const fetchData = useCallback(async () => {
    if (!currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

    // Fetch members
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        id,
        user_id,
        role,
        status,
        invited_email,
        created_at,
        users (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('organization_id', currentOrganizationId);

    if (error) {
      // Fallback: direct query
      const { data: rawMembers } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganizationId);
      if (rawMembers) setMembers(rawMembers);
    } else if (data) {
      setMembers(data);
    }

    // Fetch entitlements from organization_entitlements table
    const { data: entData } = await supabase
      .from('organization_entitlements')
      .select('*')
      .eq('organization_id', currentOrganizationId)
      .maybeSingle();

    if (entData) {
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

    setLoading(false);
  }, [currentOrganizationId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
        title: '✅ Convite enviado!',
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

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/${locale}/auth/signup?ref=${currentOrganizationId}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast({ title: 'Link copiado!', description: 'Envie este link para seu familiar entrar na rede de cuidados.' });
    setTimeout(() => setCopied(false), 3000);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      case 'caregiver': return 'Cuidador Profissional';
      default: return 'Familiar Colaborador';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'admin': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'caregiver': return 'bg-blue-50 text-blue-700 border-blue-200';
      default: return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const seatsFull = entitlements ? !entitlements.canInvite : false;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 flex items-center gap-2.5">
            <Users className="h-7 w-7 text-emerald-600" />
            Círculo Familiar & Cuidadores
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Gerencie os familiares, médicos e cuidadores que acompanham e colaboram nos cuidados.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={copyInviteLink} className="rounded-xl">
            {copied ? <Check className="h-4 w-4 mr-2 text-emerald-600" /> : <Copy className="h-4 w-4 mr-2" />}
            {copied ? 'Link Copiado!' : 'Copiar Link de Convite'}
          </Button>

          <Dialog open={inviteOpen} onOpenChange={(open) => { setInviteOpen(open); if (!open) setInviteError(null); }}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                className={`rounded-xl ${seatsFull ? 'bg-stone-400 hover:bg-stone-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
                onClick={(e) => {
                  if (seatsFull) {
                    e.preventDefault();
                    toast({
                      title: 'Limite de assentos atingido',
                      description: `O plano atual (${entitlements?.seatLimit} assentos) está cheio. Acesse Configurações > Assinatura para adicionar mais assentos.`,
                      variant: 'destructive',
                    });
                    return;
                  }
                }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[440px]">
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Convidar Familiar ou Cuidador</DialogTitle>
                  <DialogDescription>
                    Envie um convite para que outro membro da família acompanhe o dia a dia.
                    {entitlements && (
                      <span className="block mt-1.5 text-emerald-700 font-medium">
                        Assentos disponíveis: {entitlements.availableSeats} de {entitlements.seatLimit}
                      </span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      placeholder="familiar@email.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Papel nos Cuidados</Label>
                    <Select
                      value={inviteForm.role}
                      onValueChange={(val) => setInviteForm(prev => ({ ...prev, role: val }))}
                    >
                      <SelectTrigger id="role">
                        <SelectValue placeholder="Selecione o papel" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="collaborator">Familiar Colaborador (Visualiza e cumpre tarefas)</SelectItem>
                        <SelectItem value="caregiver">Cuidador Profissional (Registra medicamentos e rotina)</SelectItem>
                        <SelectItem value="admin">Administrador (Pode gerenciar membros e configurações)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {inviteError && (
                    <Alert variant="destructive" className="text-sm">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {inviteError}
                        {inviteError.includes('assentos') && (
                          <Link
                            href={`/${locale}/dashboard/settings/subscription`}
                            className="block mt-1.5 font-bold underline"
                          >
                            Clique aqui para adicionar mais assentos →
                          </Link>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                  <Button
                    type="submit"
                    disabled={inviteLoading}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {inviteLoading ? 'Enviando...' : 'Enviar Convite (1 assento reservado)'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Seat Usage Badge */}
      {entitlements && (
        <Card className={`border ${seatsFull ? 'border-amber-200 bg-amber-50' : 'border-emerald-100 bg-emerald-50/60'} rounded-2xl`}>
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Users className={`h-5 w-5 ${seatsFull ? 'text-amber-600' : 'text-emerald-600'}`} />
                <div>
                  <span className="font-bold text-stone-900 text-sm">
                    {entitlements.totalUsedSeats} de {entitlements.seatLimit} assentos utilizados
                  </span>
                  <div className="text-xs text-stone-500 mt-0.5">
                    {entitlements.activeMembersCount} membro(s) ativo(s) + {entitlements.reservedInvitesCount} convite(s) pendente(s)
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

                {seatsFull && (
                  <Button asChild size="sm" className="h-8 text-xs bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg gap-1.5">
                    <Link href={`/${locale}/dashboard/settings/subscription`}>
                      <ExternalLink className="h-3 w-3" />
                      Adicionar Assentos
                    </Link>
                  </Button>
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
      <Card className="rounded-2xl border-stone-200">
        <CardHeader>
          <CardTitle className="text-lg">Membros Ativos ({members.length || 1})</CardTitle>
          <CardDescription>Pessoas com acesso ao histórico, rotina e tarefas da família.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
            </div>
          ) : members.length > 0 ? (
            <div className="divide-y divide-stone-100">
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
                        <p className="font-semibold text-stone-900 text-sm">{displayName}</p>
                        <p className="text-xs text-stone-500 flex items-center gap-1.5 mt-0.5">
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
                        <Badge variant="secondary" className="bg-amber-50 text-amber-700 text-xs">
                          Convite Pendente
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                          Ativo
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Current user card if no members table entries yet */
            <div className="py-4 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-base">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <p className="font-semibold text-stone-900 text-sm">{user?.user_metadata?.full_name || user?.email}</p>
                  <p className="text-xs text-stone-500">{user?.email}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Proprietário
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Share / Family Guide Card */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-800 text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg">Cuidado Compartilhado</h3>
          <p className="text-emerald-100 text-sm mt-1 max-w-xl">
            Convide irmãos, filhos e cuidadores para que todos recebam notificações de remédios tomados, consultas agendadas e nunca sobrecarreguem uma só pessoa.
          </p>
        </div>
        <Button onClick={copyInviteLink} className="bg-white text-emerald-800 hover:bg-emerald-50 rounded-xl font-semibold flex-shrink-0">
          <Share2 className="h-4 w-4 mr-2" /> Compartilhar Acesso
        </Button>
      </div>
    </div>
  );
}
