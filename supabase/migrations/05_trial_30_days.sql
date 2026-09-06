-- Migration 05: 30-day Trial with Credit Card Integration
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rokrsaprrqkjdcaakkkg/sql/new

-- 1. Ensure subscriptions has trial_ends_at column
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 2. Update default current_period_end to 30 days for new subscriptions
ALTER TABLE public.subscriptions 
  ALTER COLUMN current_period_end SET DEFAULT (NOW() + INTERVAL '30 days');

-- 3. Ensure organizations trial_ends_at default is 30 days
ALTER TABLE public.organizations 
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '30 days');

-- 4. Index for checking trial expiration
CREATE INDEX IF NOT EXISTS idx_organizations_trial_ends ON public.organizations(trial_ends_at)
  WHERE subscription_status = 'trial';

CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_ends ON public.subscriptions(trial_ends_at)
  WHERE status = 'trial';
