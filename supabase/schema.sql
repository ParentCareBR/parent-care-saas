-- ============================================================
-- Parent Care — Supabase Schema
-- Execute this in the Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABLES
-- ============================================================

-- Users profile (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone TEXT,
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Plans (SaaS subscription tiers)
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  price_yearly NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  max_cared_people INT NOT NULL DEFAULT 1,
  max_members INT NOT NULL DEFAULT 5,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stripe_price_id_monthly TEXT,
  stripe_price_id_yearly TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organizations (each family is one org)
CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  plan_id UUID REFERENCES public.plans(id),
  subscription_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled', 'paused')),
  trial_ends_at TIMESTAMPTZ,
  logo_url TEXT,
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization Members (users ↔ orgs, with roles)
CREATE TABLE IF NOT EXISTS public.organization_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'collaborator'
    CHECK (role IN ('owner', 'admin', 'collaborator', 'caregiver', 'cared_person')),
  status TEXT NOT NULL DEFAULT 'invited'
    CHECK (status IN ('active', 'invited', 'suspended')),
  invited_email TEXT,
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- Cared People (the elderly persons being cared for)
CREATE TABLE IF NOT EXISTS public.cared_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  birth_date DATE,
  photo_url TEXT,
  blood_type TEXT,
  allergies TEXT[] NOT NULL DEFAULT '{}',
  conditions TEXT[] NOT NULL DEFAULT '{}',
  notes TEXT,
  user_id UUID REFERENCES public.users(id), -- link to their own user account (optional)
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Care Permissions (granular per-member, per-cared-person permissions)
CREATE TABLE IF NOT EXISTS public.care_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.organization_members(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  can_view_medications BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage_medications BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_appointments BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage_appointments BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_notes BOOLEAN NOT NULL DEFAULT TRUE,
  can_manage_notes BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_financials BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_tasks BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(member_id, cared_person_id)
);

-- Medications
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'mg',
  instructions TEXT,
  prescribing_doctor TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  start_date DATE,
  end_date DATE,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medication Schedules
CREATE TABLE IF NOT EXISTS public.medication_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  time_of_day TIME NOT NULL,
  days_of_week INT[] NOT NULL DEFAULT '{1,2,3,4,5,6,7}', -- 1=Mon, 7=Sun
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Medication Confirmations (who took what and when)
CREATE TABLE IF NOT EXISTS public.medication_confirmations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.medication_schedules(id),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  confirmed_by UUID NOT NULL REFERENCES public.users(id),
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'taken'
    CHECK (status IN ('taken', 'skipped', 'late')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Meals
CREATE TABLE IF NOT EXISTS public.meals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'snack', 'dinner', 'other')),
  description TEXT,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logged_by UUID NOT NULL REFERENCES public.users(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Hydration Logs
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  amount_ml INT NOT NULL,
  logged_by UUID NOT NULL REFERENCES public.users(id),
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ,
  doctor_name TEXT,
  specialty TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled'
    CHECK (status IN ('scheduled', 'completed', 'canceled', 'rescheduled')),
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID REFERENCES public.users(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'done', 'canceled')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Check-ins
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  checked_by UUID NOT NULL REFERENCES public.users(id),
  mood TEXT CHECK (mood IN ('great', 'good', 'okay', 'bad', 'critical')),
  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Help Requests (from the elderly person's simplified screen)
CREATE TABLE IF NOT EXISTS public.help_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.users(id),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'acknowledged', 'resolved')),
  acknowledged_by UUID REFERENCES public.users(id),
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emergency Contacts
CREATE TABLE IF NOT EXISTS public.emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Emergency Events
CREATE TABLE IF NOT EXISTS public.emergency_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  reported_by UUID NOT NULL REFERENCES public.users(id),
  description TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium'
    CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Care Notes
