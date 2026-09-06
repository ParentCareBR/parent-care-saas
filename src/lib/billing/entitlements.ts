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
}

/**
 * Calculates current seat consumption and limits for an organization.
 * Rule: used_seats = active members (including owner) + reserved pending invites.
 * Senior users using only the simplified view do not consume a seat.
 */
export async function getOrganizationEntitlements(organizationId: string): Promise<EntitlementInfo> {
  const supabase = createAdminClient();

  // 1. Fetch entitlement record
  const { data: entitlement } = await supabase
    .from('organization_entitlements')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

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

  return {
    organizationId,
    seatLimit,
    caredPeopleLimit,
    activeMembersCount: activeMembers,
    reservedInvitesCount: reservedInvites,
    totalUsedSeats,
    availableSeats,
    canInvite: availableSeats > 0,
    subscriptionStatus: entitlement?.subscription_status ?? 'trial',
    accessValidUntil: entitlement?.access_valid_until ?? null,
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
