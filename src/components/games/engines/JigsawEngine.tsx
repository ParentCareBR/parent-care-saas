'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Lightbulb, RotateCcw, CheckCircle2 } from 'lucide-react';

interface JigsawEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const PUZZLE_LEVELS = [
  {
    title: 'Jardim de Girassóis',
    emoji: '🌻',
    gradient: 'from-amber-200 via-yellow-100 to-amber-300',
    piecesLabels: ['Sol Brilhante ☀️', 'Girassol Alto 🌻', 'Borboleta 🦋', 'Jardim Florido 🌷'],
  },
  {
    title: 'Tarde na Praia Calma',
    emoji: '🏖️',
    gradient: 'from-sky-200 via-amber-100 to-sky-300',
    piecesLabels: ['Céu Azul ☁️', 'Sol de Verão ☀️', 'Mar Calmo 🌊', 'Areia Dourada 🏖️'],
  },
  {
    title: 'Aconchego na Lareira',
    emoji: '🪵',
    gradient: 'from-orange-200 via-amber-100 to-stone-200',
    piecesLabels: ['Lareira Quente 🔥', 'Café Quentinho ☕', 'Poltrona Macia 🛋️', 'Gatinho Ronronando 🐱'],
  },
  {
    title: 'Montanhas e Pinheiros',
    emoji: '🏔️',
    gradient: 'from-emerald-200 via-teal-100 to-emerald-300',
    piecesLabels: ['Picos Nevados 🏔️', 'Águia no Céu 🦅', 'Pinheiros Verdes 🌲', 'Lago Cristalino 💧'],
  },
];

export function JigsawEngine({ levelNumber, onComplete, onNextLevel }: JigsawEngineProps) {
  // 2x2 = 4 pieces for smooth, accessible, relaxing experience for seniors
  const gridSize = 2;
  const totalPieces = 4;

  const currentLevel = PUZZLE_LEVELS[(levelNumber - 1) % PUZZLE_LEVELS.length];

  const [pieces, setPieces] = useState<number[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    initPuzzle();
  }, [levelNumber]);

  const initPuzzle = () => {
    let initial = [0, 1, 2, 3];
    let isSolved = true;
    while (isSolved) {
      initial = [...initial].sort(() => Math.random() - 0.5);
      isSolved = initial.every((val, idx) => val === idx);
    }

    setPieces(initial);
    setSelectedIdx(null);
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
  };

  const handlePieceClick = (clickedIdx: number) => {
    if (isCompleted) return;

    if (selectedIdx === null) {
      setSelectedIdx(clickedIdx);
    } else {
      if (selectedIdx !== clickedIdx) {
        // Swap pieces
        const nextPieces = [...pieces];
        const temp = nextPieces[selectedIdx];
        nextPieces[selectedIdx] = nextPieces[clickedIdx];
        nextPieces[clickedIdx] = temp;

        setPieces(nextPieces);
        setMoves(m => m + 1);

        // Check if solved
        const solved = nextPieces.every((val, idx) => val === idx);
        if (solved) {
          setIsCompleted(true);
          const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
          onComplete({
            stars,
            score: Math.max(200, 500 - moves * 10 - hintsUsed * 25),
            moves: moves + 1,
            hints: hintsUsed,
          });
        }
      }
      setSelectedIdx(null);
    }
  };

  const handleHint = () => {
    if (isCompleted) return;
    setHintsUsed(h => h + 1);

    for (let targetIdx = 0; targetIdx < totalPieces; targetIdx++) {
      if (pieces[targetIdx] !== targetIdx) {
        const currentPosOfTarget = pieces.indexOf(targetIdx);
        const nextPieces = [...pieces];
        const temp = nextPieces[targetIdx];
        nextPieces[targetIdx] = nextPieces[currentPosOfTarget];
        nextPieces[currentPosOfTarget] = temp;
        setPieces(nextPieces);

        // Check if solved
        if (nextPieces.every((val, idx) => val === idx)) {
          setIsCompleted(true);
          onComplete({
            stars: 2,
            score: 300,
            moves: moves + 1,
            hints: hintsUsed + 1,
          });
        }
        break;
      }
    }
  };

  return (
    <div className="space-y-3.5 select-none max-w-md mx-auto">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <h4 className="font-black text-sm text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
            <span>{currentLevel.emoji}</span>
            <span>{currentLevel.title}</span>
          </h4>
          <p className="text-xs text-stone-500 font-bold">Toque em duas peças para trocar de lugar</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          variant="outline"
          className="h-10 text-xs font-bold rounded-xl gap-1.5"
        >
          <Eye className="h-4 w-4" /> {showPreview ? 'Ocultar Guia' : 'Ver Guia'}
        </Button>
      </div>

      {/* Guide Preview */}
      {showPreview && (
        <div className="bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border-2 border-dashed border-indigo-300 dark:border-indigo-700 text-center space-y-2 animate-in fade-in">
          <p className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-300">Ordem Correta das 4 Peças:</p>
          <div className="grid grid-cols-2 gap-2 max-w-[240px] mx-auto">
            {currentLevel.piecesLabels.map((label, idx) => (
              <div key={idx} className="p-2 rounded-xl bg-white dark:bg-stone-900 border border-stone-300 text-xs font-black">
                {idx + 1}. {label}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Jigsaw 2x2 Grid */}
      <div className="max-w-[320px] sm:max-w-[340px] mx-auto aspect-square bg-stone-100 dark:bg-stone-900 rounded-3xl p-3 border-4 border-stone-300 dark:border-stone-700 shadow-xl">
        <div className="grid grid-cols-2 grid-rows-2 gap-2.5 w-full h-full">
          {pieces.map((pieceVal, currentIdx) => {
            const isCorrect = pieceVal === currentIdx;
            const isSelected = selectedIdx === currentIdx;
            const label = currentLevel.piecesLabels[pieceVal];

            return (
              <button
                key={currentIdx}
                type="button"
                onClick={() => handlePieceClick(currentIdx)}
                className={`relative w-full h-full rounded-2xl p-2 flex flex-col items-center justify-between transition-all active:scale-95 shadow-md border-3 bg-gradient-to-br ${
                  currentLevel.gradient
                } ${
                  isSelected
                    ? 'ring-4 ring-indigo-500 border-indigo-400 scale-105 z-10'
                    : isCorrect
                    ? 'border-emerald-500 ring-2 ring-emerald-300'
                    : 'border-stone-300 hover:border-amber-400'
                }`}
              >
                <span className="self-start text-[11px] font-black px-2 py-0.5 rounded-full bg-white/90 text-stone-900 shadow-xs">
                  Peça {pieceVal + 1}
                </span>

                <span className="text-sm sm:text-base font-black text-stone-900 text-center drop-shadow-xs px-1">
                  {label}
                </span>

                {isCorrect && (
                  <span className="self-end bg-emerald-600 text-white rounded-full p-0.5 shadow-xs">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-xs text-stone-500 font-semibold">
        Peças com borda verde já estão no lugar certo!
      </p>

      {/* Controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleHint}
          disabled={isCompleted}
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-2"
        >
          <Lightbulb className="h-4 w-4" /> Encaixar 1 Peça
        </Button>
        <Button
          type="button"
          onClick={initPuzzle}
          disabled={isCompleted}
          variant="outline"
          className="flex-1 h-12 border-stone-300 font-bold text-sm rounded-xl gap-2"
        >
          <RotateCcw className="h-4 w-4" /> Embaralhar
        </Button>
      </div>

      {/* Victory */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🖼️</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Que Imagem Linda!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você montou o quebra-cabeça com muita delicadeza e paciência.
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
