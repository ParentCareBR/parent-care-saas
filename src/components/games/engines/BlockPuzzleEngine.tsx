'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { RotateCcw, Sparkles } from 'lucide-react';

interface BlockShape {
  id: string;
  coords: { r: number; c: number }[];
  color: string;
}

interface BlockPuzzleEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const AVAILABLE_SHAPES: { coords: { r: number; c: number }[]; color: string }[] = [
  { coords: [{ r: 0, c: 0 }], color: 'bg-amber-500 border-amber-600' }, // 1x1
  { coords: [{ r: 0, c: 0 }, { r: 0, c: 1 }], color: 'bg-emerald-500 border-emerald-600' }, // 1x2 horizontal
  { coords: [{ r: 0, c: 0 }, { r: 1, c: 0 }], color: 'bg-blue-500 border-blue-600' }, // 2x1 vertical
  { coords: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }], color: 'bg-purple-500 border-purple-600' }, // 2x2
  { coords: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }], color: 'bg-rose-500 border-rose-600' }, // 1x3 horizontal
  { coords: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }], color: 'bg-orange-500 border-orange-600' }, // L-shape
];

export function BlockPuzzleEngine({ levelNumber, onComplete, onNextLevel }: BlockPuzzleEngineProps) {
  const targetScore = 250 + levelNumber * 50;

  const [grid, setGrid] = useState<string[][]>([]);
  const [shapesHand, setShapesHand] = useState<(BlockShape | null)[]>([]);
  const [selectedShapeIdx, setSelectedShapeIdx] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [moves, setMoves] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    initGame();
  }, [levelNumber]);

  const generateHand = (): (BlockShape | null)[] => {
    return [0, 1, 2].map(idx => {
      const template = AVAILABLE_SHAPES[Math.floor(Math.random() * AVAILABLE_SHAPES.length)];
      return {
        id: `shape-${Date.now()}-${idx}`,
        coords: template.coords,
        color: template.color,
      };
    });
  };

  const initGame = () => {
    const emptyGrid: string[][] = Array.from({ length: 8 }, () => Array(8).fill(''));
    setGrid(emptyGrid);
    setShapesHand(generateHand());
    setSelectedShapeIdx(null);
    setScore(0);
    setMoves(0);
    setIsCompleted(false);
  };

  const canPlaceShape = (shape: BlockShape, startR: number, startC: number, currentGrid: string[][]) => {
    for (const pt of shape.coords) {
      const r = startR + pt.r;
      const c = startC + pt.c;
      if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
      if (currentGrid[r][c] !== '') return false;
    }
    return true;
  };

  const handleCellClick = (r: number, c: number) => {
    if (selectedShapeIdx === null || isCompleted) return;

    const shape = shapesHand[selectedShapeIdx];
    if (!shape) return;

    if (!canPlaceShape(shape, r, c, grid)) return;

    // Place shape
    const nextGrid = grid.map(row => [...row]);
    shape.coords.forEach(pt => {
      nextGrid[r + pt.r][c + pt.c] = shape.color;
    });

    // Check full rows and columns to clear
    const fullRows: number[] = [];
    const fullCols: number[] = [];

    for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
      if (nextGrid[rowIdx].every(cell => cell !== '')) fullRows.push(rowIdx);
    }
    for (let colIdx = 0; colIdx < 8; colIdx++) {
      let isFull = true;
      for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
        if (nextGrid[rowIdx][colIdx] === '') {
          isFull = false;
          break;
        }
      }
      if (isFull) fullCols.push(colIdx);
    }

    // Clear full lines
    fullRows.forEach(rowIdx => {
      for (let colIdx = 0; colIdx < 8; colIdx++) {
        nextGrid[rowIdx][colIdx] = '';
      }
    });
    fullCols.forEach(colIdx => {
      for (let rowIdx = 0; rowIdx < 8; rowIdx++) {
        nextGrid[rowIdx][colIdx] = '';
      }
    });

    const linesCleared = fullRows.length + fullCols.length;
    const pointsGained = shape.coords.length * 10 + linesCleared * 100;
    const nextScore = score + pointsGained;

    // Update hand
    const nextHand = [...shapesHand];
    nextHand[selectedShapeIdx] = null;

    // Refill hand if empty
    if (nextHand.every(s => s === null)) {
      setShapesHand(generateHand());
    } else {
      setShapesHand(nextHand);
    }

    setGrid(nextGrid);
    setScore(nextScore);
    setMoves(m => m + 1);
    setSelectedShapeIdx(null);

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
      {/* Target Header */}
      <div className="bg-stone-100 dark:bg-stone-800 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black uppercase text-stone-500">Objetivo da Etapa</span>
          <span className="text-base font-black text-amber-600 dark:text-amber-400">
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

      {/* 8x8 Wood Board */}
      <div className="max-w-[320px] sm:max-w-[340px] mx-auto aspect-square bg-amber-950 p-2 rounded-2xl border-4 border-amber-900 shadow-xl">
        <div className="grid grid-cols-8 grid-rows-8 gap-1 w-full h-full">
          {grid.map((row, r) =>
            row.map((cellColor, c) => (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={`w-full h-full rounded-md border transition-all ${
                  cellColor
                    ? `${cellColor} shadow-inner`
                    : 'bg-amber-900/60 border-amber-800/40 hover:bg-amber-800/80'
                }`}
              />
            ))
          )}
        </div>
      </div>

      {/* Shapes Hand Tray */}
      <div className="bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl space-y-1">
        <p className="text-xs font-bold text-stone-500 text-center">
          {selectedShapeIdx !== null
            ? 'Toque no tabuleiro onde deseja posicionar o bloco'
            : 'Toque em uma peça para selecionar:'}
        </p>

        <div className="flex justify-around items-center min-h-[70px] pt-1">
          {shapesHand.map((shape, idx) => {
            if (!shape) {
              return <div key={idx} className="w-16 h-16 opacity-0" />;
            }

            const isSelected = selectedShapeIdx === idx;

            return (
              <button
                key={shape.id}
                type="button"
                onClick={() => setSelectedShapeIdx(isSelected ? null : idx)}
                className={`p-2 rounded-xl border-2 transition-all active:scale-95 flex items-center justify-center ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/50 ring-4 ring-indigo-400'
                    : 'border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900'
                }`}
              >
                <div className="grid grid-cols-3 grid-rows-3 gap-0.5">
                  {shape.coords.map((pt, pIdx) => (
                    <div
                      key={pIdx}
                      className={`w-4 h-4 rounded-xs ${shape.color}`}
                      style={{ gridRowStart: pt.r + 1, gridColumnStart: pt.c + 1 }}
                    />
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
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
          <div className="text-4xl">🪵</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Meta de Blocos Atingida!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você encaixou e limpou as linhas de blocos com muita destreza e calma.
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
