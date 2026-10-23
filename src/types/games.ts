export type GameId =
  | 'paciencia'
  | 'domino'
  | 'sudoku'
  | 'caca_palavras'
  | 'mahjong'
  | 'memoria'
  | 'palavras_cruzadas'
  | 'quebra_cabeca'
  | 'damas'
  | 'memorias_familia'
  | 'freecell'
  | 'spider'
  | 'combine_tres'
  | 'encontre_diferencas'
  | 'perguntas_respostas'
  | 'objetos_escondidos'
  | 'unir_numeros'
  | 'blocos'
  | 'bolhas'
  | 'formar_palavras'
  | 'descubra_palavra';

export type GameCategory =
  | 'all'
  | 'cards'
  | 'words'
  | 'numbers'
  | 'memory'
  | 'images'
  | 'strategy'
  | 'relaxation'
  | 'family';

export type GameDifficulty =
  | 'iniciante'
  | 'tranquilo'
  | 'intermediario'
  | 'experiente'
  | 'desafio';

export type SessionStatus = 'started' | 'paused' | 'completed' | 'abandoned';

export interface GameCatalogItem {
  id: GameId;
  name_key: string;
  category: Exclude<GameCategory, 'all'>;
  supports_multiplayer: boolean;
  has_daily_challenge: boolean;
  sort_order: number;
  icon_emoji: string;
  color_from: string;
  color_to: string;
  description_key: string;
  is_active: boolean;
}

export interface GameProgress {
  id?: string;
  game_id: GameId;
  cared_person_id: string;
  organization_id?: string;
  current_level: number;
  max_level_reached: number;
  total_stars: number;
  total_sessions: number;
  total_completed: number;
  total_time_seconds: number;
  best_score: number;
  best_time_seconds: number | null;
  is_favorite: boolean;
  last_played_at: string | null;
}

export interface GameSession {
  id?: string;
  game_id: GameId;
  cared_person_id: string;
  organization_id: string;
  user_id?: string | null;
  level_number: number;
  difficulty: GameDifficulty;
  status: SessionStatus;
  stars: number;
  score: number;
  moves: number;
  hints_used: number;
  errors: number;
  duration_seconds: number | null;
  is_daily_challenge?: boolean;
  is_multiplayer?: boolean;
  partner_user_id?: string | null;
  game_state?: any;
  started_at?: string;
  completed_at?: string | null;
}

export interface GameAchievement {
  id: string;
  name_key: string;
  description_key: string;
  icon_emoji: string;
  condition_type: string;
  condition_value: number;
  game_id: GameId | null;
  sort_order: number;
}

export interface UserAchievement {
  id?: string;
  achievement_id: string;
  cared_person_id: string;
  unlocked_at: string;
  game_achievements?: GameAchievement;
}

export interface FamilyGameContent {
  id: string;
  organization_id: string;
  cared_person_id?: string | null;
  content_type: 'photo' | 'audio' | 'story' | 'date' | 'place';
  title: string;
  description?: string | null;
  person_names?: string[] | null;
  relationship?: string | null;
  year?: number | null;
  place?: string | null;
  media_url?: string | null;
  media_path?: string | null;
  is_approved: boolean;
  created_at: string;
}

export interface OverallStats {
  totalStars: number;
  totalCompleted: number;
  totalTime: number;
  activeDays: number;
  streak: number;
  totalSessions: number;
  gamesTried: number;
}
