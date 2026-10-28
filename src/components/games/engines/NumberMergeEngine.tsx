'use client';
import { getGameTexts } from '@/lib/i18n/game-i18n';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Sparkles } from 'lucide-react';

interface NumberMergeEngineProps {
  locale?: string;
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const TILE_COLORS: Record<number, string> = {
  2: 'bg-stone-100 text-stone-800 border-stone-300',
  4: 'bg-amber-100 text-amber-900 border-amber-300',
  8: 'bg-orange-200 text-orange-950 border-orange-400 font-black',
  16: 'bg-orange-300 text-orange-950 border-orange-500 font-black',
  32: 'bg-rose-300 text-rose-950 border-rose-500 font-black',
  64: 'bg-rose-400 text-white border-rose-600 font-black shadow-md',
  128: 'bg-amber-400 text-amber-950 border-amber-600 font-black shadow-lg',
  256: 'bg-amber-500 text-white border-amber-700 font-black shadow-xl ring-2 ring-amber-300',
  512: 'bg-emerald-500 text-white border-emerald-700 font-black shadow-xl ring-4 ring-emerald-300',
};

export function NumberMergeEngine({
  locale, levelNumber, onComplete, onNextLevel }: NumberMergeEngineProps) {
  const tGame = getGameTexts(locale);
  const targetTile = levelNumber <= 3 ? 64 : levelNumber <= 10 ? 128 : 256;

  const [board, setBoard] = useState<number[][]>([]);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  const spawnRandomTile = (currentBoard: number[][]) => {
    const emptyCells: { r: number; c: number }[] = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length === 0) return currentBoard;

    const chosen = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const val = Math.random() < 0.8 ? 2 : 4;
    const next = currentBoard.map(row => [...row]);
    next[chosen.r][chosen.c] = val;
    return next;
  };

  const initGame = () => {
    let empty = Array.from({ length: 4 }, () => Array(4).fill(0));
    empty = spawnRandomTile(empty);
    empty = spawnRandomTile(empty);
    setBoard(empty);
    setScore(0);
    setMoves(0);
    setIsCompleted(false);
  };

  useEffect(() => {
    initGame();
  }, [levelNumber]);

  const slideRow = (row: number[]) => {
    const nonZero = row.filter(x => x !== 0);
    const result: number[] = [];
    let gainedScore = 0;

    for (let i = 0; i < nonZero.length; i++) {
      if (i < nonZero.length - 1 && nonZero[i] === nonZero[i + 1]) {
        const mergedVal = nonZero[i] * 2;
        result.push(mergedVal);
        gainedScore += mergedVal;
        i++;
      } else {
        result.push(nonZero[i]);
      }
    }
    while (result.length < 4) {
      result.push(0);
    }
    return { row: result, gainedScore };
  };

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down') => {
    if (isCompleted || board.length === 0) return;

    let nextBoard = board.map(r => [...r]);
    let totalGained = 0;
    let changed = false;

    if (direction === 'left') {
      for (let r = 0; r < 4; r++) {
        const { row: newRow, gainedScore } = slideRow(nextBoard[r]);
        totalGained += gainedScore;
        if (newRow.some((val, idx) => val !== nextBoard[r][idx])) changed = true;
        nextBoard[r] = newRow;
      }
    } else if (direction === 'right') {
      for (let r = 0; r < 4; r++) {
        const reversed = [...nextBoard[r]].reverse();
        const { row: newRow, gainedScore } = slideRow(reversed);
        totalGained += gainedScore;
        const unreversed = newRow.reverse();
        if (unreversed.some((val, idx) => val !== nextBoard[r][idx])) changed = true;
        nextBoard[r] = unreversed;
      }
    } else if (direction === 'up') {
      for (let c = 0; c < 4; c++) {
        const colVals = [nextBoard[0][c], nextBoard[1][c], nextBoard[2][c], nextBoard[3][c]];
        const { row: newCol, gainedScore } = slideRow(colVals);
        totalGained += gainedScore;
        for (let r = 0; r < 4; r++) {
          if (nextBoard[r][c] !== newCol[r]) changed = true;
          nextBoard[r][c] = newCol[r];
        }
      }
    } else if (direction === 'down') {
      for (let c = 0; c < 4; c++) {
        const colVals = [nextBoard[3][c], nextBoard[2][c], nextBoard[1][c], nextBoard[0][c]];
        const { row: newCol, gainedScore } = slideRow(colVals);
        totalGained += gainedScore;
        const unreversed = newCol.reverse();
        for (let r = 0; r < 4; r++) {
          if (nextBoard[r][c] !== unreversed[r]) changed = true;
          nextBoard[r][c] = unreversed[r];
        }
      }
    }

