import { createAdminClient } from '@/lib/supabase/admin';

export interface EntitlementInfo {
  organizationId: string;
  seatLimit: number;
  caredPeopleLimit: number;
  activeMembersCount: number;
  reservedInvitesCount: number;
  totalUsedSeats: number;
  availableSeats: number;
  canInvite: boolean;
  subscriptionStatus: string;
  accessValidUntil: string | null;
  daysRemaining: number;
  isTrial: boolean;
  isTrialExpired: boolean;
  isPaywallBlocked: boolean;
}

/**
 * Calculates current seat consumption and limits for an organization.
 * Rule: used_seats = active members (including owner) + reserved pending invites.
 * Senior users using only the simplified view do not consume a seat.
 */
export async function getOrganizationEntitlements(organizationId: string): Promise<EntitlementInfo> {
  const supabase = createAdminClient();

  // 1. Fetch entitlement record
  let { data: entitlement } = await supabase
    .from('organization_entitlements')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  // If no entitlement record exists, initialize a 30-day Free Trial
  if (!entitlement) {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: created } = await supabase
      .from('organization_entitlements')
      .insert({
        organization_id: organizationId,
        seat_limit: 1,
        cared_people_limit: 2,
        active_members_count: 1,
        reserved_invites_count: 0,
        subscription_status: 'trial',
        access_valid_until: thirtyDaysFromNow,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (created) {
      entitlement = created;
    }
  }

  // 2. Count active members in the organization
  const { count: activeMembersCount } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  // 3. Count pending invitations that have reserved_seat = true
  const { count: reservedInvitesCount } = await supabase
    .from('organization_invitations')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .eq('reserved_seat', true);

  const seatLimit = entitlement?.seat_limit ?? 1;
  const caredPeopleLimit = entitlement?.cared_people_limit ?? 2;
  const activeMembers = activeMembersCount ?? 1; // At least owner
  const reservedInvites = reservedInvitesCount ?? 0;
  const totalUsedSeats = activeMembers + reservedInvites;
  const availableSeats = Math.max(0, seatLimit - totalUsedSeats);

  const rawStatus = entitlement?.subscription_status ?? 'trial';
  const accessValidUntil = entitlement?.access_valid_until ?? null;

  let daysRemaining = 30;
  let isTrialExpired = false;
  let isPaywallBlocked = false;
  const isTrial = rawStatus === 'trial';

  if (rawStatus === 'active') {
    isTrialExpired = false;
    isPaywallBlocked = false;
    daysRemaining = 0;
  } else if (isTrial) {
    if (accessValidUntil) {
      const diffMs = new Date(accessValidUntil).getTime() - Date.now();
      daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
      isTrialExpired = diffMs <= 0;
      isPaywallBlocked = isTrialExpired;
    } else {
      daysRemaining = 30;
      isTrialExpired = false;
      isPaywallBlocked = false;
    }
  } else if (rawStatus === 'canceled' || rawStatus === 'past_due') {
    isTrialExpired = true;
    isPaywallBlocked = true;
    daysRemaining = 0;
  }

  return {
    organizationId,
    seatLimit,
    caredPeopleLimit,
    activeMembersCount: activeMembers,
    reservedInvitesCount: reservedInvites,
    totalUsedSeats,
    availableSeats,
    canInvite: availableSeats > 0 && !isPaywallBlocked,
    subscriptionStatus: isTrialExpired && isTrial ? 'trial_expired' : rawStatus,
    accessValidUntil,
    daysRemaining,
    isTrial,
    isTrialExpired,
    isPaywallBlocked,
  };
}

/**
 * Checks if an organization can issue a new invitation.
 * Throws an error or returns false if limit reached.
 */
export async function assertCanInviteMember(organizationId: string): Promise<void> {
  const entitlements = await getOrganizationEntitlements(organizationId);

  if (!entitlements.canInvite) {
    throw new Error(
      `Limite de assentos atingido (${entitlements.totalUsedSeats}/${entitlements.seatLimit}). Faça um upgrade no plano para convidar novos familiares.`
    );
  }
}

/**
 * Synchronizes and updates the cached active_members_count and reserved_invites_count
 * in organization_entitlements table.
 */
export async function syncOrganizationEntitlementCounts(organizationId: string): Promise<void> {
  const supabase = createAdminClient();
  const info = await getOrganizationEntitlements(organizationId);

  await supabase
    .from('organization_entitlements')
    .upsert({
      organization_id: organizationId,
      seat_limit: info.seatLimit,
      cared_people_limit: info.caredPeopleLimit,
      active_members_count: info.activeMembersCount,
      reserved_invites_count: info.reservedInvitesCount,
      subscription_status: info.subscriptionStatus,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id' });
}
