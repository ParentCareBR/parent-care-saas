import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationEntitlements } from '@/lib/billing/entitlements';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');

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

    let targetOrgId = orgId;
    if (!targetOrgId) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      targetOrgId = membership?.organization_id;
    }

    if (!targetOrgId) {
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .maybeSingle();

      targetOrgId = ownedOrg?.id;
    }

    // Auto-provision trial organization if user has no org yet
    if (!targetOrgId) {
      const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
      const trialEndsAt = new Date(Date.now() + thirtyDaysMs).toISOString();
      const newOrgId = crypto.randomUUID();
      const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Família';

      try {
        const { data: createdOrg } = await supabase
          .from('organizations')
          .insert({
            id: newOrgId,
            name: `Família de ${name.split(' ')[0]}`,
            slug: `familia-${user.id.slice(0, 5)}-${Date.now()}`,
            owner_id: user.id,
            subscription_status: 'trial',
            trial_ends_at: trialEndsAt,
          })
          .select('id')
          .maybeSingle();

        if (createdOrg) {
          targetOrgId = createdOrg.id;
          await supabase
            .from('organization_members')
            .insert({
              organization_id: targetOrgId,
              user_id: user.id,
              role: 'owner',
              status: 'active',
            });
        }
      } catch {
        // ignore
      }
    }

    if (!targetOrgId) {
      // Fallback for new accounts: guaranteed 30-day trial entitlements
      return NextResponse.json({
        entitlements: {
          organizationId: 'new-account',
          seatLimit: 1,
          caredPeopleLimit: 2,
          activeMembersCount: 1,
          reservedInvitesCount: 0,
          totalUsedSeats: 1,
          availableSeats: 0,
          canInvite: true,
          subscriptionStatus: 'trial',
          accessValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          daysRemaining: 30,
          isTrial: true,
          isTrialExpired: false,
          isPaywallBlocked: false,
        },
      });
    }

    const entitlements = await getOrganizationEntitlements(targetOrgId, supabase);
    return NextResponse.json({ entitlements });

  } catch (error: any) {
    console.error('[API/Entitlements] Error:', error);
    return NextResponse.json({
      entitlements: {
        organizationId: 'fallback',
        seatLimit: 1,
        caredPeopleLimit: 2,
        activeMembersCount: 1,
        reservedInvitesCount: 0,
        totalUsedSeats: 1,
        availableSeats: 0,
        canInvite: true,
        subscriptionStatus: 'trial',
        accessValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        daysRemaining: 30,
        isTrial: true,
        isTrialExpired: false,
        isPaywallBlocked: false,
      },
    });
  }
}
