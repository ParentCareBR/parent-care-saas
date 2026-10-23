'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, CheckCircle2, Delete } from 'lucide-react';

interface CrosswordsEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

interface CrosswordPuzzle {
  gridSize: number;
  // 5x5 grid with characters (' ' for black/blocked cell)
  solution: string[][];
  clues: {
    direction: 'across' | 'down';
    number: number;
    text: string;
    row: number;
    col: number;
    length: number;
  }[];
}

const PUZZLES: CrosswordPuzzle[] = [
  {
    gridSize: 5,
    solution: [
      ['A', 'M', 'O', 'R', ' '],
      ['S', 'A', 'L', 'E', 'S'],
      ['A', 'M', 'A', 'D', 'O'],
      [' ', 'A', 'V', 'E', 'S'],
      ['C', 'A', 'S', 'A', ' '],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'Sentimento nobre de carinho e afeto', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Compostos de sódio usados na cozinha', row: 1, col: 0, length: 5 },
      { direction: 'across', number: 3, text: 'Pessoa muito querida', row: 2, col: 0, length: 5 },
      { direction: 'across', number: 4, text: 'Animais com penas que cantam', row: 3, col: 1, length: 4 },
      { direction: 'across', number: 5, text: 'Lar doce lar', row: 4, col: 0, length: 4 },
      { direction: 'down', number: 1, text: 'Membro com que os pássaros voam', row: 0, col: 0, length: 3 },
      { direction: 'down', number: 2, text: 'Mãe carinhosa', row: 0, col: 1, length: 5 },
      { direction: 'down', number: 3, text: 'Astro brilhante do dia', row: 0, col: 2, length: 3 },
    ],
  },
  {
    gridSize: 5,
    solution: [
      ['F', 'L', 'O', 'R', ' '],
      ['L', 'U', 'Z', 'E', 'S'],
      ['O', 'N', 'D', 'A', 'S'],
      ['R', 'A', 'I', 'Z', ' '],
      [' ', 'S', 'O', 'L', ' '],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'Brota no jardim e perfuma a casa', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Clareiam a noite', row: 1, col: 0, length: 5 },
      { direction: 'across', number: 3, text: 'Movimento do mar na praia', row: 2, col: 0, length: 5 },
      { direction: 'across', number: 4, text: 'Parte da planta que fica na terra', row: 3, col: 0, length: 4 },
      { direction: 'across', number: 5, text: 'Estrela que aquece nossos dias', row: 4, col: 1, length: 3 },
      { direction: 'down', number: 1, text: 'Aroma agradável', row: 0, col: 0, length: 4 },
      { direction: 'down', number: 2, text: 'Satélite natural da Terra que brilha à noite', row: 0, col: 1, length: 4 },
    ],
  },
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export function CrosswordsEngine({ levelNumber, onComplete, onNextLevel }: CrosswordsEngineProps) {
  const puzzle = PUZZLES[(levelNumber - 1) % PUZZLES.length];

  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [selectedClue, setSelectedClue] = useState<any>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    initGrid();
  }, [levelNumber]);

  const initGrid = () => {
    const empty = puzzle.solution.map(row => row.map(ch => (ch === ' ' ? ' ' : '')));
    setUserGrid(empty);
    setSelectedCell({ r: 0, c: 0 });
    setSelectedClue(puzzle.clues[0]);
    setHintsUsed(0);
    setIsCompleted(false);
  };

  const handleCellClick = (r: number, c: number) => {
    if (puzzle.solution[r][c] === ' ') return;
    setSelectedCell({ r, c });

    // Find clue matching cell
    const matchingClue = puzzle.clues.find(clue => {
      if (clue.direction === 'across') {
        return clue.row === r && c >= clue.col && c < clue.col + clue.length;
      } else {
        return clue.col === c && r >= clue.row && r < clue.row + clue.length;
      }
    });
    if (matchingClue) setSelectedClue(matchingClue);
  };

  const handleKeyPress = (letter: string) => {
    if (!selectedCell || isCompleted) return;

    const nextGrid = userGrid.map(row => [...row]);
    nextGrid[selectedCell.r][selectedCell.c] = letter;
    setUserGrid(nextGrid);

    // Auto advance cell horizontally if possible
    if (selectedCell.c + 1 < puzzle.gridSize && puzzle.solution[selectedCell.r][selectedCell.c + 1] !== ' ') {
      setSelectedCell({ r: selectedCell.r, c: selectedCell.c + 1 });
    }

    // Check completion
    checkSolution(nextGrid);
  };

  const handleDelete = () => {
    if (!selectedCell || isCompleted) return;
    const nextGrid = userGrid.map(row => [...row]);
    nextGrid[selectedCell.r][selectedCell.c] = '';
    setUserGrid(nextGrid);
  };

  const checkSolution = (grid: string[][]) => {
    let allCorrect = true;
    for (let r = 0; r < puzzle.gridSize; r++) {
      for (let c = 0; c < puzzle.gridSize; c++) {
        if (puzzle.solution[r][c] !== ' ') {
          if (grid[r][c] !== puzzle.solution[r][c]) {
            allCorrect = false;
            break;
          }
        }
      }
    }

    if (allCorrect) {
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
      onComplete({
        stars,
        score: Math.max(150, 500 - hintsUsed * 40),
        moves: 15,
        hints: hintsUsed,
      });
    }
  };

  const handleRevealLetter = () => {
    if (!selectedCell || isCompleted) return;
    setHintsUsed(h => h + 1);

    const correctChar = puzzle.solution[selectedCell.r][selectedCell.c];
    if (correctChar !== ' ') {
      const nextGrid = userGrid.map(row => [...row]);
      nextGrid[selectedCell.r][selectedCell.c] = correctChar;
      setUserGrid(nextGrid);
      checkSolution(nextGrid);
    }
  };

  return (
    <div className="space-y-4">
      {/* Current Clue Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 p-3 sm:p-4 rounded-2xl">
        <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400">
          Pista Selecionada:
        </span>
        <p className="font-black text-base text-stone-900 dark:text-stone-100 mt-0.5">
          {selectedClue ? `${selectedClue.number}. ${selectedClue.text}` : 'Toque em uma casa'}
        </p>
      </div>

      {/* Crossword Grid */}
      <div className="max-w-[280px] sm:max-w-[320px] mx-auto aspect-square bg-stone-900 p-2 rounded-2xl shadow-lg border-4 border-stone-800">
        <div className="grid grid-cols-5 grid-rows-5 gap-1.5 w-full h-full">
          {puzzle.solution.map((row, r) =>
            row.map((solChar, c) => {
              const isBlocked = solChar === ' ';
              const isSelected = selectedCell?.r === r && selectedCell?.c === c;
              const val = userGrid[r]?.[c] || '';

              // Find clue number starting here
              const clueStart = puzzle.clues.find(clue => clue.row === r && clue.col === c);

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(r, c)}
                  disabled={isBlocked || isCompleted}
                  className={`relative w-full h-full rounded-xl flex items-center justify-center font-black text-xl sm:text-2xl transition-all shadow-xs ${
                    isBlocked
                      ? 'bg-stone-900 cursor-default'
                      : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-2 border-stone-300 dark:border-stone-600'
                  } ${isSelected ? 'ring-4 ring-indigo-500 scale-105 z-10' : ''}`}
                >
                  {clueStart && (
                    <span className="absolute top-0.5 left-1 text-[9px] font-extrabold text-stone-500">
                      {clueStart.number}
                    </span>
                  )}
                  {val}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Big Virtual Keyboard */}
      <div className="bg-stone-100 dark:bg-stone-800 p-2 rounded-2xl space-y-1.5 max-w-sm mx-auto shadow-inner">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1">
            {row.map(char => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                disabled={isCompleted}
                className="w-8 h-11 sm:w-9 sm:h-12 bg-white dark:bg-stone-700 hover:bg-indigo-50 border border-stone-300 dark:border-stone-600 rounded-lg font-black text-sm text-stone-900 dark:text-stone-100 shadow-xs active:scale-90"
              >
                {char}
              </button>
            ))}
          </div>
        ))}

        <div className="flex justify-center gap-2 pt-1">
          <Button
            type="button"
            onClick={handleDelete}
            variant="outline"
            className="h-10 px-4 text-xs font-bold rounded-xl gap-1"
          >
            <Delete className="h-4 w-4" /> Apagar Letra
          </Button>
          <Button
            type="button"
            onClick={handleRevealLetter}
            variant="outline"
            className="h-10 px-4 border-amber-300 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl gap-1"
          >
            <Lightbulb className="h-4 w-4" /> Revelar Casa
          </Button>
        </div>
      </div>

      {/* Win Modal */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">✏️</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Palavras Cruzadas Concluídas!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Que excelente vocabulário! Você preencheu todas as pistas com perfeição.
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
