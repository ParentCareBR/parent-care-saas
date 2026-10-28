'use client';

import React, { useState, useEffect } from 'react';
import { GameId, GameDifficulty } from '@/types/games';
import { Button } from '@/components/ui/button';
import { X, Pause, Play, RotateCcw, Volume2, Sparkles, ChevronLeft, Star } from 'lucide-react';
import { SudokuEngine } from './engines/SudokuEngine';
import { WordSearchEngine } from './engines/WordSearchEngine';
import { MemoryEngine } from './engines/MemoryEngine';
import { WordDiscoveryEngine } from './engines/WordDiscoveryEngine';
import { FamilyMemoriesEngine } from './engines/FamilyMemoriesEngine';
import { DominoEngine } from './engines/DominoEngine';
import { SolitaireEngine } from './engines/SolitaireEngine';
import { CheckersEngine } from './engines/CheckersEngine';
import { TriviaEngine } from './engines/TriviaEngine';
import { MatchThreeEngine } from './engines/MatchThreeEngine';
import { JigsawEngine } from './engines/JigsawEngine';
import { CrosswordsEngine } from './engines/CrosswordsEngine';
import { MahjongEngine } from './engines/MahjongEngine';
import { DifferencesEngine } from './engines/DifferencesEngine';
import { HiddenObjectsEngine } from './engines/HiddenObjectsEngine';
import { NumberMergeEngine } from './engines/NumberMergeEngine';
import { BlockPuzzleEngine } from './engines/BlockPuzzleEngine';
import { BubblePopEngine } from './engines/BubblePopEngine';
import { WordAnagramEngine } from './engines/WordAnagramEngine';
import { saveOfflineSession } from '@/lib/games/offline-sync';
import { getCareTexts } from '@/lib/i18n/care-translations';
import { getGameTexts } from '@/lib/i18n/game-i18n';

interface GamePlayerModalProps {
  gameId: GameId;
  gameName: string;
  gameEmoji: string;
  caredPersonId: string;
  organizationId?: string;
  initialLevel?: number;
  locale?: string;
  onClose: () => void;
  onSessionComplete?: () => void;
}

