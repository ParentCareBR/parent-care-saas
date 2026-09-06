import type { Database } from './database';

export type CaredPersonRow = Database['public']['Tables']['cared_people']['Row'];
export type CaredPersonInsert = Database['public']['Tables']['cared_people']['Insert'];
export type CaredPersonUpdate = Database['public']['Tables']['cared_people']['Update'];

export type CaredPersonContact = Database['public']['Tables']['cared_person_contacts']['Row'];
export type CaredPersonAddress = Database['public']['Tables']['cared_person_addresses']['Row'];
export type CaredPersonInfo = Database['public']['Tables']['cared_person_important_information']['Row'];
export type CaredPersonPreference = Database['public']['Tables']['cared_person_preferences']['Row'];
export type CaredPersonProfessional = Database['public']['Tables']['cared_person_professionals']['Row'];
export type CaredPersonConsent = Database['public']['Tables']['cared_person_consents']['Row'];
export type CaredPersonAuditLog = Database['public']['Tables']['cared_person_audit_logs']['Row'];

export interface CaredPersonFullProfile extends CaredPersonRow {
  contacts: CaredPersonContact[];
  addresses: CaredPersonAddress[];
  important_information: CaredPersonInfo[];
  preferences: CaredPersonPreference[];
  professionals: CaredPersonProfessional[];
  consents: CaredPersonConsent[];
  audit_logs?: CaredPersonAuditLog[];
}

export type ProfileType = 'family_member' | 'professional_care' | 'nursing_home_resident';
export type CaredPersonStatus = 'active' | 'inactive' | 'archived';

export interface OnboardingWizardState {
  // Step 1: Identification
  full_name: string;
  preferred_name: string;
  relationship: string;
  birth_date: string;
  gender_identity: string;
  pronouns: string;
  marital_status: string;
  preferred_language: string;
  timezone: string;
  profile_type: ProfileType;
  notes: string;

  // Step 2: Contact & Location
  phone: string;
  whatsapp: string;
  email: string;
  address_type: string;
  street: string;
  number: string;
  complement: string;
  city: string;
  region: string;
  postal_code: string;
  country_code: string;
  housing_type: string;
  lives_alone: boolean;
  lives_with_family: boolean;
  has_caregiver: boolean;
  receives_scheduled_visits: boolean;
  access_notes: string;

  // Step 3: Emergency Contacts
  contacts: Array<{
    name: string;
    relationship: string;
    phone: string;
    whatsapp: string;
    email: string;
    priority_order: number;
    is_primary: boolean;
    is_emergency: boolean;
    can_receive_notifications: boolean;
    can_view_profile: boolean;
    can_edit_records: boolean;
  }>;

  // Step 4: Important Information
  blood_type: string;
  allergies: string[];
  chronic_conditions: string[];
  mobility_status: string;
  hearing_vision_impairment: string;
  medical_devices: string[];
  health_insurance: {
    plan_name: string;
    policy_number: string;
    hospital_preference: string;
  };

  // Step 5: Routine & Preferences
  wake_time: string;
  sleep_time: string;
  meal_preferences: string;
  activity_preferences: string;
  communication_style: string;
  comfort_actions: string;
  dislikes_or_triggers: string;

  // Step 6: Monitoring Settings (codes)
  enabled_monitoring_codes: string[];

  // Step 7: Simplified Screen Config
  simplified_screen_enabled: boolean;
  simplified_buttons: string[];
  emergency_button_enabled: boolean;

  // Step 8: Consents
  consents: {
    data_processing: boolean;
    emergency_sharing: boolean;
    health_records: boolean;
    professional_care: boolean;
  };
}