    if (changed) {
      const withSpawn = spawnRandomTile(nextBoard);
      setBoard(withSpawn);
      const nextScore = score + totalGained;
      setScore(nextScore);
      setMoves(m => m + 1);

      // Check win condition
      const reachedTarget = withSpawn.some(row => row.some(val => val >= targetTile));
      if (reachedTarget) {
        setIsCompleted(true);
        onComplete({
          stars: 3,
          score: nextScore,
          moves: moves + 1,
          hints: 0,
        });
      }
    }
  }, [board, isCompleted, score, moves, targetTile, onComplete]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp') move('up');
      if (e.key === 'ArrowDown') move('down');
      if (e.key === 'ArrowLeft') move('left');
      if (e.key === 'ArrowRight') move('right');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [move]);

  return (
    <div className="space-y-4">
      {/* Target & Score Header */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <span className="text-xs font-black uppercase text-stone-500">Objetivo da Etapa:</span>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">
            Formar a peça {targetTile}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-stone-500">Pontuação:</span>
          <p className="text-xl font-black text-stone-900 dark:text-stone-100">{score} pts</p>
        </div>
      </div>

      {/* 4x4 Number Grid */}
      <div className="max-w-[320px] sm:max-w-[340px] mx-auto aspect-square bg-stone-300 dark:bg-stone-900 p-2.5 rounded-3xl border-4 border-stone-400 dark:border-stone-800 shadow-xl">
        <div className="grid grid-cols-4 grid-rows-4 gap-2 w-full h-full">
          {board.map((row, r) =>
            row.map((val, c) => {
              const cls = TILE_COLORS[val] || 'bg-stone-200/50 dark:bg-stone-800/40 border-stone-300';
              return (
                <div
                  key={`${r}-${c}`}
                  className={`w-full h-full rounded-2xl flex items-center justify-center font-black text-xl sm:text-2xl border-2 transition-transform shadow-xs ${cls}`}
                >
                  {val > 0 ? val : ''}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Big Senior-Friendly Directional Control Pad */}
      <div className="max-w-[240px] mx-auto space-y-1 pt-1">
        <div className="flex justify-center">
          <Button
            type="button"
            onClick={() => move('up')}
            className="w-16 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md active:scale-95"
            title="Mover para cima"
          >
            <ArrowUp className="h-7 w-7 stroke-[3]" />
          </Button>
        </div>
        <div className="flex justify-between gap-2">
          <Button
            type="button"
            onClick={() => move('left')}
            className="w-16 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md active:scale-95"
            title="Mover para a esquerda"
          >
            <ArrowLeft className="h-7 w-7 stroke-[3]" />
          </Button>
          <Button
            type="button"
            onClick={() => move('down')}
            className="w-16 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md active:scale-95"
            title="Mover para baixo"
          >
            <ArrowDown className="h-7 w-7 stroke-[3]" />
          </Button>
          <Button
            type="button"
            onClick={() => move('right')}
            className="w-16 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shadow-md active:scale-95"
            title="Mover para a direita"
          >
            <ArrowRight className="h-7 w-7 stroke-[3]" />
          </Button>
        </div>
      </div>

      {/* Restart */}
      <div className="pt-1">
        <Button
          type="button"
          onClick={initGame}
          variant="outline"
          className="w-full h-11 border-stone-300 font-bold text-xs rounded-xl gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Recomeçar Tabuleiro
        </Button>
      </div>

      {/* Completion */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🔢</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Você Formou a Peça {targetTile}!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Que raciocínio incrível! Você uniu os números com grande habilidade.
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
