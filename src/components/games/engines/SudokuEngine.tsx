'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Lightbulb, Check, Sparkles } from 'lucide-react';
import { getSudokuLevel } from '@/lib/games/content-generator';

interface SudokuEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

export function SudokuEngine({ levelNumber, onComplete, onNextLevel }: SudokuEngineProps) {
  const puzzle = getSudokuLevel(levelNumber);
  const size = puzzle.size;

  const [grid, setGrid] = useState<(number | null)[][]>([]);
  const [initialFixed, setInitialFixed] = useState<boolean[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [movesCount, setMovesCount] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);

  // Initialize board on level change
  useEffect(() => {
    const init = puzzle.initial.map(row => [...row]);
    setGrid(init);
    setInitialFixed(puzzle.initial.map(row => row.map(v => v !== null)));
    setSelectedCell(null);
    setHintsUsed(0);
    setMovesCount(0);
    setIsCompleted(false);
    setEarnedStars(3);
  }, [levelNumber]);

  const handleCellClick = (r: number, c: number) => {
    if (initialFixed[r]?.[c]) return;
    setSelectedCell({ r, c });
  };

  const handleNumberInput = (num: number | null) => {
    if (!selectedCell) return;
    const { r, c } = selectedCell;
    if (initialFixed[r]?.[c]) return;

    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = num;
    setGrid(newGrid);
    setMovesCount(m => m + 1);

    // Check completion
    checkBoardCompletion(newGrid);
  };

  const handleHint = () => {
    if (!selectedCell) {
      // Find first empty cell
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (!grid[r][c]) {
            applyHintAt(r, c);
            return;
          }
        }
      }
      return;
    }
    applyHintAt(selectedCell.r, selectedCell.c);
  };

  const applyHintAt = (r: number, c: number) => {
    const correctVal = puzzle.solution[r][c];
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = correctVal;
    setGrid(newGrid);
    setHintsUsed(h => h + 1);
    checkBoardCompletion(newGrid);
  };

  const checkBoardCompletion = (currentGrid: (number | null)[][]) => {
    let allFilled = true;
    let allCorrect = true;

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (currentGrid[r][c] === null) {
          allFilled = false;
        } else if (currentGrid[r][c] !== puzzle.solution[r][c]) {
          allCorrect = false;
        }
      }
    }

    if (allFilled && allCorrect && !isCompleted) {
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
      setEarnedStars(stars);
      const score = Math.max(100, 300 - hintsUsed * 30 - movesCount * 2);
      onComplete({
        stars,
        score,
        moves: movesCount + 1,
        hints: hintsUsed,
      });
    }
  };

  const boxRows = size === 4 ? 2 : size === 6 ? 2 : 3;
  const boxCols = size === 4 ? 2 : size === 6 ? 3 : 3;

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-4">
      {/* Level Info Banner */}
      <div className="w-full flex items-center justify-between px-2 text-stone-600 dark:text-stone-300">
        <span className="text-sm font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-xl border border-indigo-200 dark:border-indigo-800">
          Etapa {levelNumber} ({size}x{size})
        </span>
        <span className="text-xs font-semibold">
          Dicas usadas: {hintsUsed}
        </span>
      </div>

      {/* Grid */}
      <div
        className="grid gap-1 bg-stone-300 dark:bg-stone-700 p-2 rounded-2xl shadow-md border-2 border-stone-400 dark:border-stone-600 select-none"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          maxWidth: size === 4 ? '280px' : size === 6 ? '340px' : '390px',
          width: '100%',
        }}
      >
        {grid.map((row, r) =>
          row.map((val, c) => {
            const isSelected = selectedCell?.r === r && selectedCell?.c === c;
            const isFixed = initialFixed[r]?.[c];
            const isSameRowOrCol = selectedCell && (selectedCell.r === r || selectedCell.c === c);

            // Box borders
            const borderRight = (c + 1) % boxCols === 0 && c + 1 < size;
            const borderBottom = (r + 1) % boxRows === 0 && r + 1 < size;

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={`aspect-square flex items-center justify-center font-black rounded-lg transition-all active:scale-95 ${
                  size === 4 ? 'text-2xl sm:text-3xl' : size === 6 ? 'text-xl sm:text-2xl' : 'text-lg sm:text-xl'
                } ${
                  isSelected
                    ? 'bg-amber-300 text-stone-900 ring-4 ring-amber-400 scale-105 z-10'
                    : isFixed
                    ? 'bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-white'
                    : val !== null
                    ? 'bg-white dark:bg-stone-900 text-indigo-600 dark:text-indigo-400 font-black'
                    : isSameRowOrCol
                    ? 'bg-indigo-50/70 dark:bg-indigo-950/40 text-stone-700'
                    : 'bg-white dark:bg-stone-900 text-stone-700 hover:bg-stone-100'
                } ${borderRight ? 'mr-1' : ''} ${borderBottom ? 'mb-1' : ''}`}
              >
                {val !== null ? val : ''}
              </button>
            );
          })
        )}
      </div>

      {/* Input Number Pad */}
      <div className="w-full space-y-2 pt-2">
        <p className="text-xs text-center font-bold text-stone-500">Toque em um número para preencher:</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: size }, (_, i) => i + 1).map(num => (
            <button
              key={num}
              type="button"
              onClick={() => handleNumberInput(num)}
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-white dark:bg-stone-800 hover:bg-indigo-50 border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 text-indigo-700 dark:text-indigo-300 text-2xl font-black shadow-xs active:scale-95 transition-all flex items-center justify-center"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleNumberInput(null)}
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 border-2 border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 text-xs font-black shadow-xs active:scale-95 transition-all flex items-center justify-center"
          >
            Apagar
          </button>
        </div>
      </div>

      {/* Quick Action Tools: Dica & Limpar */}
      <div className="flex items-center gap-2 w-full pt-1">
        <Button
          type="button"
          onClick={handleHint}
          variant="outline"
          className="flex-1 h-12 rounded-xl text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 font-bold gap-2 text-sm"
        >
          <Lightbulb className="h-5 w-5" /> Revelar Dica
        </Button>
      </div>

      {/* Victory Celebration Modal Banner */}
      {isCompleted && (
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/80 border-3 border-emerald-500 p-4 rounded-3xl text-center space-y-3 shadow-lg animate-in zoom-in-95">
          <div className="flex justify-center text-3xl">
            {Array.from({ length: earnedStars }).map((_, i) => (
              <span key={i} className="animate-bounce">⭐</span>
            ))}
          </div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Etapa Concluída! 🎉
          </h3>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            Você completou o Sudoku com tranquilidade e foco.
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
