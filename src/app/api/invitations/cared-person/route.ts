import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { recordAudit } from '@/lib/audit';
import { syncOrganizationEntitlementCounts } from '@/lib/billing/entitlements';

/**
 * POST /api/invitations/cared-person
 * Creates a new invitation for a cared person to create their own account.
 * The invitation can be sent by email, generated as a link, or a temporary code.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      organizationId,
      caredPersonId,
      invitedEmail,
      invitedPhone,
      preferredLanguage = 'pt-BR',
      personalMessage,
      role = 'cared_person',
    } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório.' }, { status: 400 });
    }

    const VALID_ROLES = ['cared_person', 'collaborator', 'caregiver', 'professional', 'emergency_contact'];
    if (!VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: `Perfil inválido: ${role}` }, { status: 400 });
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
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify invoker is owner or admin of the org
    const { data: member } = await adminSupabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json(
        { error: 'Apenas proprietários ou administradores podem criar convites.' },
        { status: 403 }
      );
    }

    // If caredPersonId provided, verify it belongs to this org
    if (caredPersonId) {
      const { data: cp } = await adminSupabase
        .from('cared_people')
        .select('id, full_name')
        .eq('id', caredPersonId)
        .eq('organization_id', organizationId)
        .single();

      if (!cp) {
        return NextResponse.json({ error: 'Pessoa cuidada não encontrada nesta família.' }, { status: 404 });
      }
    }

    // Cancel any existing pending invitations for the same email/cared person
    if (invitedEmail && caredPersonId) {
      await adminSupabase
        .from('care_invitations')
        .update({ status: 'canceled', canceled_at: new Date().toISOString(), canceled_by: user.id })
        .eq('organization_id', organizationId)
        .eq('cared_person_id', caredPersonId)
        .eq('status', 'pending');
    }

    // Create the invitation
    const { data: invitation, error: inviteError } = await adminSupabase
      .from('care_invitations')
      .insert({
        organization_id: organizationId,
        cared_person_id: caredPersonId ?? null,
        invited_by: user.id,
        role,
        invited_email: invitedEmail ?? null,
        invited_phone: invitedPhone ?? null,
        preferred_language: preferredLanguage,
        message: personalMessage ?? null,
        status: 'pending',
        reserved_seat: role !== 'cared_person', // cared_person doesn't consume a seat
        token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select('id, token, token_expires_at, role, invited_email, cared_person_id')
      .single();

    if (inviteError || !invitation) {
      return NextResponse.json(
        { error: inviteError?.message ?? 'Erro ao criar convite.' },
        { status: 500 }
      );
    }

    // Build the invitation URL
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? `https://parentcare-pink.vercel.app`;
    const inviteUrl = `${baseUrl}/${preferredLanguage}/auth/accept-invitation/${invitation.token}`;

    // Record audit
    await recordAudit({
      organizationId,
      userId: user.id,
      caredPersonId: caredPersonId ?? null,
      moduleCode: 'rotina',
      action: 'create_invitation',
      tableName: 'care_invitations',
      recordId: invitation.id,
      newData: { role, invited_email: invitedEmail, preferred_language: preferredLanguage },
      description: `Convite criado para ${role}${invitedEmail ? ` (${invitedEmail})` : ''}`,
      isCritical: false,
    });

    // Sync entitlements if a seat is being reserved
    if (invitation && role !== 'cared_person') {
      syncOrganizationEntitlementCounts(organizationId).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        token: invitation.token,
        inviteUrl,
        role: invitation.role,
        invitedEmail: invitation.invited_email,
        expiresAt: invitation.token_expires_at,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao criar convite.' }, { status: 500 });
  }
}

/**
 * GET /api/invitations/cared-person?organizationId=...
 * Lists all care invitations for an organization.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

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
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Verify membership
    const { data: member } = await adminSupabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }

    const { data: invitations } = await adminSupabase
      .from('care_invitations')
      .select(`
        id, token, role, invited_email, invited_phone, status,
        preferred_language, message, reserved_seat,
        token_expires_at, created_at, accepted_at,
        cared_person_id,
        cared_people (full_name)
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    return NextResponse.json({ invitations: invitations ?? [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao listar convites.' }, { status: 500 });
  }
}
