'use client';
import { getGameTexts } from '@/lib/i18n/game-i18n';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, CheckCircle2, RotateCcw, Sparkles } from 'lucide-react';

interface DifferenceSpot {
  id: string;
  name: string;
  xPercent: number; // 0 to 100%
  yPercent: number; // 0 to 100%
  itemA: string;
  itemB: string;
}

interface DifferencesEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const DIFFERENCE_LEVELS = [
  {
    title: 'Aconchego na Sala de Chá',
    sceneEmoji: '🫖',
    bgA: 'from-amber-100 via-stone-100 to-amber-200 dark:from-stone-800 dark:to-stone-900',
    bgB: 'from-amber-100 via-stone-100 to-amber-200 dark:from-stone-800 dark:to-stone-900',
    decor: [
      { emoji: '🪑', x: 15, y: 70 },
      { emoji: '🫖', x: 45, y: 50 },
      { emoji: '🛋️', x: 80, y: 65 },
      { emoji: '🪴', x: 15, y: 25 },
    ],
    spots: [
      { id: 'spot-1', name: 'Xícara de chá', xPercent: 32, yPercent: 48, itemA: '☕', itemB: '🥛' },
      { id: 'spot-2', name: 'Quadro da parede', xPercent: 52, yPercent: 20, itemA: '🖼️', itemB: '🪞' },
      { id: 'spot-3', name: 'Animalzinho no tapete', xPercent: 78, yPercent: 78, itemA: '🐱', itemB: '🐶' },
    ],
  },
  {
    title: 'Manhã no Jardim Florido',
    sceneEmoji: '🌸',
    bgA: 'from-emerald-100 via-teal-50 to-emerald-200 dark:from-stone-800 dark:to-stone-900',
    bgB: 'from-emerald-100 via-teal-50 to-emerald-200 dark:from-stone-800 dark:to-stone-900',
    decor: [
      { emoji: '🌳', x: 15, y: 35 },
      { emoji: '🌷', x: 45, y: 75 },
      { emoji: '🌻', x: 85, y: 70 },
      { emoji: '☀️', x: 85, y: 18 },
    ],
    spots: [
      { id: 'spot-1', name: 'Borboleta', xPercent: 30, yPercent: 20, itemA: '🦋', itemB: '🐝' },
      { id: 'spot-2', name: 'Regador de plantas', xPercent: 65, yPercent: 68, itemA: '🪴', itemB: '🪣' },
      { id: 'spot-3', name: 'Pássaro cantor', xPercent: 50, yPercent: 32, itemA: '🕊️', itemB: '🦜' },
    ],
  },
  {
    title: 'Passeio à Beira-Mar',
    sceneEmoji: '⛵',
    bgA: 'from-sky-100 via-amber-50 to-sky-200 dark:from-stone-800 dark:to-stone-900',
    bgB: 'from-sky-100 via-amber-50 to-sky-200 dark:from-stone-800 dark:to-stone-900',
    decor: [
      { emoji: '🌊', x: 20, y: 75 },
      { emoji: '🏖️', x: 75, y: 75 },
      { emoji: '☁️', x: 25, y: 18 },
      { emoji: '☀️', x: 80, y: 15 },
    ],
    spots: [
      { id: 'spot-1', name: 'Barco no mar', xPercent: 40, yPercent: 35, itemA: '⛵', itemB: '🚤' },
      { id: 'spot-2', name: 'Concha na areia', xPercent: 60, yPercent: 78, itemA: '🐚', itemB: '⭐' },
      { id: 'spot-3', name: 'Guarda-sol', xPercent: 82, yPercent: 48, itemA: '⛱️', itemB: '🌴' },
    ],
  },
];

