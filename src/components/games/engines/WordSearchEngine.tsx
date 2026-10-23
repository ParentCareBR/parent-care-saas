'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Check, Sparkles } from 'lucide-react';
import { getWordSearchLevel, WordSearchPuzzle } from '@/lib/games/content-generator';

interface WordSearchEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

export function WordSearchEngine({ levelNumber, locale = 'pt-BR', onComplete, onNextLevel }: WordSearchEngineProps) {
  const [puzzle, setPuzzle] = useState<WordSearchPuzzle>(() => getWordSearchLevel(levelNumber, locale));
  const [foundWords, setFoundWords] = useState<string[]>([]);
  const [selectedCoords, setSelectedCoords] = useState<{ r: number; c: number }[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);

  useEffect(() => {
    const p = getWordSearchLevel(levelNumber, locale);
    setPuzzle(p);
    setFoundWords([]);
    setSelectedCoords([]);
    setHintsUsed(0);
    setIsCompleted(false);
    setEarnedStars(3);
  }, [levelNumber, locale]);

  const handleCellClick = (r: number, c: number) => {
    if (isCompleted) return;

    if (selectedCoords.length === 0) {
      setSelectedCoords([{ r, c }]);
    } else {
      const first = selectedCoords[0];
      // Check if clicked cell forms horizontal, vertical or diagonal line
      const dr = r - first.r;
      const dc = c - first.c;

      if (dr === 0 || dc === 0) {
        // Line formed!
        const coords: { r: number; c: number }[] = [];
        const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
        const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
        const length = Math.max(Math.abs(dr), Math.abs(dc)) + 1;

        let curR = first.r;
        let curC = first.c;
        let selectedWord = '';

        for (let i = 0; i < length; i++) {
          coords.push({ r: curR, c: curC });
          selectedWord += puzzle.grid[curR][curC];
          curR += stepR;
          curC += stepC;
        }

        const reversed = selectedWord.split('').reverse().join('');
        const matched = puzzle.words.find(w => w === selectedWord || w === reversed);

        if (matched && !foundWords.includes(matched)) {
          const nextFound = [...foundWords, matched];
          setFoundWords(nextFound);
          setSelectedCoords([]);

          if (nextFound.length === puzzle.words.length) {
            setIsCompleted(true);
            const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
            setEarnedStars(stars);
            onComplete({
              stars,
              score: 250 - hintsUsed * 20,
              moves: nextFound.length,
              hints: hintsUsed,
            });
          }
        } else {
          // Reset selection
          setSelectedCoords([{ r, c }]);
        }
      } else {
        setSelectedCoords([{ r, c }]);
      }
    }
  };

  const handleHint = () => {
    // Find unfound word and highlight its first letter
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

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-3">
      {/* Theme and Stage Header */}
      <div className="w-full flex items-center justify-between px-2 text-stone-600 dark:text-stone-300">
        <span className="text-sm font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-xl border border-purple-200 dark:border-purple-800">
          {puzzle.theme} • Etapa {levelNumber}
        </span>
        <span className="text-xs font-bold text-stone-500">
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
              className={`px-3 py-1 rounded-xl font-bold text-xs tracking-wider transition-all flex items-center gap-1 ${
                isFound
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 line-through opacity-80'
                  : 'bg-purple-50 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
              }`}
            >
              {isFound && <Check className="h-3 w-3 stroke-[3]" />}
              {word}
            </span>
          );
        })}
      </div>

      {/* Word Search Grid */}
      <div
        className="grid gap-1 bg-purple-100 dark:bg-purple-950/40 p-2 rounded-3xl shadow-md border-3 border-purple-300 dark:border-purple-800 select-none w-full max-w-[380px]"
        style={{
          gridTemplateColumns: `repeat(${puzzle.size}, minmax(0, 1fr))`,
        }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((letter, c) => {
            const isSelected = selectedCoords.some(co => co.r === r && co.c === c);

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={`aspect-square flex items-center justify-center font-black text-lg sm:text-xl rounded-xl transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-amber-400 text-stone-900 ring-4 ring-amber-300 scale-105 z-10'
                    : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 hover:bg-purple-50 dark:hover:bg-purple-900/40'
                }`}
              >
                {letter}
              </button>
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
          className="flex-1 h-12 rounded-xl text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 font-bold gap-2 text-sm"
        >
          <Lightbulb className="h-5 w-5" /> Dica de Letra
        </Button>
      </div>

      {/* Victory Celebration */}
      {isCompleted && (
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/80 border-3 border-emerald-500 p-4 rounded-3xl text-center space-y-3 shadow-lg animate-in zoom-in-95">
          <div className="flex justify-center text-3xl">
            {Array.from({ length: earnedStars }).map((_, i) => (
              <span key={i} className="animate-bounce">⭐</span>
            ))}
          </div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Você Encontrou Todas as Palavras! 🎉
          </h3>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            Excelente atenção e treino visual.
          </p>
          {onNextLevel && (
            <Button
              type="button"
              onClick={onNextLevel}
              className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-md active:scale-95"
            >
              Próxima Etapa →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
