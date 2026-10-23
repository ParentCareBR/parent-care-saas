'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, CheckCircle2, RotateCcw, HelpCircle, Sparkles } from 'lucide-react';

interface TriviaQuestion {
  question: string;
  theme: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface TriviaEngineProps {
  levelNumber: number;
  locale?: string;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

// Curated senior-friendly questions database across multiple themes
const TRIVIA_DATABASE: TriviaQuestion[] = [
  {
    theme: 'Música & Nostalgia',
    question: 'Quem é conhecido internacionalmente como o "Rei da Bossa Nova"?',
    options: ['Tom Jobim', 'João Gilberto', 'Vinicius de Moraes', 'Chico Buarque'],
    correctIndex: 1,
    explanation: 'João Gilberto revolucionou a música brasileira com sua batida única de violão.',
  },
  {
    theme: 'Provérbios Populares',
    question: 'Complete o provérbio: "Quem canta, seus males..."',
    options: ['Esconde', 'Espanta', 'Multiplica', 'Olha'],
    correctIndex: 1,
    explanation: 'Dizer popular que nos lembra como cantar traz alegria ao coração!',
  },
  {
    theme: 'Natureza & Flores',
    question: 'Qual flor é famosa por acompanhar a posição do Sol ao longo do dia?',
    options: ['Rosa', 'Girassol', 'Orquídea', 'Lírio'],
    correctIndex: 1,
    explanation: 'O girassol realiza o heliotropismo, virando-se em direção à luz solar.',
  },
  {
    theme: 'Culinária Tradicional',
    question: 'Qual é o ingrediente principal de um tradicional pão de queijo mineiro?',
    options: ['Farinha de trigo', 'Polvilho', 'Aveia', 'Fubá'],
    correctIndex: 1,
    explanation: 'O polvilho (doce ou azedo) combinado com queijo cura dá a textura clássica.',
  },
  {
    theme: 'Geografia do Brasil',
    question: 'Qual famosa cidade histórica de Minas Gerais é conhecida pelas obras barrocas de Aleijadinho?',
    options: ['Petrópolis', 'Ouro Preto', 'Paraty', 'Olinda'],
    correctIndex: 1,
    explanation: 'Ouro Preto guarda igrejas e esculturas espetaculares do período colonial.',
  },
  {
    theme: 'Cinema Clássico',
    question: 'Qual grande comediante do cinema mudo era famoso pelo personagem "O Vagabundo" com sua bengala?',
    options: ['Buster Keaton', 'Charlie Chaplin', 'Mazzaropi', 'Grande Otelo'],
    correctIndex: 1,
    explanation: 'Charlie Chaplin encantou o mundo com sua ternura e humor inteligente.',
  },
  {
    theme: 'Cotidiano & Memória',
    question: 'Em que dia da semana comemora-se tradicionalmente o almoço de Domingo em família?',
    options: ['Sexta-feira', 'Sábado', 'Domingo', 'Segunda-feira'],
    correctIndex: 2,
    explanation: 'O domingo é o dia clássico de reunir os entes queridos ao redor da mesa.',
  },
  {
    theme: 'Provérbios Populares',
    question: 'Complete o provérbio: "Devagar se vai..."',
    options: ['Rápido', 'Ao longe', 'Sem rumo', 'Atrás'],
    correctIndex: 1,
    explanation: 'A paciência e a constância nos levam com segurança a qualquer destino.',
  },
  {
    theme: 'Plantas & Jardins',
    question: 'Qual erva aromática com folhas pequenas e perfume suave é muito usada para acalmar em chás?',
    options: ['Pimenta', 'Camomila', 'Alho', 'Louro'],
    correctIndex: 1,
    explanation: 'A camomila tem propriedades relaxantes e reconfortantes.',
  },
  {
    theme: 'História & Cultura',
    question: 'Qual monumento icônico de braços abertos protege a cidade do Rio de Janeiro no alto do Corcovado?',
    options: ['Pão de Açúcar', 'Cristo Redentor', 'Arcos da Lapa', 'Maracanã'],
    correctIndex: 1,
    explanation: 'O Cristo Redentor foi eleito uma das Novas Sete Maravilhas do Mundo.',
  },
];

export function TriviaEngine({ levelNumber, onComplete, onNextLevel }: TriviaEngineProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [eliminatedOptions, setEliminatedOptions] = useState<number[]>([]);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [score, setScore] = useState(0);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Pick 3 questions deterministically for this level
  const questionsForLevel = React.useMemo(() => {
    const list: TriviaQuestion[] = [];
    for (let i = 0; i < 3; i++) {
      const idx = (levelNumber * 3 + i) % TRIVIA_DATABASE.length;
      list.push(TRIVIA_DATABASE[idx]);
    }
    return list;
  }, [levelNumber]);

  const currentQ = questionsForLevel[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    if (idx === currentQ.correctIndex) {
      setScore(s => s + 100);
    }
  };

  const handleNextQuestion = () => {
    if (currentIdx + 1 < questionsForLevel.length) {
      setCurrentIdx(i => i + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setEliminatedOptions([]);
    } else {
      // Level complete!
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
      onComplete({
        stars,
        score: score + 100,
        moves: currentIdx + 1,
        hints: hintsUsed,
      });
    }
  };

  const handleFiftyFiftyHint = () => {
    if (eliminatedOptions.length > 0 || isAnswered) return;
    setHintsUsed(h => h + 1);

    // Eliminate 2 wrong answers
    const wrongIndices = currentQ.options
      .map((_, i) => i)
      .filter(i => i !== currentQ.correctIndex);
    const toEliminate = wrongIndices.slice(0, 2);
    setEliminatedOptions(toEliminate);
  };

  return (
    <div className="space-y-4">
      {/* Level and Theme Header */}
      <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800">
        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
          {currentQ.theme}
        </span>
        <span className="text-xs font-extrabold text-stone-500">
          Pergunta {currentIdx + 1} de {questionsForLevel.length}
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 p-5 sm:p-6 rounded-3xl shadow-sm space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-2xl">
          💡
        </div>
        <h3 className="text-lg sm:text-xl font-black text-stone-900 dark:text-stone-100 leading-snug">
          {currentQ.question}
        </h3>
      </div>

      {/* Answer Options */}
      <div className="space-y-2.5">
        {currentQ.options.map((opt, idx) => {
          const isEliminated = eliminatedOptions.includes(idx);
          const isSelected = selectedOption === idx;
          const isCorrect = idx === currentQ.correctIndex;

          let btnClass = 'bg-stone-50 dark:bg-stone-800/80 border-2 border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200';
          if (isAnswered) {
            if (isCorrect) {
              btnClass = 'bg-emerald-100 dark:bg-emerald-950/70 border-3 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-400';
            } else if (isSelected) {
              btnClass = 'bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-400 text-rose-800';
            }
          }

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectOption(idx)}
              disabled={isEliminated || isAnswered}
              className={`w-full min-h-[58px] p-4 rounded-2xl flex items-center justify-between text-left font-bold text-base transition-all active:scale-[0.98] ${btnClass} ${
                isEliminated ? 'opacity-30 cursor-not-allowed' : 'hover:border-indigo-400'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-stone-200/60 dark:bg-stone-700 flex items-center justify-center text-xs font-black shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opt}</span>
              </div>
              {isAnswered && isCorrect && <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />}
            </button>
          );
        })}
      </div>

      {/* Explanation Banner */}
      {isAnswered && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 p-4 rounded-2xl space-y-3 animate-in fade-in">
          <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">
            {currentQ.explanation}
          </p>
          <Button
            type="button"
            onClick={handleNextQuestion}
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-xl"
          >
            {currentIdx + 1 < questionsForLevel.length ? 'Próxima Pergunta' : 'Finalizar Etapa'}
          </Button>
        </div>
      )}

      {/* Bottom Hint */}
      {!isAnswered && (
        <div className="pt-2">
          <Button
            type="button"
            onClick={handleFiftyFiftyHint}
            disabled={eliminatedOptions.length > 0}
            variant="outline"
            className="w-full h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-2"
          >
            <Lightbulb className="h-4 w-4" /> Dica 50/50 (Eliminar duas alternativas)
          </Button>
        </div>
      )}

      {/* Completion */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🌟</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Etapa Concluída!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você relembrou belas histórias e conhecimentos com muita sabedoria.
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
