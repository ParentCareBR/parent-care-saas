-- Migration: whatsapp_link_requests table
-- Run this in Supabase SQL Editor at: https://supabase.com/dashboard/project/rokrsaprrqkjdcaakkkg/sql

CREATE TABLE IF NOT EXISTS public.whatsapp_link_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  token          TEXT NOT NULL UNIQUE,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
  created_by     UUID REFERENCES auth.users(id),
  linked_phone   TEXT,
  linked_at      TIMESTAMPTZ,
  expires_at     TIMESTAMPTZ NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast token lookups by the webhook
CREATE INDEX IF NOT EXISTS idx_whatsapp_link_requests_token
  ON public.whatsapp_link_requests(token);

-- Index for cleanup queries by cared_person + status
CREATE INDEX IF NOT EXISTS idx_whatsapp_link_requests_person_status
  ON public.whatsapp_link_requests(cared_person_id, status);

-- RLS: only service role (admin client) can read/write - all access via API routes
ALTER TABLE public.whatsapp_link_requests ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view link requests for their own org's people
CREATE POLICY "org_members_can_read_link_requests"
  ON public.whatsapp_link_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cared_people cp
      JOIN public.organization_members om ON om.organization_id = cp.organization_id
      WHERE cp.id = whatsapp_link_requests.cared_person_id
        AND om.user_id = auth.uid()
    )
  );
