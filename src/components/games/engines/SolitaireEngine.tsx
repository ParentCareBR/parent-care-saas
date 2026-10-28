'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw } from 'lucide-react';
import { getGameTexts } from '@/lib/i18n/game-i18n';

export type SolitaireVariant = 'klondike' | 'freecell' | 'spider';

interface Card {
  id: string;
  suit: 'spades' | 'hearts' | 'diamonds' | 'clubs';
  value: number;
  isFaceUp: boolean;
}

interface SolitaireEngineProps {
  levelNumber: number;
  locale?: string;
  variant?: SolitaireVariant;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

// Suit config with explicit inline colors (Tailwind purging fix: use style instead of dynamic class)
const SUITS = {
  spades:   { symbol: '♠', isRed: false },
  hearts:   { symbol: '♥', isRed: true  },
  diamonds: { symbol: '♦', isRed: true  },
  clubs:    { symbol: '♣', isRed: false },
} as const;

function suitColor(suit: string): string {
  return suit === 'hearts' || suit === 'diamonds' ? '#dc2626' : '#1c1917';
}

function formatValue(v: number): string {
  if (v === 1)  return 'A';
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

/** Small card face — value top-left, suit centered */
function CardFace({ card, small = false }: { card: Card; small?: boolean }) {
  const color = suitColor(card.suit);
  const sym = SUITS[card.suit].symbol;
  const val = formatValue(card.value);
  return (
    <div className="w-full h-full flex flex-col items-start justify-start p-1 select-none">
      <span className="font-black leading-none" style={{ color, fontSize: small ? 11 : 13 }}>{val}</span>
      <span className="leading-none mt-0.5" style={{ color, fontSize: small ? 12 : 14 }}>{sym}</span>
      <span className="mx-auto mt-auto mb-auto text-xl leading-none" style={{ color }}>
        {sym}
      </span>
    </div>
  );
}

/** Card back face */
function CardBack({ small = false }: { small?: boolean }) {
  return (
    <div className="w-full h-full rounded-lg flex items-center justify-center bg-blue-700 border border-blue-400">
      <div className="w-[85%] h-[85%] rounded border-2 border-blue-400/50 bg-blue-600 flex items-center justify-center">
        <span className="text-blue-300 opacity-60" style={{ fontSize: small ? 8 : 10 }}>♦♦</span>
      </div>
    </div>
  );
}

export function SolitaireEngine({
  levelNumber,
  variant = 'klondike',
  locale,
  onComplete,
  onNextLevel,
}: SolitaireEngineProps) {
  const tGame = getGameTexts(locale);
  const [stock, setStock]           = useState<Card[]>([]);
  const [waste, setWaste]           = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau, setTableau]       = useState<Card[][]>([[], [], [], [], [], [], []]);
  const [freeCells, setFreeCells]   = useState<(Card | null)[]>([null, null, null, null]);
  const [selectedCard, setSelectedCard] = useState<{ card: Card; from: string; colIdx?: number; cardIdx?: number } | null>(null);
  const [moves, setMoves]           = useState(0);
  const [hintsUsed, setHintsUsed]   = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [message, setMessage]       = useState(tGame.solitaire.instructions);

  useEffect(() => { initGame(); }, [levelNumber, variant]);

  const initGame = () => {
    const deck = createDeck().sort(() => Math.random() - 0.5);

    if (variant === 'freecell') {
      const cols: Card[][] = Array.from({ length: 8 }, () => []);
      deck.forEach((card, i) => cols[i % 8].push({ ...card, isFaceUp: true }));
      setTableau(cols);
      setFreeCells([null, null, null, null]);
      setStock([]); setWaste([]); setFoundations([[], [], [], []]);
    } else if (variant === 'spider') {
      const spiderDeck: Card[] = [];
      for (let s = 0; s < 4; s++)
        for (let v = 1; v <= 13; v++)
          spiderDeck.push({ id: `sp-${s}-${v}`, suit: 'spades', value: v, isFaceUp: false });
      spiderDeck.sort(() => Math.random() - 0.5);

      const cols: Card[][] = Array.from({ length: 8 }, () => []);
      for (let c = 0; c < 8; c++) {
        for (let r = 0; r < 5; r++) {
          const card = spiderDeck.pop();
          if (card) cols[c].push({ ...card, isFaceUp: r === 4 });
        }
      }
      setTableau(cols);
      setStock(spiderDeck); setWaste([]);
      setFoundations([[], [], [], []]);
    } else {
      // Klondike
      const cols: Card[][] = [[], [], [], [], [], [], []];
      for (let col = 0; col < 7; col++)
        for (let row = 0; row <= col; row++) {
          const card = deck.pop();
          if (card) cols[col].push({ ...card, isFaceUp: row === col });
        }
      setTableau(cols);
      setStock(deck); setWaste([]);
      setFoundations([[], [], [], []]);
    }
    setMoves(0); setHintsUsed(0); setIsCompleted(false);
    setSelectedCard(null);
    setMessage(tGame.solitaire.instructions);
  };

  // ─── Foundation logic ────────────────────────────────────────────
  const tryMoveToFoundation = (card: Card, currentFoundations: Card[][]): Card[][] | null => {
    for (let f = 0; f < 4; f++) {
      const pile = currentFoundations[f];
      if (pile.length === 0 && card.value === 1) {
        return currentFoundations.map((p, i) => i === f ? [card] : [...p]);
      }
      if (pile.length > 0) {
        const top = pile[pile.length - 1];
        if (top.suit === card.suit && card.value === top.value + 1) {
          return currentFoundations.map((p, i) => i === f ? [...p, card] : [...p]);
        }
      }
    }
    return null;
  };

  // ─── Can place card on tableau column ────────────────────────────
  const canPlaceOnColumn = (card: Card, col: Card[]): boolean => {
    if (col.length === 0) return card.value === 13 || variant === 'freecell' || variant === 'spider';
    const top = col[col.length - 1];
    if (!top.isFaceUp) return false;
    if (variant === 'spider') return card.value === top.value - 1;
    const altColor = SUITS[card.suit].isRed !== SUITS[top.suit].isRed;
    return altColor && card.value === top.value - 1;
  };

  // ─── Stock click ─────────────────────────────────────────────────
  const handleStockClick = () => {
    if (stock.length === 0) {
      if (waste.length === 0) return;
      setStock([...waste].reverse().map(c => ({ ...c, isFaceUp: false })));
      setWaste([]);
    } else {
      const nextStock = [...stock];
      const drawn = nextStock.pop()!;
      setStock(nextStock);
      setWaste(prev => [...prev, { ...drawn, isFaceUp: true }]);
    }
    setSelectedCard(null);
  };

  // ─── Waste click ─────────────────────────────────────────────────
  const handleWasteClick = () => {
    if (waste.length === 0) return;
    const topCard = waste[waste.length - 1];

    if (selectedCard) {
      setSelectedCard(null); return;
    }
    // Try auto-move to foundation
    const newF = tryMoveToFoundation(topCard, foundations);
    if (newF) {
      setFoundations(newF);
      setWaste(prev => prev.slice(0, -1));
      setMoves(m => m + 1);
      const newFoundations = newF;
      checkWin(tableau, newFoundations);
    } else {
      setSelectedCard({ card: topCard, from: 'waste' });
      setMessage(`Carta ${formatValue(topCard.value)}${SUITS[topCard.suit].symbol} selecionada. Toque em uma coluna para posicioná-la.`);
    }
  };

  // ─── Foundation pile click ────────────────────────────────────────
  const handleFoundationClick = (fIdx: number) => {
    if (!selectedCard) return;
    // Place selected onto foundation if valid
    const card = selectedCard.card;
    const pile = foundations[fIdx];
    let valid = false;
    if (pile.length === 0 && card.value === 1) valid = true;
    if (pile.length > 0) {
      const top = pile[pile.length - 1];
      if (top.suit === card.suit && card.value === top.value + 1) valid = true;
    }
    if (!valid) { setMessage('Esta carta não pode ser colocada aqui.'); return; }

    const newF = foundations.map((p, i) => i === fIdx ? [...p, card] : [...p]);
    removeSelectedCard();
    setFoundations(newF);
    setMoves(m => m + 1);
    setSelectedCard(null);
    setMessage('Carta colocada na base!');
    checkWin(tableau, newF);
  };

  // ─── Tableau column click ─────────────────────────────────────────
  const handleTableauClick = (colIdx: number) => {
    const col = tableau[colIdx];

    if (selectedCard) {
      // Try to place onto this column
      if (canPlaceOnColumn(selectedCard.card, col)) {
        const newTableau = tableau.map((c, i) => i === colIdx ? [...c, selectedCard.card] : [...c]);
        removeSelectedCardFromTableau(newTableau, colIdx);
        setSelectedCard(null);
        setMoves(m => m + 1);
        setMessage('Carta movida com sucesso!');
        checkWin(newTableau, foundations);
      } else {
        setSelectedCard(null);
        setMessage('Essa posição não é válida para esta carta.');
      }
      return;
    }

    if (!col || col.length === 0) return;
    const topCard = col[col.length - 1];

    if (!topCard.isFaceUp) {
      // Flip face-down card
      const newTableau = tableau.map((c, i) =>
        i === colIdx ? c.map((card, idx) => idx === c.length - 1 ? { ...card, isFaceUp: true } : card) : c
      );
      setTableau(newTableau);
      return;
    }

    // Try quick auto-move to foundation
    const newF = tryMoveToFoundation(topCard, foundations);
    if (newF) {
      const newTableau = tableau.map((c, i) => {
        if (i !== colIdx) return c;
        const updated = c.slice(0, -1);
        if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], isFaceUp: true };
        return updated;
      });
      setTableau(newTableau);
      setFoundations(newF);
      setMoves(m => m + 1);
      setMessage('Carta enviada para a base!');
      checkWin(newTableau, newF);
    } else {
      // Select the top card
      setSelectedCard({ card: topCard, from: 'tableau', colIdx, cardIdx: col.length - 1 });
      setMessage(`${formatValue(topCard.value)}${SUITS[topCard.suit].symbol} selecionada. Toque onde deseja colocá-la.`);
    }
  };

  // Remove selected card from its source and update tableau
  const removeSelectedCard = () => {
    if (!selectedCard) return;
    if (selectedCard.from === 'waste') {
      setWaste(prev => prev.slice(0, -1));
    } else if (selectedCard.from === 'tableau' && selectedCard.colIdx !== undefined) {
      setTableau(prev => prev.map((c, i) => {
        if (i !== selectedCard.colIdx) return c;
        const updated = c.slice(0, -1);
        if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], isFaceUp: true };
        return updated;
      }));
    }
  };

  const removeSelectedCardFromTableau = (newTableau: Card[][], destinationColIdx: number) => {
    if (!selectedCard) return;
    if (selectedCard.from === 'waste') {
      setWaste(prev => prev.slice(0, -1));
      setTableau(newTableau);
    } else if (selectedCard.from === 'tableau' && selectedCard.colIdx !== undefined) {
      const srcIdx = selectedCard.colIdx;
      const updated = newTableau.map((c, i) => {
        if (i !== srcIdx) return c;
        const trimmed = c.slice(0, destinationColIdx === srcIdx ? c.length : c.length - 1);
        // Actually remove from source (we appended to dest already)
        const trimmedSrc = tableau[srcIdx].slice(0, -1);
        const flipped = [...trimmedSrc];
        if (flipped.length > 0) flipped[flipped.length - 1] = { ...flipped[flipped.length - 1], isFaceUp: true };
        return i === srcIdx ? flipped : (i === destinationColIdx ? [...tableau[i], selectedCard.card] : tableau[i]);
      });
      setTableau(updated);
    }
  };

  const checkWin = (tab: Card[][], founds: Card[][]) => {
    const total = founds.reduce((a, p) => a + p.length, 0);
    if (total >= 52) {
      setIsCompleted(true);
      const stars = hintsUsed === 0 ? 3 : hintsUsed <= 2 ? 2 : 1;
      onComplete({ stars, score: Math.max(200, 1000 - moves * 5), moves, hints: hintsUsed });
    }
  };

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    // Find an Ace in tableau or waste
    for (let i = 0; i < tableau.length; i++) {
      const col = tableau[i];
      if (col.length > 0 && col[col.length - 1].isFaceUp && col[col.length - 1].value === 1) {
        setMessage(tGame.solitaire.hintAceCol(i + 1));
        return;
      }
    }
    if (waste.length > 0 && waste[waste.length - 1].value === 1) {
      setMessage(tGame.solitaire.hintAceWaste);
      return;
    }
    setMessage(tGame.solitaire.hintReveal);
  };

  // Card dimensions (responsive)
  const cardW = 'w-11 sm:w-13';
  const cardH = 'h-16 sm:h-20';

  return (
    <div className="space-y-3 select-none">
      {/* Message */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2.5 rounded-2xl text-center">
        <p className="font-bold text-xs text-emerald-900 dark:text-emerald-200">{message}</p>
      </div>

      {/* Top bar: Stock | Waste | Foundations */}
      <div className="flex items-center justify-between gap-1 p-2 bg-emerald-900 rounded-2xl border-2 border-emerald-950">
        {/* Stock */}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={handleStockClick}
            className={`${cardW} ${cardH} rounded-lg bg-blue-700 border-2 border-blue-400 flex items-center justify-center text-white font-black text-xs shadow-md active:scale-95`}
          >
            {stock.length > 0 ? (
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-base">🂠</span>
                <span className="text-[10px]">{stock.length}</span>
              </span>
            ) : '↺'}
          </button>

          {/* Waste */}
          <button
            type="button"
            onClick={handleWasteClick}
            className={`${cardW} ${cardH} rounded-lg border-2 shadow-md transition-all ${
              waste.length > 0 ? 'bg-white border-amber-400' : 'bg-emerald-950/40 border-dashed border-emerald-700/50'
            } ${selectedCard?.from === 'waste' ? 'ring-3 ring-amber-300 scale-105' : ''}`}
          >
            {waste.length > 0 && (
              <CardFace card={waste[waste.length - 1]} />
            )}
          </button>
        </div>

        {/* Foundations */}
        <div className="flex gap-1">
          {foundations.map((pile, fIdx) => {
            const top = pile.length > 0 ? pile[pile.length - 1] : null;
            return (
              <button
                key={fIdx}
                type="button"
                onClick={() => handleFoundationClick(fIdx)}
                className={`${cardW} ${cardH} rounded-lg border-2 shadow-sm flex flex-col items-center justify-center ${
                  top ? 'bg-white border-stone-300' : 'bg-emerald-950/40 border-dashed border-emerald-700/50'
                }`}
              >
                {top ? (
                  <CardFace card={top} />
                ) : (
                  <span className="text-emerald-500/50 text-xs font-bold">A</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* FreeCell — free cells row */}
      {variant === 'freecell' && (
        <div className="flex gap-2 justify-center p-2 bg-emerald-900/80 rounded-2xl border-2 border-emerald-900">
          {freeCells.map((cell, idx) => (
            <div
              key={idx}
              className={`${cardW} ${cardH} rounded-lg border-2 ${
                cell ? 'bg-white border-stone-300' : 'bg-emerald-950/40 border-dashed border-emerald-700/50'
              } flex items-center justify-center`}
            >
              {cell && <CardFace card={cell} />}
            </div>
          ))}
        </div>
      )}

      {/* Tableau */}
      <div className={`grid gap-1 bg-emerald-950/80 p-2 rounded-2xl border-2 border-emerald-900 ${variant === 'freecell' ? 'grid-cols-8' : 'grid-cols-7'}`}>
        {tableau.map((col, colIdx) => (
          <div
            key={colIdx}
            onClick={() => handleTableauClick(colIdx)}
            className="flex flex-col items-center min-h-[180px] cursor-pointer rounded-xl hover:bg-emerald-900/30 transition-colors p-0.5"
          >
            {col.length === 0 ? (
              <div className={`${cardW} h-14 rounded-lg border-2 border-dashed border-emerald-700/50 flex items-center justify-center text-emerald-600 text-xs font-bold`}>
                {variant === 'spider' ? '—' : 'K'}
              </div>
            ) : (
              col.map((card, cardIdx) => {
                const isTopCard = cardIdx === col.length - 1;
                const isSelected = selectedCard?.from === 'tableau'
                  && selectedCard.colIdx === colIdx
                  && selectedCard.cardIdx === cardIdx;

                return (
                  <div
                    key={card.id}
                    className={`
                      ${cardW} rounded-lg border-2 shadow-sm transition-all shrink-0
                      ${card.isFaceUp ? 'bg-white border-stone-200' : ''}
                      ${isSelected ? 'ring-3 ring-amber-400 border-amber-400 z-10' : ''}
                      ${cardIdx > 0 ? '-mt-10 sm:-mt-12' : ''}
                      ${isTopCard ? 'h-16 sm:h-20' : 'h-10 sm:h-12'}
                    `}
                  >
                    {card.isFaceUp ? (
                      <CardFace card={card} small={!isTopCard} />
                    ) : (
                      <CardBack small={!isTopCard} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <Button type="button" onClick={handleHint} variant="outline"
          className="flex-1 h-11 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-1.5">
          <Lightbulb className="h-4 w-4" /> {tGame.hint}
        </Button>
        <Button type="button" onClick={initGame} variant="outline"
          className="flex-1 h-11 border-stone-300 font-bold text-sm rounded-xl gap-1.5">
          <RotateCcw className="h-4 w-4" /> {tGame.restart}
        </Button>
      </div>

      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3">
          <div className="text-4xl">👑</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">{tGame.solitaire.winTitle}</h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{tGame.solitaire.winDesc}</p>
          <div className="flex gap-2 pt-2">
            <Button type="button" onClick={initGame} variant="outline" className="flex-1 h-12 rounded-xl font-bold">{tGame.playAgain}</Button>
            {onNextLevel && (
              <Button type="button" onClick={onNextLevel} className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold">
                {tGame.nextLevel}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
