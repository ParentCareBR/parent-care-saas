'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { 
  Shield, Users, Check, AlertCircle, ArrowLeft,
  Save, RefreshCw, Calendar, Eye, Plus, Edit, Trash2, BellRing, Settings
} from 'lucide-react';
import Link from 'next/link';
import { MODULE_CATALOG, ACTION_COLUMNS } from '@/lib/permissions/modules';

export default function FamilyPermissionsPage() {
  const { user, currentOrganizationId } = useAuth();
  const supabase = createClient() as any;
  const { toast } = useToast();
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'pt-BR';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [caredPeople, setCaredPeople] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedCaredPersonId, setSelectedCaredPersonId] = useState<string>('all');
  const [hasPersonAccess, setHasPersonAccess] = useState(true);
  const [permissionGrid, setPermissionGrid] = useState<Record<string, Record<string, boolean>>>({});
  const [agendaPolicies, setAgendaPolicies] = useState<Record<string, string>>({});

  // 1. Fetch initial data (members and cared people)
  const fetchData = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);

    try {
      const [membersRes, caredRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select(`
            user_id, role, status,
            users (id, full_name, email)
          `)
          .eq('organization_id', currentOrganizationId)
          .eq('status', 'active'),
        supabase
          .from('cared_people')
          .select('id, full_name, preferred_name')
          .eq('organization_id', currentOrganizationId),
      ]);

      const memberList = (membersRes.data || []).map((m: any) => ({
        userId: m.user_id,
        role: m.role,
        name: m.users?.full_name || m.users?.email || 'Membro',
        email: m.users?.email,
      }));

      setMembers(memberList);
      setCaredPeople(caredRes.data || []);

      if (memberList.length > 0 && !selectedUserId) {
        setSelectedUserId(memberList[0].userId);
      }
    } finally {
      setLoading(false);
    }
  }, [currentOrganizationId, supabase, selectedUserId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 2. Load permissions for selected user & cared person
  const loadUserPermissions = useCallback(async () => {
    if (!currentOrganizationId || !selectedUserId) return;

    try {
      const caredParam = selectedCaredPersonId === 'all' ? '' : `&caredPersonId=${selectedCaredPersonId}`;
      const res = await fetch(`/api/permissions?organizationId=${currentOrganizationId}&userId=${selectedUserId}${caredParam}`);
      const data = await res.json();

      if (res.ok) {
        const grid: Record<string, Record<string, boolean>> = {};
        const policies: Record<string, string> = {};

        (data.permissions || []).forEach((p: any) => {
          grid[p.module_code] = {
            can_view: p.can_view,
            can_create: p.can_create,
            can_edit_own: p.can_edit_own,
            can_edit_others: p.can_edit_others,
            can_delete: p.can_delete,
            can_request_change: p.can_request_change,
            can_approve: p.can_approve,
            can_export: p.can_export,
            can_share: p.can_share,
            can_receive_notifications: p.can_receive_notifications,
            can_administer: p.can_administer,
          };
          if (p.agenda_policy) {
            policies[p.module_code] = p.agenda_policy;
          }
        });

        setPermissionGrid(grid);
        setAgendaPolicies(policies);

        // Check if user has access to selected cared person
        if (selectedCaredPersonId !== 'all') {
          setHasPersonAccess(data.accessibleCaredPeople.includes(selectedCaredPersonId));
        } else {
          setHasPersonAccess(true);
        }
      }
    } catch {
      // ignore
    }
  }, [currentOrganizationId, selectedUserId, selectedCaredPersonId]);

  useEffect(() => {
    if (selectedUserId) {
      loadUserPermissions();
    }
  }, [selectedUserId, selectedCaredPersonId, loadUserPermissions]);

  // Handle single permission toggle
  const togglePermission = (moduleCode: string, actionKey: string) => {
    setPermissionGrid((prev) => {
      const currentMod = prev[moduleCode] || {};
      return {
        ...prev,
        [moduleCode]: {
          ...currentMod,
          [actionKey]: !currentMod[actionKey],
        },
      };
    });
  };

  // Toggle access to cared person (Grant / Revoke)
  const handleTogglePersonAccess = async () => {
    if (selectedCaredPersonId === 'all' || !currentOrganizationId || !selectedUserId) return;
    const newAccess = !hasPersonAccess;

    try {
      const res = await fetch('/api/permissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          userId: selectedUserId,
          caredPersonId: selectedCaredPersonId,
          grant: newAccess,
        }),
      });

      if (res.ok) {
        setHasPersonAccess(newAccess);
        toast({
          title: newAccess ? 'Acesso concedido' : 'Acesso revogado',
          description: newAccess
            ? 'O membro agora pode acompanhar esta pessoa cuidada.'
            : 'O membro não tem mais acesso a esta pessoa cuidada.',
        });
      }
    } catch {
      toast({ title: 'Erro ao alterar acesso', variant: 'destructive' });
    }
  };

  // Save full permission matrix
  const handleSavePermissions = async () => {
    if (!currentOrganizationId || !selectedUserId) return;
    setSaving(true);

    const payload = MODULE_CATALOG.map((mod) => {
      const modPerms = permissionGrid[mod.code] || {};
      return {
        module_code: mod.code,
        can_view: modPerms.can_view ?? false,
        can_create: modPerms.can_create ?? false,
        can_edit_own: modPerms.can_edit_own ?? false,
        can_edit_others: modPerms.can_edit_others ?? false,
        can_delete: modPerms.can_delete ?? false,
        can_request_change: modPerms.can_request_change ?? false,
        can_approve: modPerms.can_approve ?? false,
        can_export: modPerms.can_export ?? false,
        can_share: modPerms.can_share ?? false,
        can_receive_notifications: modPerms.can_receive_notifications ?? true,
        can_administer: modPerms.can_administer ?? false,
        agenda_policy: agendaPolicies[mod.code] || null,
        cared_person_id: selectedCaredPersonId === 'all' ? null : selectedCaredPersonId,
      };
    });

    try {
      const res = await fetch('/api/permissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          userId: selectedUserId,
          caredPersonId: selectedCaredPersonId === 'all' ? null : selectedCaredPersonId,
          permissions: payload,
          locale,
        }),
      });

      if (res.ok) {
        toast({
          title: '✓ Permissões salvas com sucesso!',
          description: 'As alterações foram registradas e aplicadas imediatamente.',
        });
      } else {
        const err = await res.json();
        toast({ title: 'Erro ao salvar', description: err.error, variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Falha na comunicação', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const selectedMember = members.find((m) => m.userId === selectedUserId);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/${locale}/dashboard/family`}
              className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 text-xs font-bold flex items-center gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Família
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Shield className="h-7 w-7 text-emerald-600" />
            Matriz de Permissões Granulares
          </h1>
          <p className="text-sm text-stone-500 font-medium mt-0.5">
            Defina o que cada membro pode visualizar, criar, editar ou aprovar por pessoa cuidada.
          </p>
        </div>

        <Button
          onClick={handleSavePermissions}
          disabled={saving}
          className="h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black px-6 rounded-2xl shadow-md gap-2"
        >
          {saving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Salvar Permissões
        </Button>
      </div>

      {/* Selectors Card */}
      <Card className="rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm">
        <CardContent className="p-5 grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-stone-500">
              1. Selecionar Membro da Família
            </label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="h-12 rounded-xl font-bold text-base">
                <SelectValue placeholder="Escolha um usuário" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {members.map((m) => (
                  <SelectItem key={m.userId} value={m.userId} className="font-semibold">
                    {m.name} ({m.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-stone-500">
              2. Pessoa Cuidada Afetada
            </label>
            <Select value={selectedCaredPersonId} onValueChange={setSelectedCaredPersonId}>
              <SelectTrigger className="h-12 rounded-xl font-bold text-base">
                <SelectValue placeholder="Todas as pessoas cuidadas" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="all" className="font-semibold">
                  🌐 Todas as pessoas cuidadas (Geral)
                </SelectItem>
                {caredPeople.map((cp) => (
                  <SelectItem key={cp.id} value={cp.id} className="font-semibold">
                    👤 {cp.preferred_name || cp.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Access Gate Banner for specific cared person */}
      {selectedCaredPersonId !== 'all' && (
        <div className={`p-4 rounded-3xl border-2 flex items-center justify-between gap-4 transition-all ${
          hasPersonAccess
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100'
            : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-lg ${
              hasPersonAccess ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
            }`}>
              {hasPersonAccess ? '✓' : '!'}
            </div>
            <div>
              <p className="font-black text-sm">
                {hasPersonAccess ? 'Acesso Ativo a esta Pessoa Cuidada' : 'Acesso Bloqueado para esta Pessoa Cuidada'}
              </p>
              <p className="text-xs opacity-80">
                {hasPersonAccess
                  ? 'Este membro pode acompanhar os módulos habilitados abaixo.'
                  : 'Nenhum dado desta pessoa cuidada será visível para este usuário.'}
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleTogglePersonAccess}
            className="rounded-xl font-bold h-10 text-xs shrink-0"
          >
            {hasPersonAccess ? 'Revogar Acesso' : 'Conceder Acesso'}
          </Button>
        </div>
      )}

      {/* Permissions Matrix Table */}
      <Card className="rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-stone-50 dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 p-4 sm:p-5">
          <CardTitle className="text-lg font-black text-stone-900 dark:text-stone-100 flex items-center gap-2">
            Módulos e Ações Permitidas
          </CardTitle>
          <CardDescription>
            Marque as permissões correspondentes a cada atividade da rotina.
          </CardDescription>
        </CardHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-100/60 dark:bg-stone-900/60 font-black text-stone-600 dark:text-stone-400">
                <th className="p-3 sm:p-4 min-w-[200px]">Módulo</th>
                <th className="p-3 text-center">Ver</th>
                <th className="p-3 text-center">Criar</th>
                <th className="p-3 text-center">Editar</th>
                <th className="p-3 text-center">Excluir</th>
                <th className="p-3 text-center">Solicitar</th>
                <th className="p-3 text-center">Aprovar</th>
                <th className="p-3 text-center">Exportar</th>
                <th className="p-3 text-center">Notificar</th>
                <th className="p-3 text-center">Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
              {MODULE_CATALOG.map((mod) => {
                const perms = permissionGrid[mod.code] || {};
                return (
                  <tr key={mod.code} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                    <td className="p-3 sm:p-4 font-bold text-stone-900 dark:text-stone-100">
                      <div>
                        <span className="block text-sm">{mod.name}</span>
                        <span className="text-[11px] text-stone-400 font-normal">{mod.description}</span>
                      </div>
                    </td>

                    {/* View */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_view ?? false}
                        onChange={() => togglePermission(mod.code, 'can_view')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Create */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_create ?? false}
                        onChange={() => togglePermission(mod.code, 'can_create')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Edit Own */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_edit_own ?? false}
                        onChange={() => togglePermission(mod.code, 'can_edit_own')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Delete */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_delete ?? false}
                        onChange={() => togglePermission(mod.code, 'can_delete')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Request Change */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_request_change ?? false}
                        onChange={() => togglePermission(mod.code, 'can_request_change')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Approve */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_approve ?? false}
                        onChange={() => togglePermission(mod.code, 'can_approve')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Export */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_export ?? false}
                        onChange={() => togglePermission(mod.code, 'can_export')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Notify */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_receive_notifications ?? true}
                        onChange={() => togglePermission(mod.code, 'can_receive_notifications')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>

                    {/* Admin */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={perms.can_administer ?? false}
                        onChange={() => togglePermission(mod.code, 'can_administer')}
                        className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