CREATE TABLE IF NOT EXISTS public.care_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES public.users(id),
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general'
    CHECK (type IN ('observation', 'incident', 'health', 'mood', 'general')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE SET NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  paid_at TIMESTAMPTZ,
  paid_by UUID REFERENCES public.users(id),
  receipt_url TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status TEXT NOT NULL DEFAULT 'trial'
    CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'paused')),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '14 days',
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  read_at TIMESTAMPTZ,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB DEFAULT '{}',
  new_data JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_cared_people_org ON public.cared_people(organization_id);
CREATE INDEX IF NOT EXISTS idx_medications_cared_person ON public.medications(cared_person_id);
CREATE INDEX IF NOT EXISTS idx_medications_org ON public.medications(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_org ON public.appointments(organization_id);
CREATE INDEX IF NOT EXISTS idx_appointments_cared_person ON public.appointments(cared_person_id);
CREATE INDEX IF NOT EXISTS idx_appointments_starts_at ON public.appointments(starts_at);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON public.tasks(organization_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_med_confirmations_org ON public.medication_confirmations(organization_id);
CREATE INDEX IF NOT EXISTS idx_check_ins_org ON public.check_ins(organization_id);
CREATE INDEX IF NOT EXISTS idx_help_requests_org ON public.help_requests(organization_id, status);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_cared_people_updated_at
  BEFORE UPDATE ON public.cared_people
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper: check if user is member of an org
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = uid
      AND status = 'active'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: get user's role in org
CREATE OR REPLACE FUNCTION public.get_org_role(org_id UUID, uid UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
  SELECT role FROM public.organization_members
  WHERE organization_id = org_id
    AND user_id = uid
    AND status = 'active'
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if user is admin or owner
CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID, uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = uid
      AND status = 'active'
      AND role IN ('owner', 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cared_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.help_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- users: can only see own profile
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_update_own" ON public.users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_insert_own" ON public.users
  FOR INSERT WITH CHECK (id = auth.uid());

-- organizations: members can view their org
CREATE POLICY "orgs_select_members" ON public.organizations
  FOR SELECT USING (public.is_org_member(id));

CREATE POLICY "orgs_insert_owner" ON public.organizations
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "orgs_update_admin" ON public.organizations
  FOR UPDATE USING (public.is_org_admin(id));

-- organization_members: members can see who else is in their org
CREATE POLICY "members_select_org" ON public.organization_members
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "members_insert_admin" ON public.organization_members
  FOR INSERT WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "members_update_admin" ON public.organization_members
  FOR UPDATE USING (public.is_org_admin(organization_id));

CREATE POLICY "members_delete_admin" ON public.organization_members
  FOR DELETE USING (public.is_org_admin(organization_id));

-- cared_people: org members can view
CREATE POLICY "cared_people_select" ON public.cared_people
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "cared_people_insert" ON public.cared_people
  FOR INSERT WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "cared_people_update" ON public.cared_people
  FOR UPDATE USING (public.is_org_admin(organization_id));

-- care_permissions
CREATE POLICY "care_perms_select" ON public.care_permissions
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "care_perms_manage" ON public.care_permissions
  FOR ALL USING (public.is_org_admin(organization_id));

-- medications
CREATE POLICY "medications_select" ON public.medications
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "medications_insert" ON public.medications
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "medications_update" ON public.medications
  FOR UPDATE USING (public.is_org_admin(organization_id));

CREATE POLICY "medications_delete" ON public.medications
  FOR DELETE USING (public.is_org_admin(organization_id));

-- medication_schedules
CREATE POLICY "med_schedules_select" ON public.medication_schedules
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "med_schedules_manage" ON public.medication_schedules
  FOR ALL USING (public.is_org_admin(organization_id));

-- medication_confirmations
CREATE POLICY "med_confirmations_select" ON public.medication_confirmations
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "med_confirmations_insert" ON public.medication_confirmations
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

-- meals
CREATE POLICY "meals_select" ON public.meals
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "meals_insert" ON public.meals
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

-- hydration_logs
CREATE POLICY "hydration_select" ON public.hydration_logs
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "hydration_insert" ON public.hydration_logs
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

-- appointments
CREATE POLICY "appointments_select" ON public.appointments
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "appointments_insert" ON public.appointments
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "appointments_update" ON public.appointments
  FOR UPDATE USING (public.is_org_admin(organization_id));

CREATE POLICY "appointments_delete" ON public.appointments
  FOR DELETE USING (public.is_org_admin(organization_id));

-- tasks
CREATE POLICY "tasks_select" ON public.tasks
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "tasks_insert" ON public.tasks
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "tasks_update" ON public.tasks
  FOR UPDATE USING (
    public.is_org_member(organization_id) AND
    (assigned_to = auth.uid() OR public.is_org_admin(organization_id))
  );

CREATE POLICY "tasks_delete" ON public.tasks
  FOR DELETE USING (public.is_org_admin(organization_id));

-- check_ins
CREATE POLICY "check_ins_select" ON public.check_ins
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "check_ins_insert" ON public.check_ins
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

-- help_requests
CREATE POLICY "help_requests_select" ON public.help_requests
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "help_requests_insert" ON public.help_requests
  FOR INSERT WITH CHECK (
    public.is_org_member(organization_id) OR
    EXISTS (
      SELECT 1 FROM public.cared_people
      WHERE id = cared_person_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "help_requests_update" ON public.help_requests
  FOR UPDATE USING (public.is_org_member(organization_id));

-- emergency_contacts
CREATE POLICY "emergency_contacts_select" ON public.emergency_contacts
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "emergency_contacts_manage" ON public.emergency_contacts
  FOR ALL USING (public.is_org_admin(organization_id));

-- emergency_events
CREATE POLICY "emergency_events_select" ON public.emergency_events
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "emergency_events_insert" ON public.emergency_events
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

-- care_notes
CREATE POLICY "care_notes_select" ON public.care_notes
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "care_notes_insert" ON public.care_notes
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "care_notes_update" ON public.care_notes
  FOR UPDATE USING (author_id = auth.uid() OR public.is_org_admin(organization_id));

CREATE POLICY "care_notes_delete" ON public.care_notes
  FOR DELETE USING (public.is_org_admin(organization_id));

-- expenses
CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (public.is_org_member(organization_id));

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (public.is_org_admin(organization_id));

-- subscriptions
CREATE POLICY "subscriptions_select" ON public.subscriptions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organizations
      WHERE id = organization_id AND public.is_org_member(id)
    )
  );

-- notifications
CREATE POLICY "notifications_select" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notifications_update" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

-- audit_logs: admin only
CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.is_org_admin(organization_id));

-- plans: everyone can read active plans
CREATE POLICY "plans_select_all" ON public.plans
  FOR SELECT USING (is_active = TRUE);

-- ============================================================
-- SEED DATA — Default Plans
-- ============================================================

INSERT INTO public.plans (name, slug, description, price_monthly, price_yearly, currency, max_cared_people, max_members, features)
VALUES
  (
    'Essencial', 'essencial',
    'Para famílias pequenas que precisam de organização básica.',
    29.90, 287.00, 'BRL', 1, 5,
    '{"medications": true, "appointments": true, "tasks": true, "notes": true, "check_ins": true}'
  ),
  (
    'Família', 'familia',
    'Para famílias que acompanham mais de uma pessoa.',
    59.90, 575.00, 'BRL', 3, 15,
    '{"medications": true, "appointments": true, "tasks": true, "notes": true, "check_ins": true, "expenses": true, "reports": true}'
  ),
  (
    'Profissional', 'profissional',
    'Para cuidadores profissionais e clínicas.',
    149.90, 1439.00, 'BRL', 10, 50,
    '{"medications": true, "appointments": true, "tasks": true, "notes": true, "check_ins": true, "expenses": true, "reports": true, "api_access": true}'
  )
ON CONFLICT (slug) DO NOTHING;
