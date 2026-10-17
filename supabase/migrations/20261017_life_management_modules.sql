-- ============================================================
-- Migration: Life Management Modules (v2.0)
-- Parent Care: Atividade Física, Aulas, Reabilitação, Lazer,
-- Transporte, Passagem de Turno, Compras, Estoque, Projetos e Casa
-- ============================================================

-- 1. LIFE ACTIVITIES (Atividades de Vida, Atividade Física, Cursos, Lazer, Reabilitação)
CREATE TABLE IF NOT EXISTS public.life_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('physical', 'learning', 'rehab', 'leisure', 'social', 'spiritual')),
  subcategory TEXT, -- ex: walking, dance, hydro, music, computing, cinema, etc.
  personal_goal TEXT, -- objetivo pessoal da pessoa
  person_choice BOOLEAN NOT NULL DEFAULT TRUE, -- escolha voluntária da própria pessoa
  instructor_name TEXT,
  instructor_contact TEXT,
  location_name TEXT,
  location_address TEXT,
  modality TEXT NOT NULL DEFAULT 'in_person' CHECK (modality IN ('in_person', 'online', 'home')),
  accessibility_notes TEXT,
  recurrence_type TEXT NOT NULL DEFAULT 'weekly' CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  recurrence_days JSONB NOT NULL DEFAULT '[]', -- [1, 3, 5] (seg, qua, sex)
  time_of_day TIME,
  duration_minutes INT DEFAULT 60,
  start_date DATE,
  end_date DATE,
  monthly_cost NUMERIC(10,2) DEFAULT 0.00,
  cost_periodicity TEXT NOT NULL DEFAULT 'monthly' CHECK (cost_periodicity IN ('free', 'per_session', 'monthly', 'annual')),
  payer_name TEXT,
  materials_needed TEXT,
  health_orientations TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. ACTIVITY OCCURRENCES (Registro de cada sessão / participação)
CREATE TABLE IF NOT EXISTS public.activity_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_id UUID NOT NULL REFERENCES public.life_activities(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'participated', 'missed', 'canceled', 'rescheduled')),
  absence_reason TEXT,
  voluntary_perception TEXT CHECK (voluntary_perception IN ('loved', 'good', 'neutral', 'difficult', 'disliked')),
  difficulty_reported TEXT,
  wants_to_continue BOOLEAN,
  notes TEXT,
  logged_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  logged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. ACTIVITY TRANSPORTS (Mobilidade e Transporte Integrado - Ida e Volta Separadas)
CREATE TABLE IF NOT EXISTS public.activity_transports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  activity_id UUID REFERENCES public.life_activities(id) ON DELETE SET NULL,
  occurrence_id UUID REFERENCES public.activity_occurrences(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  leg_type TEXT NOT NULL CHECK (leg_type IN ('outbound', 'return')), -- Ida e Volta separadas
  responsible_name TEXT,
  responsible_phone TEXT,
  transport_mode TEXT NOT NULL DEFAULT 'family_car' CHECK (transport_mode IN ('family_car', 'ride_app', 'ambulance', 'public_transit', 'walk', 'adapted_van', 'other')),
  pickup_location TEXT,
  dropoff_location TEXT,
  scheduled_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'to_arrange' CHECK (status IN ('to_arrange', 'confirmed', 'departed', 'arrived', 'canceled')),
  cost NUMERIC(10,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. SHIFT HANDOVERS (Equipe e Passagem de Turno)
CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  outgoing_caregiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  incoming_caregiver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shift_date DATE NOT NULL,
  shift_period TEXT NOT NULL CHECK (shift_period IN ('morning', 'afternoon', 'night', '24h', 'custom')),
  summary_notes TEXT NOT NULL,
  pending_tasks TEXT,
  incidents_noted TEXT,
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. SHOPPING ITEMS (Compras e Abastecimento Compartilhado)
CREATE TABLE IF NOT EXISTS public.shopping_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE SET NULL,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'food' CHECK (category IN ('food', 'medication', 'hygiene', 'supplies', 'household', 'other')),
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'un',
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_cart', 'purchased', 'canceled')),
  estimated_cost NUMERIC(10,2) DEFAULT 0.00,
  suggested_by_inventory BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. CARE INVENTORY ITEMS (Estoque de Medicamentos e Insumos)
CREATE TABLE IF NOT EXISTS public.care_inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL DEFAULT 'supply' CHECK (item_type IN ('medication', 'supply', 'diaper', 'hygiene', 'nutrition', 'other')),
  current_quantity NUMERIC(10,2) NOT NULL DEFAULT 0,
  minimum_quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'un',
  expiration_date DATE,
  storage_location TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CARE INVENTORY LOGS (Movimentações de Estoque - Entrada, Saída, Baixa)
CREATE TABLE IF NOT EXISTS public.care_inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inventory_item_id UUID NOT NULL REFERENCES public.care_inventory_items(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  log_type TEXT NOT NULL CHECK (log_type IN ('entry', 'exit', 'adjustment', 'dispense')),
  quantity NUMERIC(10,2) NOT NULL,
  reason TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. LIFE PROJECTS & MEMORIES (Projetos Pessoais, Desejos e Memórias)
CREATE TABLE IF NOT EXISTS public.life_projects_memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('wish_project', 'memory_story', 'personal_goal')),
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  estimated_cost NUMERIC(10,2) DEFAULT 0.00,
  supporters TEXT,
  steps_json JSONB NOT NULL DEFAULT '[]',
  media_urls JSONB NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('dream', 'active', 'completed', 'archived')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. HOME SAFETY ITEMS (Casa, Segurança e Adaptações)
CREATE TABLE IF NOT EXISTS public.home_safety_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  area_name TEXT NOT NULL,
  item_description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'in_progress', 'completed', 'verified')),
  responsible_name TEXT,
  due_date DATE,
  estimated_cost NUMERIC(10,2) DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================

ALTER TABLE public.life_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_occurrences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_transports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.care_inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.life_projects_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.home_safety_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "life_activities_all" ON public.life_activities 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "activity_occurrences_all" ON public.activity_occurrences 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "activity_transports_all" ON public.activity_transports 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "shift_handovers_all" ON public.shift_handovers 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "shopping_items_all" ON public.shopping_items 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "care_inventory_items_all" ON public.care_inventory_items 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "care_inventory_logs_all" ON public.care_inventory_logs 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "life_projects_memories_all" ON public.life_projects_memories 
  FOR ALL USING (public.is_org_member(organization_id));

CREATE POLICY "home_safety_items_all" ON public.home_safety_items 
  FOR ALL USING (public.is_org_member(organization_id));
