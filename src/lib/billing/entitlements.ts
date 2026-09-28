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
export async function getOrganizationEntitlements(
  organizationId: string,
  userSupabaseClient?: any
): Promise<EntitlementInfo> {
  const supabase = userSupabaseClient || createAdminClient();
  const adminSupabase = createAdminClient();

  // 1. Fetch organization record to get the true registration timestamp
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, created_at, trial_ends_at, subscription_status, settings')
    .eq('id', organizationId)
    .maybeSingle();

  // 2. Fetch entitlement record
  let { data: entitlement } = await supabase
    .from('organization_entitlements')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  // If not found with user client, try adminSupabase
  if (!entitlement) {
    try {
      const { data: adminEnt } = await adminSupabase
        .from('organization_entitlements')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();
      if (adminEnt) entitlement = adminEnt;
    } catch {
      // ignore
    }
  }

  // Calculate the TRUE trial expiration date anchored to organization registration:
  const orgCreatedAt = org?.created_at ? new Date(org.created_at) : new Date();
  const trialEnd = org?.trial_ends_at
    ? new Date(org.trial_ends_at)
    : (entitlement?.access_valid_until
        ? new Date(entitlement.access_valid_until)
        : new Date(orgCreatedAt.getTime() + 30 * 24 * 60 * 60 * 1000));

  // Sync trial_ends_at in organizations table if not yet set
  if (org && !org.trial_ends_at) {
    try {
      await adminSupabase
        .from('organizations')
        .update({ trial_ends_at: trialEnd.toISOString() })
        .eq('id', organizationId);
    } catch {
      // ignore
    }
  }

  // If no entitlement record exists, initialize with trialEnd
  if (!entitlement) {
    try {
      const { data: created } = await adminSupabase
        .from('organization_entitlements')
        .insert({
          organization_id: organizationId,
          seat_limit: 1,
          cared_people_limit: 2,
          active_members_count: 1,
          reserved_invites_count: 0,
          subscription_status: 'trial',
          access_valid_until: trialEnd.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (created) {
        entitlement = created;
      }
    } catch {
      // ignore
    }
  }

  // 3. Count active members in the organization
  const { count: activeMembersCount } = await supabase
    .from('organization_members')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active');

  // 4. Count pending invitations that have reserved_seat = true
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

  const rawStatus = entitlement?.subscription_status ?? org?.subscription_status ?? 'trial';
  const accessValidUntil = entitlement?.access_valid_until ?? trialEnd.toISOString();

  let daysRemaining = 30;
  let isTrialExpired = false;
  let isPaywallBlocked = false;
  const isTrial = rawStatus === 'trial';

  if (rawStatus === 'active') {
    isTrialExpired = false;
    isPaywallBlocked = false;
    daysRemaining = 0;
  } else if (isTrial) {
    // Dynamic countdown based on true registration timestamp
    const now = new Date();
    const diffMs = trialEnd.getTime() - now.getTime();
    isTrialExpired = diffMs <= 0;
    isPaywallBlocked = isTrialExpired;
    // Calculate days remaining dynamically:
    daysRemaining = isTrialExpired ? 0 : Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
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
