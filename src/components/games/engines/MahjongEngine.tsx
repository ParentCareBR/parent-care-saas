'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, Sparkles, Lock } from 'lucide-react';

interface MahjongTile {
  id: string;
  typeId: string;
  symbol: string;
  name: string;
  layer: number;
  row: number;
  col: number;
  isRemoved: boolean;
}

interface MahjongEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const TILE_SYMBOLS = [
  { id: 'flor', symbol: '🌸', name: 'Flor', color: '#db2777' },
  { id: 'bambu', symbol: '🎋', name: 'Bambu', color: '#16a34a' },
  { id: 'dragao', symbol: '🐉', name: 'Dragão', color: '#dc2626' },
  { id: 'sol', symbol: '☀️', name: 'Sol', color: '#d97706' },
  { id: 'lanterna', symbol: '🏮', name: 'Lanterna', color: '#ea580c' },
  { id: 'moeda', symbol: '🪙', name: 'Moeda', color: '#ca8a04' },
  { id: 'borboleta', symbol: '🦋', name: 'Borboleta', color: '#2563eb' },
  { id: 'peixe', symbol: '🐟', name: 'Peixe', color: '#0891b2' },
];

export function MahjongEngine({ levelNumber, onComplete, onNextLevel }: MahjongEngineProps) {
  const [tiles, setTiles] = useState<MahjongTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<MahjongTile | null>(null);
  const [hintPair, setHintPair] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Layout configuration:
  // Level 1-3: 12 tiles (6 pairs, 3x4 grid)
  // Level 4+: 16 tiles (8 pairs, 4x4 grid)
  const cols = 4;
  const rows = levelNumber <= 3 ? 3 : 4;
  const totalTiles = rows * cols;

  useEffect(() => {
    initLayout();
  }, [levelNumber]);

  const initLayout = () => {
    const totalPairs = totalTiles / 2;
    const selectedTypes = TILE_SYMBOLS.slice(0, totalPairs);

    const tileBag: { typeId: string; symbol: string; name: string }[] = [];
    selectedTypes.forEach(t => {
      tileBag.push(
        { typeId: t.id, symbol: t.symbol, name: t.name },
        { typeId: t.id, symbol: t.symbol, name: t.name }
      );
    });
    tileBag.sort(() => Math.random() - 0.5);

    const generated: MahjongTile[] = [];
    let idx = 0;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const item = tileBag[idx++];
        generated.push({
          id: `tile-${r}-${c}`,
          typeId: item.typeId,
          symbol: item.symbol,
          name: item.name,
          layer: 0,
          row: r,
          col: c,
          isRemoved: false,
        });
      }
    }

    setTiles(generated);
    setSelectedTile(null);
    setHintPair([]);
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
  };

  // In Mahjong, a tile is free if its left OR right side has no adjacent active tile.
  // Edge tiles (col 0 or col cols-1) are always free on that side!
  const isTileFree = (t: MahjongTile, currentTiles: MahjongTile[]): boolean => {
    if (t.isRemoved) return false;

    // Check left neighbor
    const hasLeft = currentTiles.some(
      other => !other.isRemoved && other.row === t.row && other.col === t.col - 1
    );
    // Check right neighbor
    const hasRight = currentTiles.some(
      other => !other.isRemoved && other.row === t.row && other.col === t.col + 1
    );

    // If either side is open, it's free to match!
    return !hasLeft || !hasRight;
  };

  const handleTileClick = (t: MahjongTile) => {
    if (isCompleted || t.isRemoved) return;
    const free = isTileFree(t, tiles);
    if (!free) return;

    if (!selectedTile) {
      setSelectedTile(t);
      setHintPair([]);
    } else {
      if (selectedTile.id === t.id) {
        setSelectedTile(null);
        return;
      }

      if (selectedTile.typeId === t.typeId) {
        // Matched pair!
        const nextTiles = tiles.map(tile =>
          tile.id === selectedTile.id || tile.id === t.id ? { ...tile, isRemoved: true } : tile
        );
        setTiles(nextTiles);
        setSelectedTile(null);
        setMoves(m => m + 1);

        // Check if all removed
        const remaining = nextTiles.filter(tile => !tile.isRemoved);
        if (remaining.length === 0) {
          setIsCompleted(true);
          const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
          onComplete({
            stars,
            score: 500,
            moves: moves + 1,
            hints: hintsUsed,
          });
        }
      } else {
        // Different tile: switch selection
        setSelectedTile(t);
      }
    }
  };

  const remainingTiles = tiles.filter(t => !t.isRemoved);
  const remainingPairs = Math.floor(remainingTiles.length / 2);

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    const activeTiles = tiles.filter(t => !t.isRemoved && isTileFree(t, tiles));

    // Find any matching pair among free tiles
    for (let i = 0; i < activeTiles.length; i++) {
      for (let j = i + 1; j < activeTiles.length; j++) {
        if (activeTiles[i].typeId === activeTiles[j].typeId) {
          setHintPair([activeTiles[i].id, activeTiles[j].id]);
          return;
        }
      }
    }

    // If no free pairs exist, auto-shuffle
    handleShuffle();
  };

  const handleShuffle = () => {
    const unremoved = tiles.filter(t => !t.isRemoved);
    const symbols = unremoved
      .map(t => ({ typeId: t.typeId, symbol: t.symbol, name: t.name }))
      .sort(() => Math.random() - 0.5);

    let idx = 0;
    const shuffled = tiles.map(t => {
      if (!t.isRemoved) {
        const item = symbols[idx++];
        return { ...t, typeId: item.typeId, symbol: item.symbol, name: item.name };
      }
      return t;
    });

    setTiles(shuffled);
    setSelectedTile(null);
    setHintPair([]);
  };

  return (
    <div className="space-y-3.5 select-none max-w-md mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <span className="text-xs font-bold text-stone-500 uppercase">Pares Restantes</span>
          <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">
            {remainingPairs} {remainingPairs === 1 ? 'par' : 'pares'}
          </p>
        </div>
        <div className="text-right">
          <span className="text-xs font-bold text-stone-500">Regra Simples:</span>
          <p className="text-xs font-bold text-stone-700 dark:text-stone-300">
            Lado esquerdo ou direito livre
          </p>
        </div>
      </div>

      {/* Mahjong Playing Table */}
      <div className="bg-emerald-900 rounded-3xl p-3 sm:p-5 border-4 border-emerald-950 min-h-[300px] flex items-center justify-center shadow-xl relative">
        <div
          className="grid gap-2 sm:gap-2.5 w-full max-w-[360px] mx-auto"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          }}
        >
          {tiles.map(tile => {
            if (tile.isRemoved) {
              return (
                <div
                  key={tile.id}
                  className="aspect-[3/4] opacity-0 pointer-events-none"
                />
              );
            }

            const free = isTileFree(tile, tiles);
            const isSelected = selectedTile?.id === tile.id;
            const isHinted = hintPair.includes(tile.id);

            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleTileClick(tile)}
                disabled={!free || isCompleted}
                className={`
                  aspect-[3/4] rounded-2xl flex flex-col items-center justify-between p-1.5 sm:p-2
                  transition-all shadow-md active:scale-95 relative
                  ${free
                    ? 'bg-amber-50 hover:bg-white text-stone-900 border-2 border-amber-200 shadow-stone-900/50 cursor-pointer'
                    : 'bg-stone-200 dark:bg-stone-800 text-stone-400 border-2 border-stone-300 dark:border-stone-700 cursor-not-allowed opacity-60'
                  }
                  ${isSelected ? 'ring-4 ring-indigo-500 border-indigo-400 scale-105 z-10 bg-white' : ''}
                  ${isHinted ? 'ring-4 ring-amber-400 animate-bounce bg-amber-100 z-10' : ''}
                `}
                style={{
                  boxShadow: free ? '0 4px 0 #d97706, 0 6px 12px rgba(0,0,0,0.3)' : undefined,
                }}
              >
                {/* Tile Symbol (Large & Clear) */}
                <span className="text-3xl sm:text-4xl mt-1 leading-none drop-shadow-xs">
                  {tile.symbol}
                </span>

                {/* Tile Name Label */}
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-tight text-stone-800 dark:text-stone-300">
                  {tile.name}
                </span>

                {/* Lock indicator if not free */}
                {!free && (
                  <div className="absolute top-1 right-1 bg-stone-400/30 rounded-full p-0.5">
                    <Lock className="h-3 w-3 text-stone-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-stone-500 font-semibold">
        Peças com sombra amarela estão livres para jogar. Toque em duas iguais!
      </p>

      {/* Bottom Controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleHint}
          disabled={isCompleted}
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-2"
        >
          <Lightbulb className="h-4 w-4" /> Dica de Par
        </Button>
        <Button
          type="button"
          onClick={handleShuffle}
          disabled={isCompleted}
          variant="outline"
          className="flex-1 h-12 border-stone-300 font-bold text-sm rounded-xl gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Embaralhar
        </Button>
      </div>

      {/* Completion */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🀄</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Tabuleiro Limpo!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você combinou todas as peças com grande harmonia e concentração.
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
