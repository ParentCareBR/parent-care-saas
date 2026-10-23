'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, Check, Sparkles } from 'lucide-react';
import { getWordDiscoveryLevel, WordDiscoveryPuzzle } from '@/lib/games/content-generator';

interface WordDiscoveryEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

export function WordDiscoveryEngine({ levelNumber, locale = 'pt-BR', onComplete, onNextLevel }: WordDiscoveryEngineProps) {
  const [puzzle, setPuzzle] = useState<WordDiscoveryPuzzle>(() => getWordDiscoveryLevel(levelNumber, locale));
  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);

  const MAX_MISTAKES = 6;

  useEffect(() => {
    const p = getWordDiscoveryLevel(levelNumber, locale);
    setPuzzle(p);
    setGuessedLetters(new Set());
    setMistakes(0);
    setShowHint(false);
    setHintsUsed(0);
    setIsCompleted(false);
    setIsGameOver(false);
    setEarnedStars(3);
  }, [levelNumber, locale]);

  const handleLetterClick = (letter: string) => {
    if (isCompleted || isGameOver) return;
    if (guessedLetters.has(letter)) return;

    const nextGuessed = new Set(guessedLetters);
    nextGuessed.add(letter);
    setGuessedLetters(nextGuessed);

    if (!puzzle.word.includes(letter)) {
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
      if (nextMistakes >= MAX_MISTAKES) {
        setIsGameOver(true);
      }
    } else {
      // Check if all letters guessed
      const allFound = puzzle.word.split('').every(ch => nextGuessed.has(ch) || ch === ' ' || ch === '-');
      if (allFound) {
        setIsCompleted(true);
        const stars = mistakes === 0 && hintsUsed === 0 ? 3 : mistakes <= 2 ? 2 : 1;
        setEarnedStars(stars);
        onComplete({
          stars,
          score: Math.max(100, 250 - mistakes * 20 - hintsUsed * 20),
          moves: nextGuessed.size,
          hints: hintsUsed,
        });
      }
    }
  };

  const handleHintClick = () => {
    setShowHint(true);
    setHintsUsed(h => h + 1);

    // Also reveal an unguessed letter
    const unguessed = puzzle.word.split('').filter(ch => !guessedLetters.has(ch));
    if (unguessed.length > 0) {
      const next = new Set(guessedLetters);
      next.add(unguessed[0]);
      setGuessedLetters(next);

      const allFound = puzzle.word.split('').every(ch => next.has(ch));
      if (allFound) {
        setIsCompleted(true);
        onComplete({
          stars: 2,
          score: 180,
          moves: next.size,
          hints: hintsUsed + 1,
        });
      }
    }
  };

  const restartCurrentLevel = () => {
    setGuessedLetters(new Set());
    setMistakes(0);
    setIsGameOver(false);
  };

  // Flower blooming petals state: from 0 to 6 correct stages
  const flowerStages = ['🌱', '🌿', '🌷', '🌸', '🌺', '🌻', '💐'];
  const flowerIdx = Math.min(flowerStages.length - 1, Math.floor((guessedLetters.size / Math.max(1, puzzle.word.length)) * 6));

  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
  ];

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-4">
      {/* Header Info */}
      <div className="w-full flex items-center justify-between px-2 text-stone-600 dark:text-stone-300">
        <span className="text-sm font-black bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
          Categoria: {puzzle.category} • Etapa {levelNumber}
        </span>
        <span className="text-xs font-bold text-stone-500">
          Tentativas restantes: {MAX_MISTAKES - mistakes}
        </span>
      </div>

      {/* Flower Garden Animation Area (Sem nenhuma violência!) */}
      <div className="w-full bg-gradient-to-b from-sky-50 via-emerald-50/50 to-amber-50/40 dark:from-stone-900 dark:via-stone-800 dark:to-stone-900 border-2 border-emerald-300 dark:border-emerald-800 p-5 rounded-3xl flex flex-col items-center justify-center text-center shadow-xs space-y-2">
        <div className="text-6xl sm:text-7xl animate-pulse">
          {isCompleted ? '🌸 💐 🌻' : flowerStages[flowerIdx]}
        </div>
        <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
          {isCompleted
            ? 'O jardim floresceu completamente!'
            : `Descubra as letras para ver a flor desabrochar (${flowerIdx + 1}/7)`}
        </p>

        {showHint && (
          <div className="bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 p-2.5 rounded-xl text-xs font-extrabold text-amber-900 dark:text-amber-200 animate-in fade-in">
            💡 Dica: {puzzle.hint}
          </div>
        )}
      </div>

      {/* Secret Word Tiles */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {puzzle.word.split('').map((ch, idx) => {
          const isRevealed = guessedLetters.has(ch) || isCompleted || isGameOver;

          return (
            <div
              key={idx}
              className={`w-11 h-14 sm:w-12 sm:h-16 rounded-2xl flex items-center justify-center text-2xl font-black border-3 transition-all ${
                isRevealed
                  ? 'bg-white dark:bg-stone-900 border-emerald-500 text-stone-900 dark:text-stone-100 shadow-md scale-105'
                  : 'bg-stone-200 dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-transparent'
              }`}
            >
              {isRevealed ? ch : ''}
            </div>
          );
        })}
      </div>

      {/* Large Senior Keyboard */}
      <div className="w-full space-y-1.5 pt-1">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map(letter => {
              const isUsed = guessedLetters.has(letter);
              const isCorrect = isUsed && puzzle.word.includes(letter);
              const isWrong = isUsed && !puzzle.word.includes(letter);

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={isUsed || isCompleted || isGameOver}
                  onClick={() => handleLetterClick(letter)}
                  className={`w-9 h-12 sm:w-10 sm:h-13 rounded-xl font-black text-base sm:text-lg transition-all active:scale-95 shadow-2xs ${
                    isCorrect
                      ? 'bg-emerald-500 text-white'
                      : isWrong
                      ? 'bg-stone-300 dark:bg-stone-800 text-stone-500 opacity-40'
                      : 'bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 hover:bg-amber-100 border border-stone-300 dark:border-stone-700'
                  }`}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Action Tools */}
      <div className="w-full flex items-center gap-2 pt-1">
        <Button
          type="button"
          onClick={handleHintClick}
          variant="outline"
          className="flex-1 h-12 rounded-xl text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 font-bold gap-2 text-sm"
        >
          <Lightbulb className="h-5 w-5" /> Ver Dica Especial
        </Button>
      </div>

      {/* Non-humiliating Game Over banner */}
      {isGameOver && (
        <div className="w-full bg-amber-50 dark:bg-stone-900 border-3 border-amber-400 p-4 rounded-3xl text-center space-y-3 shadow-md animate-in fade-in">
          <p className="text-2xl">🌱</p>
          <h3 className="text-lg font-black text-stone-900 dark:text-stone-100">
            Você chegou bem perto! Quer tentar de novo?
          </h3>
          <p className="text-xs font-semibold text-stone-600 dark:text-stone-400">
            A palavra era: <strong className="text-amber-700 dark:text-amber-400 font-black">{puzzle.word}</strong>
          </p>
          <Button
            type="button"
            onClick={restartCurrentLevel}
            className="w-full h-12 bg-amber-600 hover:bg-amber-700 text-white font-black text-sm rounded-xl shadow-xs"
          >
            <RotateCcw className="h-4 w-4 mr-2" /> Tentar Novamente com Calma
          </Button>
        </div>
      )}

      {/* Victory Celebration */}
      {isCompleted && (
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/80 border-3 border-emerald-500 p-4 rounded-3xl text-center space-y-3 shadow-lg animate-in zoom-in-95">
          <div className="flex justify-center text-3xl">
            {Array.from({ length: earnedStars }).map((_, i) => (
              <span key={i} className="animate-bounce">⭐</span>
            ))}
          </div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Palavra Revelada com Sucesso! 🌸
          </h3>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            Muito bem! A flor do jardim se abriu inteira para você.
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
