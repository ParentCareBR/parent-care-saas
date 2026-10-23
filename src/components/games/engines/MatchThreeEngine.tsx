'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, Sparkles } from 'lucide-react';

interface MatchThreeEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const FRUITS = [
  { emoji: '🍎', color: 'bg-red-100 border-red-300' },
  { emoji: '🍊', color: 'bg-orange-100 border-orange-300' },
  { emoji: '🍇', color: 'bg-purple-100 border-purple-300' },
  { emoji: '🍋', color: 'bg-yellow-100 border-yellow-300' },
  { emoji: '🫐', color: 'bg-blue-100 border-blue-300' },
];

const GRID_SIZE = 6;

export function MatchThreeEngine({ levelNumber, onComplete, onNextLevel }: MatchThreeEngineProps) {
  const [grid, setGrid] = useState<number[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [hintCells, setHintCells] = useState<{ r: number; c: number }[]>([]);

  const targetScore = 400 + levelNumber * 50;

  useEffect(() => {
    initGrid();
  }, [levelNumber]);

  const initGrid = () => {
    const newGrid: number[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: number[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(Math.floor(Math.random() * FRUITS.length));
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setScore(0);
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
    setSelectedCell(null);
    setHintCells([]);
  };

  const checkAndClearMatches = (currentGrid: number[][]) => {
    const matches: { r: number; c: number }[] = [];

    // Horizontal
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE - 2; c++) {
        const val = currentGrid[r][c];
        if (val !== -1 && val === currentGrid[r][c + 1] && val === currentGrid[r][c + 2]) {
          matches.push({ r, c }, { r, c: c + 1 }, { r, c: c + 2 });
        }
      }
    }

    // Vertical
    for (let c = 0; c < GRID_SIZE; c++) {
      for (let r = 0; r < GRID_SIZE - 2; r++) {
        const val = currentGrid[r][c];
        if (val !== -1 && val === currentGrid[r + 1][c] && val === currentGrid[r + 2][c]) {
          matches.push({ r, c }, { r: r + 1, c }, { r: r + 2, c });
        }
      }
    }

    if (matches.length > 0) {
      const uniqueMatches = Array.from(new Set(matches.map(m => `${m.r},${m.c}`))).map(str => {
        const [r, c] = str.split(',').map(Number);
        return { r, c };
      });

      const nextGrid = currentGrid.map(row => [...row]);
      uniqueMatches.forEach(m => {
        nextGrid[m.r][m.c] = -1; // marked
      });

      // Drop down and refill
      for (let c = 0; c < GRID_SIZE; c++) {
        const columnVals: number[] = [];
        for (let r = 0; r < GRID_SIZE; r++) {
          if (nextGrid[r][c] !== -1) {
            columnVals.push(nextGrid[r][c]);
          }
        }
        while (columnVals.length < GRID_SIZE) {
          columnVals.unshift(Math.floor(Math.random() * FRUITS.length));
        }
        for (let r = 0; r < GRID_SIZE; r++) {
          nextGrid[r][c] = columnVals[r];
        }
      }

      const pointsEarned = uniqueMatches.length * 30;
      const nextScore = score + pointsEarned;
      setScore(nextScore);
      setGrid(nextGrid);

      if (nextScore >= targetScore && !isCompleted) {
        setIsCompleted(true);
        const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
        onComplete({
          stars,
          score: nextScore,
          moves: moves + 1,
          hints: hintsUsed,
        });
      }
      return true;
    }
    return false;
  };

  const handleCellClick = (r: number, c: number) => {
    if (isCompleted) return;

    if (!selectedCell) {
      setSelectedCell({ r, c });
      setHintCells([]);
    } else {
      // Check adjacency
      const dr = Math.abs(selectedCell.r - r);
      const dc = Math.abs(selectedCell.c - c);
      const isAdjacent = (dr === 1 && dc === 0) || (dr === 0 && dc === 1);

      if (isAdjacent) {
        // Swap
        const nextGrid = grid.map(row => [...row]);
        const temp = nextGrid[selectedCell.r][selectedCell.c];
        nextGrid[selectedCell.r][selectedCell.c] = nextGrid[r][c];
        nextGrid[r][c] = temp;

        setGrid(nextGrid);
        setMoves(m => m + 1);
        setSelectedCell(null);

        setTimeout(() => {
          checkAndClearMatches(nextGrid);
        }, 200);
      } else {
        setSelectedCell({ r, c });
      }
    }
  };

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    // Find two adjacent items
    setHintCells([
      { r: 0, c: 0 },
      { r: 0, c: 1 },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* Target and Progress */}
      <div className="bg-stone-100 dark:bg-stone-800 p-4 rounded-3xl border border-stone-200 dark:border-stone-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-stone-500">Objetivo da Etapa</span>
          <span className="text-base font-black text-indigo-600 dark:text-indigo-400">
            {score} / {targetScore} pts
          </span>
        </div>
        <div className="w-full h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 transition-all duration-300"
            style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
          />
        </div>
      </div>

      {/* Grid */}
      <div className="max-w-[340px] sm:max-w-[380px] mx-auto aspect-square bg-stone-50 dark:bg-stone-900 border-4 border-stone-200 dark:border-stone-800 rounded-3xl p-2.5 shadow-md">
        <div className="grid grid-cols-6 grid-rows-6 gap-1.5 w-full h-full">
          {grid.map((row, r) =>
            row.map((val, c) => {
              const fruit = FRUITS[val] || FRUITS[0];
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const isHinted = hintCells.some(h => h.r === r && h.c === c);

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  className={`w-full h-full rounded-2xl flex items-center justify-center text-2xl sm:text-3xl border-2 transition-all active:scale-95 shadow-xs ${
                    fruit.color
                  } ${isSelected ? 'ring-4 ring-indigo-500 scale-105 z-10' : ''} ${
                    isHinted ? 'animate-bounce ring-4 ring-amber-400' : ''
                  }`}
                >
                  {fruit.emoji}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleHint}
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-2"
        >
          <Lightbulb className="h-4 w-4" /> Dica
        </Button>
        <Button
          type="button"
          onClick={initGrid}
          variant="outline"
          className="flex-1 h-12 border-stone-300 font-bold text-sm rounded-xl gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Reiniciar
        </Button>
      </div>

      {/* Win Modal */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🎉</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Meta Atingida!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você combinou as frutas com sucesso e alcançou a pontuação da etapa!
          </p>
          <div className="flex gap-2 pt-2">
            {onNextLevel && (
              <Button
                type="button"
                onClick={onNextLevel}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-md"
              >
                Próxima Etapa
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
