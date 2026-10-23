'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, Sparkles } from 'lucide-react';

export type SolitaireVariant = 'klondike' | 'freecell' | 'spider';

interface Card {
  id: string;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: number; // 1 (Ace) to 13 (King)
  isFaceUp: boolean;
}

interface SolitaireEngineProps {
  levelNumber: number;
  variant?: SolitaireVariant;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

const SUIT_ICONS: Record<string, { symbol: string; color: string; isRed: boolean }> = {
  spades: { symbol: '♠', color: 'text-stone-900 dark:text-stone-100', isRed: false },
  hearts: { symbol: '♥', color: 'text-rose-600', isRed: true },
  diamonds: { symbol: '♦', color: 'text-rose-600', isRed: true },
  clubs: { symbol: '♣', color: 'text-stone-900 dark:text-stone-100', isRed: false },
};

function formatValue(v: number): string {
  if (v === 1) return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

function createDeck(): Card[] {
  const suits: ('spades' | 'hearts' | 'diamonds' | 'clubs')[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: Card[] = [];
  suits.forEach(suit => {
    for (let v = 1; v <= 13; v++) {
      deck.push({ id: `${suit}-${v}`, suit, value: v, isFaceUp: false });
    }
  });
  return deck;
}

export function SolitaireEngine({
  levelNumber,
  variant = 'klondike',
  onComplete,
  onNextLevel,
}: SolitaireEngineProps) {
  const [stock, setStock] = useState<Card[]>([]);
  const [waste, setWaste] = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau, setTableau] = useState<Card[][]>([[], [], [], [], [], [], []]);
  const [freeCells, setFreeCells] = useState<(Card | null)[]>([null, null, null, null]);
  const [selectedCard, setSelectedCard] = useState<{ card: Card; from: string; colIdx?: number } | null>(null);
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [message, setMessage] = useState('Toque em uma carta para movê-la.');

  useEffect(() => {
    initGame();
  }, [levelNumber, variant]);

  const initGame = () => {
    const deck = createDeck().sort(() => Math.random() - 0.5);

    if (variant === 'freecell') {
      // FreeCell: 8 columns, all face up
      const cols: Card[][] = [[], [], [], [], [], [], [], []];
      deck.forEach((card, i) => {
        cols[i % 8].push({ ...card, isFaceUp: true });
      });
      setTableau(cols);
      setFreeCells([null, null, null, null]);
      setStock([]);
      setWaste([]);
      setFoundations([[], [], [], []]);
    } else if (variant === 'spider') {
      // Spider Solitaire (1 suit for beginner/elder friendly, 10 columns)
      const spiderDeck: Card[] = [];
      for (let s = 0; s < 4; s++) {
        for (let v = 1; v <= 13; v++) {
          spiderDeck.push({ id: `spade-${s}-${v}`, suit: 'spades', value: v, isFaceUp: false });
        }
      }
      spiderDeck.sort(() => Math.random() - 0.5);

      const cols: Card[][] = Array.from({ length: 8 }, () => []);
      for (let c = 0; c < 8; c++) {
        for (let r = 0; r < 5; r++) {
          const card = spiderDeck.pop();
          if (card) {
            cols[c].push({ ...card, isFaceUp: r === 4 });
          }
        }
      }
      setTableau(cols);
      setStock(spiderDeck);
      setWaste([]);
      setFoundations([[], [], [], []]);
    } else {
      // Klondike classic
      const cols: Card[][] = [[], [], [], [], [], [], []];
      for (let col = 0; col < 7; col++) {
        for (let row = 0; row <= col; row++) {
          const card = deck.pop();
          if (card) {
            cols[col].push({ ...card, isFaceUp: row === col });
          }
        }
      }
      setTableau(cols);
      setStock(deck);
      setWaste([]);
      setFoundations([[], [], [], []]);
    }

    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
    setSelectedCard(null);
    setMessage('Toque em uma carta para movê-la.');
  };

  // Stock draw
  const handleStockClick = () => {
    if (stock.length === 0) {
      if (waste.length === 0) return;
      // Recycle waste back to stock
      setStock(waste.map(c => ({ ...c, isFaceUp: false })).reverse());
      setWaste([]);
      setMessage('Monte reiniciado.');
    } else {
      const nextStock = [...stock];
      const drawn = nextStock.pop();
      if (drawn) {
        setStock(nextStock);
        setWaste(prev => [...prev, { ...drawn, isFaceUp: true }]);
        setMoves(m => m + 1);
      }
    }
  };

  // Auto-move card to Foundation if valid
  const tryMoveToFoundation = (card: Card): boolean => {
    const suitFoundationsOrder = ['spades', 'hearts', 'diamonds', 'clubs'];
    for (let f = 0; f < 4; f++) {
      const fPile = foundations[f];
      if (fPile.length === 0) {
        if (card.value === 1) {
          // Ace can start foundation
          const nextFoundations = foundations.map((p, i) => (i === f ? [card] : p));
          setFoundations(nextFoundations);
          return true;
        }
      } else {
        const top = fPile[fPile.length - 1];
        if (top.suit === card.suit && card.value === top.value + 1) {
          const nextFoundations = foundations.map((p, i) => (i === f ? [...p, card] : p));
          setFoundations(nextFoundations);
          return true;
        }
      }
    }
    return false;
  };

  // Tableau card click
  const handleTableauClick = (colIdx: number) => {
    const col = tableau[colIdx];
    if (!col || col.length === 0) {
      // Empty column: can place King
      if (selectedCard) {
        if (selectedCard.card.value === 13 || variant === 'freecell') {
          placeSelectedCardToColumn(colIdx);
        }
      }
      return;
    }

    const topCard = col[col.length - 1];

    if (!topCard.isFaceUp) {
      // Flip top face-down card
      const newCols = tableau.map((c, i) =>
        i === colIdx ? c.map((card, idx) => (idx === c.length - 1 ? { ...card, isFaceUp: true } : card)) : c
      );
      setTableau(newCols);
      return;
    }

    if (selectedCard) {
      // Try to place selected card onto this column
      const targetCard = topCard;
      const isAltColor = SUIT_ICONS[selectedCard.card.suit].isRed !== SUIT_ICONS[targetCard.suit].isRed;
      const isSequential = targetCard.value === selectedCard.card.value + 1;

      if ((isAltColor && isSequential) || (variant === 'spider' && isSequential)) {
        placeSelectedCardToColumn(colIdx);
      } else {
        setSelectedCard(null);
        setMessage('Essa carta não encaixa aqui.');
      }
    } else {
      // Try smart quick-move to foundation first
      const moved = tryMoveToFoundation(topCard);
      if (moved) {
        // Remove from tableau
        const newCols = tableau.map((c, i) => (i === colIdx ? c.slice(0, -1) : c));
        // Auto-flip newly exposed card
        if (newCols[colIdx].length > 0) {
          const lastIdx = newCols[colIdx].length - 1;
          newCols[colIdx][lastIdx].isFaceUp = true;
        }
        setTableau(newCols);
        setMoves(m => m + 1);
        checkWin(foundations);
      } else {
        // Select card
        setSelectedCard({ card: topCard, from: 'tableau', colIdx });
        setMessage(`Carta ${formatValue(topCard.value)}${SUIT_ICONS[topCard.suit].symbol} selecionada.`);
      }
    }
  };

  const placeSelectedCardToColumn = (targetColIdx: number) => {
    if (!selectedCard) return;

    if (selectedCard.from === 'waste') {
      setWaste(prev => prev.slice(0, -1));
    } else if (selectedCard.from === 'tableau' && selectedCard.colIdx !== undefined) {
      const srcColIdx = selectedCard.colIdx;
      const nextTableau = tableau.map((c, i) => {
        if (i === srcColIdx) {
          const updated = c.slice(0, -1);
          if (updated.length > 0) updated[updated.length - 1].isFaceUp = true;
          return updated;
        }
        return c;
      });
      setTableau(nextTableau);
    } else if (selectedCard.from === 'freecell' && selectedCard.colIdx !== undefined) {
      const nextFreeCells = [...freeCells];
      nextFreeCells[selectedCard.colIdx] = null;
      setFreeCells(nextFreeCells);
    }

    setTableau(prev =>
      prev.map((c, i) => (i === targetColIdx ? [...c, selectedCard.card] : c))
    );

    setSelectedCard(null);
    setMoves(m => m + 1);
    setMessage('Carta posicionada com sucesso!');
  };

  const handleWasteClick = () => {
    if (waste.length === 0) return;
    const topCard = waste[waste.length - 1];

    // Try moving to foundation directly
    const moved = tryMoveToFoundation(topCard);
    if (moved) {
      setWaste(prev => prev.slice(0, -1));
      setMoves(m => m + 1);
      checkWin(foundations);
    } else {
      setSelectedCard({ card: topCard, from: 'waste' });
      setMessage(`Carta do descarte ${formatValue(topCard.value)}${SUIT_ICONS[topCard.suit].symbol} selecionada.`);
    }
  };

  const checkWin = (fPiles: Card[][]) => {
    const totalFoundationCards = fPiles.reduce((acc, pile) => acc + pile.length, 0);
    if (totalFoundationCards >= 52 || (variant === 'spider' && tableau.every(c => c.length === 0))) {
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
      onComplete({
        stars,
        score: Math.max(200, 1000 - moves * 5),
        moves,
        hints: hintsUsed,
      });
    }
  };

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    // Check if any tableau top card or waste card can go to foundation
    let hintGiven = false;
    tableau.forEach((col, idx) => {
      if (col.length > 0 && col[col.length - 1].isFaceUp) {
        const c = col[col.length - 1];
        if (c.value === 1) {
          setMessage(`Dica: O Ás na coluna ${idx + 1} pode ir para o topo!`);
          hintGiven = true;
        }
      }
    });

    if (!hintGiven && waste.length > 0) {
      setMessage(`Dica: Verifique se a carta ${formatValue(waste[waste.length - 1].value)} do descarte pode ser encaixada.`);
    } else if (!hintGiven) {
      setMessage('Dica: Compre uma nova carta do monte para liberar opções.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner Message */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 p-2.5 rounded-2xl text-center">
        <p className="font-bold text-sm text-emerald-900 dark:text-emerald-200">{message}</p>
      </div>

      {/* Top Area: Stock / Waste / Foundations */}
      <div className="flex items-center justify-between gap-2 p-3 bg-emerald-900/90 rounded-2xl border-2 border-emerald-950">
        {/* Stock & Waste */}
        <div className="flex items-center gap-2">
          {/* Stock */}
          <button
            type="button"
            onClick={handleStockClick}
            className="w-12 h-16 sm:w-14 sm:h-20 rounded-xl bg-blue-700 border-2 border-blue-400 text-white flex items-center justify-center font-black text-xs shadow-md active:scale-95"
          >
            {stock.length > 0 ? `🂠 (${stock.length})` : '↺'}
          </button>

          {/* Waste */}
          <button
            type="button"
            onClick={handleWasteClick}
            disabled={waste.length === 0}
            className={`w-12 h-16 sm:w-14 sm:h-20 rounded-xl bg-white border-2 flex flex-col items-center justify-center shadow-md ${
              waste.length > 0 ? 'border-amber-400' : 'border-dashed border-white/40'
            }`}
          >
            {waste.length > 0 && (
              <>
                <span className={`text-base font-black ${SUIT_ICONS[waste[waste.length - 1].suit].color}`}>
                  {formatValue(waste[waste.length - 1].value)}
                </span>
                <span className={`text-lg leading-none ${SUIT_ICONS[waste[waste.length - 1].suit].color}`}>
                  {SUIT_ICONS[waste[waste.length - 1].suit].symbol}
                </span>
              </>
            )}
          </button>
        </div>

        {/* 4 Foundations */}
        <div className="flex items-center gap-1.5">
          {foundations.map((fPile, idx) => {
            const top = fPile.length > 0 ? fPile[fPile.length - 1] : null;
            return (
              <div
                key={idx}
                className="w-11 h-16 sm:w-13 sm:h-20 rounded-xl bg-emerald-950/60 border-2 border-emerald-700 flex flex-col items-center justify-center"
              >
                {top ? (
                  <>
                    <span className={`text-sm font-black ${SUIT_ICONS[top.suit].color}`}>
                      {formatValue(top.value)}
                    </span>
                    <span className={`text-base leading-none ${SUIT_ICONS[top.suit].color}`}>
                      {SUIT_ICONS[top.suit].symbol}
                    </span>
                  </>
                ) : (
                  <span className="text-white/30 text-xs font-bold">A</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Tableau Columns */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2 min-h-[220px] bg-emerald-950/80 p-2 sm:p-3 rounded-2xl border-2 border-emerald-900">
        {tableau.map((col, colIdx) => {
          return (
            <div
              key={colIdx}
              onClick={() => handleTableauClick(colIdx)}
              className="flex flex-col items-center min-h-[180px] cursor-pointer rounded-lg hover:bg-emerald-900/30 p-0.5"
            >
              {col.length === 0 ? (
                <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-lg border-2 border-dashed border-emerald-700/50 flex items-center justify-center text-emerald-600 text-xs font-bold">
                  K
                </div>
              ) : (
                col.map((card, cardIdx) => {
                  const isTop = cardIdx === col.length - 1;
                  const isSelected = selectedCard?.card.id === card.id;

                  return (
                    <div
                      key={card.id}
                      className={`w-10 h-14 sm:w-12 sm:h-16 rounded-lg border-2 shadow-xs flex flex-col items-center justify-center transition-all ${
                        card.isFaceUp
                          ? 'bg-white border-stone-300'
                          : 'bg-blue-800 border-blue-400'
                      } ${isSelected ? 'ring-3 ring-amber-400 scale-105' : ''} ${
                        cardIdx > 0 ? '-mt-9 sm:-mt-11' : ''
                      }`}
                    >
                      {card.isFaceUp ? (
                        <>
                          <span className={`text-xs font-black ${SUIT_ICONS[card.suit].color}`}>
                            {formatValue(card.value)}
                          </span>
                          <span className={`text-sm leading-none ${SUIT_ICONS[card.suit].color}`}>
                            {SUIT_ICONS[card.suit].symbol}
                          </span>
                        </>
                      ) : (
                        <span className="text-blue-300 text-[10px]">🂠</span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleHint}
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-1.5"
        >
          <Lightbulb className="h-4 w-4" /> Dica
        </Button>
        <Button
          type="button"
          onClick={initGame}
          variant="outline"
          className="flex-1 h-12 border-stone-300 font-bold text-sm rounded-xl gap-1.5"
        >
          <RotateCcw className="h-4 w-4" /> Reiniciar
        </Button>
      </div>

      {/* Victory modal */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3">
          <div className="text-4xl">👑</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Parabéns! Paciência Concluída!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Você organizou todas as cartas com grande calma e atenção.
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={initGame}
              variant="outline"
              className="flex-1 h-12 rounded-xl font-bold"
            >
              Jogar Novamente
            </Button>
            {onNextLevel && (
              <Button
                type="button"
                onClick={onNextLevel}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
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
