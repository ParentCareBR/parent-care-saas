'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, CheckCircle2, Delete, Sparkles } from 'lucide-react';

interface WordAnagramEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

interface AnagramLevel {
  availableLetters: string[];
  validWords: string[];
}

const ANAGRAM_LEVELS: AnagramLevel[] = [
  {
    availableLetters: ['A', 'M', 'O', 'R', 'E', 'S'],
    validWords: ['AMOR', 'ROSA', 'REMO', 'MESA', 'RAMO', 'AMORES'],
  },
  {
    availableLetters: ['C', 'A', 'S', 'A', 'D', 'O'],
    validWords: ['CASA', 'DOCE', 'SACO', 'CASADO', 'SODA', 'CODA'],
  },
  {
    availableLetters: ['J', 'A', 'R', 'D', 'I', 'M'],
    validWords: ['DIA', 'RIMA', 'MIRA', 'JARDIM', 'IDA', 'IRA'],
  },
  {
    availableLetters: ['S', 'O', 'L', 'A', 'R', 'E'],
    validWords: ['SOL', 'OLA', 'LAR', 'SOLAR', 'RELO', 'SER'],
  },
];

export function WordAnagramEngine({ levelNumber, onComplete, onNextLevel }: WordAnagramEngineProps) {
  const currentLevel = ANAGRAM_LEVELS[(levelNumber - 1) % ANAGRAM_LEVELS.length];

  const [currentWord, setCurrentWord] = useState<string[]>([]);
  const [discoveredWords, setDiscoveredWords] = useState<string[]>([]);
  const [usedLetterIndices, setUsedLetterIndices] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState('Toque nas letras em ordem para formar uma palavra.');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setCurrentWord([]);
    setDiscoveredWords([]);
    setUsedLetterIndices([]);
    setHintsUsed(0);
    setMessage('Toque nas letras em ordem para formar uma palavra.');
    setIsCompleted(false);
  }, [levelNumber]);

  const handleLetterClick = (letter: string, index: number) => {
    if (usedLetterIndices.includes(index) || isCompleted) return;

    setCurrentWord(prev => [...prev, letter]);
    setUsedLetterIndices(prev => [...prev, index]);
  };

  const handleBackspace = () => {
    if (currentWord.length === 0 || isCompleted) return;

    setCurrentWord(prev => prev.slice(0, -1));
    setUsedLetterIndices(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setCurrentWord([]);
    setUsedLetterIndices([]);
  };

  const handleSubmitWord = () => {
    const wordStr = currentWord.join('');
    if (wordStr.length < 3) {
      setMessage('Palavras devem ter pelo menos 3 letras.');
      return;
    }

    if (discoveredWords.includes(wordStr)) {
      setMessage(`Você já encontrou a palavra "${wordStr}".`);
      handleClear();
      return;
    }

    if (currentLevel.validWords.includes(wordStr)) {
      const nextDiscovered = [...discoveredWords, wordStr];
      setDiscoveredWords(nextDiscovered);
      setMessage(`Muito bem! "${wordStr}" está na lista!`);
      handleClear();

      // Check win condition (e.g. 3 words found)
      const targetCount = Math.min(3, currentLevel.validWords.length);
      if (nextDiscovered.length >= targetCount) {
        setIsCompleted(true);
        const stars = hintsUsed === 0 ? 3 : hintsUsed <= 1 ? 2 : 1;
        onComplete({
          stars,
          score: 300 + (nextDiscovered.length * 50),
          moves: nextDiscovered.length + hintsUsed,
          hints: hintsUsed,
        });
      }
    } else {
      setMessage(`"${wordStr}" não está na lista desta etapa. Vamos tentar outra?`);
      handleClear();
    }
  };

  const handleHint = () => {
    if (isCompleted) return;
    setHintsUsed(h => h + 1);

    const unfound = currentLevel.validWords.find(w => !discoveredWords.includes(w));
    if (unfound) {
      setMessage(`Dica: Uma das palavras começa com "${unfound[0]}" e tem ${unfound.length} letras.`);
    }
  };

  const targetCount = Math.min(3, currentLevel.validWords.length);

  return (
    <div className="space-y-4">
      {/* Target & Progress */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <span className="text-xs font-bold text-stone-500 uppercase">Progresso da Etapa:</span>
          <p className="font-black text-lg text-emerald-600 dark:text-emerald-400">
            {discoveredWords.length} de {targetCount} palavras
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: targetCount }).map((_, i) => (
            <span key={i} className={`text-xl ${i < discoveredWords.length ? 'text-amber-500' : 'text-stone-300'}`}>
              ★
            </span>
          ))}
        </div>
      </div>

      {/* Message Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-2xl text-center">
        <p className="font-bold text-sm text-amber-900 dark:text-amber-200">{message}</p>
      </div>

      {/* Word Construction Slot */}
      <div className="bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 p-4 rounded-3xl min-h-[70px] flex items-center justify-center gap-2 shadow-xs">
        {currentWord.length === 0 ? (
          <span className="text-stone-400 font-bold text-sm">Toque nas letras abaixo...</span>
        ) : (
          currentWord.map((letter, idx) => (
            <div
              key={idx}
              className="w-11 h-13 sm:w-12 sm:h-14 bg-indigo-50 dark:bg-indigo-950/60 border-2 border-indigo-400 rounded-xl flex items-center justify-center font-black text-2xl text-indigo-700 dark:text-indigo-300 shadow-sm"
            >
              {letter}
            </div>
          ))
        )}
      </div>

      {/* Circular Letters Pad */}
      <div className="flex flex-wrap justify-center gap-2.5 max-w-xs mx-auto py-2">
        {currentLevel.availableLetters.map((letter, idx) => {
          const isUsed = usedLetterIndices.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleLetterClick(letter, idx)}
              disabled={isUsed || isCompleted}
              className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-black text-2xl sm:text-3xl border-2 shadow-md transition-all active:scale-95 ${
                isUsed
                  ? 'bg-stone-200 text-stone-400 border-stone-300 opacity-40 cursor-not-allowed'
                  : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-900 dark:text-stone-100 hover:border-indigo-400 hover:bg-indigo-50'
              }`}
            >
              {letter}
            </button>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          onClick={handleBackspace}
          disabled={currentWord.length === 0 || isCompleted}
          variant="outline"
          className="h-12 border-stone-300 font-bold text-xs rounded-xl gap-1"
        >
          <Delete className="h-4 w-4" /> Apagar
        </Button>

        <Button
          type="button"
          onClick={handleSubmitWord}
          disabled={currentWord.length < 3 || isCompleted}
          className="h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl"
        >
          Confirmar
        </Button>

        <Button
          type="button"
          onClick={handleHint}
          disabled={isCompleted}
          variant="outline"
          className="h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-xs rounded-xl gap-1"
        >
          <Lightbulb className="h-4 w-4" /> Dica
        </Button>
      </div>

      {/* Discovered Words Tag Cloud */}
      <div className="bg-stone-50 dark:bg-stone-900 p-3 rounded-2xl border border-stone-200 dark:border-stone-800">
        <p className="text-xs font-black uppercase text-stone-500 mb-2">Palavras Encontradas:</p>
        <div className="flex flex-wrap gap-1.5 min-h-[36px]">
          {discoveredWords.map((word, idx) => (
            <span
              key={idx}
              className="px-3 py-1 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 rounded-xl font-bold text-xs flex items-center gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> {word}
            </span>
          ))}
        </div>
      </div>

      {/* Win Modal */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">📚</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Vocabulário Excelente!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você formou as palavras da etapa com muita inteligência e criatividade.
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
