import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

/**
 * GET /api/organizations/members?organizationId=...
 * Returns complete family members, cared people, and invitations for the dashboard.
 * Uses admin client to bypass client RLS column stripping.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório' }, { status: 400 });
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
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const admin = createAdminClient();

    // Verify user is an active member or owner of the organization
    const { data: currentMember } = await admin
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    const { data: org } = await admin
      .from('organizations')
      .select('id, name, owner_id')
      .eq('id', organizationId)
      .maybeSingle();

    const isOwner = org?.owner_id === user.id;

    if (!currentMember && !isOwner) {
      return NextResponse.json({ error: 'Acesso negado a esta família' }, { status: 403 });
    }

    // 1. Fetch organization members
    const { data: membersRaw } = await admin
      .from('organization_members')
      .select('id, user_id, role, status, invited_email, created_at, display_name')
      .eq('organization_id', organizationId);

    // Fetch user details for these members
    const userIds = (membersRaw || []).map((m) => m.user_id).filter((id): id is string => Boolean(id));
    let usersMap = new Map<string, { full_name: string | null; email: string | null; avatar_url: string | null }>();

    if (userIds.length > 0) {
      const { data: usersData } = await admin
        .from('users')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      (usersData || []).forEach((u) => {
        usersMap.set(u.id, { full_name: u.full_name, email: u.email, avatar_url: u.avatar_url });
      });
    }

    const members = (membersRaw || []).map((m) => {
      const u = m.user_id ? usersMap.get(m.user_id) : null;
      return {
        ...m,
        users: u || null,
        isOwner: org?.owner_id === m.user_id || m.role === 'owner',
      };
    });

    // 2. Fetch cared people (excluding archived/deleted)
    const { data: caredPeopleRaw } = await admin
      .from('cared_people')
      .select('*')
      .eq('organization_id', organizationId)
      .is('archived_at', null)
      .order('created_at', { ascending: true });

    // Fetch user details for cared people who have linked accounts
    const caredUserIds = (caredPeopleRaw || []).map((cp) => cp.user_id).filter((id): id is string => Boolean(id));
    let caredUsersMap = new Map<string, { full_name: string | null; email: string | null }>();

    if (caredUserIds.length > 0) {
      const { data: cUsers } = await admin
        .from('users')
        .select('id, full_name, email')
        .in('id', caredUserIds);

      (cUsers || []).forEach((u) => {
        caredUsersMap.set(u.id, { full_name: u.full_name, email: u.email });
      });
    }

    // 3. Fetch care invitations (especially pending ones for elderly)
    const { data: careInvitations } = await admin
      .from('care_invitations')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false });

    // Build the enriched cared people with their invitation and account status
    const caredPeople = (caredPeopleRaw || []).map((cp) => {
      const linkedUser = cp.user_id ? caredUsersMap.get(cp.user_id) : null;
      const latestInvite = (careInvitations || []).find(
        (inv) => inv.cared_person_id === cp.id && inv.role === 'cared_person'
      );

      return {
        ...cp,
        linkedUser: linkedUser || null,
        latestInvite: latestInvite || null,
        hasAccount: Boolean(cp.user_id || (latestInvite && latestInvite.status === 'accepted')),
        isInvitePending: Boolean(latestInvite && latestInvite.status === 'pending'),
      };
    });

    return NextResponse.json({
      success: true,
      organization: org,
      members,
      caredPeople,
      careInvitations: careInvitations || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro interno' }, { status: 500 });
  }
}
