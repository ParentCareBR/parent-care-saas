import { createAdminClient } from '@/lib/supabase/admin';
import { MODULE_CATALOG } from './modules';

export async function apply_default_role_permissions(
  organizationId: string,
  userId: string,
  role: string,
  caredPersonId?: string | null
): Promise<void> {
  const supabase = createAdminClient();

  // Try database RPC first
  try {
    const { error } = await (supabase.rpc as any)('apply_default_role_permissions', {
      p_organization_id: organizationId,
      p_user_id: userId,
      p_role: role,
      p_cared_person_id: caredPersonId ?? null,
    });
    if (!error) return;
  } catch {
    // Fall back to direct insertion
  }

  // Fallback: Direct batch insertion
  const isOwnerOrAdmin = ['owner', 'admin'].includes(role);
  const isCaregiver = role === 'caregiver';
  const isCollaborator = ['collaborator', 'family_member'].includes(role);
  const isCaredPerson = role === 'cared_person';

  const caregiverWriteModules = [
    'rotina', 'alimentacao', 'hidratacao', 'atividades', 'checkin',
    'diario', 'passagem_turno', 'sinais', 'peso', 'quedas', 'feridas', 'fraldas',
  ];

  const collaboratorWriteModules = ['agenda', 'checkin', 'diario', 'fotos'];
  const caredPersonWriteModules = ['checkin', 'diario', 'jogos', 'hidratacao'];

  const rows = MODULE_CATALOG.map((mod) => {
    let canView = true;
    let canCreate = false;
    let canEditOwn = false;
    let canEditOthers = false;
    let canDelete = false;
    let canRequest = false;
    let canApprove = false;
    let canExport = false;
    let canShare = false;
    let canNotify = true;
    let canAdmin = false;
    let agendaPolicy = 'view_only';

    if (isOwnerOrAdmin) {
      canView = true;
      canCreate = true;
      canEditOwn = true;
      canEditOthers = true;
      canDelete = true;
      canRequest = true;
      canApprove = true;
      canExport = true;
      canShare = true;
      canNotify = true;
      canAdmin = true;
      agendaPolicy = 'full_admin';
    } else if (isCaregiver) {
      // Caregivers cannot see private family finances or private family docs by default
      const isPrivateFamily = ['despesas', 'documentos'].includes(mod.code);
      canView = !isPrivateFamily;
      canCreate = caregiverWriteModules.includes(mod.code);
      canEditOwn = canCreate;
      canRequest = true; // Caregiver can request medication changes or agenda additions
      canNotify = ['agenda', 'medicamentos', 'rotina', 'passagem_turno', 'checkin'].includes(mod.code);
      agendaPolicy = 'add_with_notification';
    } else if (isCollaborator) {
      canView = true;
      canCreate = collaboratorWriteModules.includes(mod.code);
      canEditOwn = canCreate;
      canRequest = true;
      canNotify = ['agenda', 'checkin', 'relatorios'].includes(mod.code);
      agendaPolicy = 'request_only';
    } else if (isCaredPerson) {
      canView = !['despesas', 'relatorios'].includes(mod.code);
      canCreate = caredPersonWriteModules.includes(mod.code);
      canEditOwn = canCreate;
      canNotify = false;
      agendaPolicy = 'view_only';
    }

    return {
      organization_id: organizationId,
      user_id: userId,
      cared_person_id: caredPersonId ?? null,
      module_code: mod.code,
      can_view: canView,
      can_create: canCreate,
      can_edit_own: canEditOwn,
      can_edit_others: canEditOthers,
      can_delete: canDelete,
      can_request_change: canRequest,
      can_approve: canApprove,
      can_export: canExport,
      can_share: canShare,
      can_receive_notifications: canNotify,
      can_administer: canAdmin,
      agenda_policy: agendaPolicy,
      granted_by: userId,
      updated_at: new Date().toISOString(),
    };
  });

  try {
    await (supabase
      .from('user_module_permissions') as any)
      .upsert(rows, { onConflict: 'user_id,cared_person_id,module_code' });
  } catch (err) {
    console.warn('[Permissions] Fallback insertion error:', err);
  }
}
