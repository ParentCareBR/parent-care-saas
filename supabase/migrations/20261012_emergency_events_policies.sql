-- Migration: Add missing UPDATE and DELETE policies for emergency_events
-- Run this in Supabase SQL Editor if needed: https://supabase.com/dashboard/project/rokrsaprrqkjdcaakkkg/sql

-- Allow organization members to update emergency_events (e.g. mark resolved_at)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'emergency_events' AND policyname = 'emergency_events_update'
  ) THEN
    CREATE POLICY "emergency_events_update" ON public.emergency_events
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.organization_members om
          JOIN public.cared_people cp ON cp.organization_id = om.organization_id
          WHERE cp.id = emergency_events.cared_person_id
            AND om.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.organization_members om
          JOIN public.cared_people cp ON cp.organization_id = om.organization_id
          WHERE cp.id = emergency_events.cared_person_id
            AND om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Allow organization members to delete emergency_events (undo actions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'emergency_events' AND policyname = 'emergency_events_delete'
  ) THEN
    CREATE POLICY "emergency_events_delete" ON public.emergency_events
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.organization_members om
          JOIN public.cared_people cp ON cp.organization_id = om.organization_id
          WHERE cp.id = emergency_events.cared_person_id
            AND om.user_id = auth.uid()
        )
      );
  END IF;
END $$;
