-- Migration 06: Paddle Billing Exclusive Integration
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rokrsaprrqkjdcaakkkg/sql/new

-- 1. Add Paddle columns to subscriptions
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT,
  ALTER COLUMN gateway SET DEFAULT 'paddle';

-- 2. Add Paddle columns to organizations
ALTER TABLE public.organizations 
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT;

-- 3. Add paddle_price_monthly_id and paddle_price_yearly_id to plan_prices
ALTER TABLE public.plan_prices 
  ADD COLUMN IF NOT EXISTS paddle_price_monthly_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_yearly_id TEXT;

-- 4. Indexes for fast lookup on webhooks
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_sub_id ON public.subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_cust_id ON public.subscriptions(paddle_customer_id);
CREATE INDEX IF NOT EXISTS idx_organizations_paddle_cust_id ON public.organizations(paddle_customer_id);
