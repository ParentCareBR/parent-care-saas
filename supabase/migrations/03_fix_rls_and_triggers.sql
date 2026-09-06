-- ============================================================
-- 03_fix_rls_and_triggers.sql
-- Executar no Supabase SQL Editor:
-- https://supabase.com/dashboard/project/rokrsaprrqkjdcaakkkg/sql/new
-- ============================================================

-- 1. Sincronizar auth.users -> public.users e garantir perfil
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuário'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Sincronizar usuários existentes no Auth para public.users
INSERT INTO public.users (id, email, full_name)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', raw_user_meta_data->>'name', 'Usuário')
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Gatilho automático: ao criar uma organização/família, o dono já se torna membro owner imediatamente
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.organization_members (organization_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'active')
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- 3. Políticas de permissão para organization_members (permitir dono da org criar membros)
DROP POLICY IF EXISTS "members_insert_admin" ON public.organization_members;
CREATE POLICY "members_insert_admin" ON public.organization_members
  FOR INSERT WITH CHECK (
    public.is_org_admin(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.organizations WHERE id = organization_id AND owner_id = auth.uid()
    )
    OR user_id = auth.uid()
  );

-- 4. Permitir que o dono veja sua própria organização mesmo antes do cache de membros atualizar
DROP POLICY IF EXISTS "orgs_select" ON public.organizations;
CREATE POLICY "orgs_select" ON public.organizations
  FOR SELECT USING (
    public.is_org_member(id)
    OR owner_id = auth.uid()
  );

-- 5. Adicionar colunas extras na tabela cared_people e flexibilizar regras
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.cared_people ALTER COLUMN created_by DROP NOT NULL;

DROP POLICY IF EXISTS "cared_people_all" ON public.cared_people;
DROP POLICY IF EXISTS "cared_people_select" ON public.cared_people;
DROP POLICY IF EXISTS "cared_people_insert" ON public.cared_people;
DROP POLICY IF EXISTS "cared_people_update" ON public.cared_people;

CREATE POLICY "cared_people_all" ON public.cared_people
  FOR ALL USING (
    public.is_org_member(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.organizations WHERE id = organization_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_org_member(organization_id)
    OR EXISTS (
      SELECT 1 FROM public.organizations WHERE id = organization_id AND owner_id = auth.uid()
    )
  );
