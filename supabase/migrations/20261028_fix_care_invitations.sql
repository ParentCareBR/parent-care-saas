-- ============================================================
-- Migration: 20261028_fix_care_invitations.sql
-- Fix: Cria a tabela care_invitations e dependências do idoso (Opção C)
-- Idempotente: pode ser executada múltiplas vezes com total segurança.
-- ============================================================

-- 1. Extensões essenciais
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Função auxiliar para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Garantir colunas em cared_people
ALTER TABLE public.cared_people
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS nickname TEXT,
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'pt-BR',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS relationship TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;

-- 4. Garantir colunas em organization_members
ALTER TABLE public.organization_members
  ADD COLUMN IF NOT EXISTS display_name TEXT,
  ADD COLUMN IF NOT EXISTS relationship TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Atualizar constraint de role em organization_members de forma segura
DO $$
BEGIN
  ALTER TABLE public.organization_members DROP CONSTRAINT IF EXISTS organization_members_role_check;
  ALTER TABLE public.organization_members ADD CONSTRAINT organization_members_role_check
    CHECK (role IN ('owner', 'admin', 'collaborator', 'caregiver', 'cared_person', 'professional', 'emergency_contact'));
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- 5. Criar tabela de auditoria se não existir
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE SET NULL,
  module_code TEXT,
  action TEXT NOT NULL,
  table_name TEXT,
  record_id UUID,
  old_data JSONB DEFAULT '{}',
  new_data JSONB DEFAULT '{}',
  description TEXT,
  is_critical BOOLEAN DEFAULT FALSE,
  user_role TEXT,
  user_display_name TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  device_info TEXT,
  language_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_al_org ON public.audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_cared ON public.audit_logs(cared_person_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_al_user ON public.audit_logs(user_id, created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "audit_logs_admin_select" ON public.audit_logs;
  DROP POLICY IF EXISTS "audit_logs_member_insert" ON public.audit_logs;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = audit_logs.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

CREATE POLICY "audit_logs_member_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 6. CRIAR TABELA PRINCIPAL: care_invitations
CREATE TABLE IF NOT EXISTS public.care_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE SET NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'cared_person'
    CHECK (role IN ('admin', 'collaborator', 'caregiver', 'cared_person', 'professional', 'emergency_contact')),
  invited_email TEXT,
  invited_phone TEXT,
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'canceled', 'revoked')),
  accepted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,
  canceled_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  preferred_language TEXT DEFAULT 'pt-BR',
  message TEXT,
  reserved_seat BOOLEAN NOT NULL DEFAULT FALSE,
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

DO $$
BEGIN
  DROP POLICY IF EXISTS "ci_admin_all" ON public.care_invitations;
  DROP POLICY IF EXISTS "ci_inviter_select" ON public.care_invitations;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "ci_admin_all" ON public.care_invitations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = care_invitations.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

CREATE POLICY "ci_inviter_select" ON public.care_invitations
  FOR SELECT USING (invited_by = auth.uid());

-- 7. TABELA: user_cared_person_access (isolamento por idoso)
CREATE TABLE IF NOT EXISTS public.user_cared_person_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

ALTER TABLE public.user_cared_person_access ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "ucpa_admin_all" ON public.user_cared_person_access;
  DROP POLICY IF EXISTS "ucpa_self_select" ON public.user_cared_person_access;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

CREATE POLICY "ucpa_admin_all" ON public.user_cared_person_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.organization_members om
      WHERE om.organization_id = user_cared_person_access.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

CREATE POLICY "ucpa_self_select" ON public.user_cared_person_access
  FOR SELECT USING (user_id = auth.uid());

-- 8. TRIGGER: vincular idoso automaticamente ao seu próprio registro
CREATE OR REPLACE FUNCTION public.handle_cared_person_user_link()
RETURNS TRIGGER AS $$
BEGIN
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

-- 9. Auto-conceder acesso aos donos/administradores existentes
INSERT INTO public.user_cared_person_access (organization_id, user_id, cared_person_id, granted_by, notes)
SELECT
  cp.organization_id,
  om.user_id,
  cp.id,
  om.user_id,
  'Auto-grant: existing owner/admin'
FROM public.organization_members om
JOIN public.cared_people cp ON cp.organization_id = om.organization_id
WHERE om.role IN ('owner', 'admin')
AND om.status = 'active'
ON CONFLICT (user_id, cared_person_id) DO NOTHING;

-- 10. RECARREGAR SCHEMA CACHE DO POSTGREST IMEDIATAMENTE
NOTIFY pgrst, 'reload schema';
