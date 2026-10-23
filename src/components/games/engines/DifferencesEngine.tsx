'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

interface DifferenceSpot {
  id: string;
  name: string;
  xPercent: number; // 0 to 100% of image width
  yPercent: number; // 0 to 100% of image height
}

interface DifferencesEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const DIFFERENCE_LEVELS = [
  {
    title: 'Aconchego na Sala de Chá',
    sceneEmoji: '🫖',
    spots: [
      { id: 'spot-1', name: 'Xícara de chá', xPercent: 25, yPercent: 40 },
      { id: 'spot-2', name: 'Gatinho dormindo', xPercent: 75, yPercent: 65 },
      { id: 'spot-3', name: 'Quadro na parede', xPercent: 50, yPercent: 20 },
    ],
  },
  {
    title: 'Manhã no Jardim Florido',
    sceneEmoji: '🌸',
    spots: [
      { id: 'spot-1', name: 'Borboleta azul', xPercent: 30, yPercent: 25 },
      { id: 'spot-2', name: 'Regador vermelho', xPercent: 70, yPercent: 70 },
      { id: 'spot-3', name: 'Passarinho no galho', xPercent: 55, yPercent: 35 },
    ],
  },
  {
    title: 'Passeio à Beira-Mar',
    sceneEmoji: '⛵',
    spots: [
      { id: 'spot-1', name: 'Barco a vela', xPercent: 35, yPercent: 30 },
      { id: 'spot-2', name: 'Concha dourada', xPercent: 60, yPercent: 75 },
      { id: 'spot-3', name: 'Guarda-sol listrado', xPercent: 80, yPercent: 45 },
    ],
  },
];

export function DifferencesEngine({ levelNumber, onComplete, onNextLevel }: DifferencesEngineProps) {
  const currentLevel = DIFFERENCE_LEVELS[(levelNumber - 1) % DIFFERENCE_LEVELS.length];
  const [foundSpots, setFoundSpots] = useState<string[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintSpot, setHintSpot] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setFoundSpots([]);
    setHintsUsed(0);
    setHintSpot(null);
    setIsCompleted(false);
  }, [levelNumber]);

  const handleSpotClick = (spot: DifferenceSpot) => {
    if (foundSpots.includes(spot.id) || isCompleted) return;

    const nextFound = [...foundSpots, spot.id];
    setFoundSpots(nextFound);
    setHintSpot(null);

    if (nextFound.length === currentLevel.spots.length) {
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 1 ? 2 : 1;
      onComplete({
        stars,
        score: 350 + (nextFound.length * 50),
        moves: nextFound.length + hintsUsed,
        hints: hintsUsed,
      });
    }
  };

  const handleHint = () => {
    if (isCompleted) return;
    setHintsUsed(h => h + 1);
    const unfound = currentLevel.spots.find(s => !foundSpots.includes(s.id));
    if (unfound) {
      setHintSpot(unfound.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Title & Progress */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{currentLevel.title}</h4>
          <p className="text-xs text-stone-500 font-semibold">
            {foundSpots.length} de {currentLevel.spots.length} diferenças encontradas
          </p>
        </div>
        <div className="flex gap-1">
          {currentLevel.spots.map(s => (
            <span
              key={s.id}
              className={`text-lg transition-transform ${
                foundSpots.includes(s.id) ? 'scale-110' : 'opacity-30'
              }`}
            >
              ⭐
            </span>
          ))}
        </div>
      </div>

      {/* Difference Scenes Container */}
      <div className="space-y-3">
        {/* Scene 1 (Original) */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-amber-100 via-orange-50 to-amber-200 dark:from-stone-800 dark:to-stone-900 rounded-3xl p-4 border-3 border-amber-300 dark:border-amber-800 shadow-md flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center text-xs font-bold text-amber-900 dark:text-amber-200">
            <span>Cena A (Original)</span>
            <span className="text-2xl">{currentLevel.sceneEmoji}</span>
          </div>

          <div className="flex items-center justify-center h-full text-stone-400 text-sm font-semibold select-none">
            Observe com atenção os detalhes da imagem
          </div>

          {/* Interactive targets overlay */}
          {currentLevel.spots.map(spot => {
            const isFound = foundSpots.includes(spot.id);
            const isHinted = hintSpot === spot.id;

            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleSpotClick(spot)}
                className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full transition-all flex items-center justify-center ${
                  isFound
                    ? 'border-4 border-emerald-500 bg-emerald-400/20 shadow-md'
                    : isHinted
                    ? 'border-4 border-amber-400 bg-amber-400/20 animate-ping'
                    : 'hover:bg-amber-500/10'
                }`}
                style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
              >
                {isFound && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
              </button>
            );
          })}
        </div>

        {/* Scene 2 (Modified) */}
        <div className="relative aspect-[16/10] bg-gradient-to-br from-orange-100 via-amber-50 to-orange-200 dark:from-stone-800 dark:to-stone-900 rounded-3xl p-4 border-3 border-orange-300 dark:border-orange-800 shadow-md flex flex-col justify-between overflow-hidden">
          <div className="flex justify-between items-center text-xs font-bold text-orange-900 dark:text-orange-200">
            <span>Cena B (Com Diferenças)</span>
            <span className="text-2xl">{currentLevel.sceneEmoji}</span>
          </div>

          <div className="flex items-center justify-center h-full text-stone-400 text-sm font-semibold select-none">
            Toque onde houver algo diferente
          </div>

          {/* Interactive targets overlay */}
          {currentLevel.spots.map(spot => {
            const isFound = foundSpots.includes(spot.id);
            const isHinted = hintSpot === spot.id;

            return (
              <button
                key={spot.id}
                type="button"
                onClick={() => handleSpotClick(spot)}
                className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full transition-all flex items-center justify-center ${
                  isFound
                    ? 'border-4 border-emerald-500 bg-emerald-400/20 shadow-md'
                    : isHinted
                    ? 'border-4 border-amber-400 bg-amber-400/20 animate-ping'
                    : 'hover:bg-orange-500/10'
                }`}
                style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
              >
                {isFound && <CheckCircle2 className="h-6 w-6 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleHint}
          disabled={isCompleted}
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-2"
        >
          <Lightbulb className="h-4 w-4" /> Dica de Diferença
        </Button>
      </div>

      {/* Completion */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🔍</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Todas as Diferenças Encontradas!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Seus olhos atentos encontraram cada detalhe com grande maestria.
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
