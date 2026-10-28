'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Check, Sparkles, RotateCcw } from 'lucide-react';
import { getWordSearchLevel, WordSearchPuzzle } from '@/lib/games/content-generator';
import { getGameTexts } from '@/lib/i18n/game-i18n';

interface WordSearchEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const FOUND_COLORS = [
  'bg-emerald-500 text-white border-emerald-600',
  'bg-indigo-500 text-white border-indigo-600',
  'bg-amber-500 text-white border-amber-600',
  'bg-rose-500 text-white border-rose-600',
  'bg-cyan-500 text-white border-cyan-600',
  'bg-violet-500 text-white border-violet-600',
];

function playFoundChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5 cheerful major triad
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + idx * 0.1;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.25, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.4);
    });
  } catch {}
}

// Calculate straight line coordinates with friendly axis snapping for senior fingers
function getLineCoords(
  start: { r: number; c: number },
  current: { r: number; c: number },
  maxSize: number
): { r: number; c: number }[] {
  const dr = current.r - start.r;
  const dc = current.c - start.c;

  if (dr === 0 && dc === 0) {
    return [start];
  }

  const absDr = Math.abs(dr);
  const absDc = Math.abs(dc);

  let effectiveDr = dr;
  let effectiveDc = dc;

  // Forgiving axis snapping:
  // If swipe is mostly horizontal, lock to horizontal
  if (absDc >= absDr * 1.2) {
    effectiveDr = 0;
  } else if (absDr >= absDc * 1.2) {
    // If swipe is mostly vertical, lock to vertical
    effectiveDc = 0;
  } else {
    // Diagonal
    const mag = Math.min(absDr, absDc);
    effectiveDr = (dr > 0 ? 1 : -1) * mag;
    effectiveDc = (dc > 0 ? 1 : -1) * mag;
  }

  const stepR = effectiveDr === 0 ? 0 : effectiveDr > 0 ? 1 : -1;
  const stepC = effectiveDc === 0 ? 0 : effectiveDc > 0 ? 1 : -1;
  const length = Math.max(Math.abs(effectiveDr), Math.abs(effectiveDc)) + 1;

  const result: { r: number; c: number }[] = [];
  for (let i = 0; i < length; i++) {
    const r = start.r + i * stepR;
    const c = start.c + i * stepC;
    if (r >= 0 && r < maxSize && c >= 0 && c < maxSize) {
      result.push({ r, c });
    }
  }

  return result;
}

