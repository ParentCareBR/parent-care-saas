/**
 * Permission helpers for Parent Care.
 * All permission checks MUST go through these functions.
 * Client-side usage is for UX only. Always enforce on the server/API level.
 */

import { createClient } from '@/lib/supabase/client';
import { createAdminClient } from '@/lib/supabase/admin';

export type ModuleCode =
  | 'agenda' | 'medicamentos' | 'alimentacao' | 'hidratacao'
  | 'rotina' | 'humor' | 'atividades' | 'autonomia'
  | 'sinais' | 'peso' | 'quedas' | 'feridas' | 'fraldas'
  | 'dispositivos' | 'documentos' | 'despesas' | 'transporte'
  | 'contatos_emergencia' | 'checkin' | 'diario' | 'passagem_turno'
  | 'relatorios' | 'jogos' | 'historico_jogos' | 'fotos' | 'localizacao';

export type PermissionAction =
  | 'can_view' | 'can_create' | 'can_edit_own' | 'can_edit_others'
  | 'can_delete' | 'can_request_change' | 'can_approve' | 'can_export'
  | 'can_share' | 'can_receive_notifications' | 'can_administer';

export type AgendaPolicy =
  | 'view_only' | 'request_only' | 'add_pending_approval'
  | 'add_with_notification' | 'full_admin';

export type MemberRole =
  | 'owner' | 'admin' | 'collaborator' | 'caregiver'
  | 'cared_person' | 'professional' | 'emergency_contact';

export interface UserModulePermission {
  user_id: string;
  cared_person_id: string | null;
  module_code: ModuleCode;
  can_view: boolean;
  can_create: boolean;
  can_edit_own: boolean;
  can_edit_others: boolean;
  can_delete: boolean;
  can_request_change: boolean;
  can_approve: boolean;
  can_export: boolean;
  can_share: boolean;
  can_receive_notifications: boolean;
  can_administer: boolean;
  agenda_policy: AgendaPolicy | null;
}

export interface CaredPersonAccess {
  user_id: string;
  cared_person_id: string;
  is_active: boolean;
}

/**
 * SERVER-SIDE: Check if a user can access a specific cared person.
 * Uses the database function can_access_cared_person().
 */
export async function serverCanAccessCaredPerson(
  userId: string,
  caredPersonId: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.rpc as any)('can_access_cared_person', {
    p_user_id: userId,
    p_cared_person_id: caredPersonId,
  });
  if (error) return false;
  return data === true;
}

/**
 * SERVER-SIDE: Check if a user has a specific module permission.
 */
export async function serverHasModulePermission(
  userId: string,
  caredPersonId: string,
  moduleCode: ModuleCode,
  permission: PermissionAction
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await (supabase.rpc as any)('has_module_permission', {
    p_user_id: userId,
    p_cared_person_id: caredPersonId,
    p_module_code: moduleCode,
    p_permission: permission,
  });
  if (error) return false;
  return data === true;
}

/**
 * SERVER-SIDE: Get the user's role in an organization.
 */
export async function serverGetUserRole(
  userId: string,
  organizationId: string
): Promise<MemberRole | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();
  return (data?.role as MemberRole) || null;
}

/**
 * SERVER-SIDE: Get a user's module permissions for a specific cared person.
 */
export async function serverGetModulePermissions(
  userId: string,
  caredPersonId: string,
  organizationId: string
): Promise<UserModulePermission[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('user_module_permissions')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .or(`cared_person_id.eq.${caredPersonId},cared_person_id.is.null`);
  return (data || []) as unknown as UserModulePermission[];
}

/**
 * SERVER-SIDE: Verify user has access to a cared person in an API route.
 * Throws with a clear message if not.
 */
export async function assertCaredPersonAccess(
  userId: string,
  caredPersonId: string,
  action: string = 'access'
): Promise<void> {
  const hasAccess = await serverCanAccessCaredPerson(userId, caredPersonId);
  if (!hasAccess) {
    throw new Error(
      `Usuário ${userId} não tem permissão para ${action} dados da pessoa cuidada ${caredPersonId}.`
    );
  }
}

/**
 * SERVER-SIDE: Verify user has a module permission in an API route.
 * Throws with a clear message if not.
 */
export async function assertModulePermission(
  userId: string,
  caredPersonId: string,
  moduleCode: ModuleCode,
  permission: PermissionAction
): Promise<void> {
  const hasPerm = await serverHasModulePermission(
    userId, caredPersonId, moduleCode, permission
  );
  if (!hasPerm) {
    throw new Error(
      `Usuário ${userId} não tem permissão '${permission}' no módulo '${moduleCode}' para a pessoa cuidada ${caredPersonId}.`
    );
  }
}

/**
 * SERVER-SIDE: Get all cared people accessible by a user.
 */
export async function serverGetAccessibleCaredPeople(
  userId: string,
  organizationId: string
): Promise<string[]> {
  const supabase = createAdminClient();

  // Check if owner/admin — get all
  const { data: member } = await supabase
    .from('organization_members')
    .select('role')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .single();

  if (member?.role && ['owner', 'admin'].includes(member.role)) {
    const { data: all } = await supabase
      .from('cared_people')
      .select('id')
      .eq('organization_id', organizationId);
    return (all || []).map((cp) => cp.id);
  }

  // Otherwise get explicit grants
  const { data } = await supabase
    .from('user_cared_person_access')
    .select('cared_person_id')
    .eq('user_id', userId)
    .eq('is_active', true);
  return (data || []).map((a) => a.cared_person_id);
}

/**
 * SERVER-SIDE: Check if a user's access is currently valid considering access periods.
 */
export async function serverIsAccessPeriodValid(
  userId: string,
  organizationId: string,
  caredPersonId?: string
): Promise<boolean> {
  const supabase = createAdminClient();

  // Owners and admins are never restricted by access periods
  const role = await serverGetUserRole(userId, organizationId);
  if (role && ['owner', 'admin'].includes(role)) return true;

  // Check active access periods
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const { data: periods } = await supabase
    .from('user_access_periods')
    .select('*')
    .eq('user_id', userId)
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .or(caredPersonId
      ? `cared_person_id.eq.${caredPersonId},cared_person_id.is.null`
      : 'cared_person_id.is.null'
    );

  if (!periods || periods.length === 0) {
    // No access periods defined = permanent access
    return true;
  }

  for (const period of periods) {
    if (period.access_type === 'permanent') return true;

    // Check date range
    if (period.starts_at && new Date(period.starts_at) > now) continue;
    if (period.ends_at && new Date(period.ends_at) < now) continue;

    // Check day of week
    if (period.days_of_week && !period.days_of_week.includes(dayOfWeek)) continue;

    // Check time range
    if (period.time_from && timeStr < period.time_from.slice(0, 5)) continue;
    if (period.time_until && timeStr > period.time_until.slice(0, 5)) continue;

    return true;
  }

  return false;
}

/**
 * CLIENT-SIDE: Get user permissions for a cared person (for UI rendering).
 * These are for UX only. Always verify server-side in API routes.
 */
export async function clientGetPermissions(
  caredPersonId: string,
  organizationId: string
): Promise<UserModulePermission[]> {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from('user_module_permissions')
    .select('*')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .or(`cared_person_id.eq.${caredPersonId},cared_person_id.is.null`);

  return (data || []) as unknown as UserModulePermission[];
}
