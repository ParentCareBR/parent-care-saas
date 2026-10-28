-- Ensure cared_people has user_id, preferred_name, and other essential columns
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'pt-BR';
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/Sao_Paulo';
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS relationship TEXT;
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.cared_people ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT;
