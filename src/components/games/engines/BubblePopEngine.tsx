'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sparkles } from 'lucide-react';

interface BubblePopEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const BUBBLE_COLORS = [
  { id: 'red', bg: 'bg-rose-500 border-rose-300 ring-rose-400 shadow-rose-900/30' },
  { id: 'blue', bg: 'bg-sky-500 border-sky-300 ring-sky-400 shadow-sky-900/30' },
  { id: 'green', bg: 'bg-emerald-500 border-emerald-300 ring-emerald-400 shadow-emerald-900/30' },
  { id: 'yellow', bg: 'bg-amber-400 border-amber-200 ring-amber-300 shadow-amber-900/30' },
  { id: 'purple', bg: 'bg-purple-500 border-purple-300 ring-purple-400 shadow-purple-900/30' },
];

const ROWS = 8;
const COLS = 7;

export function BubblePopEngine({ levelNumber, onComplete, onNextLevel }: BubblePopEngineProps) {
  const targetScore = 300 + levelNumber * 50;

  const [grid, setGrid] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    initGrid();
  }, [levelNumber]);

  const initGrid = () => {
    const numColors = levelNumber <= 3 ? 3 : levelNumber <= 8 ? 4 : 5;
    const newGrid: number[][] = [];
    for (let r = 0; r < ROWS; r++) {
      const row: number[] = [];
      for (let c = 0; c < COLS; c++) {
        row.push(Math.floor(Math.random() * numColors));
      }
      newGrid.push(row);
    }
    setGrid(newGrid);
    setScore(0);
    setMoves(0);
    setIsCompleted(false);
  };

  // Find connected cluster of same color
  const getCluster = (startR: number, startC: number, colorIdx: number): { r: number; c: number }[] => {
    const visited = new Set<string>();
    const cluster: { r: number; c: number }[] = [];
    const queue: { r: number; c: number }[] = [{ r: startR, c: startC }];

    while (queue.length > 0) {
      const { r, c } = queue.pop()!;
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) continue;
      if (grid[r][c] !== colorIdx) continue;

      cluster.push({ r, c });

      queue.push({ r: r - 1, c });
      queue.push({ r: r + 1, c });
      queue.push({ r, c: c - 1 });
      queue.push({ r, c: c + 1 });
    }

    return cluster;
  };

  const handleBubbleClick = (r: number, c: number) => {
    if (isCompleted) return;

    const colorIdx = grid[r][c];
    if (colorIdx === -1) return;

    const cluster = getCluster(r, c, colorIdx);

    // Need at least 2 connected bubbles to pop
    if (cluster.length < 2) return;

    // Haptic feedback if supported
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30);
    }

    // Pop cluster
    const nextGrid = grid.map(row => [...row]);
    cluster.forEach(pt => {
      nextGrid[pt.r][pt.c] = -1;
    });

    // Gravity: bubbles fall down in each column
    for (let col = 0; col < COLS; col++) {
      const columnBubbles: number[] = [];
      for (let row = 0; row < ROWS; row++) {
        if (nextGrid[row][col] !== -1) {
          columnBubbles.push(nextGrid[row][col]);
        }
      }
      while (columnBubbles.length < ROWS) {
        columnBubbles.unshift(-1);
      }
      for (let row = 0; row < ROWS; row++) {
        nextGrid[row][col] = columnBubbles[row];
      }
    }

    const pointsGained = cluster.length * cluster.length * 10;
    const nextScore = score + pointsGained;

    setGrid(nextGrid);
    setScore(nextScore);
    setMoves(m => m + 1);

    if (nextScore >= targetScore) {
      setIsCompleted(true);
      onComplete({
        stars: 3,
        score: nextScore,
        moves: moves + 1,
        hints: 0,
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Target & Score Header */}
      <div className="bg-stone-100 dark:bg-stone-800 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-stone-500">Objetivo da Etapa</span>
          <span className="text-base font-black text-rose-600 dark:text-rose-400">
            {score} / {targetScore} pts
          </span>
        </div>
        <div className="w-full h-3 bg-stone-200 dark:bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-sky-400 via-rose-400 to-amber-400 transition-all duration-300"
            style={{ width: `${Math.min(100, (score / targetScore) * 100)}%` }}
          />
        </div>
      </div>

      {/* Bubble Grid */}
      <div className="max-w-[320px] sm:max-w-[340px] mx-auto aspect-[7/8] bg-stone-900 p-3 rounded-3xl border-4 border-stone-800 shadow-xl">
        <div className="grid grid-cols-7 grid-rows-8 gap-1.5 w-full h-full">
          {grid.map((row, r) =>
            row.map((colorIdx, c) => {
              if (colorIdx === -1) {
                return <div key={`${r}-${c}`} className="w-full h-full opacity-0" />;
              }

              const bubble = BUBBLE_COLORS[colorIdx] || BUBBLE_COLORS[0];

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleBubbleClick(r, c)}
                  className={`w-full h-full rounded-full border-2 shadow-md transition-transform active:scale-90 flex items-center justify-center ${bubble.bg}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-white/70 -mt-1 -ml-1" />
                </button>
              );
            })
          )}
        </div>
      </div>

      <p className="text-center text-xs font-semibold text-stone-500">
        Toque em 2 ou mais bolhas da mesma cor juntas para estourá-las
      </p>

      {/* Restart */}
      <div className="pt-1">
        <Button
          type="button"
          onClick={initGrid}
          variant="outline"
          className="w-full h-11 border-stone-300 font-bold text-xs rounded-xl gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Recomeçar Tabuleiro
        </Button>
      </div>

      {/* Completion */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🫧</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Bolhas Estouradas!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você estourou as bolhas com agilidade e alcançou a meta da etapa!
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