export function WordSearchEngine({
 levelNumber, locale = 'pt-BR', onComplete, onNextLevel }: WordSearchEngineProps) {
  const tGame = getGameTexts(locale);
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle>(() => getWordSearchLevel(levelNumber, locale));
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [foundCells, setFoundCells] = useState<{ r: number; c: number; colorClass: string }[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ r: number; c: number }[]>([]);
  const [dragCoords, setDragCoords] = useState<{ r: number; c: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ r: number; c: number } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);

  const gridContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const p = getWordSearchLevel(levelNumber, locale);
    setPuzzle(p);
    setFoundWords([]);
    setFoundCells([]);
    setSelectedCoords([]);
    setDragCoords([]);
    setIsDragging(false);
    setDragStart(null);
    setHintsUsed(0);
    setIsCompleted(false);
    setEarnedStars(3);
  }, [levelNumber, locale]);

  // Resolve grid coordinate from pointer position
  const getCellFromPointer = (clientX: number, clientY: number): { r: number; c: number } | null => {
    if (!gridContainerRef.current) return null;

    // Check by DOM element under pointer first
    const target = document.elementFromPoint(clientX, clientY);
    if (target) {
      const cell = target.closest('[data-r]');
      if (cell) {
        const r = parseInt(cell.getAttribute('data-r') || '-1', 10);
        const c = parseInt(cell.getAttribute('data-c') || '-1', 10);
        if (r >= 0 && r < puzzle.size && c >= 0 && c < puzzle.size) {
          return { r, c };
        }
      }
    }

    // Direct geometric calculation fallback
    const rect = gridContainerRef.current.getBoundingClientRect();
    const relX = clientX - rect.left;
    const relY = clientY - rect.top;

    if (relX >= 0 && relX <= rect.width && relY >= 0 && relY <= rect.height) {
      const c = Math.floor((relX / rect.width) * puzzle.size);
      const r = Math.floor((relY / rect.height) * puzzle.size);
      return {
        r: Math.max(0, Math.min(puzzle.size - 1, r)),
        c: Math.max(0, Math.min(puzzle.size - 1, c)),
      };
    }

    return null;
  };

  // Pointer Down (Start dragging or first tap)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (isCompleted) return;

    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {}

    setIsDragging(true);
    setDragStart(cell);
    setDragCoords([cell]);
  };

  // Pointer Move (Slide across letters)
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !dragStart || isCompleted) return;

    const cell = getCellFromPointer(e.clientX, e.clientY);
    if (!cell) return;

    const coords = getLineCoords(dragStart, cell, puzzle.size);
    setDragCoords(coords);
  };

  // Check and register word
  const evaluateWord = (coords: { r: number; c: number }[]) => {
    if (coords.length < 2) return false;

    const wordLetters = coords.map(co => puzzle.grid[co.r][co.c]).join('');
    const reversedLetters = wordLetters.split('').reverse().join('');

    const matched = puzzle.words.find(
      w => (w === wordLetters || w === reversedLetters) && !foundWords.includes(w)
    );

    if (matched) {
      // SUCCESS!
      playFoundChime();
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(80);
        } catch {}
      }

      const nextFound = [...foundWords, matched];
      const colorClass = FOUND_COLORS[nextFound.length % FOUND_COLORS.length];

      const newMarkedCells = coords.map(coord => ({
        r: coord.r,
        c: coord.c,
        colorClass,
      }));

      setFoundCells(prev => [...prev, ...newMarkedCells]);
      setFoundWords(nextFound);
      setDragCoords([]);
      setSelectedCoords([]);

      // Check win
      if (nextFound.length === puzzle.words.length) {
        setIsCompleted(true);
        const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
        setEarnedStars(stars);
        onComplete({
          stars,
          score: 300 - hintsUsed * 25,
          moves: nextFound.length,
          hints: hintsUsed,
        });
      }
      return true;
    }

    return false;
  };

  // Pointer Up (Release finger / mouse)
  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || isCompleted) return;
    setIsDragging(false);

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (dragCoords.length >= 2) {
      const found = evaluateWord(dragCoords);
      if (!found) {
        setDragCoords([]);
      }
    } else if (dragCoords.length === 1) {
      // Tap-mode fallback for single click:
      const clicked = dragCoords[0];
      if (selectedCoords.length === 0) {
        setSelectedCoords([clicked]);
      } else {
        const first = selectedCoords[0];
        const line = getLineCoords(first, clicked, puzzle.size);
        const found = evaluateWord(line);
        if (!found) {
          setSelectedCoords([clicked]);
        }
      }
      setDragCoords([]);
    } else {
      setDragCoords([]);
    }

    setDragStart(null);
  };

  const handlePointerCancel = (e: React.PointerEvent) => {
    setIsDragging(false);
    setDragStart(null);
    setDragCoords([]);
  };

  const handleHint = () => {
    const unfound = puzzle.words.filter(w => !foundWords.includes(w));
    if (unfound.length === 0) return;
    const targetWord = unfound[0];

    // Find first letter coordinates
    for (let r = 0; r < puzzle.size; r++) {
      for (let c = 0; c < puzzle.size; c++) {
        if (puzzle.grid[r][c] === targetWord[0]) {
          setSelectedCoords([{ r, c }]);
          setHintsUsed(h => h + 1);
          return;
        }
      }
    }
  };

  const restartPuzzle = () => {
    setFoundWords([]);
    setFoundCells([]);
    setSelectedCoords([]);
    setDragCoords([]);
    setIsDragging(false);
    setDragStart(null);
    setHintsUsed(0);
    setIsCompleted(false);
  };

  // Current forming word from drag
  const currentDragWord = dragCoords.map(co => puzzle.grid[co.r][co.c]).join('');

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-3 select-none">
      {/* Theme and Stage Header */}
      <div className="w-full flex items-center justify-between px-1 text-stone-700 dark:text-stone-300">
        <span className="text-xs sm:text-sm font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800">
          Tema: {puzzle.theme} • Etapa {levelNumber}
        </span>
        <span className="text-xs sm:text-sm font-black text-emerald-700 dark:text-emerald-400">
          {foundWords.length}/{puzzle.words.length} encontradas
        </span>
      </div>

      {/* Words Checklist */}
      <div className="w-full bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 p-3 rounded-2xl flex flex-wrap gap-2 justify-center shadow-xs">
        {puzzle.words.map(word => {
          const isFound = foundWords.includes(word);
          return (
            <span
              key={word}
              className={`px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm tracking-wide transition-all flex items-center gap-1.5 ${
                isFound
                  ? 'bg-emerald-500 text-white line-through shadow-sm'
                  : 'bg-purple-50 text-purple-900 dark:bg-purple-950/60 dark:text-purple-200 border-2 border-purple-200 dark:border-purple-800'
              }`}
            >
              {isFound && <Check className="h-4 w-4 stroke-[3]" />}
              {word}
            </span>
          );
        })}
      </div>

      {/* Live Swipe Preview Badge */}
      <div className="h-7 flex items-center justify-center">
        {isDragging && currentDragWord.length > 0 ? (
          <span className="bg-amber-400 text-stone-950 font-black text-xs sm:text-sm px-3.5 py-1 rounded-full shadow-md animate-pulse">
            Deslizando: {currentDragWord.split('').join(' ')}
          </span>
        ) : (
          <span className="text-xs text-stone-500 font-bold">
            Deslize o dedo sobre as letras para pintar a palavra
          </span>
        )}
      </div>

      {/* Word Search Grid with touch drag & swipe */}
      <div
        ref={gridContainerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          touchAction: 'none',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
        }}
        className="grid gap-1 bg-purple-100 dark:bg-purple-950/40 p-2.5 rounded-3xl shadow-md border-3 border-purple-300 dark:border-purple-800 w-full max-w-[380px] cursor-pointer"
      >
        {puzzle.grid.map((row, r) =>
          row.map((letter, c) => {
            const isDragActive = dragCoords.some(co => co.r === r && co.c === c);
            const isTapped = selectedCoords.some(co => co.r === r && co.c === c);
            const foundMatch = foundCells.find(fc => fc.r === r && fc.c === c);

            let cellClass =
              'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 border border-stone-200 dark:border-stone-800';

            if (isDragActive) {
              // Active glowing drag trail
              cellClass =
                'bg-amber-400 text-stone-950 ring-4 ring-amber-300 scale-105 z-10 font-black border-amber-500 shadow-lg';
            } else if (foundMatch) {
              // Permanently highlighted where the word was found!
              cellClass = `${foundMatch.colorClass} shadow-md scale-100 font-black border-transparent ring-2 ring-white/50`;
            } else if (isTapped) {
              cellClass =
                'bg-amber-300 text-stone-950 ring-3 ring-amber-200 scale-105 font-black border-amber-400';
            }

            return (
              <div
                key={`${r}-${c}`}
                data-r={r}
                data-c={c}
                className={`aspect-square flex items-center justify-center font-black text-lg sm:text-2xl rounded-xl transition-all duration-75 ${cellClass}`}
              >
                {letter}
              </div>
            );
          })
        )}
      </div>

      {/* Action buttons */}
      <div className="w-full flex items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={handleHint}
          variant="outline"
          className="flex-1 h-12 rounded-xl text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 font-bold gap-2 text-sm"
        >
          <Lightbulb className="h-5 w-5" /> {tGame.hintStart}
        </Button>
        <Button
          type="button"
          onClick={restartPuzzle}
          variant="outline"
          className="h-12 px-4 rounded-xl text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 font-bold gap-1 text-sm"
          title={tGame.restartTitle}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Victory Celebration */}
      {isCompleted && (
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/80 border-3 border-emerald-500 p-5 rounded-3xl text-center space-y-3 shadow-lg animate-in zoom-in-95">
          <div className="flex justify-center text-3xl">
            {Array.from({ length: earnedStars }).map((_, i) => (
              <span key={i} className="animate-bounce">
                ⭐
              </span>
            ))}
          </div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            {tGame.wordsFoundAll}
          </h3>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Excelente atenção e memória visual!
          </p>
          {onNextLevel && (
            <Button
              type="button"
              onClick={onNextLevel}
              className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-md active:scale-95"
            >
              {tGame.nextLevel} →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
