-- ============================================================
-- Migration 08: Monitoring Personalization & Customization
-- ============================================================

-- 1. MONITORING CATEGORIES (12 standard categories: A to L)
CREATE TABLE IF NOT EXISTS public.monitoring_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  translation_key TEXT NOT NULL,
  icon TEXT NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.monitoring_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_categories_read_all" ON public.monitoring_categories
  FOR SELECT USING (TRUE);

-- 2. MONITORING DEFINITIONS (items within each category)
CREATE TABLE IF NOT EXISTS public.monitoring_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID NOT NULL REFERENCES public.monitoring_categories(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  translation_key TEXT NOT NULL,
  description_translation_key TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'boolean' CHECK (field_type IN ('boolean', 'number', 'time', 'text', 'scale', 'select', 'multi_select', 'photo')),
  dependency_code TEXT, -- e.g. checkin_btn_took_med depends on meds_scheduled
  allows_reminder BOOLEAN NOT NULL DEFAULT FALSE,
  allows_attachment BOOLEAN NOT NULL DEFAULT FALSE,
  display_order INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.monitoring_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_definitions_read_all" ON public.monitoring_definitions
  FOR SELECT USING (TRUE);

-- 3. CARED PERSON MONITORING SETTINGS (per-person activation)
CREATE TABLE IF NOT EXISTS public.cared_person_monitoring_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  monitoring_definition_id UUID NOT NULL REFERENCES public.monitoring_definitions(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  enabled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  disabled_at TIMESTAMPTZ,
  configured_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  settings_json JSONB NOT NULL DEFAULT '{}',
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cared_person_id, monitoring_definition_id)
);

ALTER TABLE public.cared_person_monitoring_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cared_person_monitoring_settings_select" ON public.cared_person_monitoring_settings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = cared_person_monitoring_settings.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "cared_person_monitoring_settings_insert" ON public.cared_person_monitoring_settings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = cared_person_monitoring_settings.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'collaborator')
        AND om.status = 'active'
    )
  );

CREATE POLICY "cared_person_monitoring_settings_update" ON public.cared_person_monitoring_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = cared_person_monitoring_settings.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'collaborator')
        AND om.status = 'active'
    )
  );

CREATE POLICY "cared_person_monitoring_settings_delete" ON public.cared_person_monitoring_settings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = cared_person_monitoring_settings.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin')
        AND om.status = 'active'
    )
  );

-- 4. CUSTOM MONITORING FIELDS (user-defined tracking items)
CREATE TABLE IF NOT EXISTS public.custom_monitoring_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.monitoring_categories(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  description TEXT,
  field_type TEXT NOT NULL CHECK (field_type IN ('boolean', 'checkbox', 'short_text', 'notes', 'number', 'time', 'date', 'single_select', 'multi_select', 'scale_0_10', 'photo', 'attachment')),
  options_json JSONB NOT NULL DEFAULT '[]',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  frequency_json JSONB NOT NULL DEFAULT '{"type": "daily"}',
  reminder_settings_json JSONB NOT NULL DEFAULT '{}',
  visibility_json JSONB NOT NULL DEFAULT '{"roles": ["owner", "admin", "collaborator", "caregiver"]}',
  include_daily_summary BOOLEAN NOT NULL DEFAULT TRUE,
  include_weekly_report BOOLEAN NOT NULL DEFAULT TRUE,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

ALTER TABLE public.custom_monitoring_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_monitoring_fields_select" ON public.custom_monitoring_fields
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = custom_monitoring_fields.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "custom_monitoring_fields_insert" ON public.custom_monitoring_fields
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = custom_monitoring_fields.organization_id
        AND om.user_id = auth.uid()
        AND om.role IN ('owner', 'admin', 'collaborator')
        AND om.status = 'active'
    )
  );

-- 5. MONITORING RECORDS (daily tracking events for both standard & custom items)
CREATE TABLE IF NOT EXISTS public.monitoring_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  monitoring_definition_id UUID REFERENCES public.monitoring_definitions(id) ON DELETE SET NULL,
  custom_field_id UUID REFERENCES public.custom_monitoring_fields(id) ON DELETE SET NULL,
  recorded_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  value_json JSONB NOT NULL DEFAULT '{}',
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'family_app' CHECK (source IN ('family_app', 'senior_screen', 'caregiver_app', 'system_automation')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  archived_at TIMESTAMPTZ
);

ALTER TABLE public.monitoring_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_records_select" ON public.monitoring_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = monitoring_records.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

