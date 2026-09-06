import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { getOrganizationEntitlements, syncOrganizationEntitlementCounts } from '@/lib/billing/entitlements';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 });
    }

    const entitlements = await getOrganizationEntitlements(organizationId);

    const supabase = createAdminClient();
    const { data: invitations } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    return NextResponse.json({
      entitlements,
      invitations: invitations || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao carregar convites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { organizationId, email, role = 'collaborator' } = await req.json();

    if (!organizationId || !email) {
      return NextResponse.json({ error: 'Organização e e-mail são obrigatórios.' }, { status: 400 });
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

    // Check membership
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Apenas proprietários ou administradores podem convidar membros.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // 1. Verify seat quota server-side
    const entitlements = await getOrganizationEntitlements(organizationId);
    if (!entitlements.canInvite) {
      return NextResponse.json({
        error: `Limite de assentos atingido (${entitlements.totalUsedSeats}/${entitlements.seatLimit} assentos ocupados). Faça um upgrade no seu plano Paddle para convidar novos familiares.`,
        limitReached: true,
        entitlements,
      }, { status: 403 });
    }

    // 2. Check if already member or invited
    const normalizedEmail = email.toLowerCase().trim();
    const { data: existingInvite } = await adminSupabase
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('invited_email', normalizedEmail)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInvite) {
      return NextResponse.json({ error: 'Já existe um convite pendente para este e-mail.' }, { status: 400 });
    }

    // 3. Create invitation row with reserved_seat: true
    const { data: invite, error: inviteError } = await adminSupabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        invited_email: normalizedEmail,
        role,
        status: 'pending',
        reserved_seat: true,
        invited_by: user.id,
      })
      .select()
      .single();

    if (inviteError) {
      return NextResponse.json({ error: inviteError.message }, { status: 500 });
    }

    // Also insert into organization_members with status = 'invited'
    await adminSupabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: user.id, // linked until claimed
        invited_email: normalizedEmail,
        role,
        status: 'invited',
      });

    // 4. Sync entitlements count
    await syncOrganizationEntitlementCounts(organizationId);

    return NextResponse.json({
      success: true,
      message: `Convite enviado para ${normalizedEmail}. 1 assento reservado.`,
      invitation: invite,
    }, { status: 201 });
  } catch (error: any) {
    console.error('[Create Invitation Error]:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao enviar convite.' }, { status: 500 });
  }
}
