export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// Supabase requires this exact structure for the generic type to work with from()
export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; full_name: string | null; avatar_url: string | null; };
        Insert: { id?: string; email: string; full_name?: string | null; avatar_url?: string | null; };
        Update: { id?: string; email?: string; full_name?: string | null; avatar_url?: string | null; };
        Relationships: [];
      };
      organizations: {
        Row: { id: string; name: string; slug: string; owner_id: string; subscription_status: string | null; plan_id: string | null; trial_ends_at?: string | null; paddle_customer_id?: string | null; settings?: Json | null; created_at?: string | null; updated_at?: string | null; };
        Insert: { id?: string; name: string; slug: string; owner_id: string; subscription_status?: string | null; plan_id?: string | null; trial_ends_at?: string | null; paddle_customer_id?: string | null; settings?: Json | null; created_at?: string | null; updated_at?: string | null; };
        Update: { id?: string; name?: string; slug?: string; owner_id?: string; subscription_status?: string | null; plan_id?: string | null; trial_ends_at?: string | null; paddle_customer_id?: string | null; settings?: Json | null; created_at?: string | null; updated_at?: string | null; };
        Relationships: [];
      };
      organization_members: {
        Row: { id: string; organization_id: string; user_id: string; role: string; status: string; invited_email?: string | null; invited_at?: string | null; joined_at?: string | null; created_at?: string; };
        Insert: { id?: string; organization_id: string; user_id: string; role: string; status?: string; invited_email?: string | null; invited_at?: string | null; joined_at?: string | null; created_at?: string; };
        Update: { id?: string; organization_id?: string; user_id?: string; role?: string; status?: string; invited_email?: string | null; invited_at?: string | null; joined_at?: string | null; };
        Relationships: [];
      };
      cared_people: {
        Row: { id: string; organization_id: string; user_id: string | null; full_name: string; birth_date: string | null; photo_url: string | null; blood_type: string | null; };
        Insert: { id?: string; organization_id: string; user_id?: string | null; full_name: string; birth_date?: string | null; photo_url?: string | null; blood_type?: string | null; };
        Update: { id?: string; organization_id?: string; user_id?: string | null; full_name?: string; birth_date?: string | null; photo_url?: string | null; blood_type?: string | null; };
        Relationships: [];
      };
      medications: {
        Row: { id: string; cared_person_id: string; organization_id: string; name: string; dosage: string; unit: string; instructions: string | null; is_active: boolean; created_by: string | null; created_at: string; };
        Insert: { id?: string; cared_person_id: string; organization_id: string; name: string; dosage: string; unit: string; instructions?: string | null; is_active?: boolean; created_by?: string | null; created_at?: string; };
        Update: { id?: string; cared_person_id?: string; organization_id?: string; name?: string; dosage?: string; unit?: string; instructions?: string | null; is_active?: boolean; created_by?: string | null; };
        Relationships: [];
      };
      meals: {
        Row: { id: string; organization_id: string; cared_person_id: string; meal_type: string; description: string | null; consumed_at: string; logged_by: string; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; meal_type: string; description?: string | null; consumed_at?: string; logged_by: string; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; meal_type?: string; description?: string | null; consumed_at?: string; logged_by?: string; };
        Relationships: [];
      };
      hydration_logs: {
        Row: { id: string; organization_id: string; cared_person_id: string; amount_ml: number; logged_at: string; logged_by: string; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; amount_ml: number; logged_at?: string; logged_by: string; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; amount_ml?: number; logged_at?: string; logged_by?: string; };
        Relationships: [];
      };
      appointments: {
        Row: { id: string; organization_id: string; cared_person_id: string; title: string; description: string | null; starts_at: string; doctor_name: string | null; status: string; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; title: string; description?: string | null; starts_at: string; doctor_name?: string | null; status?: string; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; title?: string; description?: string | null; starts_at?: string; doctor_name?: string | null; status?: string; };
        Relationships: [];
      };
      tasks: {
        Row: { id: string; organization_id: string; cared_person_id: string | null; title: string; status: string; due_date: string | null; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id?: string | null; title: string; status?: string; due_date?: string | null; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string | null; title?: string; status?: string; due_date?: string | null; };
        Relationships: [];
      };
      check_ins: {
        Row: { id: string; organization_id: string; cared_person_id: string; checked_by: string | null; mood: string | null; notes: string | null; checked_at: string; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; checked_by?: string | null; mood?: string | null; notes?: string | null; checked_at?: string; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; checked_by?: string | null; mood?: string | null; notes?: string | null; checked_at?: string; };
        Relationships: [];
      };
      emergency_events: {
        Row: { id: string; organization_id: string; cared_person_id: string; reported_by: string | null; description: string; severity: string; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; reported_by?: string | null; description: string; severity?: string; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; reported_by?: string | null; description?: string; severity?: string; };
        Relationships: [];
      };
      help_requests: {
        Row: { id: string; organization_id: string; cared_person_id: string; requested_by: string | null; message: string; status: string; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; requested_by?: string | null; message: string; status?: string; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; requested_by?: string | null; message?: string; status?: string; };
        Relationships: [];
      };
      expenses: {
        Row: { id: string; organization_id: string; cared_person_id: string | null; category: string; description: string; amount: number; currency: string; paid_at: string | null; paid_by: string | null; receipt_url: string | null; created_by: string; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id?: string | null; category: string; description: string; amount: number; currency?: string; paid_at?: string | null; paid_by?: string | null; receipt_url?: string | null; created_by: string; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string | null; category?: string; description?: string; amount?: number; currency?: string; paid_at?: string | null; paid_by?: string | null; receipt_url?: string | null; created_by?: string; created_at?: string; };
        Relationships: [];
      };
      plans: {
        Row: { id: string; name: string; slug: string; description: string | null; max_cared_people: number; max_members: number; is_active: boolean; trial_days: number; created_at: string; };
        Insert: { id?: string; name: string; slug: string; description?: string | null; max_cared_people: number; max_members: number; is_active?: boolean; trial_days?: number; created_at?: string; };
        Update: { id?: string; name?: string; slug?: string; description?: string | null; max_cared_people?: number; max_members?: number; is_active?: boolean; trial_days?: number; };
        Relationships: [];
      };
      plan_prices: {
        Row: { id: string; plan_id: string; currency: string; monthly_price: number; yearly_price: number; paddle_price_monthly_id?: string | null; paddle_price_yearly_id?: string | null; created_at: string; };
        Insert: { id?: string; plan_id: string; currency: string; monthly_price: number; yearly_price: number; paddle_price_monthly_id?: string | null; paddle_price_yearly_id?: string | null; created_at?: string; };
        Update: { id?: string; plan_id?: string; currency?: string; monthly_price?: number; yearly_price?: number; paddle_price_monthly_id?: string | null; paddle_price_yearly_id?: string | null; };
        Relationships: [];
      };
      subscriptions: {
        Row: { id: string; organization_id: string; plan_id?: string | null; status: string; gateway?: string; paddle_customer_id?: string | null; paddle_subscription_id?: string | null; cancel_at_period_end?: boolean | null; grace_period_ends_at?: string | null; cancel_reason?: string | null; trial_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null; created_at?: string; updated_at?: string | null; };
        Insert: { id?: string; organization_id: string; plan_id?: string | null; status?: string; gateway?: string; paddle_customer_id?: string | null; paddle_subscription_id?: string | null; cancel_at_period_end?: boolean | null; grace_period_ends_at?: string | null; cancel_reason?: string | null; trial_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null; created_at?: string; updated_at?: string | null; };
        Update: { id?: string; organization_id?: string; plan_id?: string | null; status?: string; gateway?: string; paddle_customer_id?: string | null; paddle_subscription_id?: string | null; cancel_at_period_end?: boolean | null; grace_period_ends_at?: string | null; cancel_reason?: string | null; trial_ends_at?: string | null; current_period_start?: string | null; current_period_end?: string | null; updated_at?: string | null; };
        Relationships: [];
      };
      billing_customers: {
        Row: { id: string; organization_id: string; owner_user_id: string | null; paddle_customer_id: string; email: string; country_code: string | null; preferred_currency: string; created_at: string; updated_at: string; };
        Insert: { id?: string; organization_id: string; owner_user_id?: string | null; paddle_customer_id: string; email: string; country_code?: string | null; preferred_currency?: string; created_at?: string; updated_at?: string; };
        Update: { id?: string; organization_id?: string; owner_user_id?: string | null; paddle_customer_id?: string; email?: string; country_code?: string | null; preferred_currency?: string; updated_at?: string; };
        Relationships: [];
      };
      billing_subscriptions: {
        Row: { id: string; organization_id: string; paddle_subscription_id: string; paddle_customer_id: string; paddle_product_id: string | null; paddle_price_id: string; status: string; seat_limit: number; cared_people_limit: number; currency_code: string; unit_price: number; recurring_total: number; billing_interval: string; current_period_start: string; current_period_end: string; next_billed_at: string | null; canceled_at: string | null; scheduled_change: Json | null; created_at: string; updated_at: string; };
        Insert: { id?: string; organization_id: string; paddle_subscription_id: string; paddle_customer_id: string; paddle_product_id?: string | null; paddle_price_id: string; status?: string; seat_limit?: number; cared_people_limit?: number; currency_code?: string; unit_price?: number; recurring_total?: number; billing_interval?: string; current_period_start?: string; current_period_end?: string; next_billed_at?: string | null; canceled_at?: string | null; scheduled_change?: Json | null; created_at?: string; updated_at?: string; };
        Update: { id?: string; organization_id?: string; paddle_subscription_id?: string; paddle_customer_id?: string; paddle_product_id?: string | null; paddle_price_id?: string; status?: string; seat_limit?: number; cared_people_limit?: number; currency_code?: string; unit_price?: number; recurring_total?: number; billing_interval?: string; current_period_start?: string; current_period_end?: string; next_billed_at?: string | null; canceled_at?: string | null; scheduled_change?: Json | null; updated_at?: string; };
        Relationships: [];
      };
      billing_price_mappings: {
        Row: { id: string; environment: string; seat_quantity: number; paddle_product_id: string | null; paddle_price_id: string; billing_interval: string; cared_people_limit: number; unit_price_brl: number; total_monthly_brl: number; status: string; created_at: string; updated_at: string; };
        Insert: { id?: string; environment?: string; seat_quantity: number; paddle_product_id?: string | null; paddle_price_id: string; billing_interval?: string; cared_people_limit?: number; unit_price_brl: number; total_monthly_brl: number; status?: string; created_at?: string; updated_at?: string; };
        Update: { id?: string; environment?: string; seat_quantity?: number; paddle_product_id?: string | null; paddle_price_id?: string; billing_interval?: string; cared_people_limit?: number; unit_price_brl?: number; total_monthly_brl?: number; status?: string; updated_at?: string; };
        Relationships: [];
      };
      billing_events: {
        Row: { id: string; paddle_event_id: string; event_type: string; occurred_at: string | null; processed_at: string; status: string; attempts: number; error_message: string | null; payload: Json; created_at: string; };
        Insert: { id?: string; paddle_event_id: string; event_type: string; occurred_at?: string | null; processed_at?: string; status?: string; attempts?: number; error_message?: string | null; payload: Json; created_at?: string; };
        Update: { id?: string; paddle_event_id?: string; event_type?: string; occurred_at?: string | null; processed_at?: string; status?: string; attempts?: number; error_message?: string | null; payload?: Json; };
        Relationships: [];
      };
      organization_entitlements: {
        Row: { organization_id: string; subscription_id: string | null; seat_limit: number; cared_people_limit: number; active_members_count: number; reserved_invites_count: number; subscription_status: string; access_valid_until: string; updated_at: string; };
        Insert: { organization_id: string; subscription_id?: string | null; seat_limit?: number; cared_people_limit?: number; active_members_count?: number; reserved_invites_count?: number; subscription_status?: string; access_valid_until?: string; updated_at?: string; };
        Update: { organization_id?: string; subscription_id?: string | null; seat_limit?: number; cared_people_limit?: number; active_members_count?: number; reserved_invites_count?: number; subscription_status?: string; access_valid_until?: string; updated_at?: string; };
        Relationships: [];
      };
      organization_invitations: {
        Row: { id: string; organization_id: string; invited_email: string; role: string; status: string; expires_at: string; reserved_seat: boolean; invited_by: string | null; accepted_by: string | null; created_at: string; accepted_at: string | null; canceled_at: string | null; };
        Insert: { id?: string; organization_id: string; invited_email: string; role?: string; status?: string; expires_at?: string; reserved_seat?: boolean; invited_by?: string | null; accepted_by?: string | null; created_at?: string; accepted_at?: string | null; canceled_at?: string | null; };
        Update: { id?: string; organization_id?: string; invited_email?: string; role?: string; status?: string; expires_at?: string; reserved_seat?: boolean; invited_by?: string | null; accepted_by?: string | null; accepted_at?: string | null; canceled_at?: string | null; };
        Relationships: [];
      };
      billing_history: {
        Row: { id: string; organization_id: string; subscription_id: string | null; gateway: string; gateway_invoice_id: string | null; amount_due: number; amount_paid: number; currency: string; status: string; invoice_pdf_url: string | null; created_at: string; paid_at: string | null; };
        Insert: { id?: string; organization_id: string; subscription_id?: string | null; gateway?: string; gateway_invoice_id?: string | null; amount_due: number; amount_paid: number; currency: string; status: string; invoice_pdf_url?: string | null; created_at?: string; paid_at?: string | null; };
        Update: { id?: string; organization_id?: string; subscription_id?: string | null; gateway?: string; gateway_invoice_id?: string | null; amount_due?: number; amount_paid?: number; currency?: string; status?: string; invoice_pdf_url?: string | null; paid_at?: string | null; };
        Relationships: [];
      };
      gateway_events: {
        Row: { id: string; gateway: string; event_id: string; event_type: string; payload: Json; processed_at: string; };
        Insert: { id?: string; gateway: string; event_id: string; event_type: string; payload: Json; processed_at?: string; };
        Update: { id?: string; gateway?: string; event_id?: string; event_type?: string; payload?: Json; processed_at?: string; };
        Relationships: [];
      };
      notifications: {
        Row: { id: string; user_id: string; organization_id: string | null; type: string; title: string; message: string; link_url: string | null; read_at: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; organization_id?: string | null; type?: string; title: string; message: string; link_url?: string | null; read_at?: string | null; created_at?: string; };
        Update: { id?: string; user_id?: string; organization_id?: string | null; type?: string; title?: string; message?: string; link_url?: string | null; read_at?: string | null; };
        Relationships: [];
      };
      audit_logs: {
        Row: { id: string; organization_id: string | null; user_id: string | null; action: string; table_name: string | null; record_id: string | null; old_data: Json | null; new_data: Json | null; ip_address: string | null; created_at: string; };
        Insert: { id?: string; organization_id?: string | null; user_id?: string | null; action: string; table_name?: string | null; record_id?: string | null; old_data?: Json | null; new_data?: Json | null; ip_address?: string | null; created_at?: string; };
        Update: { id?: string; organization_id?: string | null; user_id?: string | null; action?: string; table_name?: string | null; record_id?: string | null; old_data?: Json | null; new_data?: Json | null; ip_address?: string | null; };
        Relationships: [];
      };
      medication_confirmations: {
        Row: { id: string; organization_id: string; cared_person_id: string; medication_id: string; schedule_id: string | null; confirmed_by: string; confirmed_at: string; status: string; notes: string | null; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; medication_id: string; schedule_id?: string | null; confirmed_by: string; confirmed_at?: string; status?: string; notes?: string | null; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; medication_id?: string; schedule_id?: string | null; confirmed_by?: string; confirmed_at?: string; status?: string; notes?: string | null; };
        Relationships: [];
      };
      emergency_contacts: {
        Row: { id: string; cared_person_id: string; organization_id: string; name: string; relationship: string; phone: string; is_primary: boolean; created_at: string; };
        Insert: { id?: string; cared_person_id: string; organization_id: string; name: string; relationship: string; phone: string; is_primary?: boolean; created_at?: string; };
        Update: { id?: string; cared_person_id?: string; organization_id?: string; name?: string; relationship?: string; phone?: string; is_primary?: boolean; };
        Relationships: [];
      };
      care_notes: {
        Row: { id: string; cared_person_id: string; organization_id: string; author_id: string; content: string; type: string; created_at: string; updated_at: string; };
        Insert: { id?: string; cared_person_id: string; organization_id: string; author_id: string; content: string; type?: string; created_at?: string; updated_at?: string; };
        Update: { id?: string; cared_person_id?: string; organization_id?: string; author_id?: string; content?: string; type?: string; };
        Relationships: [];
      };
      medication_schedules: {
        Row: { id: string; medication_id: string; cared_person_id: string; organization_id: string; time_of_day: string; days_of_week: string[] | null; created_at: string; };
        Insert: { id?: string; medication_id: string; cared_person_id: string; organization_id: string; time_of_day: string; days_of_week?: string[] | null; created_at?: string; };
        Update: { id?: string; medication_id?: string; cared_person_id?: string; organization_id?: string; time_of_day?: string; days_of_week?: string[] | null; };
        Relationships: [];
      };
      monitoring_categories: {
        Row: { id: string; code: string; translation_key: string; icon: string; display_order: number; status: string; created_at: string; };
        Insert: { id?: string; code: string; translation_key: string; icon: string; display_order?: number; status?: string; created_at?: string; };
        Update: { id?: string; code?: string; translation_key?: string; icon?: string; display_order?: number; status?: string; };
        Relationships: [];
      };
      monitoring_definitions: {
        Row: { id: string; category_id: string; code: string; translation_key: string; description_translation_key: string; field_type: string; dependency_code: string | null; allows_reminder: boolean; allows_attachment: boolean; display_order: number; status: string; created_at: string; };
        Insert: { id?: string; category_id: string; code: string; translation_key: string; description_translation_key: string; field_type?: string; dependency_code?: string | null; allows_reminder?: boolean; allows_attachment?: boolean; display_order?: number; status?: string; created_at?: string; };
        Update: { id?: string; category_id?: string; code?: string; translation_key?: string; description_translation_key?: string; field_type?: string; dependency_code?: string | null; allows_reminder?: boolean; allows_attachment?: boolean; display_order?: number; status?: string; };
        Relationships: [];
      };
      cared_person_monitoring_settings: {
        Row: { id: string; organization_id: string; cared_person_id: string; monitoring_definition_id: string; enabled: boolean; enabled_at: string; disabled_at: string | null; configured_by: string | null; settings_json: Json; display_order: number; created_at: string; updated_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; monitoring_definition_id: string; enabled?: boolean; enabled_at?: string; disabled_at?: string | null; configured_by?: string | null; settings_json?: Json; display_order?: number; created_at?: string; updated_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; monitoring_definition_id?: string; enabled?: boolean; enabled_at?: string; disabled_at?: string | null; configured_by?: string | null; settings_json?: Json; display_order?: number; updated_at?: string; };
        Relationships: [];
      };
      custom_monitoring_fields: {
        Row: { id: string; organization_id: string; cared_person_id: string; category_id: string | null; label: string; description: string | null; field_type: string; options_json: Json; required: boolean; frequency_json: Json; reminder_settings_json: Json; visibility_json: Json; include_daily_summary: boolean; include_weekly_report: boolean; enabled: boolean; created_by: string | null; created_at: string; updated_at: string; archived_at: string | null; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; category_id?: string | null; label: string; description?: string | null; field_type: string; options_json?: Json; required?: boolean; frequency_json?: Json; reminder_settings_json?: Json; visibility_json?: Json; include_daily_summary?: boolean; include_weekly_report?: boolean; enabled?: boolean; created_by?: string | null; created_at?: string; updated_at?: string; archived_at?: string | null; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; category_id?: string | null; label?: string; description?: string | null; field_type?: string; options_json?: Json; required?: boolean; frequency_json?: Json; reminder_settings_json?: Json; visibility_json?: Json; include_daily_summary?: boolean; include_weekly_report?: boolean; enabled?: boolean; updated_at?: string; archived_at?: string | null; };
        Relationships: [];
      };
      monitoring_records: {
        Row: { id: string; organization_id: string; cared_person_id: string; monitoring_definition_id: string | null; custom_field_id: string | null; recorded_by: string | null; occurred_at: string; value_json: Json; notes: string | null; source: string; created_at: string; updated_at: string; archived_at: string | null; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; monitoring_definition_id?: string | null; custom_field_id?: string | null; recorded_by?: string | null; occurred_at?: string; value_json?: Json; notes?: string | null; source?: string; created_at?: string; updated_at?: string; archived_at?: string | null; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; monitoring_definition_id?: string | null; custom_field_id?: string | null; recorded_by?: string | null; occurred_at?: string; value_json?: Json; notes?: string | null; source?: string; updated_at?: string; archived_at?: string | null; };
        Relationships: [];
      };
      monitoring_configuration_audit: {
        Row: { id: string; organization_id: string; cared_person_id: string; action: string; monitoring_definition_id: string | null; custom_field_id: string | null; previous_value: Json | null; new_value: Json | null; performed_by: string | null; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id: string; action: string; monitoring_definition_id?: string | null; custom_field_id?: string | null; previous_value?: Json | null; new_value?: Json | null; performed_by?: string | null; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string; action?: string; monitoring_definition_id?: string | null; custom_field_id?: string | null; previous_value?: Json | null; new_value?: Json | null; performed_by?: string | null; };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