CREATE POLICY "monitoring_records_insert" ON public.monitoring_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = monitoring_records.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- 6. CONFIGURATION AUDIT LOG
CREATE TABLE IF NOT EXISTS public.monitoring_configuration_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('enable', 'disable', 'reorder', 'create_custom_field', 'archive_custom_field', 'copy_configuration')),
  monitoring_definition_id UUID REFERENCES public.monitoring_definitions(id) ON DELETE SET NULL,
  custom_field_id UUID REFERENCES public.custom_monitoring_fields(id) ON DELETE SET NULL,
  previous_value JSONB,
  new_value JSONB,
  performed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.monitoring_configuration_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monitoring_configuration_audit_select" ON public.monitoring_configuration_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = monitoring_configuration_audit.organization_id
        AND om.user_id = auth.uid()
        AND om.status = 'active'
    )
  );

-- 7. PERFORMANCE INDICES
CREATE INDEX IF NOT EXISTS idx_monitoring_settings_person ON public.cared_person_monitoring_settings(cared_person_id, enabled);
CREATE INDEX IF NOT EXISTS idx_monitoring_settings_org ON public.cared_person_monitoring_settings(organization_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_records_person_date ON public.monitoring_records(cared_person_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_records_definition ON public.monitoring_records(monitoring_definition_id);
CREATE INDEX IF NOT EXISTS idx_monitoring_records_custom ON public.monitoring_records(custom_field_id);
CREATE INDEX IF NOT EXISTS idx_custom_fields_person ON public.custom_monitoring_fields(cared_person_id, enabled);
CREATE INDEX IF NOT EXISTS idx_monitoring_audit_person ON public.monitoring_configuration_audit(cared_person_id, created_at DESC);

-- 8. SEED MONITORING CATEGORIES (12 standard categories)
INSERT INTO public.monitoring_categories (id, code, translation_key, icon, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'daily_routine', 'monitoring.categories.daily_routine', 'Utensils', 1),
  ('c1000000-0000-0000-0000-000000000002', 'medications', 'monitoring.categories.medications', 'Pill', 2),
  ('c1000000-0000-0000-0000-000000000003', 'observed_wellbeing', 'monitoring.categories.observed_wellbeing', 'Heart', 3),
  ('c1000000-0000-0000-0000-000000000004', 'memory_routine', 'monitoring.categories.memory_routine', 'Brain', 4),
  ('c1000000-0000-0000-0000-000000000005', 'autonomy', 'monitoring.categories.autonomy', 'Footprints', 5),
  ('c1000000-0000-0000-0000-000000000006', 'socialization', 'monitoring.categories.socialization', 'Users', 6),
  ('c1000000-0000-0000-0000-000000000007', 'safety_incidents', 'monitoring.categories.safety_incidents', 'ShieldAlert', 7),
  ('c1000000-0000-0000-0000-000000000008', 'prosthetics_devices', 'monitoring.categories.prosthetics_devices', 'Glasses', 8),
  ('c1000000-0000-0000-0000-000000000009', 'care_inventory', 'monitoring.categories.care_inventory', 'Package', 9),
  ('c1000000-0000-0000-0000-000000000010', 'schedule_logistics', 'monitoring.categories.schedule_logistics', 'Calendar', 10),
  ('c1000000-0000-0000-0000-000000000011', 'caregivers_shifts', 'monitoring.categories.caregivers_shifts', 'Clock', 11),
  ('c1000000-0000-0000-0000-000000000012', 'cared_person_checkins', 'monitoring.categories.cared_person_checkins', 'CheckSquare', 12)
ON CONFLICT (code) DO NOTHING;

-- 9. SEED MONITORING DEFINITIONS
-- Category A: Rotina diária
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'routine_meals', 'monitoring.defs.routine_meals', 'monitoring.defs.desc.routine_meals', 'select', 1),
  ('c1000000-0000-0000-0000-000000000001', 'routine_hydration', 'monitoring.defs.routine_hydration', 'monitoring.defs.desc.routine_hydration', 'number', 2),
  ('c1000000-0000-0000-0000-000000000001', 'routine_bath', 'monitoring.defs.routine_bath', 'monitoring.defs.desc.routine_bath', 'boolean', 3),
  ('c1000000-0000-0000-0000-000000000001', 'routine_personal_hygiene', 'monitoring.defs.routine_personal_hygiene', 'monitoring.defs.desc.routine_personal_hygiene', 'boolean', 4),
  ('c1000000-0000-0000-0000-000000000001', 'routine_clothing_change', 'monitoring.defs.routine_clothing_change', 'monitoring.defs.desc.routine_clothing_change', 'boolean', 5),
  ('c1000000-0000-0000-0000-000000000001', 'routine_restroom', 'monitoring.defs.routine_restroom', 'monitoring.defs.desc.routine_restroom', 'select', 6),
  ('c1000000-0000-0000-0000-000000000001', 'routine_diapers', 'monitoring.defs.routine_diapers', 'monitoring.defs.desc.routine_diapers', 'number', 7),
  ('c1000000-0000-0000-0000-000000000001', 'routine_sleep', 'monitoring.defs.routine_sleep', 'monitoring.defs.desc.routine_sleep', 'time', 8),
  ('c1000000-0000-0000-0000-000000000001', 'routine_activities', 'monitoring.defs.routine_activities', 'monitoring.defs.desc.routine_activities', 'text', 9),
  ('c1000000-0000-0000-0000-000000000001', 'routine_housework', 'monitoring.defs.routine_housework', 'monitoring.defs.desc.routine_housework', 'text', 10)
ON CONFLICT (code) DO NOTHING;

-- Category B: Medicamentos
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, allows_reminder, allows_attachment, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000002', 'meds_scheduled', 'monitoring.defs.meds_scheduled', 'monitoring.defs.desc.meds_scheduled', 'boolean', TRUE, TRUE, 1),
  ('c1000000-0000-0000-0000-000000000002', 'meds_taken_confirmation', 'monitoring.defs.meds_taken_confirmation', 'monitoring.defs.desc.meds_taken_confirmation', 'boolean', TRUE, FALSE, 2),
  ('c1000000-0000-0000-0000-000000000002', 'meds_not_taken_reason', 'monitoring.defs.meds_not_taken_reason', 'monitoring.defs.desc.meds_not_taken_reason', 'text', FALSE, FALSE, 3),
  ('c1000000-0000-0000-0000-000000000002', 'meds_stock_management', 'monitoring.defs.meds_stock_management', 'monitoring.defs.desc.meds_stock_management', 'number', TRUE, FALSE, 4),
  ('c1000000-0000-0000-0000-000000000002', 'meds_low_stock_alert', 'monitoring.defs.meds_low_stock_alert', 'monitoring.defs.desc.meds_low_stock_alert', 'boolean', TRUE, FALSE, 5)
ON CONFLICT (code) DO NOTHING;

-- Category C: Bem-estar observado
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000003', 'wellbeing_mood', 'monitoring.defs.wellbeing_mood', 'monitoring.defs.desc.wellbeing_mood', 'select', 1),
  ('c1000000-0000-0000-0000-000000000003', 'wellbeing_energy', 'monitoring.defs.wellbeing_energy', 'monitoring.defs.desc.wellbeing_energy', 'scale', 2),
  ('c1000000-0000-0000-0000-000000000003', 'wellbeing_behavior_change', 'monitoring.defs.wellbeing_behavior_change', 'monitoring.defs.desc.wellbeing_behavior_change', 'text', 3),
  ('c1000000-0000-0000-0000-000000000003', 'wellbeing_reported_pain', 'monitoring.defs.wellbeing_reported_pain', 'monitoring.defs.desc.wellbeing_reported_pain', 'scale', 4),
  ('c1000000-0000-0000-0000-000000000003', 'wellbeing_weight', 'monitoring.defs.wellbeing_weight', 'monitoring.defs.desc.wellbeing_weight', 'number', 5),
  ('c1000000-0000-0000-0000-000000000003', 'wellbeing_general_notes', 'monitoring.defs.wellbeing_general_notes', 'monitoring.defs.desc.wellbeing_general_notes', 'text', 6)
ON CONFLICT (code) DO NOTHING;

-- Category D: Memória e rotina cotidiana
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000004', 'memory_unusual_forgetfulness', 'monitoring.defs.memory_unusual_forgetfulness', 'monitoring.defs.desc.memory_unusual_forgetfulness', 'text', 1),
  ('c1000000-0000-0000-0000-000000000004', 'memory_repeated_questions', 'monitoring.defs.memory_repeated_questions', 'monitoring.defs.desc.memory_repeated_questions', 'boolean', 2),
  ('c1000000-0000-0000-0000-000000000004', 'memory_routine_difficulty', 'monitoring.defs.memory_routine_difficulty', 'monitoring.defs.desc.memory_routine_difficulty', 'text', 3),
  ('c1000000-0000-0000-0000-000000000004', 'memory_reminder_need', 'monitoring.defs.memory_reminder_need', 'monitoring.defs.desc.memory_reminder_need', 'boolean', 4)
ON CONFLICT (code) DO NOTHING;

-- Category E: Autonomia
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000005', 'autonomy_meals', 'monitoring.defs.autonomy_meals', 'monitoring.defs.desc.autonomy_meals', 'select', 1),
  ('c1000000-0000-0000-0000-000000000005', 'autonomy_bath', 'monitoring.defs.autonomy_bath', 'monitoring.defs.desc.autonomy_bath', 'select', 2),
  ('c1000000-0000-0000-0000-000000000005', 'autonomy_dressing', 'monitoring.defs.autonomy_dressing', 'monitoring.defs.desc.autonomy_dressing', 'select', 3),
  ('c1000000-0000-0000-0000-000000000005', 'autonomy_mobility', 'monitoring.defs.autonomy_mobility', 'monitoring.defs.desc.autonomy_mobility', 'select', 4),
  ('c1000000-0000-0000-0000-000000000005', 'autonomy_restroom', 'monitoring.defs.autonomy_restroom', 'monitoring.defs.desc.autonomy_restroom', 'select', 5)
ON CONFLICT (code) DO NOTHING;

-- Category F: Socialização
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000006', 'social_visits', 'monitoring.defs.social_visits', 'monitoring.defs.desc.social_visits', 'text', 1),
  ('c1000000-0000-0000-0000-000000000006', 'social_calls', 'monitoring.defs.social_calls', 'monitoring.defs.desc.social_calls', 'number', 2),
  ('c1000000-0000-0000-0000-000000000006', 'social_activities', 'monitoring.defs.social_activities', 'monitoring.defs.desc.social_activities', 'text', 3),
  ('c1000000-0000-0000-0000-000000000006', 'social_alone_periods', 'monitoring.defs.social_alone_periods', 'monitoring.defs.desc.social_alone_periods', 'boolean', 4)
ON CONFLICT (code) DO NOTHING;

-- Category G: Segurança e ocorrências
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, allows_attachment, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000007', 'safety_falls', 'monitoring.defs.safety_falls', 'monitoring.defs.desc.safety_falls', 'text', TRUE, 1),
  ('c1000000-0000-0000-0000-000000000007', 'safety_domestic_incidents', 'monitoring.defs.safety_domestic_incidents', 'monitoring.defs.desc.safety_domestic_incidents', 'text', TRUE, 2),
  ('c1000000-0000-0000-0000-000000000007', 'safety_help_requests', 'monitoring.defs.safety_help_requests', 'monitoring.defs.desc.safety_help_requests', 'boolean', FALSE, 3),
  ('c1000000-0000-0000-0000-000000000007', 'safety_emergency_button', 'monitoring.defs.safety_emergency_button', 'monitoring.defs.desc.safety_emergency_button', 'boolean', FALSE, 4),
  ('c1000000-0000-0000-0000-000000000007', 'safety_observed_wounds', 'monitoring.defs.safety_observed_wounds', 'monitoring.defs.desc.safety_observed_wounds', 'text', TRUE, 5)
ON CONFLICT (code) DO NOTHING;

-- Category H: Próteses, equipamentos e dispositivos
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000008', 'devices_glasses', 'monitoring.defs.devices_glasses', 'monitoring.defs.desc.devices_glasses', 'boolean', 1),
  ('c1000000-0000-0000-0000-000000000008', 'devices_hearing_aid', 'monitoring.defs.devices_hearing_aid', 'monitoring.defs.desc.devices_hearing_aid', 'boolean', 2),
  ('c1000000-0000-0000-0000-000000000008', 'devices_dentures', 'monitoring.defs.devices_dentures', 'monitoring.defs.desc.devices_dentures', 'boolean', 3),
  ('c1000000-0000-0000-0000-000000000008', 'devices_mobility_aids', 'monitoring.defs.devices_mobility_aids', 'monitoring.defs.desc.devices_mobility_aids', 'select', 4),
  ('c1000000-0000-0000-0000-000000000008', 'devices_maintenance', 'monitoring.defs.devices_maintenance', 'monitoring.defs.desc.devices_maintenance', 'text', 5)
ON CONFLICT (code) DO NOTHING;

-- Category I: Estoque de cuidados
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, allows_reminder, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000009', 'inventory_diapers', 'monitoring.defs.inventory_diapers', 'monitoring.defs.desc.inventory_diapers', 'number', TRUE, 1),
  ('c1000000-0000-0000-0000-000000000009', 'inventory_hygiene', 'monitoring.defs.inventory_hygiene', 'monitoring.defs.desc.inventory_hygiene', 'number', TRUE, 2),
  ('c1000000-0000-0000-0000-000000000009', 'inventory_dressings', 'monitoring.defs.inventory_dressings', 'monitoring.defs.desc.inventory_dressings', 'number', TRUE, 3),
  ('c1000000-0000-0000-0000-000000000009', 'inventory_special_food', 'monitoring.defs.inventory_special_food', 'monitoring.defs.desc.inventory_special_food', 'number', TRUE, 4)
ON CONFLICT (code) DO NOTHING;

-- Category J: Agenda, transporte e documentos
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, allows_reminder, allows_attachment, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000010', 'schedule_appointments', 'monitoring.defs.schedule_appointments', 'monitoring.defs.desc.schedule_appointments', 'text', TRUE, TRUE, 1),
  ('c1000000-0000-0000-0000-000000000010', 'schedule_physical_therapy', 'monitoring.defs.schedule_physical_therapy', 'monitoring.defs.desc.schedule_physical_therapy', 'text', TRUE, FALSE, 2),
  ('c1000000-0000-0000-0000-000000000010', 'schedule_transport', 'monitoring.defs.schedule_transport', 'monitoring.defs.desc.schedule_transport', 'text', FALSE, FALSE, 3),
  ('c1000000-0000-0000-0000-000000000010', 'schedule_documents', 'monitoring.defs.schedule_documents', 'monitoring.defs.desc.schedule_documents', 'text', TRUE, TRUE, 4)
ON CONFLICT (code) DO NOTHING;

-- Category K: Cuidadores e passagem de turno
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000011', 'shift_checkin_checkout', 'monitoring.defs.shift_checkin_checkout', 'monitoring.defs.desc.shift_checkin_checkout', 'time', 1),
  ('c1000000-0000-0000-0000-000000000011', 'shift_tasks', 'monitoring.defs.shift_tasks', 'monitoring.defs.desc.shift_tasks', 'text', 2),
  ('c1000000-0000-0000-0000-000000000011', 'shift_handover_report', 'monitoring.defs.shift_handover_report', 'monitoring.defs.desc.shift_handover_report', 'text', 3)
ON CONFLICT (code) DO NOTHING;

-- Category L: Check-in da pessoa cuidada (Botões tela simplificada)
INSERT INTO public.monitoring_definitions (category_id, code, translation_key, description_translation_key, field_type, dependency_code, display_order)
VALUES
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_im_well', 'monitoring.defs.checkin_btn_im_well', 'monitoring.defs.desc.checkin_btn_im_well', 'boolean', NULL, 1),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_need_help', 'monitoring.defs.checkin_btn_need_help', 'monitoring.defs.desc.checkin_btn_need_help', 'boolean', NULL, 2),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_took_med', 'monitoring.defs.checkin_btn_took_med', 'monitoring.defs.desc.checkin_btn_took_med', 'boolean', 'meds_scheduled', 3),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_ate', 'monitoring.defs.checkin_btn_ate', 'monitoring.defs.desc.checkin_btn_ate', 'boolean', 'routine_meals', 4),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_drank_water', 'monitoring.defs.checkin_btn_drank_water', 'monitoring.defs.desc.checkin_btn_drank_water', 'boolean', 'routine_hydration', 5),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_woke_up', 'monitoring.defs.checkin_btn_woke_up', 'monitoring.defs.desc.checkin_btn_woke_up', 'boolean', 'routine_sleep', 6),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_going_to_sleep', 'monitoring.defs.checkin_btn_going_to_sleep', 'monitoring.defs.desc.checkin_btn_going_to_sleep', 'boolean', 'routine_sleep', 7),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_activity_done', 'monitoring.defs.checkin_btn_activity_done', 'monitoring.defs.desc.checkin_btn_activity_done', 'boolean', 'routine_activities', 8),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_remind_later', 'monitoring.defs.checkin_btn_remind_later', 'monitoring.defs.desc.checkin_btn_remind_later', 'boolean', NULL, 9),
  ('c1000000-0000-0000-0000-000000000012', 'checkin_btn_emergency', 'monitoring.defs.checkin_btn_emergency', 'monitoring.defs.desc.checkin_btn_emergency', 'boolean', 'safety_emergency_button', 10)
ON CONFLICT (code) DO NOTHING;
