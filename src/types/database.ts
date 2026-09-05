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
        Row: { id: string; name: string; slug: string; owner_id: string; subscription_status: string | null; plan_id: string | null; };
        Insert: { id?: string; name: string; slug: string; owner_id: string; subscription_status?: string | null; plan_id?: string | null; };
        Update: { id?: string; name?: string; slug?: string; owner_id?: string; subscription_status?: string | null; plan_id?: string | null; };
        Relationships: [];
      };
      organization_members: {
        Row: { id: string; organization_id: string; user_id: string; role: string; status: string; };
        Insert: { id?: string; organization_id: string; user_id: string; role: string; status?: string; };
        Update: { id?: string; organization_id?: string; user_id?: string; role?: string; status?: string; };
        Relationships: [];
      };
      cared_people: {
        Row: { id: string; organization_id: string; full_name: string; birth_date: string | null; photo_url: string | null; blood_type: string | null; };
        Insert: { id?: string; organization_id: string; full_name: string; birth_date?: string | null; photo_url?: string | null; blood_type?: string | null; };
        Update: { id?: string; organization_id?: string; full_name?: string; birth_date?: string | null; photo_url?: string | null; blood_type?: string | null; };
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
        Row: { id: string; organization_id: string; cared_person_id: string | null; category: string; description: string; amount: number; created_at: string; };
        Insert: { id?: string; organization_id: string; cared_person_id?: string | null; category: string; description: string; amount: number; created_at?: string; };
        Update: { id?: string; organization_id?: string; cared_person_id?: string | null; category?: string; description?: string; amount?: number; };
        Relationships: [];
      };
      plans: {
        Row: { id: string; name: string; slug: string; description: string | null; max_cared_people: number; max_members: number; is_active: boolean; trial_days: number; created_at: string; };
        Insert: { id?: string; name: string; slug: string; description?: string | null; max_cared_people: number; max_members: number; is_active?: boolean; trial_days?: number; created_at?: string; };
        Update: { id?: string; name?: string; slug?: string; description?: string | null; max_cared_people?: number; max_members?: number; is_active?: boolean; trial_days?: number; };
        Relationships: [];
      };
      plan_prices: {
        Row: { id: string; plan_id: string; currency: string; monthly_price: number; yearly_price: number; stripe_price_monthly_id: string | null; stripe_price_yearly_id: string | null; created_at: string; };
        Insert: { id?: string; plan_id: string; currency: string; monthly_price: number; yearly_price: number; stripe_price_monthly_id?: string | null; stripe_price_yearly_id?: string | null; created_at?: string; };
        Update: { id?: string; plan_id?: string; currency?: string; monthly_price?: number; yearly_price?: number; stripe_price_monthly_id?: string | null; stripe_price_yearly_id?: string | null; };
        Relationships: [];
      };
      subscriptions: {
        Row: { id: string; organization_id: string; plan_id: string; status: string; gateway: string; stripe_customer_id: string | null; stripe_subscription_id: string | null; cancel_at_period_end: boolean | null; grace_period_ends_at: string | null; cancel_reason: string | null; created_at: string; };
        Insert: { id?: string; organization_id: string; plan_id: string; status?: string; gateway?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; cancel_at_period_end?: boolean | null; grace_period_ends_at?: string | null; cancel_reason?: string | null; created_at?: string; };
        Update: { id?: string; organization_id?: string; plan_id?: string; status?: string; gateway?: string; stripe_customer_id?: string | null; stripe_subscription_id?: string | null; cancel_at_period_end?: boolean | null; grace_period_ends_at?: string | null; cancel_reason?: string | null; };
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
