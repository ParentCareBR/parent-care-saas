-- ============================================================
-- Migration: Multi-currency Billing and Gateway abstractions
-- ============================================================

-- Table for multi-currency pricing per plan
CREATE TABLE IF NOT EXISTS public.plan_prices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE CASCADE,
  currency TEXT NOT NULL, -- e.g., 'BRL', 'USD', 'EUR'
  monthly_price NUMERIC(10,2) NOT NULL,
  yearly_price NUMERIC(10,2) NOT NULL,
  paddle_price_monthly_id TEXT,
  paddle_price_yearly_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(plan_id, currency)
);

ALTER TABLE public.plan_prices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_prices_select_all" ON public.plan_prices
  FOR SELECT USING (TRUE);

-- Altering subscriptions to add gateway and grace periods
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS gateway TEXT NOT NULL DEFAULT 'paddle',
  ADD COLUMN IF NOT EXISTS grace_period_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- Invoices / Billing history via Paddle Billing
CREATE TABLE IF NOT EXISTS public.billing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  gateway TEXT NOT NULL DEFAULT 'paddle',
  gateway_invoice_id TEXT UNIQUE,
  amount_due NUMERIC(10,2) NOT NULL,
  amount_paid NUMERIC(10,2) NOT NULL,
  currency TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'paid', 'uncollectible', 'void')),
  invoice_pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  paid_at TIMESTAMPTZ
);

ALTER TABLE public.billing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "billing_history_select" ON public.billing_history
  FOR SELECT USING (public.is_org_admin(organization_id));

-- Paddle Webhook Events Log (for idempotency and audit)
CREATE TABLE IF NOT EXISTS public.gateway_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gateway TEXT NOT NULL,
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Note: No RLS on gateway_events as it is backend-only

-- ============================================================
-- SEED DATA for plan_prices based on existing plans
-- ============================================================
DO $$ 
DECLARE
  plan_essencial UUID;
  plan_familia UUID;
  plan_pro UUID;
BEGIN
  SELECT id INTO plan_essencial FROM public.plans WHERE slug = 'essencial';
  SELECT id INTO plan_familia FROM public.plans WHERE slug = 'familia';
  SELECT id INTO plan_pro FROM public.plans WHERE slug = 'profissional';

  IF plan_essencial IS NOT NULL THEN
    INSERT INTO public.plan_prices (plan_id, currency, monthly_price, yearly_price)
    VALUES 
      (plan_essencial, 'BRL', 29.90, 287.00),
      (plan_essencial, 'USD', 9.90, 99.00),
      (plan_essencial, 'EUR', 9.90, 99.00)
    ON CONFLICT DO NOTHING;
  END IF;

  IF plan_familia IS NOT NULL THEN
    INSERT INTO public.plan_prices (plan_id, currency, monthly_price, yearly_price)
    VALUES 
      (plan_familia, 'BRL', 59.90, 575.00),
      (plan_familia, 'USD', 19.90, 199.00),
      (plan_familia, 'EUR', 19.90, 199.00)
    ON CONFLICT DO NOTHING;
  END IF;

  IF plan_pro IS NOT NULL THEN
    INSERT INTO public.plan_prices (plan_id, currency, monthly_price, yearly_price)
    VALUES 
      (plan_pro, 'BRL', 149.90, 1439.00),
      (plan_pro, 'USD', 49.90, 499.00),
      (plan_pro, 'EUR', 49.90, 499.00)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;
