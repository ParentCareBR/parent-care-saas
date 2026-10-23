import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { recordAudit } from '@/lib/audit';
import { serverGetUserRole, serverGetAccessibleCaredPeople } from '@/lib/permissions';

/**
 * GET /api/permissions?organizationId=...&userId=...&caredPersonId=...
 * Returns module permissions for a user in an organization, optionally filtered by cared person.
 * Only owners/admins can see permissions for other users.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const targetUserId = searchParams.get('userId');
    const caredPersonId = searchParams.get('caredPersonId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const adminSupabase = createAdminClient();
    const callerRole = await serverGetUserRole(user.id, organizationId);

    // Can only view other users' permissions if admin/owner
    const queryUserId = targetUserId ?? user.id;
    if (queryUserId !== user.id && !['owner', 'admin'].includes(callerRole ?? '')) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    let query = adminSupabase
      .from('user_module_permissions')
      .select('*')
      .eq('user_id', queryUserId)
      .eq('organization_id', organizationId)
      .order('module_code');

    if (caredPersonId) {
      query = query.or(`cared_person_id.eq.${caredPersonId},cared_person_id.is.null`);
    }

    const { data: permissions, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Also return the cared people the user has access to
    const accessibleCaredPeople = await serverGetAccessibleCaredPeople(queryUserId, organizationId);

    return NextResponse.json({
      permissions: permissions ?? [],
      accessibleCaredPeople,
      callerRole,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao buscar permissões.' }, { status: 500 });
  }
}

/**
 * PUT /api/permissions
 * Updates module permissions for a user. Caller must be owner or admin.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, userId: targetUserId, caredPersonId, permissions } = body;

    if (!organizationId || !targetUserId || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'organizationId, userId e permissions são obrigatórios.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    // Verify caller is admin/owner
    const callerRole = await serverGetUserRole(user.id, organizationId);
    if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
      return NextResponse.json({ error: 'Apenas administradores podem alterar permissões.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Upsert all permissions in the payload
    const permissionsToUpsert = permissions.map((perm: any) => ({
      organization_id: organizationId,
      user_id: targetUserId,
      cared_person_id: caredPersonId ?? perm.cared_person_id ?? null,
      module_code: perm.module_code,
      can_view: perm.can_view ?? false,
      can_create: perm.can_create ?? false,
      can_edit_own: perm.can_edit_own ?? false,
      can_edit_others: perm.can_edit_others ?? false,
      can_delete: perm.can_delete ?? false,
      can_request_change: perm.can_request_change ?? false,
      can_approve: perm.can_approve ?? false,
      can_export: perm.can_export ?? false,
      can_share: perm.can_share ?? false,
      can_receive_notifications: perm.can_receive_notifications ?? true,
      can_administer: perm.can_administer ?? false,
      agenda_policy: perm.agenda_policy ?? null,
      granted_by: user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertError } = await adminSupabase
      .from('user_module_permissions')
      .upsert(permissionsToUpsert, { onConflict: 'user_id,cared_person_id,module_code' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    // Record critical audit
    await recordAudit({
      organizationId,
      userId: user.id,
      caredPersonId: caredPersonId ?? null,
      moduleCode: 'rotina',
      action: 'update_permissions',
      tableName: 'user_module_permissions',
      newData: { target_user_id: targetUserId, modules_updated: permissions.map((p: any) => p.module_code) },
      description: `Permissões atualizadas para usuário ${targetUserId}`,
      isCritical: true,
    });

    // Notify the target user about permission changes
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    await adminSupabase.from('notifications').insert({
      user_id: targetUserId,
      organization_id: organizationId,
      type: 'info',
      title: 'Permissões atualizadas',
      message: `Suas permissões na família "${org?.name}" foram atualizadas pelo administrador.`,
      link_url: `/${body.locale ?? 'pt-BR'}/dashboard/settings`,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao atualizar permissões.' }, { status: 500 });
  }
}

/**
 * POST /api/permissions/cared-person-access
 * Grants or revokes a user's access to a specific cared person.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, userId: targetUserId, caredPersonId, grant } = body;

    if (!organizationId || !targetUserId || !caredPersonId) {
      return NextResponse.json({ error: 'organizationId, userId e caredPersonId são obrigatórios.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const callerRole = await serverGetUserRole(user.id, organizationId);
    if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
      return NextResponse.json({ error: 'Apenas administradores podem gerenciar acessos.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    if (grant) {
      // Grant access
      await adminSupabase
        .from('user_cared_person_access')
        .upsert({
          organization_id: organizationId,
          user_id: targetUserId,
          cared_person_id: caredPersonId,
          granted_by: user.id,
          is_active: true,
          revoked_at: null,
          revoked_by: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,cared_person_id' });
    } else {
      // Revoke access
      await adminSupabase
        .from('user_cared_person_access')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', targetUserId)
        .eq('cared_person_id', caredPersonId);
    }

    await recordAudit({
      organizationId,
      userId: user.id,
      caredPersonId,
      moduleCode: 'rotina',
      action: grant ? 'grant_cared_person_access' : 'revoke_cared_person_access',
      tableName: 'user_cared_person_access',
      newData: { target_user_id: targetUserId, cared_person_id: caredPersonId, granted: grant },
      description: `Acesso ${grant ? 'concedido' : 'revogado'} para usuário ${targetUserId}`,
      isCritical: true,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao gerenciar acesso.' }, { status: 500 });
  }
}
