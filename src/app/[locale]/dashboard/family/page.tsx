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
import { Users, UserPlus, Mail, Shield, Share2, Check, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

export default function FamilyPage() {
  const { user, currentOrganizationId } = useAuth();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;
  const { toast } = useToast();

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    role: 'collaborator',
  });

  const fetchMembers = useCallback(async () => {
    if (!currentOrganizationId) {
      setLoading(false);
      return;
    }
    setLoading(true);

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
      console.error('Erro ao buscar membros:', error);
      // Fallback: If joined query fails due to RLS, fetch members directly
      const { data: rawMembers } = await supabase
        .from('organization_members')
        .select('*')
        .eq('organization_id', currentOrganizationId);

      if (rawMembers) {
        setMembers(rawMembers);
      }
    } else if (data) {
      setMembers(data);
    }
    setLoading(false);
  }, [currentOrganizationId, supabase]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganizationId) return;

    const { error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: currentOrganizationId,
        user_id: user?.id, // Temporary link until accepted
        invited_email: inviteForm.email,
        role: inviteForm.role,
        status: 'invited',
      });

    if (error) {
      toast({ title: 'Erro ao convidar', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Convite enviado!', description: `Convite enviado para ${inviteForm.email}.` });
      setInviteOpen(false);
      setInviteForm({ name: '', email: '', role: 'collaborator' });
      fetchMembers();
    }
  };

  const copyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/pt-BR/auth/signup?ref=${currentOrganizationId}`;
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

          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-xl">
                <UserPlus className="h-4 w-4 mr-2" /> Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <form onSubmit={handleInvite}>
                <DialogHeader>
                  <DialogTitle>Convidar Familiar ou Cuidador</DialogTitle>
                  <DialogDescription>
                    Envie um convite para que outro membro da família acompanhe o dia a dia.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome (opcional)</Label>
                    <Input 
                      id="name" 
                      placeholder="Ex: Tio João, Enfermeira Ana"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>

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
                </div>

                <DialogFooter>
                  <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700">Enviar Convite</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

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
