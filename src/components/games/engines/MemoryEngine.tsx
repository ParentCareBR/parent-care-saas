'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, Check, Sparkles } from 'lucide-react';
import { getMemoryLevel, MemoryPair } from '@/lib/games/content-generator';

interface MemoryCard {
  id: string;
  pairId: string;
  emoji: string;
  label: string;
  isFlipped: boolean;
  isMatched: boolean;
}

interface MemoryEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

export function MemoryEngine({ levelNumber, onComplete, onNextLevel }: MemoryEngineProps) {
  const [cards, setCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);
  const [themeName, setThemeName] = useState('');

  // Setup level cards
  useEffect(() => {
    const data = getMemoryLevel(levelNumber);
    setThemeName(data.theme);

    const deck: MemoryCard[] = [];
    data.pairs.forEach((p, idx) => {
      deck.push({ id: `c-${idx}-a`, pairId: p.id, emoji: p.emoji, label: p.label, isFlipped: false, isMatched: false });
      deck.push({ id: `c-${idx}-b`, pairId: p.id, emoji: p.emoji, label: p.label, isFlipped: false, isMatched: false });
    });

    // Shuffle deck
    const shuffled = deck.sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setFlippedIndices([]);
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
    setEarnedStars(3);
  }, [levelNumber]);

  const handleCardClick = (index: number) => {
    if (isCompleted) return;
    if (flippedIndices.length >= 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    const nextFlipped = [...flippedIndices, index];
    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);
    setFlippedIndices(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves(m => m + 1);
      const [firstIdx, secondIdx] = nextFlipped;
      const cardA = newCards[firstIdx];
      const cardB = newCards[secondIdx];

      if (cardA.pairId === cardB.pairId) {
        // Matched!
        setTimeout(() => {
          const matchedCards = [...newCards];
          matchedCards[firstIdx].isMatched = true;
          matchedCards[secondIdx].isMatched = true;
          setCards(matchedCards);
          setFlippedIndices([]);

          // Check win
          if (matchedCards.every(c => c.isMatched)) {
            setIsCompleted(true);
            const stars = hintsUsed === 0 && moves <= cards.length ? 3 : hintsUsed <= 1 ? 2 : 1;
            setEarnedStars(stars);
            onComplete({
              stars,
              score: Math.max(120, 300 - moves * 5 - hintsUsed * 25),
              moves: moves + 1,
              hints: hintsUsed,
            });
          }
        }, 500);
      } else {
        // Not matched, flip back after comfortable delay
        setTimeout(() => {
          const resetCards = [...newCards];
          resetCards[firstIdx].isFlipped = false;
          resetCards[secondIdx].isFlipped = false;
          setCards(resetCards);
          setFlippedIndices([]);
        }, 900);
      }
    }
  };

  const handleHint = () => {
    if (flippedIndices.length > 0 || isCompleted) return;

    // Find first unmatched pair and reveal for 1.2s
    const unmatched = cards.find(c => !c.isMatched);
    if (!unmatched) return;

    const matchIndices = cards
      .map((c, i) => (c.pairId === unmatched.pairId && !c.isMatched ? i : -1))
      .filter(i => i !== -1);

    if (matchIndices.length === 2) {
      setHintsUsed(h => h + 1);
      const peekCards = [...cards];
      peekCards[matchIndices[0]].isFlipped = true;
      peekCards[matchIndices[1]].isFlipped = true;
      setCards(peekCards);

      setTimeout(() => {
        const revertCards = [...cards];
        revertCards[matchIndices[0]].isFlipped = false;
        revertCards[matchIndices[1]].isFlipped = false;
        setCards(revertCards);
      }, 1200);
    }
  };

  const gridCols = cards.length <= 8 ? 3 : cards.length <= 16 ? 4 : 5;

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-4">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between px-2 text-stone-600 dark:text-stone-300">
        <span className="text-sm font-black bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-3 py-1 rounded-xl border border-rose-200 dark:border-rose-800">
          {themeName} • Etapa {levelNumber}
        </span>
        <span className="text-xs font-bold text-stone-500">
          Movimentos: {moves}
        </span>
      </div>

      {/* Cards Board */}
      <div
        className="grid gap-2.5 p-2 bg-stone-100 dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 rounded-3xl w-full max-w-[380px]"
        style={{
          gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
        }}
      >
        {cards.map((card, idx) => {
          const isRevealed = card.isFlipped || card.isMatched;

          return (
            <button
              key={card.id}
              type="button"
              onClick={() => handleCardClick(idx)}
              className={`aspect-square rounded-2xl flex flex-col items-center justify-center p-1 font-black transition-all transform active:scale-95 shadow-xs ${
                card.isMatched
                  ? 'bg-emerald-100 dark:bg-emerald-950/80 border-2 border-emerald-400 opacity-90'
                  : isRevealed
                  ? 'bg-white dark:bg-stone-800 border-3 border-indigo-400 scale-105 shadow-md'
                  : 'bg-gradient-to-br from-rose-400 to-rose-600 text-white border-2 border-rose-300 hover:scale-102'
              }`}
            >
              {isRevealed ? (
                <>
                  <span className="text-3xl sm:text-4xl">{card.emoji}</span>
                  <span className="text-[10px] sm:text-xs font-bold text-stone-700 dark:text-stone-300 truncate max-w-full">
                    {card.label}
                  </span>
                </>
              ) : (
                <span className="text-2xl text-white/90">❓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Action tool */}
      <div className="w-full flex items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={handleHint}
          variant="outline"
          className="flex-1 h-12 rounded-xl text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 font-bold gap-2 text-sm"
        >
          <Lightbulb className="h-5 w-5" /> Revelar um Par Rapidinho
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
            Parabéns! Memória Excelente! 🎉
          </h3>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            Você encontrou todos os pares com calma e carinho.
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
