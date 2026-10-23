'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, Lightbulb, RotateCcw, CheckCircle2 } from 'lucide-react';

interface JigsawEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

// Beautiful nature scenes
const PUZZLE_IMAGES = [
  {
    title: 'Jardim de Rosas',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
  },
  {
    title: 'Pôr do Sol na Praia',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
  },
  {
    title: 'Montanhas Tranquilas',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=80',
  },
  {
    title: 'Campos de Lavanda',
    url: 'https://images.unsplash.com/photo-1528722828814-77b9b83aafb2?w=600&auto=format&fit=crop&q=80',
  },
];

export function JigsawEngine({ levelNumber, onComplete, onNextLevel }: JigsawEngineProps) {
  // 2x2 for levels 1-5, 3x3 for level 6+
  const gridSize = levelNumber <= 5 ? 2 : 3;
  const totalPieces = gridSize * gridSize;

  const currentImage = PUZZLE_IMAGES[(levelNumber - 1) % PUZZLE_IMAGES.length];

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
    // Shuffled pieces ensuring it is not already solved
    let initial = Array.from({ length: totalPieces }, (_, i) => i);
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
            score: Math.max(200, 600 - moves * 10 - hintsUsed * 30),
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

    // Find the first misplaced piece and swap it to its rightful place
    for (let targetIdx = 0; targetIdx < totalPieces; targetIdx++) {
      if (pieces[targetIdx] !== targetIdx) {
        const currentPosOfTarget = pieces.indexOf(targetIdx);
        const nextPieces = [...pieces];
        const temp = nextPieces[targetIdx];
        nextPieces[targetIdx] = nextPieces[currentPosOfTarget];
        nextPieces[currentPosOfTarget] = temp;
        setPieces(nextPieces);
        break;
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div>
          <h4 className="font-bold text-sm text-stone-900 dark:text-stone-100">{currentImage.title}</h4>
          <p className="text-xs text-stone-500 font-semibold">{gridSize}x{gridSize} peças • Toque para trocar</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowPreview(p => !p)}
          variant="outline"
          className="h-10 text-xs font-bold rounded-xl gap-1.5"
        >
          <Eye className="h-4 w-4" /> {showPreview ? 'Ocultar Foto' : 'Ver Foto'}
        </Button>
      </div>

      {/* Image Preview if requested */}
      {showPreview && (
        <div className="bg-stone-900/90 p-3 rounded-2xl text-center space-y-2 animate-in fade-in">
          <img
            src={currentImage.url}
            alt={currentImage.title}
            className="w-full max-h-48 object-cover rounded-xl mx-auto shadow-md"
          />
          <p className="text-xs text-stone-300 font-semibold">Imagem original de referência</p>
        </div>
      )}

      {/* Jigsaw Grid */}
      <div className="max-w-[340px] sm:max-w-[380px] mx-auto aspect-square bg-stone-200 dark:bg-stone-800 rounded-3xl p-2 shadow-inner border-4 border-stone-300 dark:border-stone-700">
        <div
          className="grid gap-1.5 w-full h-full rounded-2xl overflow-hidden"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {pieces.map((pieceOriginalIdx, currentIdx) => {
            const isCorrect = pieceOriginalIdx === currentIdx;
            const isSelected = selectedIdx === currentIdx;

            // Compute background position
            const col = pieceOriginalIdx % gridSize;
            const row = Math.floor(pieceOriginalIdx / gridSize);
            const xPercent = (col / (gridSize - 1)) * 100;
            const yPercent = (row / (gridSize - 1)) * 100;

            return (
              <button
                key={currentIdx}
                type="button"
                onClick={() => handlePieceClick(currentIdx)}
                className={`relative w-full h-full rounded-xl overflow-hidden border-2 transition-all active:scale-95 shadow-xs ${
                  isSelected
                    ? 'ring-4 ring-amber-400 border-white scale-105 z-10'
                    : isCorrect
                    ? 'border-emerald-400'
                    : 'border-white/60'
                }`}
                style={{
                  backgroundImage: `url(${currentImage.url})`,
                  backgroundSize: `${gridSize * 100}% ${gridSize * 100}%`,
                  backgroundPosition: `${xPercent}% ${yPercent}%`,
                }}
              >
                {isCorrect && (
                  <span className="absolute bottom-1 right-1 bg-emerald-600/90 text-white rounded-full p-0.5 shadow-xs">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
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
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-2"
        >
          <Lightbulb className="h-4 w-4" /> Encaixar 1 Peça
        </Button>
        <Button
          type="button"
          onClick={initPuzzle}
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
