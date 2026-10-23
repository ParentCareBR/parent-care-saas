-- ============================================================
-- Migration: Jogos e Momentos (Games & Moments Module)
-- Parent Care v2.0 — 2026-10-23
-- ============================================================

-- 1. GAME CATALOG
CREATE TABLE IF NOT EXISTS public.game_catalog (
  id TEXT PRIMARY KEY, -- e.g. 'sudoku', 'caca_palavras', 'memoria', etc.
  name_key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cards','words','numbers','memory','images','strategy','relaxation','family')),
  min_age INT DEFAULT 0,
  supports_multiplayer BOOLEAN NOT NULL DEFAULT FALSE,
  has_daily_challenge BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  icon_emoji TEXT NOT NULL DEFAULT '🎮',
  color_from TEXT NOT NULL DEFAULT '#6366f1',
  color_to TEXT NOT NULL DEFAULT '#8b5cf6',
  description_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. GAME LEVEL CONTENT (pre-generated or procedural seed levels)
CREATE TABLE IF NOT EXISTS public.game_level_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.game_catalog(id) ON DELETE CASCADE,
  level_number INT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('iniciante','tranquilo','intermediario','experiente','desafio')),
  locale TEXT NOT NULL DEFAULT 'universal',
  content JSONB NOT NULL,
  solution JSONB,
  estimated_minutes INT DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, level_number, locale)
);

-- 3. GAME SESSIONS (each match started or played)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.game_catalog(id),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level_number INT NOT NULL DEFAULT 1,
  difficulty TEXT NOT NULL DEFAULT 'iniciante',
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started','paused','completed','abandoned')),
  stars INT NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  score INT NOT NULL DEFAULT 0,
  moves INT NOT NULL DEFAULT 0,
  hints_used INT NOT NULL DEFAULT 0,
  errors INT NOT NULL DEFAULT 0,
  duration_seconds INT,
  is_daily_challenge BOOLEAN NOT NULL DEFAULT FALSE,
  is_multiplayer BOOLEAN NOT NULL DEFAULT FALSE,
  partner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  game_state JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. GAME PROGRESS (per cared person per game — cumulative)
CREATE TABLE IF NOT EXISTS public.game_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.game_catalog(id),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  current_level INT NOT NULL DEFAULT 1,
  max_level_reached INT NOT NULL DEFAULT 1,
  total_stars INT NOT NULL DEFAULT 0,
  total_sessions INT NOT NULL DEFAULT 0,
  total_completed INT NOT NULL DEFAULT 0,
  total_time_seconds INT NOT NULL DEFAULT 0,
  best_score INT NOT NULL DEFAULT 0,
  best_time_seconds INT,
  is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, cared_person_id)
);

-- 5. GAME LEVEL PROGRESS (per cared person per level)
CREATE TABLE IF NOT EXISTS public.game_level_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.game_catalog(id),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  level_number INT NOT NULL,
  stars INT NOT NULL DEFAULT 0 CHECK (stars BETWEEN 0 AND 3),
  best_score INT NOT NULL DEFAULT 0,
  best_time_seconds INT,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, cared_person_id, level_number)
);

-- 6. GAME ACHIEVEMENTS (definitions)
CREATE TABLE IF NOT EXISTS public.game_achievements (
  id TEXT PRIMARY KEY,
  name_key TEXT NOT NULL,
  description_key TEXT NOT NULL,
  icon_emoji TEXT NOT NULL DEFAULT '🏆',
  condition_type TEXT NOT NULL,
  condition_value INT NOT NULL DEFAULT 1,
  game_id TEXT REFERENCES public.game_catalog(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. USER GAME ACHIEVEMENTS (unlocked per cared person)
CREATE TABLE IF NOT EXISTS public.user_game_achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  achievement_id TEXT NOT NULL REFERENCES public.game_achievements(id),
  cared_person_id UUID NOT NULL REFERENCES public.cared_people(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(achievement_id, cared_person_id)
);

-- 8. DAILY CHALLENGES
CREATE TABLE IF NOT EXISTS public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id TEXT NOT NULL REFERENCES public.game_catalog(id),
  challenge_date DATE NOT NULL,
  level_number INT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, challenge_date)
);

