-- Migration 04: Add expenses table
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rokrsaprrqkjdcaakkkg/sql/new

CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_by TEXT,
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expenses_cared_person ON public.expenses(cared_person_id);
CREATE INDEX IF NOT EXISTS idx_expenses_org ON public.expenses(organization_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date DESC);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT USING (is_org_member(organization_id));

CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT WITH CHECK (is_org_member(organization_id));

CREATE POLICY "expenses_update" ON public.expenses
  FOR UPDATE USING (created_by = auth.uid() OR is_org_admin(organization_id));

CREATE POLICY "expenses_delete" ON public.expenses
  FOR DELETE USING (is_org_admin(organization_id));

CREATE OR REPLACE FUNCTION public.handle_expenses_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_expenses_updated ON public.expenses;
CREATE TRIGGER on_expenses_updated
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.handle_expenses_updated_at();
