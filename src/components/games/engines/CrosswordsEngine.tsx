'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, CheckCircle2, Delete, Sparkles, ArrowRight } from 'lucide-react';

interface CrosswordsEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

interface CrosswordPuzzle {
  gridSize: number;
  title: string;
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

// 6 puzzles perfeitamente cruzados onde TODAS as palavras horizontais e verticais se conectam de verdade
const PUZZLES: CrosswordPuzzle[] = [
  {
    gridSize: 4,
    title: 'Lar e Afeto',
    solution: [
      ['C', 'A', 'S', 'A'],
      ['A', 'M', 'O', 'R'],
      ['S', 'O', 'L', 'O'],
      ['A', 'R', 'O', 'S'],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'Lar acolhedor onde a família se reúne', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Sentimento nobre de carinho e afeto', row: 1, col: 0, length: 4 },
      { direction: 'across', number: 3, text: 'Chão firme e a terra onde pisamos', row: 2, col: 0, length: 4 },
      { direction: 'across', number: 4, text: 'Círculos ou anéis metálicos', row: 3, col: 0, length: 4 },
      { direction: 'down', number: 1, text: 'Habitação doce e protegida', row: 0, col: 0, length: 4 },
      { direction: 'down', number: 2, text: 'Grande afeto e união sincera', row: 0, col: 1, length: 4 },
      { direction: 'down', number: 3, text: 'O chão fértil do nosso jardim', row: 0, col: 2, length: 4 },
      { direction: 'down', number: 4, text: 'Argolas redondas', row: 0, col: 3, length: 4 },
    ],
  },
  {
    gridSize: 4,
    title: 'Vida e Convivência',
    solution: [
      ['V', 'I', 'D', 'A'],
      ['I', 'T', 'E', 'M'],
      ['D', 'E', 'D', 'O'],
      ['A', 'M', 'O', 'R'],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'O maior e mais belo presente que temos', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Cada artigo ou ponto de uma lista', row: 1, col: 0, length: 4 },
      { direction: 'across', number: 3, text: 'Parte da mão que usamos para tocar e acariciar', row: 2, col: 0, length: 4 },
      { direction: 'across', number: 4, text: 'Sentimento de afeto que aquece a alma', row: 3, col: 0, length: 4 },
      { direction: 'down', number: 1, text: 'A nossa preciosa existência diária', row: 0, col: 0, length: 4 },
      { direction: 'down', number: 2, text: 'Elemento de uma receita ou lista', row: 0, col: 1, length: 4 },
      { direction: 'down', number: 3, text: 'Cada um dos cinco membros da mão', row: 0, col: 2, length: 4 },
      { direction: 'down', number: 4, text: 'Carinho profundo pela família', row: 0, col: 3, length: 4 },
    ],
  },
  {
    gridSize: 4,
    title: 'Cozinha e Conforto',
    solution: [
      ['C', 'A', 'S', 'A'],
      ['A', 'R', 'O', 'S'],
      ['S', 'O', 'P', 'A'],
      ['A', 'S', 'A', 'S'],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'Moradia quentinha e aconchegante', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Anéis ou círculos redondos', row: 1, col: 0, length: 4 },
      { direction: 'across', number: 3, text: 'Caldo quente e saboroso servido na tigela', row: 2, col: 0, length: 4 },
      { direction: 'across', number: 4, text: 'Penas com que os pássaros voam', row: 3, col: 0, length: 4 },
      { direction: 'down', number: 1, text: 'Lar onde vivemos em paz', row: 0, col: 0, length: 4 },
      { direction: 'down', number: 2, text: 'Argolas circulares', row: 0, col: 1, length: 4 },
      { direction: 'down', number: 3, text: 'Comidinha caseira quentinha', row: 0, col: 2, length: 4 },
      { direction: 'down', number: 4, text: 'Membros que fazem as aves subirem aos céus', row: 0, col: 3, length: 4 },
    ],
  },
  {
    gridSize: 4,
    title: 'Natureza e Jardim',
    solution: [
      ['M', 'A', 'T', 'A'],
      ['A', 'V', 'E', 'S'],
      ['T', 'E', 'L', 'A'],
      ['A', 'S', 'A', 'S'],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'Floresta verde e cheia de árvores', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Passarinhos com penas que cantam', row: 1, col: 0, length: 4 },
      { direction: 'across', number: 3, text: 'Quadro de pintura ou tela de TV', row: 2, col: 0, length: 4 },
      { direction: 'across', number: 4, text: 'Membros que permitem o voo das aves', row: 3, col: 0, length: 4 },
      { direction: 'down', number: 1, text: 'Bosque natural com vegetação', row: 0, col: 0, length: 4 },
      { direction: 'down', number: 2, text: 'Pássaros que cantam ao amanhecer', row: 0, col: 1, length: 4 },
      { direction: 'down', number: 3, text: 'Superfície onde vemos belas fotos e quadros', row: 0, col: 2, length: 4 },
      { direction: 'down', number: 4, text: 'Penas que fazem os pássaros voarem', row: 0, col: 3, length: 4 },
    ],
  },
  {
    gridSize: 4,
    title: 'Voz e Ternura',
    solution: [
      ['F', 'A', 'L', 'A'],
      ['A', 'M', 'O', 'R'],
      ['L', 'O', 'B', 'O'],
      ['A', 'R', 'O', 'S'],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'Comunicação alegre por voz', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Sentimento nobre do coração', row: 1, col: 0, length: 4 },
      { direction: 'across', number: 3, text: 'Animal silvestre parente do cão', row: 2, col: 0, length: 4 },
      { direction: 'across', number: 4, text: 'Círculos ou anéis metálicos', row: 3, col: 0, length: 4 },
      { direction: 'down', number: 1, text: 'Conversa amiga entre entes queridos', row: 0, col: 0, length: 4 },
      { direction: 'down', number: 2, text: 'Laço de afeto e união sincera', row: 0, col: 1, length: 4 },
      { direction: 'down', number: 3, text: 'Animal das florestas e montanhas', row: 0, col: 2, length: 4 },
      { direction: 'down', number: 4, text: 'Argolas redondas', row: 0, col: 3, length: 4 },
    ],
  },
  {
    gridSize: 4,
    title: 'Café da Tarde',
    solution: [
      ['L', 'A', 'M', 'A'],
      ['A', 'V', 'E', 'S'],
      ['M', 'E', 'S', 'A'],
      ['A', 'S', 'A', 'S'],
    ],
    clues: [
      { direction: 'across', number: 1, text: 'Terra molhada pela chuva fresca', row: 0, col: 0, length: 4 },
      { direction: 'across', number: 2, text: 'Passarinhos livres pelo céu', row: 1, col: 0, length: 4 },
      { direction: 'across', number: 3, text: 'Móvel da sala para o café da tarde', row: 2, col: 0, length: 4 },
      { direction: 'across', number: 4, text: 'Penas que fazem os pássaros subirem ao céu', row: 3, col: 0, length: 4 },
      { direction: 'down', number: 1, text: 'Barro macio do jardim', row: 0, col: 0, length: 4 },
      { direction: 'down', number: 2, text: 'Animais com asas e penas que cantam', row: 0, col: 1, length: 4 },
      { direction: 'down', number: 3, text: 'Onde servimos os bolos e pratos gostosos', row: 0, col: 2, length: 4 },
      { direction: 'down', number: 4, text: 'Membros com que as aves voam', row: 0, col: 3, length: 4 },
    ],
  },
];

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ç'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

function playVictoryChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + idx * 0.12;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.3, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  } catch {}
}

