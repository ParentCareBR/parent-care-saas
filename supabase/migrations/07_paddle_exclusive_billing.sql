-- Migration 07: Exclusive Paddle Billing System & Access Control
-- Parent Care SaaS — Sole Financial Platform: Paddle Billing

-- ====================================================================
-- 1. DROP STRIPE COLUMNS & ARTIFACTS
-- ====================================================================
ALTER TABLE IF EXISTS public.subscriptions 
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS stripe_customer_id;

ALTER TABLE IF EXISTS public.plan_prices
  DROP COLUMN IF EXISTS stripe_price_monthly_id,
  DROP COLUMN IF EXISTS stripe_price_yearly_id;

ALTER TABLE IF EXISTS public.plans
  DROP COLUMN IF EXISTS stripe_price_id_monthly,
  DROP COLUMN IF EXISTS stripe_price_id_yearly;

ALTER TABLE IF EXISTS public.billing_history
  DROP COLUMN IF EXISTS stripe_invoice_id;

-- ====================================================================
-- 2. TABLE: billing_customers
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  paddle_customer_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  country_code TEXT,
  preferred_currency TEXT NOT NULL DEFAULT 'BRL',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_customers_org ON public.billing_customers(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_paddle_id ON public.billing_customers(paddle_customer_id);

-- ====================================================================
-- 3. TABLE: billing_subscriptions
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  paddle_subscription_id TEXT NOT NULL UNIQUE,
  paddle_customer_id TEXT NOT NULL,
  paddle_product_id TEXT,
  paddle_price_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'trial', -- trial, active, past_due, paused, canceled
  seat_limit INTEGER NOT NULL DEFAULT 1 CHECK (seat_limit >= 1),
  cared_people_limit INTEGER NOT NULL DEFAULT 2 CHECK (cared_people_limit >= 1),
  currency_code TEXT NOT NULL DEFAULT 'BRL',
  unit_price NUMERIC(10, 2) NOT NULL DEFAULT 49.90,
  recurring_total NUMERIC(10, 2) NOT NULL DEFAULT 49.90,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  next_billed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  scheduled_change JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_org ON public.billing_subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_paddle_sub ON public.billing_subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_subscriptions_paddle_cust ON public.billing_subscriptions(paddle_customer_id);

-- ====================================================================
-- 4. TABLE: billing_price_mappings
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.billing_price_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  environment TEXT NOT NULL DEFAULT 'sandbox', -- sandbox or live
  seat_quantity INTEGER NOT NULL CHECK (seat_quantity BETWEEN 1 AND 6),
  paddle_product_id TEXT,
  paddle_price_id TEXT NOT NULL,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  cared_people_limit INTEGER NOT NULL DEFAULT 2,
  unit_price_brl NUMERIC(10, 2) NOT NULL,
  total_monthly_brl NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_billing_price_mapping UNIQUE(environment, seat_quantity)
);

CREATE INDEX IF NOT EXISTS idx_billing_price_mappings_env_seats ON public.billing_price_mappings(environment, seat_quantity);

-- Seed baseline mappings with commercial tiers
INSERT INTO public.billing_price_mappings (environment, seat_quantity, paddle_price_id, unit_price_brl, total_monthly_brl, status)
VALUES
  ('sandbox', 1, 'pri_sandbox_family_1seat', 49.90, 49.90, 'active'),
  ('sandbox', 2, 'pri_sandbox_family_2seats', 45.90, 91.80, 'active'),
  ('sandbox', 3, 'pri_sandbox_family_3seats', 39.00, 117.00, 'active'),
  ('sandbox', 4, 'pri_sandbox_family_4seats', 35.90, 143.60, 'active'),
  ('sandbox', 5, 'pri_sandbox_family_5seats', 32.90, 164.50, 'active'),
  ('sandbox', 6, 'pri_sandbox_family_6seats', 29.90, 179.40, 'active'),
  ('live', 1, 'pri_live_family_1seat', 49.90, 49.90, 'active'),
  ('live', 2, 'pri_live_family_2seats', 45.90, 91.80, 'active'),
  ('live', 3, 'pri_live_family_3seats', 39.00, 117.00, 'active'),
  ('live', 4, 'pri_live_family_4seats', 35.90, 143.60, 'active'),
  ('live', 5, 'pri_live_family_5seats', 32.90, 164.50, 'active'),
  ('live', 6, 'pri_live_family_6seats', 29.90, 179.40, 'active')
ON CONFLICT (environment, seat_quantity) DO UPDATE SET
  unit_price_brl = EXCLUDED.unit_price_brl,
  total_monthly_brl = EXCLUDED.total_monthly_brl,
  updated_at = now();

-- ====================================================================
-- 5. TABLE: billing_events (Idempotency & Webhook audit)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paddle_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'processed', -- processed, failed, skipped
  attempts INTEGER NOT NULL DEFAULT 1,
  error_message TEXT,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_event_id ON public.billing_events(paddle_event_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type ON public.billing_events(event_type);

-- ====================================================================
-- 6. TABLE: organization_entitlements
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.organization_entitlements (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.billing_subscriptions(id) ON DELETE SET NULL,
  seat_limit INTEGER NOT NULL DEFAULT 1 CHECK (seat_limit >= 1),
  cared_people_limit INTEGER NOT NULL DEFAULT 2 CHECK (cared_people_limit >= 1),
  active_members_count INTEGER NOT NULL DEFAULT 1,
  reserved_invites_count INTEGER NOT NULL DEFAULT 0,
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  access_valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ====================================================================
-- 7. TABLE: organization_invitations
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.organization_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  invited_email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'collaborator',
  status TEXT NOT NULL DEFAULT 'pending', -- pending, accepted, canceled, expired
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  reserved_seat BOOLEAN NOT NULL DEFAULT true,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_org_invites_org_status ON public.organization_invitations(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_org_invites_email ON public.organization_invitations(invited_email);

-- ====================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_price_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- 8.1 Price Mappings: Public read-only
CREATE POLICY "Public read active price mappings"
  ON public.billing_price_mappings
  FOR SELECT
  USING (status = 'active');

-- 8.2 Entitlements: Read-only for organization members, updates reserved for service role
CREATE POLICY "Org members can read entitlements"
  ON public.organization_entitlements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_entitlements.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- 8.3 Subscriptions: Read-only for org members
CREATE POLICY "Org members can read subscriptions"
  ON public.billing_subscriptions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = billing_subscriptions.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

-- 8.4 Customers: Read-only for org owners/admins
CREATE POLICY "Org owners can read billing customers"
  ON public.billing_customers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = billing_customers.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.status = 'active'
    )
  );

-- 8.5 Invitations: Read for org members, insert/update for owner/admin
CREATE POLICY "Org members can view invitations"
  ON public.organization_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Org admins/owners can create invitations"
  ON public.organization_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.status = 'active'
    )
  );

CREATE POLICY "Org admins/owners can update invitations"
  ON public.organization_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.organization_members
      WHERE organization_members.organization_id = organization_invitations.organization_id
      AND organization_members.user_id = auth.uid()
      AND organization_members.role IN ('owner', 'admin')
      AND organization_members.status = 'active'
    )
  );

-- 8.6 Billing Events: Service role only (no user access)
CREATE POLICY "Service role only for billing events"
  ON public.billing_events
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');
