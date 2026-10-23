'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart, Sparkles, Volume2, Check, RefreshCw } from 'lucide-react';
import { FamilyGameContent } from '@/types/games';

interface FamilyMemoriesEngineProps {
  levelNumber: number;
  caredPersonId?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

// Default warm memories if family hasn't uploaded custom ones yet
const DEFAULT_MEMORIES: Partial<FamilyGameContent>[] = [
  {
    id: 'def-1',
    title: 'Almoço de Domingo em Família',
    description: 'Aquele almoço especial com macarronada e todo mundo reunido na mesa grande.',
    person_names: ['Netos', 'Filhos', 'Família Toda'],
    relationship: 'Filhos e Netos',
    place: 'Casa da Família',
    year: 2023,
    media_url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'def-2',
    title: 'Passeio Gostoso na Praia',
    description: 'Caminhada suave na beira do mar no fim da tarde ouvindo as ondas.',
    person_names: ['Família'],
    relationship: 'Companhia querida',
    place: 'Litoral',
    year: 2022,
    media_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'def-3',
    title: 'Jardim Florido de Primavera',
    description: 'As flores lindas que desabrocharam perto da janela.',
    person_names: ['Natureza'],
    relationship: 'Lembrança do coração',
    place: 'Jardim de Casa',
    year: 2024,
    media_url: 'https://images.unsplash.com/photo-1465146344425-f00d5f5c8f07?w=600&auto=format&fit=crop&q=80',
  },
  {
    id: 'def-4',
    title: 'Aniversário com Bolo e Velinhas',
    description: 'Comemoração com abraços apertados e muitas risadas com quem a gente ama.',
    person_names: ['Família Querida'],
    relationship: 'Gerações reunidas',
    place: 'Sala de Estar',
    year: 2023,
    media_url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=600&auto=format&fit=crop&q=80',
  },
];

export function FamilyMemoriesEngine({ levelNumber, caredPersonId, onComplete, onNextLevel }: FamilyMemoriesEngineProps) {
  const [memories, setMemories] = useState<Partial<FamilyGameContent>[]>(DEFAULT_MEMORIES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (caredPersonId) {
      fetch(`/api/games/family?cared_person_id=${caredPersonId}`)
        .then(res => res.json())
        .then(data => {
          if (data.items && data.items.length > 0) {
            setMemories([...data.items, ...DEFAULT_MEMORIES]);
          }
        })
        .catch(() => {});
    }
  }, [caredPersonId]);

  const currentMemory = memories[(levelNumber - 1 + currentIndex) % memories.length];

  // Options for multiple choice: correct answer + 2 gentle alternatives
  const options = [
    currentMemory.title || 'Momento Especial',
    'Passeio no Parque da Cidade',
    'Café da Tarde com Amigos',
  ].sort(() => 0.5 - Math.random());

  const handleSelectOption = (opt: string) => {
    setSelectedOption(opt);
    const isCorrect = opt === currentMemory.title;

    if (isCorrect) {
      setFeedback('Que lindo recordar esse momento! ✨');
      setTimeout(() => {
        setIsCompleted(true);
        onComplete({
          stars: 3,
          score: 300,
          moves: 1,
          hints: 0,
        });
      }, 1000);
    } else {
      setFeedback('Essa lembrança também é linda! Que tal darmos uma olhadinha de novo?');
    }
  };

  return (
    <div className="flex flex-col items-center max-w-md mx-auto space-y-4">
      {/* Header */}
      <div className="w-full flex items-center justify-between px-2 text-stone-600 dark:text-stone-300">
        <span className="text-sm font-black bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-xl border border-amber-200 dark:border-amber-800 flex items-center gap-1.5">
          <Heart className="h-4 w-4 fill-amber-500 text-amber-500" /> Memórias do Coração • Etapa {levelNumber}
        </span>
      </div>

      {/* Memory Photo Card */}
      <div className="w-full bg-white dark:bg-stone-900 border-3 border-amber-300 dark:border-amber-700 rounded-3xl overflow-hidden shadow-md">
        <div className="aspect-4/3 w-full relative bg-stone-200 dark:bg-stone-800">
          <img
            src={currentMemory.media_url || 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80'}
            alt={currentMemory.title || 'Lembrança'}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="p-4 space-y-1.5 text-center">
          <p className="text-sm font-extrabold text-stone-800 dark:text-stone-100">
            {currentMemory.description}
          </p>
          {currentMemory.place && (
            <p className="text-xs font-semibold text-stone-500">
              📍 {currentMemory.place} {currentMemory.year ? `• Ano de ${currentMemory.year}` : ''}
            </p>
          )}
        </div>
      </div>

      {/* Question */}
      <div className="w-full text-center">
        <h3 className="text-base font-black text-stone-900 dark:text-stone-100">
          Qual é o título desta recordação com carinho?
        </h3>
      </div>

      {/* Options */}
      <div className="w-full space-y-2">
        {options.map((opt, i) => {
          const isSelected = selectedOption === opt;
          const isCorrect = opt === currentMemory.title;

          return (
            <button
              key={i}
              type="button"
              onClick={() => handleSelectOption(opt)}
              className={`w-full p-4 rounded-2xl border-2 text-left text-sm font-black transition-all active:scale-98 shadow-xs flex items-center justify-between ${
                isSelected && isCorrect
                  ? 'bg-emerald-100 border-emerald-500 text-emerald-950 dark:bg-emerald-950 dark:text-emerald-100'
                  : isSelected && !isCorrect
                  ? 'bg-amber-100 border-amber-400 text-amber-950 dark:bg-amber-950 dark:text-amber-100'
                  : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-800 dark:text-stone-100 hover:border-amber-400'
              }`}
            >
              <span>{opt}</span>
              {isSelected && isCorrect && <Check className="h-5 w-5 text-emerald-600 stroke-[3]" />}
            </button>
          );
        })}
      </div>

      {/* Feedback banner */}
      {feedback && (
        <p className="text-xs font-extrabold text-center text-amber-800 dark:text-amber-300 animate-in fade-in">
          {feedback}
        </p>
      )}

      {/* Celebration */}
      {isCompleted && (
        <div className="w-full bg-emerald-50 dark:bg-emerald-950/80 border-3 border-emerald-500 p-4 rounded-3xl text-center space-y-3 shadow-lg animate-in zoom-in-95">
          <div className="text-3xl animate-bounce">⭐⭐⭐</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Lembrança Acolhida com Amor! ❤️
          </h3>
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">
            Recordar momentos bons fortalece nossa história e união familiar.
          </p>
          {onNextLevel && (
            <Button
              type="button"
              onClick={onNextLevel}
              className="w-full h-13 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base rounded-2xl shadow-md active:scale-95"
            >
              Próxima Memória →
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
