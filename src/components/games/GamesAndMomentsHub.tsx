'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { GameCatalogItem, GameId, GameCategory, GameProgress, OverallStats, GameSession } from '@/types/games';
import { STATIC_CATALOG } from '@/lib/games/catalog-data';
import { GamePlayerModal } from './GamePlayerModal';
import { Button } from '@/components/ui/button';
import { 
  Gamepad2, 
  Star, 
  Trophy, 
  Flame, 
  Clock, 
  Heart, 
  History, 
  Sparkles, 
  Search, 
  Play, 
  Calendar, 
  Users, 
  ChevronRight, 
  X, 
  CheckCircle2, 
  RotateCcw,
  Volume2,
  ChevronLeft,
  Filter
} from 'lucide-react';
import { 
  getLocalFavorites, 
  toggleLocalFavorite, 
  getLocalProgressCache, 
  setLocalProgressCache, 
  flushOfflineSessionsQueue 
} from '@/lib/games/offline-sync';
import { getCareTexts } from '@/lib/i18n/care-translations';

interface GamesAndMomentsHubProps {
  caredPersonId: string;
  caredPersonName?: string;
  organizationId?: string;
  locale?: string;
  showBackHeader?: boolean;
  backHref?: string;
}

export function GamesAndMomentsHub({
  caredPersonId,
  caredPersonName = 'Pessoa Querida',
  organizationId,
  locale = 'pt-BR',
  showBackHeader = true,
  backHref = '/dashboard',
}: GamesAndMomentsHubProps) {
  const tCare = getCareTexts(locale);

  const categoryTabs: { key: GameCategory; label: string; icon: string }[] = useMemo(() => [
    { key: 'all', label: tCare.gamesCategories.all, icon: '🎮' },
    { key: 'cards', label: tCare.gamesCategories.cards, icon: '🃏' },
    { key: 'words', label: tCare.gamesCategories.words, icon: '🔤' },
    { key: 'numbers', label: tCare.gamesCategories.numbers, icon: '🔢' },
    { key: 'memory', label: tCare.gamesCategories.memory, icon: '🧠' },
    { key: 'images', label: tCare.gamesCategories.images, icon: '🖼️' },
    { key: 'strategy', label: tCare.gamesCategories.strategy, icon: '♟️' },
    { key: 'relaxation', label: tCare.gamesCategories.relaxation, icon: '🫧' },
    { key: 'family', label: tCare.gamesCategories.family, icon: '👨‍👩‍👧‍👦' },
  ], [tCare]);
  const [catalog, setCatalog] = useState<GameCatalogItem[]>(STATIC_CATALOG);
  const [progressMap, setProgressMap] = useState<Record<string, GameProgress>>({});
  const [stats, setStats] = useState<OverallStats>({
    totalStars: 0,
    totalCompleted: 0,
    totalTime: 0,
    activeDays: 1,
    streak: 1,
    totalSessions: 0,
    gamesTried: 0,
  });
  const [recentSessions, setRecentSessions] = useState<GameSession[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<GameCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [activePlayingGame, setActivePlayingGame] = useState<GameCatalogItem | null>(null);
  const [playingLevel, setPlayingLevel] = useState(1);
  const [showEvolutionModal, setShowEvolutionModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showAchievementsModal, setShowAchievementsModal] = useState(false);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);

  // Load progress, catalog and favorites
  const loadData = () => {
    // 1. Local Cache
    const cached = getLocalProgressCache(caredPersonId);
    if (cached) {
      const map: Record<string, GameProgress> = {};
      cached.progress.forEach(p => { map[p.game_id] = p; });
      setProgressMap(map);
      setStats(cached.stats);
    }
    setFavorites(getLocalFavorites(caredPersonId));

    // 2. Fetch Catalog
    fetch('/api/games/catalog')
      .then(res => res.json())
      .then(data => {
        if (data.catalog && data.catalog.length > 0) {
          setCatalog(data.catalog);
        }
      })
      .catch(() => {});

    // 3. Fetch Remote Progress
    fetch(`/api/games/progress?cared_person_id=${caredPersonId}`)
      .then(res => res.json())
      .then(data => {
        if (data.progress) {
          const map: Record<string, GameProgress> = {};
          data.progress.forEach((p: GameProgress) => { map[p.game_id] = p; });
          setProgressMap(map);
        }
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.recentSessions) {
          setRecentSessions(data.recentSessions);
        }
        // Update local cache
        if (data.progress && data.stats) {
          setLocalProgressCache(caredPersonId, { progress: data.progress, stats: data.stats });
        }
      })
      .catch(() => {});

    // 4. Daily challenge
    fetch('/api/games/daily')
      .then(res => res.json())
      .then(data => {
        if (data.challenge) setDailyChallenge(data.challenge);
      })
      .catch(() => {});

    // 5. Try flushing any offline queue
    flushOfflineSessionsQueue().catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, [caredPersonId]);

  const handleToggleFav = (gameId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isNowFav = toggleLocalFavorite(caredPersonId, gameId);
    setFavorites(getLocalFavorites(caredPersonId));

    // Sync remote
    fetch('/api/games/progress/favorite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cared_person_id: caredPersonId, game_id: gameId, is_favorite: isNowFav }),
    }).catch(() => {});
  };

  const handleStartGame = (game: GameCatalogItem, level?: number) => {
    const p = progressMap[game.id];
    const targetLvl = level || p?.current_level || 1;
    setActivePlayingGame(game);
    setPlayingLevel(targetLvl);
  };

  // Find last played session for "Continuar Jogando"
  const lastPlayedGame = useMemo(() => {
    if (recentSessions.length === 0) return null;
    const lastSession = recentSessions[0];
    return catalog.find(g => g.id === lastSession.game_id) || null;
  }, [recentSessions, catalog]);

  // Filtered games
  const filteredGames = useMemo(() => {
    return catalog.filter(game => {
      const matchesCategory = activeCategory === 'all' || game.category === activeCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        game.name_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        game.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalog, activeCategory, searchQuery]);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20 px-3 sm:px-4">
      {/* ── TOP HEADER ── */}
      {showBackHeader && (
        <header className="flex items-center justify-between py-3">
          <Link
            href={backHref}
            className="w-11 h-11 rounded-2xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 flex items-center justify-center text-stone-800 dark:text-stone-200 shadow-2xs hover:bg-stone-100 transition active:scale-95"
          >
            <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
          </Link>
          <div className="flex items-center gap-2">
            <Gamepad2 className="h-8 w-8 text-indigo-600 dark:text-indigo-400 stroke-[2.5]" />
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100 tracking-wider">
              {tCare.gamesHubTitle.toUpperCase()}
            </h1>
          </div>
          <div className="w-11" />
        </header>
      )}

      {/* ── EVOLUTION & METRICS HERO BANNER ── */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-600 text-white rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-44 h-44 rounded-full bg-white/10 pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full inline-block mb-1.5">
              {tCare.gamesHubSubtitle}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black leading-tight">
              {tCare.greeting(caredPersonName)}
            </h2>
            <p className="text-sm font-semibold text-indigo-100 mt-1">
              {tCare.cardGamesSubtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stars pill */}
            <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-center">
              <span className="text-xl font-black flex items-center justify-center gap-1">
                ⭐ {stats.totalStars}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200 block">
                {tCare.gamesStars}
              </span>
            </div>

            {/* Streak pill */}
            <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-center">
              <span className="text-xl font-black flex items-center justify-center gap-1">
                🔥 {stats.streak}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-200 block">
                {tCare.dayToday}
              </span>
            </div>
          </div>
        </div>

        {/* Action quick links strip */}
        <div className="grid grid-cols-3 gap-2 pt-4 mt-4 border-t border-white/20">
          <button
            type="button"
            onClick={() => setShowEvolutionModal(true)}
            className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <Trophy className="h-4 w-4" /> {tCare.gamesEvolution}
          </button>
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="py-2 px-3 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95"
          >
            <History className="h-4 w-4" /> {tCare.gamesHistory}
          </button>
          <button
            type="button"
            onClick={() => {
              const memGame = catalog.find(g => g.id === 'memorias_familia');
              if (memGame) handleStartGame(memGame);
            }}
            className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-900 text-xs font-black flex items-center justify-center gap-1.5 transition active:scale-95 shadow-sm"
          >
            <Heart className="h-4 w-4 fill-current text-rose-600" /> {tCare.gameNames['memorias_familia']?.title || 'Memórias'}
          </button>
        </div>
      </div>

      {/* ── HERO ROW: CONTINUAR JOGANDO & DESAFIO DO DIA ── */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Continuar Jogando Card */}
        {lastPlayedGame && (
          <div className="bg-white dark:bg-stone-900 border-2 border-indigo-200 dark:border-indigo-800 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-3xl shrink-0">
                {lastPlayedGame.icon_emoji}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 block">
                  {tCare.cardGamesSubtitle}
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100 truncate">
                  {tCare.gameNames[lastPlayedGame.id]?.title || lastPlayedGame.name_key.replace('_', ' ').toUpperCase()}
                </h3>
                <span className="text-xs font-bold text-stone-500">
                  {tCare.gamesLevel} {progressMap[lastPlayedGame.id]?.current_level || 1}
                </span>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => handleStartGame(lastPlayedGame)}
              className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs rounded-xl shadow-xs shrink-0 active:scale-95"
            >
              <Play className="h-4 w-4 mr-1 fill-current" /> {tCare.gamesPlayNow}
            </Button>
          </div>
        )}

        {/* Desafio do Dia Card */}
        {dailyChallenge && (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-stone-900 dark:to-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-3xl p-4 shadow-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-amber-100 dark:bg-amber-950 flex items-center justify-center text-3xl shrink-0">
                {dailyChallenge.icon}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase text-amber-800 dark:text-amber-400 block">
                  {tCare.gamesDailyChallenge} ☀️
                </span>
                <h3 className="text-base font-black text-stone-900 dark:text-stone-100 truncate">
                  {dailyChallenge.title}
                </h3>
                <span className="text-xs font-bold text-amber-700 dark:text-amber-300">
                  +150 pts bônus
                </span>
              </div>
            </div>
            <Button
              type="button"
              onClick={() => {
                const target = catalog.find(g => g.id === dailyChallenge.game_id) || catalog[0];
                handleStartGame(target, dailyChallenge.level_number);
              }}
              className="h-11 px-4 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs rounded-xl shadow-xs shrink-0 active:scale-95"
            >
              {tCare.gamesPlayNow}
            </Button>
          </div>
        )}
      </div>

      {/* ── CATEGORY FILTER TABS ── */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
          {categoryTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveCategory(tab.key)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 border ${
                activeCategory === tab.key
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-800 hover:bg-stone-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── ALL 21 GAMES GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredGames.map(game => {
          const prog = progressMap[game.id];
          const isFav = favorites.includes(game.id);
          const currentLvl = prog?.current_level || 1;
          const starsEarned = prog?.total_stars || 0;
          const progressPercent = Math.min(100, Math.round((currentLvl / 100) * 100));

          return (
            <div
              key={game.id}
              onClick={() => handleStartGame(game)}
              className="bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 hover:border-indigo-400 p-4 sm:p-5 rounded-3xl shadow-xs transition-all active:scale-[0.99] flex flex-col justify-between cursor-pointer group"
            >
              {/* Card Top: Emoji Icon + Fav Button + Multiplayer badge */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div
                  className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center text-3xl shadow-2xs group-hover:scale-105 transition-transform"
                  style={{ backgroundColor: `${game.color_from}18`, color: game.color_from }}
                >
                  {game.icon_emoji}
                </div>

                <div className="flex items-center gap-1">
                  {game.supports_multiplayer && (
                    <span className="text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-lg">
                      👨‍👩‍👧 {tCare.gamesFamilyBadge}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={(e) => handleToggleFav(game.id, e)}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-amber-500 transition"
                  >
                    <Star className={`h-4 w-4 ${isFav ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Card Middle: Title & Level */}
              <div className="space-y-1 mb-4">
                <h3 className="text-lg font-black text-stone-900 dark:text-stone-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {tCare.gameNames[game.id]?.title || game.name_key.replace('_', ' ').toUpperCase()}
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold text-stone-500">
                  <span>{tCare.gamesLevel} {currentLvl} de 100+</span>
                  <span>•</span>
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-0.5">
                    ⭐ {starsEarned}
                  </span>
                </div>

                {/* Smooth Progress Bar */}
                <div className="w-full bg-stone-100 dark:bg-stone-800 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(5, progressPercent)}%`, backgroundColor: game.color_from }}
                  />
                </div>
              </div>

              {/* Card Bottom: Big Action Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartGame(game);
                }}
                className="w-full h-12 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-indigo-600 group-hover:bg-indigo-600 text-stone-800 dark:text-stone-200 group-hover:text-white font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-2xs"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>{tCare.gamesPlayNow}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* ── MODAL: MINHA EVOLUÇÃO ── */}
      {showEvolutionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 border-4 border-indigo-400 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-indigo-600" />
                <h3 className="text-xl font-black text-stone-900 dark:text-stone-100">
                  Minha Evolução
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEvolutionModal(false)}
                className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-indigo-50 dark:bg-indigo-950/60 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800">
                <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300 block">
                  ⭐ {stats.totalStars}
                </span>
                <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  Estrelas Ganhas
                </span>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/60 p-3 rounded-2xl border border-purple-200 dark:border-purple-800">
                <span className="text-2xl font-black text-purple-700 dark:text-purple-300 block">
                  🏁 {stats.totalCompleted}
                </span>
                <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  Etapas Concluídas
                </span>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/60 p-3 rounded-2xl border border-amber-200 dark:border-amber-800">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-300 block">
                  🔥 {stats.streak} dias
                </span>
                <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  Sequência Ativa
                </span>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/60 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300 block">
                  🎮 {stats.gamesTried}/21
                </span>
                <span className="text-xs font-bold text-stone-600 dark:text-stone-400">
                  Jogos Experimentados
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={() => setShowEvolutionModal(false)}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl"
            >
              Fechar
            </Button>
          </div>
        </div>
      )}

      {/* ── MODAL: HISTÓRICO DE PARTIDAS ── */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-stone-900 border-4 border-indigo-400 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-6 w-6 text-indigo-600" />
                <h3 className="text-xl font-black text-stone-900 dark:text-stone-100">
                  Histórico de Partidas
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="w-9 h-9 rounded-xl bg-stone-100 dark:bg-stone-800 flex items-center justify-center"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {recentSessions.length === 0 ? (
                <p className="text-sm font-semibold text-stone-500 text-center py-8">
                  Nenhuma partida recente registrada ainda. Que tal jogar uma agora?
                </p>
              ) : (
                recentSessions.map((session, i) => (
                  <div
                    key={session.id || i}
                    className="p-3 bg-stone-50 dark:bg-stone-800 rounded-2xl border border-stone-200 dark:border-stone-700 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-black text-stone-900 dark:text-stone-100 uppercase">
                        {session.game_id} • Etapa {session.level_number}
                      </p>
                      <p className="text-xs font-semibold text-stone-500">
                        {session.started_at ? new Date(session.started_at).toLocaleDateString('pt-BR') : ''} • {session.duration_seconds || 0}s jogados
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-black text-amber-500 block">
                        ⭐ {session.stars || 0}
                      </span>
                      <span className="text-[10px] font-bold text-stone-400 uppercase">
                        {session.status === 'completed' ? 'Concluída' : 'Em andamento'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              type="button"
              onClick={() => setShowHistoryModal(false)}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl shrink-0"
            >
              Voltar aos Jogos
            </Button>
          </div>
        </div>
      )}

      {/* ── ACTIVE GAME ENGINE MODAL ── */}
      {activePlayingGame && (
        <GamePlayerModal
          gameId={activePlayingGame.id}
          gameName={tCare.gameNames[activePlayingGame.id]?.title || activePlayingGame.name_key.replace('_', ' ').toUpperCase()}
          gameEmoji={activePlayingGame.icon_emoji}
          caredPersonId={caredPersonId}
          organizationId={organizationId}
          initialLevel={playingLevel}
          locale={locale}
          onClose={() => {
            setActivePlayingGame(null);
            loadData();
          }}
          onSessionComplete={() => {
            loadData();
          }}
        />
      )}
    </div>
  );
}
