export * from './database';

export type UserRole = 'owner' | 'admin' | 'collaborator' | 'caregiver' | 'cared_person';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  locale: string;
  timezone: string;
}

export interface OrganizationMembership {
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: UserRole;
  status: 'active' | 'invited' | 'suspended';
}

export interface AppUser extends UserProfile {
  memberships: OrganizationMembership[];
  currentOrganizationId: string | null;
}
