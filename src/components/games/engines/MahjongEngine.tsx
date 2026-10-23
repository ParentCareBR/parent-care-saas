'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, Sparkles } from 'lucide-react';

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
  { id: 'flor', symbol: '🌸', name: 'Flor' },
  { id: 'bambu', symbol: '🎋', name: 'Bambu' },
  { id: 'dragao', symbol: '🐉', name: 'Dragão' },
  { id: 'sol', symbol: '☀️', name: 'Sol' },
  { id: 'lanterna', symbol: '🏮', name: 'Lanterna' },
  { id: 'moeda', symbol: '🪙', name: 'Moeda' },
  { id: 'borboleta', symbol: '🦋', name: 'Borboleta' },
  { id: 'peixe', symbol: '🐟', name: 'Peixe' },
];

export function MahjongEngine({ levelNumber, onComplete, onNextLevel }: MahjongEngineProps) {
  const [tiles, setTiles] = useState<MahjongTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<MahjongTile | null>(null);
  const [hintPair, setHintPair] = useState<string[]>([]);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);

  // Setup layout (simple 4x4 or pyramid)
  useEffect(() => {
    initLayout();
  }, [levelNumber]);

  const initLayout = () => {
    const totalPairs = levelNumber <= 3 ? 6 : 8;
    const selectedTypes = TILE_SYMBOLS.slice(0, totalPairs);

    const tileBag: { typeId: string; symbol: string; name: string }[] = [];
    selectedTypes.forEach(t => {
      // 2 or 4 of each
      tileBag.push(
        { typeId: t.id, symbol: t.symbol, name: t.name },
        { typeId: t.id, symbol: t.symbol, name: t.name }
      );
    });
    tileBag.sort(() => Math.random() - 0.5);

    // Arrange in a pleasant 4x4 or 4x3 grid with central layer
    const generated: MahjongTile[] = [];
    let bagIdx = 0;

    // Base layer (4x3 = 12 tiles)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 4; c++) {
        if (bagIdx < tileBag.length) {
          const item = tileBag[bagIdx++];
          generated.push({
            id: `tile-${r}-${c}-0`,
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
    }

    // Top layer (center 2 tiles if available)
    if (bagIdx < tileBag.length) {
      const item1 = tileBag[bagIdx++];
      generated.push({
        id: `tile-top-1`,
        typeId: item1.typeId,
        symbol: item1.symbol,
        name: item1.name,
        layer: 1,
        row: 1,
        col: 1.5,
        isRemoved: false,
      });
    }
    if (bagIdx < tileBag.length) {
      const item2 = tileBag[bagIdx++];
      generated.push({
        id: `tile-top-2`,
        typeId: item2.typeId,
        symbol: item2.symbol,
        name: item2.name,
        layer: 1,
        row: 1,
        col: 2.5,
        isRemoved: false,
      });
    }

    setTiles(generated);
    setSelectedTile(null);
    setHintPair([]);
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
  };

  // A tile is free if either its left or right is not occupied by another active tile in the same layer,
  // and no tile is directly above it in layer 1.
  const isTileFree = (t: MahjongTile, currentTiles: MahjongTile[]): boolean => {
    if (t.isRemoved) return false;

    // Check if covered from above
    if (t.layer === 0) {
      const coveredByTop = currentTiles.some(
        other => !other.isRemoved && other.layer === 1 && Math.abs(other.row - t.row) <= 0.6 && Math.abs(other.col - t.col) <= 0.6
      );
      if (coveredByTop) return false;
    }

    // Check left and right neighbor
    const hasLeft = currentTiles.some(
      other => !other.isRemoved && other.layer === t.layer && other.row === t.row && other.col === t.col - 1
    );
    const hasRight = currentTiles.some(
      other => !other.isRemoved && other.layer === t.layer && other.row === t.row && other.col === t.col + 1
    );

    return !hasLeft || !hasRight;
  };

  const handleTileClick = (t: MahjongTile) => {
    if (isCompleted || t.isRemoved) return;
    if (!isTileFree(t, tiles)) return;

    if (!selectedTile) {
      setSelectedTile(t);
      setHintPair([]);
    } else {
      if (selectedTile.id === t.id) {
        setSelectedTile(null);
        return;
      }

      if (selectedTile.typeId === t.typeId) {
        // Matched!
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
            score: 400 + (totalPairsRemaining * 20),
            moves: moves + 1,
            hints: hintsUsed,
          });
        }
      } else {
        // Mismatch: switch selection to the new free tile
        setSelectedTile(t);
      }
    }
  };

  const totalPairsRemaining = Math.floor(tiles.filter(t => !t.isRemoved).length / 2);

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    const activeTiles = tiles.filter(t => !t.isRemoved && isTileFree(t, tiles));

    // Find any matching pair among active free tiles
    for (let i = 0; i < activeTiles.length; i++) {
      for (let j = i + 1; j < activeTiles.length; j++) {
        if (activeTiles[i].typeId === activeTiles[j].typeId) {
          setHintPair([activeTiles[i].id, activeTiles[j].id]);
          return;
        }
      }
    }
  };

  const handleShuffle = () => {
    const unremoved = tiles.filter(t => !t.isRemoved);
    const symbols = unremoved.map(t => ({ typeId: t.typeId, symbol: t.symbol, name: t.name })).sort(() => Math.random() - 0.5);

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
    <div className="space-y-4">
      {/* Pairs Left Indicator */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <span className="text-xs font-bold text-stone-500 uppercase">Pares Restantes:</span>
          <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">
            {totalPairsRemaining} pares
          </p>
        </div>
        <span className="text-xs font-semibold text-stone-500">
          Combine duas peças livres iguais
        </span>
      </div>

      {/* Mahjong Board */}
      <div className="bg-emerald-900/90 rounded-3xl p-4 sm:p-6 border-4 border-emerald-950 min-h-[260px] flex items-center justify-center shadow-inner relative">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-sm w-full mx-auto">
          {tiles
            .filter(t => t.layer === 0)
            .map(tile => {
              const free = isTileFree(tile, tiles);
              const isSelected = selectedTile?.id === tile.id;
              const isHinted = hintPair.includes(tile.id);

              if (tile.isRemoved) {
                return (
                  <div
                    key={tile.id}
                    className="aspect-square opacity-0 pointer-events-none"
                  />
                );
              }

              return (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleTileClick(tile)}
                  disabled={!free || isCompleted}
                  className={`aspect-[3/4] rounded-2xl flex flex-col items-center justify-center p-1 border-3 shadow-lg transition-all active:scale-95 ${
                    free
                      ? 'bg-amber-50 dark:bg-stone-100 text-stone-900 border-amber-200 hover:border-amber-400 cursor-pointer shadow-stone-950/40'
                      : 'bg-stone-300 dark:bg-stone-700 text-stone-400 border-stone-400 opacity-50 cursor-not-allowed'
                  } ${isSelected ? 'ring-4 ring-indigo-500 border-indigo-400 scale-105 z-10' : ''} ${
                    isHinted ? 'ring-4 ring-amber-400 animate-bounce' : ''
                  }`}
                >
                  <span className="text-3xl sm:text-4xl">{tile.symbol}</span>
                  <span className="text-[10px] font-black uppercase text-stone-600 mt-1">
                    {tile.name}
                  </span>
                </button>
              );
            })}
        </div>
      </div>

      {/* Bottom Controls */}
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
          onClick={handleShuffle}
          variant="outline"
          className="flex-1 h-12 border-stone-300 font-bold text-sm rounded-xl gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Embaralhar Peças
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
