-- ============================================================
-- Migration: Core App Modules (Cared Persons, Medications, Tasks, Meals, Events)
-- B2B / Family-as-Org approach
-- ============================================================

-- 1. Cared People (Os Idosos / Pacientes, vinculados a uma Organização/Família)
CREATE TABLE IF NOT EXISTS public.cared_people (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  nickname TEXT,
  birth_date DATE,
  gender TEXT,
  blood_type TEXT,
  avatar_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Medications (Medicamentos do Idoso)
CREATE TABLE IF NOT EXISTS public.medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT,
  time_of_day TIME NOT NULL,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 3. Medication Logs (Registro de doses tomadas)
CREATE TABLE IF NOT EXISTS public.medication_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  taken_by UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- who gave the med
  status TEXT DEFAULT 'taken' CHECK (status IN ('taken', 'skipped', 'delayed')),
  notes TEXT
);

-- 4. Tasks (Tarefas da rotina)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'canceled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 5. Hydration Logs (Registro de ingestão de água)
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount_ml INT NOT NULL,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.cared_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;

-- As table policies rely on organization membership, we can use the existing function:
-- public.is_org_member(organization_id)

CREATE POLICY "cared_people_all" ON public.cared_people 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "medications_all" ON public.medications 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "medication_logs_all" ON public.medication_logs 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "tasks_all" ON public.tasks 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "hydration_logs_all" ON public.hydration_logs 
  FOR ALL USING (public.is_org_member(organization_id));