export function CrosswordsEngine({ levelNumber, onComplete, onNextLevel }: CrosswordsEngineProps) {
  const puzzleIndex = (levelNumber - 1) % PUZZLES.length;
  const puzzle = PUZZLES[puzzleIndex];

  const [userGrid, setUserGrid] = useState<string[][]>([]);
  const [selectedCell, setSelectedCell] = useState<{ r: number; c: number } | null>(null);
  const [activeDirection, setActiveDirection] = useState<'across' | 'down'>('across');
  const [selectedClue, setSelectedClue] = useState<any>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const victoryCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initGrid();
  }, [levelNumber]);

  const initGrid = () => {
    const empty = puzzle.solution.map(row => row.map(ch => (ch === ' ' ? ' ' : '')));
    setUserGrid(empty);
    setSelectedCell({ r: 0, c: 0 });
    setActiveDirection('across');
    setSelectedClue(puzzle.clues[0]);
    setHintsUsed(0);
    setIsCompleted(false);
  };

  // Find clue for current cell and direction
  const updateClueForCell = (r: number, c: number, dir: 'across' | 'down') => {
    let match = puzzle.clues.find(clue => {
      if (clue.direction === dir) {
        if (dir === 'across') {
          return clue.row === r && c >= clue.col && c < clue.col + clue.length;
        } else {
          return clue.col === c && r >= clue.row && r < clue.row + clue.length;
        }
      }
      return false;
    });

    // Fallback to opposite direction if not found
    if (!match) {
      match = puzzle.clues.find(clue => {
        if (clue.direction === (dir === 'across' ? 'down' : 'across')) {
          if (clue.direction === 'across') {
            return clue.row === r && c >= clue.col && c < clue.col + clue.length;
          } else {
            return clue.col === c && r >= clue.row && r < clue.row + clue.length;
          }
        }
        return false;
      });
      if (match) {
        setActiveDirection(match.direction);
      }
    }

    if (match) setSelectedClue(match);
  };

  const handleCellClick = (r: number, c: number) => {
    if (puzzle.solution[r][c] === ' ') return;

    if (selectedCell && selectedCell.r === r && selectedCell.c === c) {
      // Toggle direction when tapping same cell
      const newDir = activeDirection === 'across' ? 'down' : 'across';
      setActiveDirection(newDir);
      updateClueForCell(r, c, newDir);
    } else {
      setSelectedCell({ r, c });
      updateClueForCell(r, c, activeDirection);
    }
  };

  const handleKeyPress = (letter: string) => {
    if (!selectedCell || isCompleted) return;

    const nextGrid = userGrid.map(row => [...row]);
    nextGrid[selectedCell.r][selectedCell.c] = letter.toUpperCase();
    setUserGrid(nextGrid);

    // Auto advance in active direction
    if (activeDirection === 'across') {
      if (selectedCell.c + 1 < puzzle.gridSize && puzzle.solution[selectedCell.r][selectedCell.c + 1] !== ' ') {
        const nextC = selectedCell.c + 1;
        setSelectedCell({ r: selectedCell.r, c: nextC });
        updateClueForCell(selectedCell.r, nextC, 'across');
      }
    } else {
      if (selectedCell.r + 1 < puzzle.gridSize && puzzle.solution[selectedCell.r + 1][selectedCell.c] !== ' ') {
        const nextR = selectedCell.r + 1;
        setSelectedCell({ r: nextR, c: selectedCell.c });
        updateClueForCell(nextR, selectedCell.c, 'down');
      }
    }

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
      if (!allCorrect) break;
    }

    if (allCorrect && !isCompleted) {
      setIsCompleted(true);
      playVictoryChime();

      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([100, 50, 150]); } catch {}
      }

      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
      onComplete({
        stars,
        score: Math.max(150, 500 - hintsUsed * 40),
        moves: puzzle.gridSize * puzzle.gridSize,
        hints: hintsUsed,
      });

      // Scroll celebration into view
      setTimeout(() => {
        victoryCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
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
    <div className="space-y-3.5 select-none max-w-md mx-auto">
      {/* Header with Title and Level */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs sm:text-sm font-black bg-purple-100 dark:bg-purple-950/80 text-purple-800 dark:text-purple-300 px-3 py-1.5 rounded-xl border border-purple-300 dark:border-purple-800">
          Tema: {puzzle.title} • Etapa {levelNumber}
        </span>
        <button
          type="button"
          onClick={() => {
            const newDir = activeDirection === 'across' ? 'down' : 'across';
            setActiveDirection(newDir);
            if (selectedCell) updateClueForCell(selectedCell.r, selectedCell.c, newDir);
          }}
          className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800"
        >
          {activeDirection === 'across' ? 'Horizontal ➡️' : 'Vertical ⬇️'}
        </button>
      </div>

      {/* Current Clue Banner */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 p-3 sm:p-4 rounded-2xl shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400">
            {selectedClue?.direction === 'across' ? 'Horizontal (➡️)' : 'Vertical (⬇️)'} • Pista {selectedClue?.number}:
          </span>
          <span className="text-[11px] font-bold text-stone-500">
            {selectedClue?.length} letras
          </span>
        </div>
        <p className="font-black text-base sm:text-lg text-stone-900 dark:text-stone-100 mt-1 leading-snug">
          {selectedClue ? selectedClue.text : 'Toque em uma casa para ver a pista'}
        </p>
      </div>

      {/* Crossword Grid (Scales based on gridSize) */}
      <div
        className="max-w-[320px] sm:max-w-[340px] mx-auto aspect-square bg-stone-900 p-2.5 rounded-3xl shadow-xl border-4 border-stone-800"
      >
        <div
          className="grid gap-2 w-full h-full"
          style={{
            gridTemplateColumns: `repeat(${puzzle.gridSize}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${puzzle.gridSize}, minmax(0, 1fr))`,
          }}
        >
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
                  className={`relative w-full h-full rounded-2xl flex items-center justify-center font-black text-2xl sm:text-3xl transition-all shadow-sm active:scale-95 ${
                    isBlocked
                      ? 'bg-stone-900 cursor-default'
                      : 'bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 border-2 border-stone-300 dark:border-stone-600'
                  } ${isSelected ? 'ring-4 ring-indigo-500 bg-amber-50 dark:bg-indigo-950/60 scale-105 z-10' : ''}`}
                >
                  {clueStart && (
                    <span className="absolute top-1 left-1.5 text-[10px] font-black text-stone-400">
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
      <div className="bg-stone-100 dark:bg-stone-800/90 p-2 sm:p-2.5 rounded-3xl space-y-1.5 max-w-sm mx-auto shadow-inner border border-stone-200 dark:border-stone-700">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1">
            {row.map(char => (
              <button
                key={char}
                type="button"
                onClick={() => handleKeyPress(char)}
                disabled={isCompleted}
                className="w-8 h-12 sm:w-9 sm:h-12 bg-white dark:bg-stone-700 hover:bg-indigo-50 active:bg-indigo-200 border border-stone-300 dark:border-stone-600 rounded-xl font-black text-sm sm:text-base text-stone-900 dark:text-stone-100 shadow-xs active:scale-90 transition-transform"
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
            className="flex-1 h-11 px-3 text-xs font-bold rounded-xl gap-1.5 border-stone-300 dark:border-stone-600"
          >
            <Delete className="h-4 w-4" /> Apagar
          </Button>
          <Button
            type="button"
            onClick={handleRevealLetter}
            variant="outline"
            className="flex-1 h-11 px-3 border-amber-300 text-amber-800 dark:text-amber-300 text-xs font-bold rounded-xl gap-1.5 bg-amber-50/50 dark:bg-amber-950/30"
          >
            <Lightbulb className="h-4 w-4" /> Dica ({hintsUsed})
          </Button>
          <Button
            type="button"
            onClick={initGrid}
            variant="outline"
            className="h-11 px-3 text-stone-600 dark:text-stone-300 rounded-xl"
            title="Recomeçar"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Win / Completion Celebration Banner */}
      {isCompleted && (
        <div
          ref={victoryCardRef}
          className="bg-emerald-50 dark:bg-emerald-950/80 border-3 border-emerald-500 p-6 rounded-3xl text-center space-y-3.5 shadow-xl animate-in zoom-in-95"
        >
          <div className="flex justify-center text-4xl">
            <span className="animate-bounce">⭐</span>
            <span className="animate-bounce delay-100">✏️</span>
            <span className="animate-bounce delay-200">⭐</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-emerald-950 dark:text-emerald-100">
            Parabéns! Cruzadas Concluídas!
          </h3>
          <p className="text-sm font-bold text-emerald-800 dark:text-emerald-200">
            Você preencheu todas as palavras com muita sabedoria e perfeição!
          </p>
          <div className="pt-2">
            {onNextLevel && (
              <Button
                type="button"
                onClick={onNextLevel}
                className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg active:scale-95 flex items-center justify-center gap-2"
              >
                Próxima Etapa <ArrowRight className="h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