-- 9. FAMILY GAME CONTENT (for Memórias da Família)
CREATE TABLE IF NOT EXISTS public.family_game_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  cared_person_id UUID REFERENCES public.cared_people(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('photo','audio','story','date','place')),
  title TEXT NOT NULL,
  description TEXT,
  person_names TEXT[],
  relationship TEXT,
  year INT,
  place TEXT,
  media_url TEXT,
  media_path TEXT,
  is_approved BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_game_sessions_cared_person ON public.game_sessions(cared_person_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game ON public.game_sessions(game_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_started ON public.game_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_progress_cared_person ON public.game_progress(cared_person_id);
CREATE INDEX IF NOT EXISTS idx_game_level_progress_person ON public.game_level_progress(cared_person_id, game_id);
CREATE INDEX IF NOT EXISTS idx_game_level_content_game ON public.game_level_content(game_id, level_number);
CREATE INDEX IF NOT EXISTS idx_daily_challenges_date ON public.daily_challenges(challenge_date, game_id);
CREATE INDEX IF NOT EXISTS idx_family_content_org ON public.family_game_content(organization_id, cared_person_id);

-- RLS POLICIES
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_level_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_game_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_game_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_level_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_achievements ENABLE ROW LEVEL SECURITY;

-- Public read for catalog, content, achievements, daily
CREATE POLICY "game_catalog_public_read" ON public.game_catalog FOR SELECT USING (is_active = TRUE);
CREATE POLICY "game_level_content_public_read" ON public.game_level_content FOR SELECT USING (TRUE);
CREATE POLICY "game_achievements_public_read" ON public.game_achievements FOR SELECT USING (is_active = TRUE);
CREATE POLICY "daily_challenges_public_read" ON public.daily_challenges FOR SELECT USING (TRUE);

-- Sessions: org members or elder session
CREATE POLICY "game_sessions_select" ON public.game_sessions FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

CREATE POLICY "game_sessions_insert" ON public.game_sessions FOR INSERT
  WITH CHECK (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

CREATE POLICY "game_sessions_update" ON public.game_sessions FOR UPDATE
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

-- Progress
CREATE POLICY "game_progress_select" ON public.game_progress FOR SELECT
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

CREATE POLICY "game_progress_upsert" ON public.game_progress FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

-- Level progress
CREATE POLICY "game_level_progress_all" ON public.game_level_progress FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

-- User achievements
CREATE POLICY "user_achievements_all" ON public.user_game_achievements FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

-- Family content
CREATE POLICY "family_content_all" ON public.family_game_content FOR ALL
  USING (organization_id IN (
    SELECT organization_id FROM public.organization_members WHERE user_id = auth.uid() AND status = 'active'
  ) OR cared_person_id IS NOT NULL);

-- ============================================================
-- SEED DATA: 21 JOGOS DO CATÁLOGO OFICIAL
-- ============================================================
INSERT INTO public.game_catalog (id, name_key, category, supports_multiplayer, has_daily_challenge, sort_order, icon_emoji, color_from, color_to, description_key) VALUES
('paciencia', 'paciencia', 'cards', FALSE, TRUE, 1, '🃏', '#1D4ED8', '#1E40AF', 'paciencia_desc'),
('domino', 'domino', 'strategy', TRUE, TRUE, 2, '🁓', '#1F2937', '#374151', 'domino_desc'),
('sudoku', 'sudoku', 'numbers', FALSE, TRUE, 3, '🔢', '#0891B2', '#0E7490', 'sudoku_desc'),
('caca_palavras', 'caca_palavras', 'words', FALSE, TRUE, 4, '🔤', '#9333EA', '#7E22CE', 'caca_palavras_desc'),
('mahjong', 'mahjong', 'strategy', FALSE, TRUE, 5, '🀄', '#DC2626', '#B91C1C', 'mahjong_desc'),
('memoria', 'memoria', 'memory', TRUE, TRUE, 6, '🧠', '#EF4444', '#DC2626', 'memoria_desc'),
('palavras_cruzadas', 'palavras_cruzadas', 'words', FALSE, TRUE, 7, '📝', '#7C3AED', '#6D28D9', 'palavras_cruzadas_desc'),
('quebra_cabeca', 'quebra_cabeca', 'images', FALSE, TRUE, 8, '🧩', '#059669', '#047857', 'quebra_cabeca_desc'),
('damas', 'damas', 'strategy', TRUE, TRUE, 9, '⚫', '#374151', '#1F2937', 'damas_desc'),
('memorias_familia', 'memorias_familia', 'family', TRUE, FALSE, 10, '👨‍👩‍👧‍👦', '#F59E0B', '#D97706', 'memorias_familia_desc'),
('freecell', 'freecell', 'cards', FALSE, TRUE, 11, '🂡', '#2563EB', '#1D4ED8', 'freecell_desc'),
('spider', 'spider', 'cards', FALSE, TRUE, 12, '🕷️', '#6D28D9', '#4C1D95', 'spider_desc'),
('combine_tres', 'combine_tres', 'relaxation', FALSE, TRUE, 13, '🍬', '#EC4899', '#DB2777', 'combine_tres_desc'),
('encontre_diferencas', 'encontre_diferencas', 'images', FALSE, TRUE, 14, '🔍', '#10B981', '#059669', 'encontre_diferencas_desc'),
('perguntas_respostas', 'perguntas_respostas', 'memory', TRUE, TRUE, 15, '❓', '#6366F1', '#4F46E5', 'perguntas_respostas_desc'),
('objetos_escondidos', 'objetos_escondidos', 'images', FALSE, TRUE, 16, '👀', '#F97316', '#EA580C', 'objetos_escondidos_desc'),
('unir_numeros', 'unir_numeros', 'numbers', FALSE, TRUE, 17, '🔟', '#06B6D4', '#0891B2', 'unir_numeros_desc'),
('blocos', 'blocos', 'relaxation', FALSE, TRUE, 18, '🟦', '#8B5CF6', '#7C3AED', 'blocos_desc'),
('bolhas', 'bolhas', 'relaxation', FALSE, TRUE, 19, '🫧', '#0EA5E9', '#0284C7', 'bolhas_desc'),
('formar_palavras', 'formar_palavras', 'words', FALSE, TRUE, 20, '🔡', '#16A34A', '#15803D', 'formar_palavras_desc'),
('descubra_palavra', 'descubra_palavra', 'words', FALSE, TRUE, 21, '🌸', '#D97706', '#B45309', 'descubra_palavra_desc')
ON CONFLICT (id) DO UPDATE SET
  name_key = EXCLUDED.name_key,
  category = EXCLUDED.category,
  sort_order = EXCLUDED.sort_order,
  icon_emoji = EXCLUDED.icon_emoji,
  color_from = EXCLUDED.color_from,
  color_to = EXCLUDED.color_to,
  description_key = EXCLUDED.description_key;

-- ============================================================
-- SEED DATA: CONQUISTAS DO MÓDULO
-- ============================================================
INSERT INTO public.game_achievements (id, name_key, description_key, icon_emoji, condition_type, condition_value, game_id, sort_order) VALUES
('first_session', 'ach_first_session', 'ach_first_session_desc', '🎉', 'total_sessions', 1, NULL, 1),
('first_complete', 'ach_first_complete', 'ach_first_complete_desc', '⭐', 'total_completed', 1, NULL, 2),
('five_complete', 'ach_five_complete', 'ach_five_complete_desc', '🌟', 'total_completed', 5, NULL, 3),
('twenty_complete', 'ach_twenty_complete', 'ach_twenty_complete_desc', '💫', 'total_completed', 20, NULL, 4),
('fifty_complete', 'ach_fifty_complete', 'ach_fifty_complete_desc', '🏆', 'total_completed', 50, NULL, 5),
('hundred_stars', 'ach_hundred_stars', 'ach_hundred_stars_desc', '✨', 'total_stars', 100, NULL, 6),
('five_games', 'ach_five_games', 'ach_five_games_desc', '🎮', 'games_tried', 5, NULL, 7),
('no_hints', 'ach_no_hints', 'ach_no_hints_desc', '🧠', 'no_hints_complete', 1, NULL, 8),
('sudoku_master', 'ach_sudoku_master', 'ach_sudoku_master_desc', '🔢', 'total_completed', 10, 'sudoku', 9),
('word_hunter', 'ach_word_hunter', 'ach_word_hunter_desc', '🔤', 'total_completed', 10, 'caca_palavras', 10),
('memory_champ', 'ach_memory_champ', 'ach_memory_champ_desc', '🧠', 'total_completed', 10, 'memoria', 11),
('word_master', 'ach_word_master', 'ach_word_master_desc', '🌸', 'total_completed', 10, 'descubra_palavra', 12),
('ten_days', 'ach_ten_days', 'ach_ten_days_desc', '📅', 'active_days', 10, NULL, 13),
('perfect_score', 'ach_perfect_score', 'ach_perfect_score_desc', '💯', 'three_stars', 1, NULL, 14),
('daily_challenge', 'ach_daily_challenge', 'ach_daily_challenge_desc', '🌅', 'daily_complete', 1, NULL, 15)
ON CONFLICT (id) DO NOTHING;
