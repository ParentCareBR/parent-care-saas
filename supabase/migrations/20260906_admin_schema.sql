-- ============================================================
-- Parent Care — Admin Schema Migration
-- Run this in Supabase SQL Editor AFTER the main schema.sql
-- ============================================================

-- Admin users (SaaS staff only, NOT customer users)
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'support'
    CHECK (role IN ('owner', 'finance', 'support', 'content')),
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Admin audit logs (every admin action is logged)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_table TEXT,
  target_id TEXT,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRM leads (visitors and potential customers before they sign up)
CREATE TABLE IF NOT EXISTS public.crm_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT,
  full_name TEXT,
  phone TEXT,
  country TEXT,
  language TEXT,
  source TEXT, -- organic, paid, referral, direct
  campaign TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,
  funnel_stage TEXT NOT NULL DEFAULT 'visitor'
    CHECK (funnel_stage IN ('visitor', 'lead', 'signup_started', 'trial', 'subscriber', 'past_due', 'canceled', 'reactivated')),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  churn_risk TEXT CHECK (churn_risk IN ('low', 'medium', 'high')),
  churn_reason TEXT,
  ltv NUMERIC(12,2) DEFAULT 0,
  mrr NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRM notes (internal notes per customer/lead)
CREATE TABLE IF NOT EXISTS public.crm_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CRM follow-up tasks
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'done', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ERP Revenue entries (subscriptions, one-time, refunds)
CREATE TABLE IF NOT EXISTS public.erp_revenue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('subscription', 'one_time', 'refund', 'chargeback')),
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  gateway TEXT NOT NULL DEFAULT 'stripe',
  gateway_ref TEXT,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  gateway_fee NUMERIC(10,2) DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(12,2) GENERATED ALWAYS AS (amount - COALESCE(discount_amount,0) - COALESCE(gateway_fee,0) - COALESCE(tax_amount,0)) STORED,
  period_start DATE,
  period_end DATE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ERP Expenses (operational costs of the SaaS business)
CREATE TABLE IF NOT EXISTS public.erp_expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL CHECK (category IN ('infrastructure', 'marketing', 'staff', 'legal', 'tools', 'taxes', 'other')),
  vendor TEXT,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  paid_at DATE,
  receipt_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ERP Vendors / Suppliers
CREATE TABLE IF NOT EXISTS public.erp_vendors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  country TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general'
    CHECK (category IN ('billing', 'technical', 'account', 'feature_request', 'general')),
  priority TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'waiting_customer', 'resolved', 'closed')),
  assigned_to UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
  sla_due_at TIMESTAMPTZ,
  satisfaction INT CHECK (satisfaction BETWEEN 1 AND 5),
  satisfaction_comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support ticket messages
CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  content TEXT NOT NULL,
  attachments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin coupons
CREATE TABLE IF NOT EXISTS public.admin_coupons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  max_uses INT,
  used_count INT NOT NULL DEFAULT 0,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_crm_leads_funnel ON public.crm_leads(funnel_stage);
CREATE INDEX IF NOT EXISTS idx_crm_leads_country ON public.crm_leads(country);
CREATE INDEX IF NOT EXISTS idx_erp_revenue_created ON public.erp_revenue(created_at);
CREATE INDEX IF NOT EXISTS idx_erp_revenue_currency ON public.erp_revenue(currency);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at);

-- ============================================================
-- RLS — Admin tables are accessible only to admin_users
-- Regular client rows have NO RLS (backend/service_role only)
-- ============================================================

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_revenue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_coupons ENABLE ROW LEVEL SECURITY;

-- Helper: check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin(uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = uid AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check admin role
CREATE OR REPLACE FUNCTION public.has_admin_role(required_role TEXT, uid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = uid AND is_active = TRUE
      AND (role = 'owner' OR role = required_role)
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Apply RLS policies — only admins can access
CREATE POLICY "admin_users_select" ON public.admin_users FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_audit_select" ON public.admin_audit_logs FOR SELECT USING (public.is_admin());
CREATE POLICY "admin_audit_insert" ON public.admin_audit_logs FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "crm_leads_all" ON public.crm_leads FOR ALL USING (public.is_admin());
CREATE POLICY "crm_notes_all" ON public.crm_notes FOR ALL USING (public.is_admin());
CREATE POLICY "crm_tasks_all" ON public.crm_tasks FOR ALL USING (public.is_admin());
CREATE POLICY "erp_revenue_all" ON public.erp_revenue FOR ALL USING (public.has_admin_role('finance'));
CREATE POLICY "erp_expenses_all" ON public.erp_expenses FOR ALL USING (public.has_admin_role('finance'));
CREATE POLICY "erp_vendors_all" ON public.erp_vendors FOR ALL USING (public.has_admin_role('finance'));
CREATE POLICY "support_tickets_all" ON public.support_tickets FOR ALL USING (public.is_admin());
CREATE POLICY "support_messages_all" ON public.support_messages FOR ALL USING (public.is_admin());
CREATE POLICY "admin_coupons_all" ON public.admin_coupons FOR ALL USING (public.has_admin_role('content'));

-- ============================================================
-- SEED: Insert first admin (owner) — update email as needed
-- ============================================================
-- NOTE: Run this AFTER the user has signed up via the app
-- Replace the email below with your actual admin email
INSERT INTO public.admin_users (user_id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email), 'owner'
FROM auth.users
WHERE email = 'jamessneves2@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
