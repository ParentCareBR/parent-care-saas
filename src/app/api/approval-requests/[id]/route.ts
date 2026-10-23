import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { recordCriticalAudit } from '@/lib/audit';
import { serverGetUserRole } from '@/lib/permissions';

/**
 * PUT /api/approval-requests/[id]
 * Approve or reject an approval request.
 * Caller must be owner or admin.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();
    const { decision, decisionNotes, locale = 'pt-BR' } = body;

    if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    if (!decision || !['approved', 'rejected'].includes(decision)) {
      return NextResponse.json({ error: 'decision deve ser "approved" ou "rejected".' }, { status: 400 });
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

    // Fetch the request
    const { data: approvalRequest, error: fetchError } = await adminSupabase
      .from('approval_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !approvalRequest) {
      return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    }

    if (approvalRequest.status !== 'pending') {
      return NextResponse.json({
        error: `Esta solicitação já foi ${approvalRequest.status === 'approved' ? 'aprovada' : 'processada'}.`,
      }, { status: 409 });
    }

    // Verify caller is admin/owner of the org
    const callerRole = await serverGetUserRole(user.id, approvalRequest.organization_id);
    if (!callerRole || !['owner', 'admin'].includes(callerRole)) {
      return NextResponse.json({ error: 'Apenas administradores podem aprovar ou rejeitar solicitações.' }, { status: 403 });
    }

    // Update the approval request
    const { error: updateError } = await adminSupabase
      .from('approval_requests')
      .update({
        status: decision,
        decided_by: user.id,
        decided_at: new Date().toISOString(),
        decision_notes: decisionNotes ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If approved AND we have table+record info, apply the change automatically
    // This is a safety net — specific modules should handle their own approval flows
    if (decision === 'approved' && approvalRequest.table_name && approvalRequest.record_id && approvalRequest.proposed_data) {
      try {
        // Only update safe tables — never auth.users or permissions directly
        const SAFE_TABLES = [
          'appointments', 'tasks', 'medications', 'medication_schedules',
          'care_notes', 'emergency_contacts', 'shopping_items',
        ];
        if (SAFE_TABLES.includes(approvalRequest.table_name)) {
          await (adminSupabase as any)
            .from(approvalRequest.table_name)
            .upsert({
              id: approvalRequest.record_id,
              ...(approvalRequest.proposed_data as Record<string, any>),
              updated_at: new Date().toISOString(),
            });
        }
      } catch {
        // Non-fatal: the admin can apply manually
      }
    }

    // Notify the requester
    const decisionLabel = decision === 'approved' ? 'aprovada ✅' : 'rejeitada ❌';
    const { data: decider } = await adminSupabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();

    await adminSupabase.from('notifications').insert({
      user_id: approvalRequest.requested_by,
      organization_id: approvalRequest.organization_id,
      type: decision === 'approved' ? 'success' : 'warning',
      title: `Solicitação ${decisionLabel}`,
      message: `Sua solicitação "${approvalRequest.description}" foi ${decisionLabel} por ${decider?.full_name ?? 'um administrador'}.${decisionNotes ? ` Observação: ${decisionNotes}` : ''}`,
      link_url: `/${locale}/dashboard`,
    });

    // Record audit
    await recordCriticalAudit({
      organizationId: approvalRequest.organization_id,
      userId: user.id,
      caredPersonId: approvalRequest.cared_person_id,
      moduleCode: approvalRequest.module_code,
      action: `decision:${decision}`,
      tableName: 'approval_requests',
      recordId: id,
      oldData: { status: 'pending' },
      newData: { status: decision, decision_notes: decisionNotes },
      description: `Solicitação "${approvalRequest.description}" ${decision === 'approved' ? 'aprovada' : 'rejeitada'}`,
      approvalRequestId: id,
    });

    return NextResponse.json({ success: true, decision });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao processar aprovação.' }, { status: 500 });
  }
}

/**
 * GET /api/approval-requests/[id]
 * Returns details of a specific approval request.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const adminSupabase = createAdminClient();

    const { data: request, error } = await adminSupabase
      .from('approval_requests')
      .select(`
        *,
        requester: users!requested_by (full_name),
        decider: users!decided_by (full_name),
        cared_people (full_name, preferred_name)
      `)
      .eq('id', id)
      .single();

    if (error || !request) {
      return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    }

    // Verify access
    const callerRole = await serverGetUserRole(user.id, request.organization_id);
    if (!callerRole) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    // Non-admins can only see their own requests
    if (!['owner', 'admin'].includes(callerRole) && request.requested_by !== user.id) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    return NextResponse.json({ request });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao buscar solicitação.' }, { status: 500 });
  }
}