export function DifferencesEngine({ levelNumber, locale, onComplete, onNextLevel }: DifferencesEngineProps) {
  const tGame = getGameTexts(locale);
  const currentLevel = DIFFERENCE_LEVELS[(levelNumber - 1) % DIFFERENCE_LEVELS.length];
  const [foundSpots, setFoundSpots] = useState<string[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintSpot, setHintSpot] = useState<string | null>(null);
  const [message, setMessage] = useState('Compare as duas imagens e toque onde houver uma diferença.');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setFoundSpots([]);
    setHintsUsed(0);
    setHintSpot(null);
    setMessage('Compare as duas imagens e toque onde houver uma diferença.');
    setIsCompleted(false);
  }, [levelNumber]);

  const handleSpotClick = (spot: DifferenceSpot) => {
    if (foundSpots.includes(spot.id) || isCompleted) return;

    const nextFound = [...foundSpots, spot.id];
    setFoundSpots(nextFound);
    setHintSpot(null);
    setMessage(`Diferença encontrada: ${spot.name}!`);

    if (nextFound.length === currentLevel.spots.length) {
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 1 ? 2 : 1;
      onComplete({
        stars,
        score: 400 + (nextFound.length * 50),
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
      setMessage(`Dica: Repare com atenção no(a) ${unfound.name}!`);
    }
  };

  const renderScene = (isSceneB: boolean) => (
    <div
      className={`relative aspect-[16/9] w-full rounded-3xl p-3 border-3 shadow-md overflow-hidden bg-gradient-to-br ${
        isSceneB ? currentLevel.bgB : currentLevel.bgA
      } ${isSceneB ? 'border-amber-400 dark:border-amber-700' : 'border-stone-300 dark:border-stone-700'}`}
    >
      {/* Scene Header Tag */}
      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/80 dark:bg-stone-900/80 text-stone-800 dark:text-stone-200">
        {isSceneB ? 'Imagem B (com diferenças)' : 'Imagem A (original)'}
      </span>

      {/* Decorative scenery items */}
      {currentLevel.decor.map((d, idx) => (
        <span
          key={idx}
          className="absolute text-2xl sm:text-3xl select-none opacity-85 pointer-events-none"
          style={{ left: `${d.x}%`, top: `${d.y}%` }}
        >
          {d.emoji}
        </span>
      ))}

      {/* Interactive difference spots */}
      {currentLevel.spots.map(spot => {
        const isFound = foundSpots.includes(spot.id);
        const isHinted = hintSpot === spot.id;
        const currentEmoji = isSceneB ? spot.itemB : spot.itemA;

        return (
          <button
            key={spot.id}
            type="button"
            onClick={() => handleSpotClick(spot)}
            className={`absolute -ml-6 -mt-6 w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95 ${
              isFound
                ? 'ring-4 ring-emerald-500 bg-emerald-300/30 shadow-md scale-110'
                : isHinted
                ? 'ring-4 ring-amber-400 bg-amber-300/40 animate-bounce'
                : 'hover:scale-105'
            }`}
            style={{ left: `${spot.xPercent}%`, top: `${spot.yPercent}%` }}
            title={spot.name}
          >
            <span className="text-3xl select-none drop-shadow-xs">{currentEmoji}</span>
            {isFound && (
              <span className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3.5 select-none max-w-md mx-auto">
      {/* Title & Progress */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <h4 className="font-black text-sm text-stone-900 dark:text-stone-100">{currentLevel.title}</h4>
          <p className="text-xs text-stone-500 font-bold">
            {foundSpots.length} de {currentLevel.spots.length} diferenças encontradas
          </p>
        </div>
        <div className="flex gap-1">
          {currentLevel.spots.map(s => (
            <span
              key={s.id}
              className={`text-xl transition-transform ${
                foundSpots.includes(s.id) ? 'scale-110' : 'opacity-30'
              }`}
            >
              ⭐
            </span>
          ))}
        </div>
      </div>

      {/* Message Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-2xl text-center">
        <p className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">{message}</p>
      </div>

      {/* Scene A and Scene B */}
      <div className="space-y-2.5">
        {renderScene(false)}
        {renderScene(true)}
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
          <Lightbulb className="h-4 w-4" /> {tGame.hintDiff}
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
