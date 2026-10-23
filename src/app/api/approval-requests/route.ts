import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { recordAudit } from '@/lib/audit';
import { serverGetUserRole, serverCanAccessCaredPerson } from '@/lib/permissions';

/**
 * GET /api/approval-requests?organizationId=...&status=pending
 * Lists approval requests for an organization.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status') ?? 'pending';
    const caredPersonId = searchParams.get('caredPersonId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const adminSupabase = createAdminClient();
    const callerRole = await serverGetUserRole(user.id, organizationId);
    if (!callerRole) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

    let query = adminSupabase
      .from('approval_requests')
      .select(`
        id, module_code, action, description, status, proposed_data,
        current_data, created_at, updated_at, expires_at,
        decided_at, decision_notes, is_critical: requires_admin_approval,
        requested_by, decided_by, cared_person_id, table_name, record_id,
        requester: users!requested_by (full_name, email: users(email)),
        decider: users!decided_by (full_name),
        cared_people (full_name, preferred_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Non-admins only see their own requests
    if (!['owner', 'admin'].includes(callerRole)) {
      query = query.eq('requested_by', user.id);
    } else if (caredPersonId) {
      query = query.eq('cared_person_id', caredPersonId);
    }

    const { data: requests, error } = await query.limit(100);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ requests: requests ?? [], callerRole });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao buscar aprovações.' }, { status: 500 });
  }
}

/**
 * POST /api/approval-requests
 * Creates a new approval request.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationId, caredPersonId, moduleCode, action,
      tableName, recordId, proposedData, currentData, description,
    } = body;

    if (!organizationId || !moduleCode || !action || !description) {
      return NextResponse.json({ error: 'organizationId, moduleCode, action e description são obrigatórios.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const callerRole = await serverGetUserRole(user.id, organizationId);
    if (!callerRole) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

    // Verify access to cared person
    if (caredPersonId) {
      const hasAccess = await serverCanAccessCaredPerson(user.id, caredPersonId);
      if (!hasAccess) return NextResponse.json({ error: 'Acesso negado a esta pessoa cuidada.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    const { data: request, error } = await adminSupabase
      .from('approval_requests')
      .insert({
        organization_id: organizationId,
        cared_person_id: caredPersonId ?? null,
        requested_by: user.id,
        module_code: moduleCode,
        action,
        table_name: tableName ?? null,
        record_id: recordId ?? null,
        proposed_data: proposedData ?? null,
        current_data: currentData ?? null,
        description,
        status: 'pending',
        requires_admin_approval: true,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (error || !request) {
      return NextResponse.json({ error: error?.message ?? 'Erro ao criar solicitação.' }, { status: 500 });
    }

    // Notify admins
    const { data: admins } = await adminSupabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('role', ['owner', 'admin'])
      .eq('status', 'active')
      .neq('user_id', user.id);

    const { data: requester } = await adminSupabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { data: caredPerson } = caredPersonId
      ? await adminSupabase.from('cared_people').select('full_name').eq('id', caredPersonId).single()
      : { data: null };

    if (admins && admins.length > 0) {
      const notifPayload = admins.map((a) => ({
        user_id: a.user_id,
        organization_id: organizationId,
        type: 'warning',
        title: '⏳ Solicitação aguardando aprovação',
        message: `${requester?.full_name ?? 'Um usuário'} solicitou: ${description}${caredPerson ? ` (${caredPerson.full_name})` : ''}`,
        link_url: `/${body.locale ?? 'pt-BR'}/dashboard/approvals`,
      }));

      await adminSupabase.from('notifications').insert(notifPayload);
    }

    await recordAudit({
      organizationId,
      userId: user.id,
      caredPersonId: caredPersonId ?? null,
      moduleCode,
      action: `request_approval:${action}`,
      tableName,
      recordId,
      newData: proposedData,
      oldData: currentData,
      description,
      approvalRequestId: request.id,
    });

    return NextResponse.json({ success: true, requestId: request.id });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar solicitação.' }, { status: 500 });
  }
}
