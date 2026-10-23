-- ============================================================
-- Migration: Auth, Permissions, Audit, Notifications v2
-- 20261023_auth_permissions_v2.sql
-- Parent Care — Implementa sistema completo de perfis, permissões
-- granulares por pessoa cuidada e módulo, auditoria, aprovações,
-- preferências de notificação e controle de acesso por período.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. EXTEND users TABLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS preferred_language TEXT NOT NULL DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
CREATE TRIGGER users_set_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 2. EXTEND organization_members TABLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS relationship TEXT, -- filho, irmão, cônjuge, cuidador, etc.
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS org_members_set_updated_at ON public.organization_members;
CREATE TRIGGER org_members_set_updated_at
  BEFORE UPDATE ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3. USER × CARED PERSON ACCESS
-- Controla quem pode acessar cada pessoa cuidada individualmente.
-- Um membro só vê pessoas cuidadas com registro aqui.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_cared_person_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, cared_person_id)
);

CREATE INDEX IF NOT EXISTS idx_ucpa_user ON public.user_cared_person_access(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ucpa_cared ON public.user_cared_person_access(cared_person_id, is_active);
CREATE INDEX IF NOT EXISTS idx_ucpa_org ON public.user_cared_person_access(organization_id);

DROP TRIGGER IF EXISTS ucpa_set_updated_at ON public.user_cared_person_access;
CREATE TRIGGER ucpa_set_updated_at
  BEFORE UPDATE ON public.user_cared_person_access
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_cared_person_access ENABLE ROW LEVEL SECURITY;

-- Owners/admins can manage; users can see their own access
CREATE POLICY "ucpa_admin_all" ON public.user_cared_person_access
  FOR ALL USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "ucpa_self_select" ON public.user_cared_person_access
  FOR SELECT USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 4. USER ACCESS PERIODS (Validade e horários do cuidador)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_access_periods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE CASCADE, -- NULL = all
  access_type TEXT NOT NULL DEFAULT 'permanent'
    CHECK (access_type IN ('permanent', 'temporary', 'shift_only', 'scheduled')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  days_of_week INT[] DEFAULT NULL, -- 0=Sun, 1=Mon, ... 6=Sat; NULL = all days
  time_from TIME DEFAULT NULL, -- e.g. '07:00'
  time_until TIME DEFAULT NULL, -- e.g. '19:00'
  timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uap_user ON public.user_access_periods(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_uap_org ON public.user_access_periods(organization_id);

DROP TRIGGER IF EXISTS uap_set_updated_at ON public.user_access_periods;
CREATE TRIGGER uap_set_updated_at
  BEFORE UPDATE ON public.user_access_periods
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_access_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "uap_admin_all" ON public.user_access_periods
  FOR ALL USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "uap_self_select" ON public.user_access_periods
  FOR SELECT USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 5. MODULE PERMISSIONS (Permissões granulares por módulo e ação)
-- ─────────────────────────────────────────────────────────────

-- 5a. Reference table: module definitions
CREATE TABLE IF NOT EXISTS public.module_definitions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL, -- 'agenda', 'medicamentos', etc.
  name_key TEXT NOT NULL,    -- i18n key
  description_key TEXT,
  icon TEXT,
  display_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert all 26 modules
INSERT INTO public.module_definitions (code, name_key, icon, display_order) VALUES
  ('agenda',              'modules.agenda',             'Calendar',      1),
  ('medicamentos',        'modules.medicamentos',        'Pill',          2),
  ('alimentacao',         'modules.alimentacao',         'Utensils',      3),
  ('hidratacao',          'modules.hidratacao',          'Droplet',       4),
  ('rotina',              'modules.rotina',              'CheckSquare',   5),
  ('humor',               'modules.humor',               'Smile',         6),
  ('atividades',          'modules.atividades',          'Activity',      7),
  ('autonomia',           'modules.autonomia',           'User',          8),
  ('sinais',              'modules.sinais',              'Heart',         9),
  ('peso',                'modules.peso',                'Scale',         10),
  ('quedas',              'modules.quedas',              'AlertTriangle', 11),
  ('feridas',             'modules.feridas',             'Bandage',       12),
  ('fraldas',             'modules.fraldas',             'Baby',          13),
  ('dispositivos',        'modules.dispositivos',        'Tool',          14),
  ('documentos',          'modules.documentos',          'FileText',      15),
  ('despesas',            'modules.despesas',            'DollarSign',    16),
  ('transporte',          'modules.transporte',          'Car',           17),
  ('contatos_emergencia', 'modules.contatos_emergencia', 'Phone',         18),
  ('checkin',             'modules.checkin',             'CheckCircle',   19),
  ('diario',              'modules.diario',              'BookOpen',      20),
  ('passagem_turno',      'modules.passagem_turno',      'RefreshCw',     21),
  ('relatorios',          'modules.relatorios',          'BarChart2',     22),
  ('jogos',               'modules.jogos',               'Gamepad2',      23),
  ('historico_jogos',     'modules.historico_jogos',     'Trophy',        24),
  ('fotos',               'modules.fotos',               'Image',         25),
  ('localizacao',         'modules.localizacao',         'MapPin',        26)
ON CONFLICT (code) DO NOTHING;

-- 5b. User module permissions (granular per user × cared_person × module × actions)
CREATE TABLE IF NOT EXISTS public.user_module_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE CASCADE, -- NULL = all cared_people
  module_code TEXT NOT NULL REFERENCES public.module_definitions(code) ON DELETE CASCADE,
  -- Actions (JSONB for flexibility)
  can_view BOOLEAN NOT NULL DEFAULT FALSE,
  can_create BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_own BOOLEAN NOT NULL DEFAULT FALSE,
  can_edit_others BOOLEAN NOT NULL DEFAULT FALSE,
  can_delete BOOLEAN NOT NULL DEFAULT FALSE,
  can_request_change BOOLEAN NOT NULL DEFAULT FALSE,
  can_approve BOOLEAN NOT NULL DEFAULT FALSE,
  can_export BOOLEAN NOT NULL DEFAULT FALSE,
  can_share BOOLEAN NOT NULL DEFAULT FALSE,
  can_receive_notifications BOOLEAN NOT NULL DEFAULT TRUE,
  can_administer BOOLEAN NOT NULL DEFAULT FALSE,
  -- Agenda-specific policy
  agenda_policy TEXT DEFAULT NULL
    CHECK (agenda_policy IS NULL OR agenda_policy IN (
      'view_only', 'request_only', 'add_pending_approval',
      'add_with_notification', 'full_admin'
    )),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, cared_person_id, module_code)
);

CREATE INDEX IF NOT EXISTS idx_ump_user ON public.user_module_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_ump_org ON public.user_module_permissions(organization_id);
CREATE INDEX IF NOT EXISTS idx_ump_cared ON public.user_module_permissions(cared_person_id);

DROP TRIGGER IF EXISTS ump_set_updated_at ON public.user_module_permissions;
CREATE TRIGGER ump_set_updated_at
  BEFORE UPDATE ON public.user_module_permissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_module_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ump_admin_all" ON public.user_module_permissions
  FOR ALL USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "ump_self_select" ON public.user_module_permissions
  FOR SELECT USING (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 6. CARE INVITATIONS (Convites completos para idosos e outros perfis)
-- Separado de organization_invitations para suportar convites por
-- link, código temporário e configurações específicas do perfil.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.care_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Invitation target
  role TEXT NOT NULL DEFAULT 'collaborator'
    CHECK (role IN ('admin', 'collaborator', 'caregiver', 'cared_person', 'professional', 'emergency_contact')),
  invited_email TEXT,
  invited_phone TEXT,
  -- Token for link-based invite (single use, hashed)
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'canceled', 'revoked')),
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  canceled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  -- Config
  preferred_language TEXT DEFAULT 'pt-BR',
  message TEXT, -- Personal message from admin to invitee
  reserved_seat BOOLEAN NOT NULL DEFAULT TRUE,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ci_org ON public.care_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_ci_token ON public.care_invitations(token);