export function GamePlayerModal({
  gameId,
  gameName,
  gameEmoji,
  caredPersonId,
  organizationId,
  initialLevel = 1,
  locale = 'pt-BR',
  onClose,
  onSessionComplete,
}: GamePlayerModalProps) {
  const tCare = getCareTexts(locale);
  const tGame = getGameTexts(locale);
  const [levelNumber, setLevelNumber] = useState(initialLevel);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime] = useState<number>(Date.now());
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // Start session on mount
  useEffect(() => {
    fetch('/api/games/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game_id: gameId,
        cared_person_id: caredPersonId,
        organization_id: organizationId,
        level_number: initialLevel,
        status: 'started',
      }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.session?.id) {
          setActiveSessionId(data.session.id);
        }
      })
      .catch(() => {});
  }, [gameId, caredPersonId, organizationId, initialLevel]);

  const handleGameComplete = async (stats: { stars: number; score: number; moves: number; hints: number }) => {
    const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

    const payload = {
      id: activeSessionId,
      game_id: gameId,
      cared_person_id: caredPersonId,
      organization_id: organizationId,
      level_number: levelNumber,
      status: 'completed',
      stars: stats.stars,
      score: stats.score,
      moves: stats.moves,
      hints_used: stats.hints,
      duration_seconds: durationSeconds,
    };

    // Save offline first for zero-data-loss guarantee
    saveOfflineSession(payload as any);

    // Sync to backend
    fetch('/api/games/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(() => {});

    if (onSessionComplete) {
      onSessionComplete();
    }
  };

  const handleNextLevel = () => {
    setLevelNumber(lvl => lvl + 1);
  };

  const handlePauseToggle = () => {
    setIsPaused(p => !p);
  };

  const handleConfirmExit = () => {
    if (confirm(tCare.exitConfirm)) {
      const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
      fetch('/api/games/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: activeSessionId,
          game_id: gameId,
          cared_person_id: caredPersonId,
          organization_id: organizationId,
          level_number: levelNumber,
          status: 'paused',
          duration_seconds: durationSeconds,
        }),
      }).catch(() => {});

      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col justify-between overflow-y-auto animate-in fade-in duration-200">
      {/* Top Modal Header */}
      <header className="bg-white/95 dark:bg-stone-900/95 border-b border-stone-200 dark:border-stone-800 p-3 sm:p-4 sticky top-0 z-10 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmExit}
              className="w-11 h-11 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-800 dark:text-stone-200 flex items-center justify-center font-bold active:scale-95 transition"
              title={tCare.backBtn}
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-2xl">{gameEmoji}</span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-stone-900 dark:text-stone-100 leading-tight">
                  {gameName}
                </h2>
                <p className="text-[11px] font-bold text-stone-500">
                  {tGame.levelOf(levelNumber)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handlePauseToggle}
              className="h-10 px-3 rounded-xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 text-stone-700 dark:text-stone-300 font-bold text-xs flex items-center gap-1.5 active:scale-95"
            >
              {isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
              <span>{isPaused ? tCare.resumeBtn : tCare.pauseBtn}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Game Screen */}
      <main className="flex-1 max-w-md mx-auto w-full p-4 flex flex-col justify-center">
        {isPaused ? (
          <div className="bg-white dark:bg-stone-900 border-3 border-amber-300 dark:border-amber-700 p-6 rounded-3xl text-center space-y-4 shadow-xl">
            <div className="text-5xl">☕</div>
            <h3 className="text-xl font-black text-stone-900 dark:text-stone-100">
              {tCare.pausedGameTitle}
            </h3>
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-300">
              {tCare.pausedGameDesc}
            </p>
            <div className="space-y-2 pt-2">
              <Button
                type="button"
                onClick={() => setIsPaused(false)}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-base rounded-2xl shadow-md active:scale-95"
              >
                {tCare.resumeGameBtn}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleConfirmExit}
                className="w-full h-12 border-stone-300 text-stone-700 dark:text-stone-300 font-bold rounded-2xl"
              >
                {tCare.backToGamesBtn}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {gameId === 'paciencia' && (
              <SolitaireEngine locale={locale}
                key={`paciencia-${levelNumber}`}
                variant="klondike"
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'freecell' && (
              <SolitaireEngine locale={locale}
                key={`freecell-${levelNumber}`}
                variant="freecell"
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'spider' && (
              <SolitaireEngine locale={locale}
                key={`spider-${levelNumber}`}
                variant="spider"
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'domino' && (
              <DominoEngine locale={locale}
                key={`domino-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'sudoku' && (
              <SudokuEngine locale={locale}
                key={`sudoku-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'caca_palavras' && (
              <WordSearchEngine
                key={`caca_palavras-${levelNumber}`}
                levelNumber={levelNumber}
                locale={locale}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'mahjong' && (
              <MahjongEngine locale={locale}
                key={`mahjong-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'memoria' && (
              <MemoryEngine locale={locale}
                key={`memoria-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'palavras_cruzadas' && (
              <CrosswordsEngine
                key={`palavras_cruzadas-${levelNumber}`}
                levelNumber={levelNumber}
                locale={locale}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'quebra_cabeca' && (
              <JigsawEngine locale={locale}
                key={`quebra_cabeca-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'damas' && (
              <CheckersEngine locale={locale}
                key={`damas-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'memorias_familia' && (
              <FamilyMemoriesEngine
                key={`memorias_familia-${levelNumber}`}
                levelNumber={levelNumber}
                caredPersonId={caredPersonId}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'combine_tres' && (
              <MatchThreeEngine locale={locale}
                key={`combine_tres-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'encontre_diferencas' && (
              <DifferencesEngine locale={locale}
                key={`encontre_diferencas-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'perguntas_respostas' && (
              <TriviaEngine
                key={`perguntas_respostas-${levelNumber}`}
                levelNumber={levelNumber}
                locale={locale}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'objetos_escondidos' && (
              <HiddenObjectsEngine locale={locale}
                key={`objetos_escondidos-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'unir_numeros' && (
              <NumberMergeEngine locale={locale}
                key={`unir_numeros-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'blocos' && (
              <BlockPuzzleEngine locale={locale}
                key={`blocos-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'bolhas' && (
              <BubblePopEngine locale={locale}
                key={`bolhas-${levelNumber}`}
                levelNumber={levelNumber}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'formar_palavras' && (
              <WordAnagramEngine
                key={`formar_palavras-${levelNumber}`}
                levelNumber={levelNumber}
                locale={locale}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
            {gameId === 'descubra_palavra' && (
              <WordDiscoveryEngine
                key={`descubra_palavra-${levelNumber}`}
                levelNumber={levelNumber}
                locale={locale}
                onComplete={handleGameComplete}
                onNextLevel={handleNextLevel}
              />
            )}
          </>
        )}
      </main>

      <footer className="p-3 text-center text-xs text-white/50">
        {tGame.footerTag}
      </footer>
    </div>
  );
}
