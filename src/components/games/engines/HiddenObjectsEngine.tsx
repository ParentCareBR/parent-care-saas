'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, CheckCircle2, Sparkles } from 'lucide-react';

interface HiddenItem {
  id: string;
  name: string;
  emoji: string;
  xPercent: number;
  yPercent: number;
}

interface HiddenObjectsEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const SCENES = [
  {
    title: 'Aconchegante Sala de Estar',
    bgGradient: 'from-amber-100 via-stone-100 to-amber-200 dark:from-stone-800 dark:to-stone-900',
    decor: [
      { emoji: '🛋️', x: 20, y: 70, size: 'text-5xl' },
      { emoji: '🪴', x: 80, y: 75, size: 'text-4xl' },
      { emoji: '🖼️', x: 50, y: 22, size: 'text-4xl' },
      { emoji: '🚪', x: 12, y: 35, size: 'text-5xl' },
      { emoji: '🏮', x: 85, y: 25, size: 'text-3xl' },
    ],
    items: [
      { id: 'item-1', name: 'Óculos de leitura', emoji: '👓', xPercent: 28, yPercent: 62 },
      { id: 'item-2', name: 'Chave dourada', emoji: '🔑', xPercent: 72, yPercent: 32 },
      { id: 'item-3', name: 'Livro de poesia', emoji: '📖', xPercent: 48, yPercent: 72 },
      { id: 'item-4', name: 'Xícara de chá', emoji: '☕', xPercent: 82, yPercent: 60 },
    ],
  },
  {
    title: 'Jardim Florido da Vovó',
    bgGradient: 'from-emerald-100 via-teal-50 to-emerald-200 dark:from-stone-800 dark:to-stone-900',
    decor: [
      { emoji: '🌳', x: 18, y: 35, size: 'text-6xl' },
      { emoji: '🏡', x: 80, y: 30, size: 'text-5xl' },
      { emoji: '🌷', x: 25, y: 78, size: 'text-4xl' },
      { emoji: '🌻', x: 75, y: 78, size: 'text-4xl' },
      { emoji: '☀️', x: 50, y: 15, size: 'text-4xl' },
    ],
    items: [
      { id: 'item-1', name: 'Regador de flores', emoji: '🪴', xPercent: 35, yPercent: 68 },
      { id: 'item-2', name: 'Tesoura de poda', emoji: '✂️', xPercent: 62, yPercent: 42 },
      { id: 'item-3', name: 'Borboleta azul', emoji: '🦋', xPercent: 78, yPercent: 20 },
      { id: 'item-4', name: 'Lupa do jardim', emoji: '🔍', xPercent: 42, yPercent: 78 },
    ],
  },
];

export function HiddenObjectsEngine({ levelNumber, onComplete, onNextLevel }: HiddenObjectsEngineProps) {
  const currentScene = SCENES[(levelNumber - 1) % SCENES.length];
  const [foundItemIds, setFoundItemIds] = useState<string[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [hintedItemId, setHintedItemId] = useState<string | null>(null);
  const [message, setMessage] = useState('Encontre os objetos da lista abaixo no cenário.');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setFoundItemIds([]);
    setHintsUsed(0);
    setHintedItemId(null);
    setMessage('Encontre os objetos da lista abaixo no cenário.');
    setIsCompleted(false);
  }, [levelNumber]);

  const handleItemClick = (item: HiddenItem) => {
    if (foundItemIds.includes(item.id) || isCompleted) return;

    const nextFound = [...foundItemIds, item.id];
    setFoundItemIds(nextFound);
    setHintedItemId(null);
    setMessage(`Você encontrou: ${item.name}!`);

    if (nextFound.length === currentScene.items.length) {
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 1 ? 2 : 1;
      onComplete({
        stars,
        score: 350 + (nextFound.length * 60),
        moves: nextFound.length + hintsUsed,
        hints: hintsUsed,
      });
    }
  };

  const handleHint = () => {
    if (isCompleted) return;
    setHintsUsed(h => h + 1);
    const unfound = currentScene.items.find(item => !foundItemIds.includes(item.id));
    if (unfound) {
      setHintedItemId(unfound.id);
      setMessage(`Dica: Veja com atenção onde está o(a) ${unfound.name}!`);
    }
  };

  return (
    <div className="space-y-3.5 select-none max-w-md mx-auto">
      {/* Title & Progress */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <h4 className="font-black text-sm text-stone-900 dark:text-stone-100">{currentScene.title}</h4>
          <p className="text-xs text-stone-500 font-bold">
            {foundItemIds.length} de {currentScene.items.length} objetos encontrados
          </p>
        </div>
        <span className="text-xs font-black text-indigo-700 dark:text-indigo-400">
          Toque no objeto
        </span>
      </div>

      {/* Message Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-2xl text-center">
        <p className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">{message}</p>
      </div>

      {/* Main Scene Container with background room decor */}
      <div
        className={`relative aspect-[16/11] bg-gradient-to-br ${currentScene.bgGradient} rounded-3xl p-4 border-4 border-stone-300 dark:border-stone-700 shadow-lg overflow-hidden`}
      >
        {/* Decorative Scenery Objects */}
        {currentScene.decor.map((d, idx) => (
          <span
            key={idx}
            className={`absolute ${d.size} select-none opacity-80 pointer-events-none`}
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
          >
            {d.emoji}
          </span>
        ))}

        {/* Scattered Hidden Items */}
        {currentScene.items.map(item => {
          const isFound = foundItemIds.includes(item.id);
          const isHinted = hintedItemId === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleItemClick(item)}
              className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${
                isFound
                  ? 'border-3 border-emerald-500 bg-emerald-100/70 scale-110 shadow-md ring-2 ring-emerald-300'
                  : isHinted
                  ? 'ring-4 ring-amber-400 bg-amber-200/60 animate-bounce'
                  : 'hover:scale-110'
              }`}
              style={{ left: `${item.xPercent}%`, top: `${item.yPercent}%` }}
              title={item.name}
            >
              <span className="text-3xl drop-shadow-xs select-none">{item.emoji}</span>
              {isFound && (
                <span className="absolute -top-1 -right-1 bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Checklist of Objects to Find */}
      <div className="bg-stone-50 dark:bg-stone-900 p-3 rounded-2xl border border-stone-200 dark:border-stone-800">
        <p className="text-xs font-black uppercase text-stone-500 mb-2">Objetos para Encontrar:</p>
        <div className="grid grid-cols-2 gap-2">
          {currentScene.items.map(item => {
            const isFound = foundItemIds.includes(item.id);
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border flex items-center gap-2 transition-all ${
                  isFound
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-900 dark:text-emerald-200'
                    : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300'
                }`}
              >
                <span className="text-xl">{item.emoji}</span>
                <span className={`text-xs font-bold flex-1 ${isFound ? 'line-through opacity-70' : ''}`}>
                  {item.name}
                </span>
                {isFound && <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />}
              </div>
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
          <Lightbulb className="h-4 w-4" /> Dica de Objeto
        </Button>
      </div>

      {/* Win Modal */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🗝️</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Você Encontrou Tudo!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Sua visão atenta e calma encontrou cada um dos tesouros escondidos!
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