CREATE INDEX IF NOT EXISTS idx_ci_email ON public.care_invitations(invited_email);
CREATE INDEX IF NOT EXISTS idx_ci_cared ON public.care_invitations(cared_person_id);

DROP TRIGGER IF EXISTS ci_set_updated_at ON public.care_invitations;
CREATE TRIGGER ci_set_updated_at
  BEFORE UPDATE ON public.care_invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.care_invitations ENABLE ROW LEVEL SECURITY;

-- Admins manage; anyone can read their own (by token via API)
CREATE POLICY "ci_admin_all" ON public.care_invitations
  FOR ALL USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "ci_inviter_select" ON public.care_invitations
  FOR SELECT USING (invited_by = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 7. APPROVAL REQUESTS (Solicitações aguardando aprovação)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- What is being requested
  module_code TEXT NOT NULL, -- 'agenda', 'medicamentos', etc.
  action TEXT NOT NULL,       -- 'create', 'edit', 'delete', etc.
  table_name TEXT,            -- DB table affected
  record_id UUID,             -- ID of the record being changed (if exists)
  -- Data
  proposed_data JSONB,        -- New data being proposed
  current_data JSONB,         -- Current data snapshot
  description TEXT NOT NULL,  -- Human-readable description of the request
  -- Status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'canceled', 'expired')),
  -- Decision
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  decision_notes TEXT,
  -- Config
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  requires_admin_approval BOOLEAN NOT NULL DEFAULT TRUE,
  -- Notifications sent
  notified_at TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_org ON public.approval_requests(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_ar_cared ON public.approval_requests(cared_person_id);
CREATE INDEX IF NOT EXISTS idx_ar_requester ON public.approval_requests(requested_by);

DROP TRIGGER IF EXISTS ar_set_updated_at ON public.approval_requests;
CREATE TRIGGER ar_set_updated_at
  BEFORE UPDATE ON public.approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ar_admin_all" ON public.approval_requests
  FOR ALL USING (public.is_org_admin(organization_id))
  WITH CHECK (public.is_org_admin(organization_id));

CREATE POLICY "ar_requester_select" ON public.approval_requests
  FOR SELECT USING (requested_by = auth.uid());

CREATE POLICY "ar_member_insert" ON public.approval_requests
  FOR INSERT WITH CHECK (public.is_org_member(organization_id));

CREATE POLICY "ar_requester_cancel" ON public.approval_requests
  FOR UPDATE USING (requested_by = auth.uid() AND status = 'pending');

-- ─────────────────────────────────────────────────────────────
-- 8. IMPROVE AUDIT LOGS TABLE
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_code TEXT,
  ADD COLUMN IF NOT EXISTS user_role TEXT,
  ADD COLUMN IF NOT EXISTS user_display_name TEXT,
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS device_info TEXT,
  ADD COLUMN IF NOT EXISTS language_used TEXT,
  ADD COLUMN IF NOT EXISTS approval_request_id UUID REFERENCES public.approval_requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_critical BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_al_org ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_cared ON public.audit_logs(cared_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_user ON public.audit_logs(user_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- 9. USER NOTIFICATION PREFERENCES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  -- Events to receive notifications for
  new_appointment BOOLEAN NOT NULL DEFAULT TRUE,
  appointment_changed BOOLEAN NOT NULL DEFAULT TRUE,
  appointment_canceled BOOLEAN NOT NULL DEFAULT TRUE,
  approval_requested BOOLEAN NOT NULL DEFAULT TRUE,
  approval_decided BOOLEAN NOT NULL DEFAULT TRUE,
  medication_confirmed BOOLEAN NOT NULL DEFAULT TRUE,
  medication_missed BOOLEAN NOT NULL DEFAULT TRUE,
  emergency_event BOOLEAN NOT NULL DEFAULT TRUE,
  help_requested BOOLEAN NOT NULL DEFAULT TRUE,
  shift_started BOOLEAN NOT NULL DEFAULT FALSE,
  shift_ended BOOLEAN NOT NULL DEFAULT FALSE,
  handover_submitted BOOLEAN NOT NULL DEFAULT TRUE,
  document_added BOOLEAN NOT NULL DEFAULT FALSE,
  photo_added BOOLEAN NOT NULL DEFAULT FALSE,
  new_member BOOLEAN NOT NULL DEFAULT TRUE,
  member_first_access BOOLEAN NOT NULL DEFAULT TRUE,
  access_expiring BOOLEAN NOT NULL DEFAULT TRUE,
  access_suspended BOOLEAN NOT NULL DEFAULT TRUE,
  permission_changed BOOLEAN NOT NULL DEFAULT TRUE,
  -- Channels
  in_app BOOLEAN NOT NULL DEFAULT TRUE,
  email BOOLEAN NOT NULL DEFAULT TRUE,
  push_web BOOLEAN NOT NULL DEFAULT TRUE,
  -- Quiet hours
  quiet_hours_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_from TIME DEFAULT '22:00',
  quiet_until TIME DEFAULT '07:00',
  -- Language for notifications
  notification_language TEXT DEFAULT 'pt-BR',
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_unp_user ON public.user_notification_preferences(user_id);

DROP TRIGGER IF EXISTS unp_set_updated_at ON public.user_notification_preferences;
CREATE TRIGGER unp_set_updated_at
  BEFORE UPDATE ON public.user_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.user_notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "unp_own_all" ON public.user_notification_preferences
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can see preferences of org members
CREATE POLICY "unp_admin_select" ON public.user_notification_preferences
  FOR SELECT USING (public.is_org_admin(organization_id));

-- ─────────────────────────────────────────────────────────────
-- 10. TRUSTED DEVICES
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.trusted_devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  device_fingerprint TEXT NOT NULL, -- hashed
  device_type TEXT DEFAULT 'unknown' CHECK (device_type IN ('mobile', 'tablet', 'desktop', 'unknown')),
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  trusted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_td_user ON public.trusted_devices(user_id, is_active);

ALTER TABLE public.trusted_devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "td_own_all" ON public.trusted_devices
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────
-- 11. HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Check if user has access to a specific cared person
CREATE OR REPLACE FUNCTION public.can_access_cared_person(
  p_user_id UUID,
  p_cared_person_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  -- Owners and admins always have full access
  IF EXISTS (
    SELECT 1 FROM public.user_cared_person_access ucpa
    JOIN public.organization_members om ON (
      om.user_id = p_user_id AND
      om.organization_id = ucpa.organization_id AND
      om.role IN ('owner', 'admin') AND
      om.status = 'active'
    )
    WHERE ucpa.user_id = p_user_id
    AND ucpa.is_active = TRUE
    LIMIT 1
  ) THEN
    RETURN TRUE;
  END IF;

  -- Owners: check organizations directly
  IF EXISTS (
    SELECT 1 FROM public.organizations o
    JOIN public.cared_people cp ON cp.organization_id = o.id
    WHERE o.owner_id = p_user_id
    AND cp.id = p_cared_person_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Otherwise check explicit access grant
  RETURN EXISTS (
    SELECT 1 FROM public.user_cared_person_access
    WHERE user_id = p_user_id
    AND cared_person_id = p_cared_person_id
    AND is_active = TRUE
    AND revoked_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user has a specific permission on a module
CREATE OR REPLACE FUNCTION public.has_module_permission(
  p_user_id UUID,
  p_cared_person_id UUID,
  p_module_code TEXT,
  p_permission TEXT -- 'can_view', 'can_create', etc.
)
RETURNS BOOLEAN AS $$
DECLARE
  v_has_perm BOOLEAN := FALSE;
BEGIN
  -- Owners always have full access
  IF EXISTS (
    SELECT 1 FROM public.organizations o
    JOIN public.cared_people cp ON cp.organization_id = o.id
    WHERE o.owner_id = p_user_id AND cp.id = p_cared_person_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check user_module_permissions (specific for this cared_person)
  EXECUTE format(
    'SELECT COALESCE(%I, FALSE) FROM public.user_module_permissions
     WHERE user_id = $1
     AND module_code = $2
     AND (cared_person_id = $3 OR cared_person_id IS NULL)
     AND organization_id IN (
       SELECT organization_id FROM public.cared_people WHERE id = $3
     )
     ORDER BY cared_person_id NULLS LAST
     LIMIT 1',
    p_permission
  )
  INTO v_has_perm
  USING p_user_id, p_module_code, p_cared_person_id;

  RETURN COALESCE(v_has_perm, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ─────────────────────────────────────────────────────────────
-- 12. AUTO-GRANT ACCESS WHEN CARED PERSON IS LINKED TO A USER
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_cared_person_user_link()
RETURNS TRIGGER AS $$
BEGIN
  -- When a cared_person gets a user_id, grant that user access to themselves
  IF NEW.user_id IS NOT NULL AND (OLD.user_id IS NULL OR OLD.user_id != NEW.user_id) THEN
    INSERT INTO public.user_cared_person_access (
      organization_id, user_id, cared_person_id, granted_by, notes
    ) VALUES (
      NEW.organization_id,
      NEW.user_id,
      NEW.id,
      NEW.user_id,
      'Auto-granted: cared person linked to own account'
    )
    ON CONFLICT (user_id, cared_person_id) DO UPDATE SET
      is_active = TRUE,
      revoked_at = NULL,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_cared_person_user_linked ON public.cared_people;
CREATE TRIGGER on_cared_person_user_linked
  AFTER INSERT OR UPDATE OF user_id ON public.cared_people
  FOR EACH ROW EXECUTE FUNCTION public.handle_cared_person_user_link();

-- ─────────────────────────────────────────────────────────────
-- 13. DEFAULT PERMISSIONS BY ROLE
-- ─────────────────────────────────────────────────────────────
-- Function to apply default module permissions when a member joins
CREATE OR REPLACE FUNCTION public.apply_default_role_permissions(
  p_organization_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_cared_person_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_module RECORD;
BEGIN
  FOR v_module IN SELECT code FROM public.module_definitions WHERE is_active = TRUE LOOP
    INSERT INTO public.user_module_permissions (
      organization_id, user_id, cared_person_id, module_code,
      can_view, can_create, can_edit_own, can_edit_others, can_delete,
      can_request_change, can_approve, can_export, can_share,
      can_receive_notifications, can_administer, agenda_policy,
      granted_by
    ) VALUES (
      p_organization_id, p_user_id, p_cared_person_id, v_module.code,
      -- owner: all true
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE
           WHEN p_role = 'caregiver' THEN TRUE -- caregivers can view all
           WHEN p_role IN ('collaborator', 'cared_person') THEN TRUE
           WHEN p_role = 'professional' THEN TRUE
           ELSE FALSE END, -- can_view
      -- can_create
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE
           WHEN p_role = 'caregiver' THEN
             v_module.code IN ('rotina','alimentacao','hidratacao','atividades','checkin','diario','passagem_turno','sinais','peso','quedas','feridas','fraldas')
           WHEN p_role = 'collaborator' THEN
             v_module.code IN ('agenda','checkin','diario')
           WHEN p_role = 'cared_person' THEN
             v_module.code IN ('checkin','diario','jogos')
           ELSE FALSE END,
      -- can_edit_own
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE
           WHEN p_role IN ('caregiver', 'collaborator', 'cared_person') THEN TRUE
           ELSE FALSE END,
      -- can_edit_others
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE ELSE FALSE END,
      -- can_delete
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE ELSE FALSE END,
      -- can_request_change
      CASE WHEN p_role IN ('owner','admin','caregiver','collaborator') THEN TRUE ELSE FALSE END,
      -- can_approve
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE ELSE FALSE END,
      -- can_export
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE ELSE FALSE END,
      -- can_share
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE ELSE FALSE END,
      -- can_receive_notifications
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE
           WHEN p_role = 'caregiver' THEN v_module.code IN ('agenda','medicamentos','rotina','passagem_turno','checkin','emergencia')
           WHEN p_role = 'collaborator' THEN v_module.code IN ('agenda','checkin','relatorios')
           ELSE FALSE END,
      -- can_administer
      CASE WHEN p_role IN ('owner', 'admin') THEN TRUE ELSE FALSE END,
      -- agenda_policy
      CASE WHEN p_role IN ('owner', 'admin') THEN 'full_admin'
           WHEN p_role = 'caregiver' THEN 'add_with_notification'
           WHEN p_role = 'collaborator' THEN 'request_only'
           WHEN p_role = 'cared_person' THEN 'view_only'
           ELSE 'view_only' END,
      p_user_id
    )
    ON CONFLICT (user_id, cared_person_id, module_code) DO NOTHING;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─────────────────────────────────────────────────────────────
-- 14. AUTO-GRANT CARED PERSON ACCESS WHEN OWNER JOINS
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_org_member()
RETURNS TRIGGER AS $$
DECLARE
  v_cared RECORD;
BEGIN
  -- For owners and admins: grant access to ALL cared people in the org
  IF NEW.role IN ('owner', 'admin') THEN
    FOR v_cared IN
      SELECT id FROM public.cared_people
      WHERE organization_id = NEW.organization_id
    LOOP
      INSERT INTO public.user_cared_person_access (
        organization_id, user_id, cared_person_id, granted_by, notes
      ) VALUES (
        NEW.organization_id, NEW.user_id, v_cared.id, NEW.user_id,
        'Auto-granted: owner/admin role'
      )
      ON CONFLICT (user_id, cared_person_id) DO UPDATE SET
        is_active = TRUE, revoked_at = NULL, updated_at = NOW();
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_new_org_member ON public.organization_members;
CREATE TRIGGER on_new_org_member
  AFTER INSERT OR UPDATE OF role ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_org_member();

-- ─────────────────────────────────────────────────────────────
-- 15. AUTO-GRANT ACCESS TO OWNER FOR ALL EXISTING CARED PEOPLE
-- (Backfill for existing data)
-- ─────────────────────────────────────────────────────────────
INSERT INTO public.user_cared_person_access (organization_id, user_id, cared_person_id, granted_by, notes)
SELECT
  cp.organization_id,
  om.user_id,
  cp.id,
  om.user_id,
  'Backfill: existing owner/admin'
FROM public.organization_members om
JOIN public.cared_people cp ON cp.organization_id = om.organization_id
WHERE om.role IN ('owner', 'admin')
AND om.status = 'active'
ON CONFLICT (user_id, cared_person_id) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- 16. RLS: MODULE_DEFINITIONS (public read)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.module_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "md_public_read" ON public.module_definitions
  FOR SELECT USING (TRUE);

-- ─────────────────────────────────────────────────────────────
-- 17. AUTO AUDIT LOG HELPER FUNCTION
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_audit_log(
  p_organization_id UUID,
  p_user_id UUID,
  p_cared_person_id UUID,
  p_module_code TEXT,
  p_action TEXT,
  p_table_name TEXT DEFAULT NULL,
  p_record_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL,
  p_is_critical BOOLEAN DEFAULT FALSE,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
  v_user_role TEXT;
  v_user_name TEXT;
BEGIN
  -- Get user role in org
  SELECT om.role, COALESCE(u.full_name, u.email, 'Unknown')
  INTO v_user_role, v_user_name
  FROM public.organization_members om
  LEFT JOIN public.users u ON u.id = p_user_id
  WHERE om.organization_id = p_organization_id
  AND om.user_id = p_user_id
  LIMIT 1;

  INSERT INTO public.audit_logs (
    organization_id, user_id, cared_person_id, module_code, action,
    table_name, record_id, old_data, new_data, is_critical,
    user_role, user_display_name
  ) VALUES (
    p_organization_id, p_user_id, p_cared_person_id, p_module_code, p_action,
    p_table_name, p_record_id, p_old_data, p_new_data, p_is_critical,
    v_user_role, v_user_name
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_audit_log TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_cared_person TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_module_permission TO authenticated;
GRANT EXECUTE ON FUNCTION public.apply_default_role_permissions TO authenticated;

-- ─────────────────────────────────────────────────────────────
-- 18. TYPE DEFINITIONS FOR DATABASE.TS (comment only)
-- ─────────────────────────────────────────────────────────────
-- See src/types/database.ts for TypeScript types corresponding
-- to these tables.

COMMENT ON TABLE public.user_cared_person_access IS
  'Controls which users can access which cared people. Enforces per-person data isolation.';

COMMENT ON TABLE public.user_module_permissions IS
  'Granular module permissions per user × cared person × module. Verified at API level.';

COMMENT ON TABLE public.care_invitations IS
  'Invitations for all roles including cared persons (elderly). Supports link, email and temp code.';

COMMENT ON TABLE public.approval_requests IS
  'Approval workflow for critical changes like medications, emergency contacts, permissions.';

COMMENT ON TABLE public.user_access_periods IS
  'Time-bound access rules for caregivers (shift times, date ranges, days of week).';

COMMENT ON TABLE public.trusted_devices IS
  'Devices that have been explicitly trusted by the user for login.';
