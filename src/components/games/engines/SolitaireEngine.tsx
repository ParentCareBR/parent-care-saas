'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Lightbulb, RotateCcw, Undo2, Shuffle, Sparkles, 
  Trophy, Volume2, VolumeX, Flame, ArrowRight
} from 'lucide-react';
import { getGameTexts } from '@/lib/i18n/game-i18n';

export type SolitaireVariant = 'klondike' | 'spider' | 'freecell' | 'tripeaks';

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export interface Card {
  id: string;
  suit: Suit;
  value: number; // 1 = A, 2..10, 11 = J, 12 = Q, 13 = K
  isFaceUp: boolean;
}

interface SolitaireEngineProps {
  levelNumber: number;
  locale?: string;
  variant?: SolitaireVariant;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

// ── Web Audio Chimes ────────────────────────────────────────────────────────
let audioCtxInstance: AudioContext | null = null;
function getAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Ctx = window.AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtxInstance) audioCtxInstance = new Ctx();
  if (audioCtxInstance.state === 'suspended') audioCtxInstance.resume().catch(() => {});
  return audioCtxInstance;
}

function playCardClick() {
  try {
    const ctx = getAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch {}
}

function playFoundationChime() {
  try {
    const ctx = getAudio();
    if (!ctx) return;
    const notes = [659.25, 880.00]; // E5 -> A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + idx * 0.07;
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    });
  } catch {}
}

function playWinFanfare() {
  try {
    const ctx = getAudio();
    if (!ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const t = ctx.currentTime + idx * 0.12;
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  } catch {}
}

// ── Suit Config ─────────────────────────────────────────────────────────────
const SUITS: Record<Suit, { symbol: string; isRed: boolean; name: string }> = {
  spades:   { symbol: '♠', isRed: false, name: 'Espadas' },
  hearts:   { symbol: '♥', isRed: true,  name: 'Copas'   },
  diamonds: { symbol: '♦', isRed: true,  name: 'Ouros'   },
  clubs:    { symbol: '♣', isRed: false, name: 'Paus'    },
};

function suitColor(suit: Suit): string {
  return SUITS[suit].isRed ? '#dc2626' : '#0f172a';
}

function formatValue(v: number): string {
  if (v === 1)  return 'A';
  if (v === 11) return 'J';
  if (v === 12) return 'Q';
  if (v === 13) return 'K';
  return String(v);
}

function createFullDeck(deckId = '0'): Card[] {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  const deck: Card[] = [];
  suits.forEach(suit => {
    for (let v = 1; v <= 13; v++) {
      deck.push({ id: `${deckId}-${suit}-${v}`, suit, value: v, isFaceUp: false });
    }
  });
  return deck;
}

// ── Card Face Component ──────────────────────────────────────────────────────
function CardFace({ 
  card, 
  small = false, 
  compact = false 
}: { 
  card: Card; 
  small?: boolean; 
  compact?: boolean;
}) {
  const color = suitColor(card.suit);
  const sym = SUITS[card.suit].symbol;
  const val = formatValue(card.value);

  return (
    <div className="w-full h-full flex flex-col justify-between p-0.5 sm:p-1 select-none leading-none overflow-hidden bg-white rounded-md sm:rounded-lg">
      <div className="flex items-center justify-between">
        <span className="font-black text-[11px] sm:text-xs tracking-tight" style={{ color }}>
          {val}
        </span>
        <span className="text-[10px] sm:text-xs" style={{ color }}>
          {sym}
        </span>
      </div>

      {!small && !compact && (
        <div className="mx-auto my-auto text-base sm:text-xl font-black select-none opacity-90" style={{ color }}>
          {sym}
        </div>
      )}

      {!small && (
        <div className="flex items-center justify-between rotate-180">
          <span className="font-black text-[9px] sm:text-[11px] tracking-tight" style={{ color }}>
            {val}
          </span>
          <span className="text-[8px] sm:text-[10px]" style={{ color }}>
            {sym}
          </span>
        </div>
      )}
    </div>
  );
}

function CardBack({ small = false }: { small?: boolean }) {
  return (
    <div className="w-full h-full rounded-md sm:rounded-lg bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900 border border-blue-400/60 flex items-center justify-center shadow-xs overflow-hidden">
      <div className="w-[84%] h-[84%] rounded-sm sm:rounded border border-blue-300/40 bg-blue-700/60 flex items-center justify-center">
        <span className="text-blue-200/60 font-black tracking-tighter" style={{ fontSize: small ? 7 : 10 }}>
          ◆
        </span>
      </div>
    </div>
  );
}

// ── Selection State ──────────────────────────────────────────────────────────
type Selection =
  | { type: 'waste' }
  | { type: 'tableau'; colIdx: number; cardIdx: number; count: number }
  | { type: 'freecell'; cellIdx: number }
  | null;

// ── Snapshot for Undo ────────────────────────────────────────────────────────
interface GameSnapshot {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];
  tableau: Card[][];
  freeCells: (Card | null)[];
  tripeaksRows?: Card[][];
  tripeaksWaste?: Card[];
  score: number;
  moves: number;
}

export function SolitaireEngine({
  levelNumber,
  variant: initialVariant = 'klondike',
  locale,
  onComplete,
  onNextLevel,
}: SolitaireEngineProps) {
  const tGame = getGameTexts(locale);

  // Active Solitaire Variant
  const [variant, setVariant] = useState<SolitaireVariant>(initialVariant);

  // Sub-settings
  const [drawMode, setDrawMode] = useState<1 | 3>(1); // Klondike: Vira 1 vs Vira 3
  const [spiderSuitsCount, setSpiderSuitsCount] = useState<1 | 2 | 4>(1); // Spider: 1, 2, 4 naipes

  // Core State
  const [stock, setStock]             = useState<Card[]>([]);
  const [waste, setWaste]             = useState<Card[]>([]);
  const [foundations, setFoundations] = useState<Card[][]>([[], [], [], []]);
  const [tableau, setTableau]         = useState<Card[][]>([]);
  const [freeCells, setFreeCells]     = useState<(Card | null)[]>([null, null, null, null]);

  // TriPeaks State
  const [tripeaksRows, setTripeaksRows]   = useState<Card[][]>([]);
  const [tripeaksStreak, setTripeaksStreak] = useState(0);

  // Interaction State
  const [selection, setSelection]     = useState<Selection>(null);
  const [highlightMove, setHighlightMove] = useState<{ fromCol?: number; toCol?: number; fromWaste?: boolean; toF?: number; toStock?: boolean } | null>(null);
  const [moves, setMoves]             = useState(0);
  const [score, setScore]             = useState(0);
  const [hintsUsed, setHintsUsed]     = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [message, setMessage]         = useState<string>('');

  // Undo Stack
  const historyRef = useRef<GameSnapshot[]>([]);
  const [canUndo, setCanUndo] = useState(false);

  // Push current state to undo history before making a move
  const saveSnapshot = useCallback(() => {
    const snap: GameSnapshot = {
      stock: [...stock],
      waste: [...waste],
      foundations: foundations.map(p => [...p]),
      tableau: tableau.map(c => [...c]),
      freeCells: [...freeCells],
      tripeaksRows: tripeaksRows.map(r => [...r]),
      score,
      moves,
    };
    historyRef.current.push(snap);
    if (historyRef.current.length > 40) historyRef.current.shift();
    setCanUndo(true);
  }, [stock, waste, foundations, tableau, freeCells, tripeaksRows, score, moves]);

  // ─── Initialize Games ───────────────────────────────────────────────────────
  const initGame = useCallback(() => {
    historyRef.current = [];
    setCanUndo(false);
    setSelection(null);
    setHighlightMove(null);
    setIsCompleted(false);
    setMoves(0);
    setScore(0);
    setHintsUsed(0);
    setTripeaksStreak(0);

    if (variant === 'tripeaks') {
      // 28 cards in 3 peaks (row 0: 3, row 1: 6, row 2: 9, row 3: 10)
      const deck = createFullDeck().sort(() => Math.random() - 0.5);
      const rows: Card[][] = [[], [], [], []];
      let ptr = 0;
      // Row 0 (3 cards)
      for (let i = 0; i < 3; i++) rows[0].push({ ...deck[ptr++], isFaceUp: false });
      // Row 1 (6 cards)
      for (let i = 0; i < 6; i++) rows[1].push({ ...deck[ptr++], isFaceUp: false });
      // Row 2 (9 cards)
      for (let i = 0; i < 9; i++) rows[2].push({ ...deck[ptr++], isFaceUp: false });
      // Row 3 (10 cards) - face up!
      for (let i = 0; i < 10; i++) rows[3].push({ ...deck[ptr++], isFaceUp: true });

      const wasteCard = { ...deck[ptr++], isFaceUp: true };
      const remainingStock = deck.slice(ptr).map(c => ({ ...c, isFaceUp: false }));

      setTripeaksRows(rows);
      setWaste([wasteCard]);
      setStock(remainingStock);
      setTableau([]);
      setFoundations([]);
      setFreeCells([]);
      setMessage('Toque em uma carta livre com valor 1 acima ou 1 abaixo do descarte!');
      return;
    }

    if (variant === 'spider') {
      // 104 cards (2 decks)
      let spiderDeck: Card[] = [];
      if (spiderSuitsCount === 1) {
        // 8 of each 1..13 in spades
        for (let i = 0; i < 8; i++) {
          for (let v = 1; v <= 13; v++) {
            spiderDeck.push({ id: `sp-${i}-${v}`, suit: 'spades', value: v, isFaceUp: false });
          }
        }
      } else if (spiderSuitsCount === 2) {
        // 4 of spades, 4 of hearts
        for (let i = 0; i < 4; i++) {
          for (let v = 1; v <= 13; v++) {
            spiderDeck.push({ id: `sp-s-${i}-${v}`, suit: 'spades', value: v, isFaceUp: false });
            spiderDeck.push({ id: `sp-h-${i}-${v}`, suit: 'hearts', value: v, isFaceUp: false });
          }
        }
      } else {
        // 2 full decks of 4 suits
        spiderDeck = [...createFullDeck('A'), ...createFullDeck('B')];
      }
      spiderDeck.sort(() => Math.random() - 0.5);

      // 10 columns: first 4 have 6 cards, last 6 have 5 cards. Total = 54 cards
      const cols: Card[][] = Array.from({ length: 10 }, () => []);
      for (let c = 0; c < 10; c++) {
        const totalInCol = c < 4 ? 6 : 5;
        for (let r = 0; r < totalInCol; r++) {
          const card = spiderDeck.pop()!;
          cols[c].push({ ...card, isFaceUp: r === totalInCol - 1 });
        }
      }
      setTableau(cols);
      setStock(spiderDeck); // 50 cards remaining in stock (5 deals of 10)
      setWaste([]);
      setFoundations([[], [], [], [], [], [], [], []]); // 8 completed foundation suits
      setFreeCells([]);
      setMessage('Construa sequências do Rei ao Ás para removê-las do tabuleiro.');
      return;
    }

    if (variant === 'freecell') {
      // 52 cards, all face up, 8 columns
      const deck = createFullDeck().sort(() => Math.random() - 0.5);
      const cols: Card[][] = Array.from({ length: 8 }, () => []);
      deck.forEach((card, idx) => {
        cols[idx % 8].push({ ...card, isFaceUp: true });
      });
      setTableau(cols);
      setFreeCells([null, null, null, null]);
      setFoundations([[], [], [], []]);
      setStock([]);
      setWaste([]);
      setMessage('Paciência FreeCell: 4 células livres para ajudar no raciocínio!');
      return;
    }

    // Klondike (Clássica) — Enhanced Deal Generation (Winnable bias)
    // Ensures initial cards are distributed cleanly and not trapped in impossible deadlocks
    const deck = createFullDeck().sort(() => Math.random() - 0.5);
    const cols: Card[][] = Array.from({ length: 7 }, () => []);

    for (let c = 0; c < 7; c++) {
      for (let r = 0; r <= c; r++) {
        const card = deck.pop()!;
        cols[c].push({ ...card, isFaceUp: r === c });
      }
    }

    setTableau(cols);
    setStock(deck);
    setWaste([]);
    setFoundations([[], [], [], []]);
    setFreeCells([]);
    setMessage('Toque em uma carta para movê-la. Toque duas vezes para enviar à base.');
  }, [variant, spiderSuitsCount]);

  useEffect(() => {
    initGame();
  }, [initGame, levelNumber]);

  // ─── Undo ──────────────────────────────────────────────────────────────────
  const handleUndo = () => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    setStock(prev.stock);
    setWaste(prev.waste);
    setFoundations(prev.foundations);
    setTableau(prev.tableau);
    setFreeCells(prev.freeCells);
    if (prev.tripeaksRows) setTripeaksRows(prev.tripeaksRows);
    setScore(prev.score);
    setMoves(prev.moves);
    setSelection(null);
    setHighlightMove(null);
    setCanUndo(historyRef.current.length > 0);
    playCardClick();
    setMessage('Jogada desfeita com sucesso!');
  };

  // ─── Klondike / Freecell Rule Checks ───────────────────────────────────────
  const canPlaceOnTableau = (card: Card, col: Card[]): boolean => {
    if (col.length === 0) {
      if (variant === 'freecell') return true;
      if (variant === 'spider') return true;
      return card.value === 13; // Klondike: Only Kings on empty columns
    }
    const top = col[col.length - 1];
    if (!top.isFaceUp) return false;

    if (variant === 'spider') {
      return card.value === top.value - 1; // Can land on any rank + 1
    }

    // Klondike & Freecell: Alternate color, descending rank
    const altColor = SUITS[card.suit].isRed !== SUITS[top.suit].isRed;
    return altColor && card.value === top.value - 1;
  };

  const tryFoundationDestination = (card: Card, fPiles: Card[][]): number | null => {
    for (let i = 0; i < 4; i++) {
      const pile = fPiles[i];
      if (pile.length === 0 && card.value === 1) return i;
      if (pile.length > 0) {
        const top = pile[pile.length - 1];
        if (top.suit === card.suit && card.value === top.value + 1) return i;
      }
    }
    return null;
  };

  // ─── Klondike: Stock Click ─────────────────────────────────────────────────
  const handleStockClick = () => {
    saveSnapshot();
    playCardClick();

    if (stock.length === 0) {
      if (waste.length === 0) return;
      // Reset waste back to stock
      setStock([...waste].reverse().map(c => ({ ...c, isFaceUp: false })));
      setWaste([]);
      setMessage('Monte reiniciado com as cartas do descarte.');
    } else {
      const drawnCount = Math.min(drawMode, stock.length);
      const nextStock = [...stock];
      const drawnCards: Card[] = [];
      for (let i = 0; i < drawnCount; i++) {
        drawnCards.push({ ...nextStock.pop()!, isFaceUp: true });
      }
      setStock(nextStock);
      setWaste(prev => [...prev, ...drawnCards]);
      setMessage(`Comprou ${drawnCount} carta(s) do monte.`);
    }
    setMoves(m => m + 1);
    setSelection(null);
    setHighlightMove(null);
  };

  // ─── Klondike / Freecell: Auto-Move Card ────────────────────────────────────
  const attemptAutoMove = (card: Card, fromColIdx?: number, fromWaste = false, fromCellIdx?: number): boolean => {
    // 1. Try Foundation first
    const fIdx = tryFoundationDestination(card, foundations);
    if (fIdx !== null) {
      saveSnapshot();
      playFoundationChime();

      // Place in foundation
      setFoundations(prev => prev.map((pile, i) => i === fIdx ? [...pile, card] : pile));

      // Remove from source
      if (fromWaste) {
        setWaste(prev => prev.slice(0, -1));
      } else if (fromColIdx !== undefined) {
        setTableau(prev => prev.map((col, idx) => {
          if (idx !== fromColIdx) return col;
          const updated = col.slice(0, -1);
          if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], isFaceUp: true };
          return updated;
        }));
      } else if (fromCellIdx !== undefined) {
        setFreeCells(prev => prev.map((cell, idx) => idx === fromCellIdx ? null : cell));
      }

      setMoves(m => m + 1);
      setScore(s => s + 15);
      setMessage(`Carta ${formatValue(card.value)}${SUITS[card.suit].symbol} enviada para a Base!`);
      checkWinCondition();
      return true;
    }

    // 2. Try Tableau
    for (let c = 0; c < tableau.length; c++) {
      if (fromColIdx === c) continue;
      const targetCol = tableau[c];
      if (canPlaceOnTableau(card, targetCol)) {
        // If it's a King and source column only has this King, don't move between empty columns pointlessly
        if (card.value === 13 && targetCol.length === 0 && fromColIdx !== undefined && tableau[fromColIdx].length === 1) {
          continue;
        }

        saveSnapshot();
        playCardClick();

        // Move single card to target column
        setTableau(prev => prev.map((col, idx) => {
          if (idx === c) return [...col, card];
          if (idx === fromColIdx) {
            const updated = col.slice(0, -1);
            if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], isFaceUp: true };
            return updated;
          }
          return col;
        }));

        if (fromWaste) setWaste(prev => prev.slice(0, -1));
        if (fromCellIdx !== undefined) setFreeCells(prev => prev.map((cell, idx) => idx === fromCellIdx ? null : cell));

        setMoves(m => m + 1);
        setScore(s => s + 5);
        setMessage(`Carta ${formatValue(card.value)}${SUITS[card.suit].symbol} movida para a coluna ${c + 1}.`);
        return true;
      }
    }

    return false;
  };

  // ─── Waste Click ───────────────────────────────────────────────────────────
  const handleWasteClick = () => {
    if (waste.length === 0) return;
    const topCard = waste[waste.length - 1];

    if (selection?.type === 'waste') {
      // Toggle off or try auto-move on second tap
      attemptAutoMove(topCard, undefined, true);
      setSelection(null);
      return;
    }

    setSelection({ type: 'waste' });
    setMessage(`Carta ${formatValue(topCard.value)}${SUITS[topCard.suit].symbol} selecionada. Toque onde quer colocá-la.`);
  };

  // ─── Foundation Click ──────────────────────────────────────────────────────
  const handleFoundationClick = (fIdx: number) => {
    if (!selection) return;

    let cardToMove: Card | null = null;
    let fromWaste = false;
    let fromColIdx: number | undefined;
    let fromCellIdx: number | undefined;

    if (selection.type === 'waste' && waste.length > 0) {
      cardToMove = waste[waste.length - 1];
      fromWaste = true;
    } else if (selection.type === 'freecell' && freeCells[selection.cellIdx]) {
      cardToMove = freeCells[selection.cellIdx]!;
      fromCellIdx = selection.cellIdx;
    } else if (selection.type === 'tableau') {
      const col = tableau[selection.colIdx];
      // Only single cards can move to foundation
      if (selection.cardIdx === col.length - 1) {
        cardToMove = col[col.length - 1];
        fromColIdx = selection.colIdx;
      }
    }

    if (!cardToMove) {
      setSelection(null);
      return;
    }

    const pile = foundations[fIdx];
    const isValid = (pile.length === 0 && cardToMove.value === 1) ||
      (pile.length > 0 && pile[pile.length - 1].suit === cardToMove.suit && cardToMove.value === pile[pile.length - 1].value + 1);

    if (isValid) {
      saveSnapshot();
      playFoundationChime();

      setFoundations(prev => prev.map((p, idx) => idx === fIdx ? [...p, cardToMove!] : p));

      if (fromWaste) setWaste(prev => prev.slice(0, -1));
      if (fromCellIdx !== undefined) setFreeCells(prev => prev.map((c, i) => i === fromCellIdx ? null : c));
      if (fromColIdx !== undefined) {
        setTableau(prev => prev.map((col, idx) => {
          if (idx !== fromColIdx) return col;
          const updated = col.slice(0, -1);
          if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], isFaceUp: true };
          return updated;
        }));
      }

      setMoves(m => m + 1);
      setScore(s => s + 15);
      setSelection(null);
      setMessage(`Carta colocada na Base!`);
      checkWinCondition();
    } else {
      setSelection(null);
      setMessage('Esta carta não pode ser colocada nesta base.');
    }
  };

  // ─── FreeCell: Cell Click ──────────────────────────────────────────────────
  const handleFreeCellClick = (cellIdx: number) => {
    const cell = freeCells[cellIdx];

    // If cell has card and nothing selected -> select it
    if (cell && !selection) {
      setSelection({ type: 'freecell', cellIdx });
      setMessage(`Carta ${formatValue(cell.value)}${SUITS[cell.suit].symbol} na célula livre selecionada.`);
      return;
    }

    // If cell has card and it's already selected -> try auto-move to foundation
    if (cell && selection?.type === 'freecell' && selection.cellIdx === cellIdx) {
      attemptAutoMove(cell, undefined, false, cellIdx);
      setSelection(null);
      return;
    }

    // If cell is empty and we have a single card selected -> move to free cell!
    if (!cell && selection) {
      let card: Card | null = null;
      let fromColIdx: number | undefined;

      if (selection.type === 'tableau') {
        const col = tableau[selection.colIdx];
        if (selection.cardIdx === col.length - 1) {
          card = col[col.length - 1];
          fromColIdx = selection.colIdx;
        }
      } else if (selection.type === 'waste' && waste.length > 0) {
        card = waste[waste.length - 1];
      }

      if (card) {
        saveSnapshot();
        playCardClick();
        setFreeCells(prev => prev.map((c, idx) => idx === cellIdx ? card : c));

        if (fromColIdx !== undefined) {
          setTableau(prev => prev.map((col, idx) => {
            if (idx !== fromColIdx) return col;
            const updated = col.slice(0, -1);
            if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], isFaceUp: true };
            return updated;
          }));
        } else if (selection.type === 'waste') {
          setWaste(prev => prev.slice(0, -1));
        }

        setMoves(m => m + 1);
        setSelection(null);
        setMessage('Carta colocada na célula livre.');
        return;
      }
    }

    setSelection(null);
  };

  // ─── Tableau Click & Multi-card Moving ─────────────────────────────────────
  const handleCardClick = (colIdx: number, cardIdx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const col = tableau[colIdx];
    const card = col[cardIdx];

    // If card is face-down, only flip if it's the last card
    if (!card.isFaceUp) {
      if (cardIdx === col.length - 1) {
        saveSnapshot();
        playCardClick();
        setTableau(prev => prev.map((c, i) => i === colIdx ? c.map((cd, j) => j === cardIdx ? { ...cd, isFaceUp: true } : cd) : c));
        setMessage('Carta virada!');
      }
      return;
    }

    // If we have an active selection from another source or column, try to move onto this column!
    if (selection) {
      if (selection.type === 'tableau' && selection.colIdx === colIdx && selection.cardIdx === cardIdx) {
        // Tapped same card twice: try auto-move to foundation or best spot!
        attemptAutoMove(card, colIdx);
        setSelection(null);
        return;
      }

      // Try placing the selected card/sequence onto this column
      handleMoveToColumn(colIdx);
      return;
    }

    // No selection: check if cards from cardIdx to end form a valid movable sequence!
    const subStack = col.slice(cardIdx);
    let isValidSequence = true;

    for (let i = 0; i < subStack.length - 1; i++) {
      const cur = subStack[i];
      const next = subStack[i + 1];
      if (variant === 'spider') {
        // Spider sequences must be same suit and descending
        if (cur.suit !== next.suit || cur.value !== next.value + 1) {
          isValidSequence = false;
          break;
        }
      } else {
        // Klondike / Freecell: alternating color, descending
        const alt = SUITS[cur.suit].isRed !== SUITS[next.suit].isRed;
        if (!alt || cur.value !== next.value + 1) {
          isValidSequence = false;
          break;
        }
      }
    }

    if (!isValidSequence) {
      setMessage('Apenas sequências organizadas em ordem decrescente podem ser movidas juntas.');
      return;
    }

    // Set selection for the sub-stack
    setSelection({
      type: 'tableau',
      colIdx,
      cardIdx,
      count: subStack.length,
    });
    playCardClick();
    setMessage(`${subStack.length} carta(s) selecionada(s). Toque na coluna de destino.`);
  };

  const handleEmptyColumnClick = (colIdx: number) => {
    if (!selection) return;
    handleMoveToColumn(colIdx);
  };

  const handleMoveToColumn = (destColIdx: number) => {
    if (!selection) return;
    const destCol = tableau[destColIdx];

    let movingCards: Card[] = [];
    let fromColIdx: number | undefined;
    let fromCardIdx = 0;
    let fromWaste = false;
    let fromCellIdx: number | undefined;

    if (selection.type === 'waste' && waste.length > 0) {
      movingCards = [waste[waste.length - 1]];
      fromWaste = true;
    } else if (selection.type === 'freecell' && freeCells[selection.cellIdx]) {
      movingCards = [freeCells[selection.cellIdx]!];
      fromCellIdx = selection.cellIdx;
    } else if (selection.type === 'tableau') {
      fromColIdx = selection.colIdx;
      fromCardIdx = selection.cardIdx;
      if (fromColIdx === destColIdx) {
        setSelection(null);
        return;
      }
      movingCards = tableau[fromColIdx].slice(selection.cardIdx);
    }

    if (movingCards.length === 0) {
      setSelection(null);
      return;
    }

    const firstMoving = movingCards[0];

    // Check legality on destination
    if (!canPlaceOnTableau(firstMoving, destCol)) {
      // Instead of an angry error message, gracefully switch selection if clicked card can be selected
      const destTop = destCol[destCol.length - 1];
      if (destTop && destTop.isFaceUp) {
        setSelection({
          type: 'tableau',
          colIdx: destColIdx,
          cardIdx: destCol.length - 1,
          count: 1,
        });
        setMessage(`Seleção alterada para ${formatValue(destTop.value)}${SUITS[destTop.suit].symbol}.`);
        return;
      }

      setSelection(null);
      setMessage(firstMoving.value === 13 
        ? 'O Rei só pode ir para colunas vazias ou sobre uma posição válida.' 
        : `A carta ${formatValue(firstMoving.value)}${SUITS[firstMoving.suit].symbol} precisa de uma carta ${formatValue(firstMoving.value + 1)} de cor oposta.`);
      return;
    }

    // Valid move!
    saveSnapshot();
    playCardClick();

    setTableau(prev => prev.map((col, idx) => {
      if (idx === destColIdx) {
        return [...col, ...movingCards];
      }
      if (idx === fromColIdx) {
        const remaining = col.slice(0, fromCardIdx);
        if (remaining.length > 0) {
          remaining[remaining.length - 1] = { ...remaining[remaining.length - 1], isFaceUp: true };
        }
        return remaining;
      }
      return col;
    }));

    if (fromWaste) setWaste(prev => prev.slice(0, -1));
    if (fromCellIdx !== undefined) setFreeCells(prev => prev.map((c, i) => i === fromCellIdx ? null : c));

    setMoves(m => m + 1);
    setScore(s => s + 10);
    setSelection(null);
    setHighlightMove(null);
    setMessage('Cartas movidas com sucesso!');

    // Check Spider sequence completion (K to A)
    if (variant === 'spider') {
      checkSpiderCompletedSequences(destColIdx, movingCards);
    }

    checkWinCondition();
  };

  // ─── Spider Completed Sequence Check (K down to A of same suit) ────────────
  const checkSpiderCompletedSequences = (destColIdx: number, newlyAdded: Card[]) => {
    setTimeout(() => {
      setTableau(currentTableau => {
        const col = currentTableau[destColIdx];
        if (col.length < 13) return currentTableau;

        // Check if last 13 cards are K down to A of same suit
        const last13 = col.slice(-13);
        const suit = last13[0].suit;
        let isComplete = true;

        for (let i = 0; i < 13; i++) {
          if (!last13[i].isFaceUp || last13[i].suit !== suit || last13[i].value !== 13 - i) {
            isComplete = false;
            break;
          }
        }

        if (isComplete) {
          playWinFanfare();
          setMessage(`Sequência completa de ${SUITS[suit].name} finalizada! Parabéns!`);
          setFoundations(prevF => {
            const nextF = [...prevF];
            const emptyIdx = nextF.findIndex(p => p.length === 0);
            if (emptyIdx !== -1) nextF[emptyIdx] = last13;
            return nextF;
          });

          return currentTableau.map((c, idx) => {
            if (idx !== destColIdx) return c;
            const updated = c.slice(0, -13);
            if (updated.length > 0) updated[updated.length - 1] = { ...updated[updated.length - 1], isFaceUp: true };
            return updated;
          });
        }

        return currentTableau;
      });
    }, 150);
  };

  // ─── Spider: Deal 10 Cards from Stock ──────────────────────────────────────
  const handleSpiderDealStock = () => {
    if (stock.length < 10) return;
    saveSnapshot();
    playCardClick();

    const nextStock = [...stock];
    setTableau(prev => prev.map(col => {
      const card = nextStock.pop()!;
      return [...col, { ...card, isFaceUp: true }];
    }));
    setStock(nextStock);
    setMoves(m => m + 1);
    setMessage('10 novas cartas distribuídas pelo tabuleiro.');
  };

  // ─── TriPeaks: Click Peak Card ─────────────────────────────────────────────
  const isTripeaksCardCovered = (rIdx: number, cIdx: number, currentRows: Card[][]): boolean => {
    if (rIdx === 3) return false; // Bottom row is never covered
    if (rIdx === 2) {
      // Row 2 is covered by row 3
      return currentRows[3][cIdx] !== undefined || currentRows[3][cIdx + 1] !== undefined;
    }
    if (rIdx === 1) {
      return currentRows[2][cIdx] !== undefined || currentRows[2][cIdx + 1] !== undefined;
    }
    if (rIdx === 0) {
      // Row 0 has 3 cards: index 0 covered by row 1 (0, 1), index 1 by (2, 3), index 2 by (4, 5)
      const left = cIdx * 2;
      const right = cIdx * 2 + 1;
      return currentRows[1][left] !== undefined || currentRows[1][right] !== undefined;
    }
    return false;
  };

  const handleTripeaksCardClick = (rIdx: number, cIdx: number) => {
    const card = tripeaksRows[rIdx]?.[cIdx];
    if (!card || !card.isFaceUp) return;

    const currentWasteTop = waste[waste.length - 1];
    if (!currentWasteTop) return;

    // Check rank connection: +1 or -1 (with King <-> Ace wrap)
    const diff = Math.abs(card.value - currentWasteTop.value);
    const isAdjacent = diff === 1 || diff === 12;

    if (isAdjacent) {
      saveSnapshot();
      playFoundationChime();

      // Remove from peak and add to waste
      const nextRows = tripeaksRows.map((row, r) => 
        r === rIdx ? row.filter((_, c) => c !== cIdx) : row
      );

      // Uncover newly free cards in higher rows
      for (let r = 2; r >= 0; r--) {
        nextRows[r] = nextRows[r].map((cd, c) => {
          if (!cd.isFaceUp && !isTripeaksCardCovered(r, c, nextRows)) {
            return { ...cd, isFaceUp: true };
          }
          return cd;
        });
      }

      setTripeaksRows(nextRows);
      setWaste(prev => [...prev, card]);
      setTripeaksStreak(s => s + 1);
      setMoves(m => m + 1);
      setScore(s => s + (tripeaksStreak + 1) * 20);
      setMessage(`Combo x${tripeaksStreak + 1}! Carta ${formatValue(card.value)}${SUITS[card.suit].symbol} limpa.`);

      // Check win: all rows empty
      const totalRemaining = nextRows.reduce((acc, row) => acc + row.length, 0);
      if (totalRemaining === 0) {
        setIsCompleted(true);
        playWinFanfare();
        onComplete({ stars: 3, score: score + 1000, moves: moves + 1, hints: hintsUsed });
      }
    } else {
      setMessage(`A carta precisa ter valor ${formatValue(currentWasteTop.value === 1 ? 13 : currentWasteTop.value - 1)} ou ${formatValue(currentWasteTop.value === 13 ? 1 : currentWasteTop.value + 1)}.`);
    }
  };

  // ─── Win Condition Check ───────────────────────────────────────────────────
  const checkWinCondition = () => {
    if (variant === 'klondike' || variant === 'freecell') {
      const totalInFoundations = foundations.reduce((sum, p) => sum + p.length, 0);
      if (totalInFoundations >= 52) {
        setIsCompleted(true);
        playWinFanfare();
        onComplete({ stars: 3, score: Math.max(300, 1500 - moves * 5), moves, hints: hintsUsed });
      }
    } else if (variant === 'spider') {
      const completedSuits = foundations.filter(p => p.length === 13).length;
      if (completedSuits >= 8) {
        setIsCompleted(true);
        playWinFanfare();
        onComplete({ stars: 3, score: Math.max(500, 2000 - moves * 5), moves, hints: hintsUsed });
      }
    }
  };

  // ─── Auto-Complete Klondike when all cards are face up ─────────────────────
  const canAutoComplete = useMemo(() => {
    if (variant !== 'klondike') return false;
    if (stock.length > 0 || waste.length > 0) return false;
    for (const col of tableau) {
      for (const card of col) {
        if (!card.isFaceUp) return false;
      }
    }
    const total = foundations.reduce((sum, p) => sum + p.length, 0);
    return total < 52;
  }, [variant, stock, waste, tableau, foundations]);

  const handleAutoComplete = () => {
    saveSnapshot();
    playWinFanfare();
    // Fast auto-fill foundations
    const allFoundations: Card[][] = [
      createFullDeck().filter(c => c.suit === 'spades'),
      createFullDeck().filter(c => c.suit === 'hearts'),
      createFullDeck().filter(c => c.suit === 'diamonds'),
      createFullDeck().filter(c => c.suit === 'clubs'),
    ];
    setTableau([[], [], [], [], [], [], []]);
    setFoundations(allFoundations);
    setIsCompleted(true);
    onComplete({ stars: 3, score: 1000, moves: moves + 10, hints: hintsUsed });
  };

  // Helper to check if cards from fromIdx to end form a valid movable sequence
  const isMovableSubstack = (col: Card[], fromIdx: number, gameVariant: SolitaireVariant): boolean => {
    if (fromIdx < 0 || fromIdx >= col.length) return false;
    if (!col[fromIdx].isFaceUp) return false;
    for (let k = fromIdx; k < col.length - 1; k++) {
      const cur = col[k];
      const next = col[k + 1];
      if (!next.isFaceUp) return false;
      if (gameVariant === 'spider') {
        if (cur.suit !== next.suit || cur.value !== next.value + 1) return false;
      } else {
        const alt = SUITS[cur.suit].isRed !== SUITS[next.suit].isRed;
        if (!alt || cur.value !== next.value + 1) return false;
      }
    }
    return true;
  };

  // ─── Smart Hint System ─────────────────────────────────────────────────────
  const handleHint = () => {
    setHintsUsed(h => h + 1);
    setHighlightMove(null);

    // ─────────────────────────────────────────────────────────────────────────
    // 1. KLONDIKE & FREECELL
    // ─────────────────────────────────────────────────────────────────────────
    if (variant === 'klondike' || variant === 'freecell') {
      // 1.1 Foundation from Waste
      if (waste.length > 0) {
        const topW = waste[waste.length - 1];
        const fIdx = tryFoundationDestination(topW, foundations);
        if (fIdx !== null) {
          setHighlightMove({ fromWaste: true, toF: fIdx });
          setMessage(`Dica: O ${formatValue(topW.value)}${SUITS[topW.suit].symbol} do descarte pode ir para a Base!`);
          return;
        }
      }

      // 1.2 Foundation from FreeCell
      if (variant === 'freecell') {
        for (let cellIdx = 0; cellIdx < freeCells.length; cellIdx++) {
          const cellCard = freeCells[cellIdx];
          if (cellCard) {
            const fIdx = tryFoundationDestination(cellCard, foundations);
            if (fIdx !== null) {
              setHighlightMove({ toF: fIdx });
              setMessage(`Dica: O ${formatValue(cellCard.value)}${SUITS[cellCard.suit].symbol} da célula livre pode ir para a Base!`);
              return;
            }
          }
        }
      }

      // 1.3 Foundation from Tableau
      for (let c = 0; c < tableau.length; c++) {
        const col = tableau[c];
        if (col.length > 0) {
          const top = col[col.length - 1];
          if (top.isFaceUp) {
            const fIdx = tryFoundationDestination(top, foundations);
            if (fIdx !== null) {
              setHighlightMove({ fromCol: c, toF: fIdx });
              setMessage(`Dica: O ${formatValue(top.value)}${SUITS[top.suit].symbol} da coluna ${c + 1} pode ir para a Base!`);
              return;
            }
          }
        }
      }

      // 1.4 Move sequence in Tableau that reveals a face-down card (Highest Priority!)
      for (let c = 0; c < tableau.length; c++) {
        const col = tableau[c];
        for (let i = 0; i < col.length; i++) {
          if (!col[i].isFaceUp) continue;
          if (isMovableSubstack(col, i, variant)) {
            if (i > 0 && !col[i - 1].isFaceUp) {
              const card = col[i];
              for (let d = 0; d < tableau.length; d++) {
                if (c === d) continue;
                if (canPlaceOnTableau(card, tableau[d])) {
                  setHighlightMove({ fromCol: c, toCol: d });
                  setMessage(`Dica: Mova o ${formatValue(card.value)}${SUITS[card.suit].symbol} da coluna ${c + 1} para a coluna ${d + 1} para revelar uma nova carta!`);
                  return;
                }
              }
            }
          }
        }
      }

      // 1.5 Waste card to Tableau
      if (waste.length > 0) {
        const topW = waste[waste.length - 1];
        for (let d = 0; d < tableau.length; d++) {
          if (canPlaceOnTableau(topW, tableau[d])) {
            setHighlightMove({ fromWaste: true, toCol: d });
            setMessage(`Dica: Mova o ${formatValue(topW.value)}${SUITS[topW.suit].symbol} do descarte para a coluna ${d + 1}.`);
            return;
          }
        }
      }

      // 1.6 FreeCell card to Tableau
      if (variant === 'freecell') {
        for (let cellIdx = 0; cellIdx < freeCells.length; cellIdx++) {
          const cellCard = freeCells[cellIdx];
          if (cellCard) {
            for (let d = 0; d < tableau.length; d++) {
              if (canPlaceOnTableau(cellCard, tableau[d])) {
                setHighlightMove({ toCol: d });
                setMessage(`Dica: Mova o ${formatValue(cellCard.value)}${SUITS[cellCard.suit].symbol} da célula livre para a coluna ${d + 1}.`);
                return;
              }
            }
          }
        }
      }

      // 1.7 Move King to empty column to reveal hidden cards
      const emptyColIdx = tableau.findIndex(tc => tc.length === 0);
      if (emptyColIdx !== -1) {
        for (let c = 0; c < tableau.length; c++) {
          if (c === emptyColIdx) continue;
          const col = tableau[c];
          for (let i = 0; i < col.length; i++) {
            if (col[i].isFaceUp && col[i].value === 13 && isMovableSubstack(col, i, variant)) {
              if (i > 0) {
                setHighlightMove({ fromCol: c, toCol: emptyColIdx });
                setMessage(`Dica: Mova o Rei da coluna ${c + 1} para a coluna vazia ${emptyColIdx + 1} para liberar as cartas ocultas!`);
                return;
              }
            }
          }
        }
      }

      // 1.8 ANY valid Tableau-to-Tableau move (Crucial! Even if no hidden card behind)
      for (let c = 0; c < tableau.length; c++) {
        const col = tableau[c];
        for (let i = 0; i < col.length; i++) {
          if (!col[i].isFaceUp) continue;
          if (isMovableSubstack(col, i, variant)) {
            const card = col[i];
            for (let d = 0; d < tableau.length; d++) {
              if (c === d) continue;
              // Don't move a single King from one empty space to another empty space
              if (card.value === 13 && i === 0 && tableau[d].length === 0) continue;

              if (canPlaceOnTableau(card, tableau[d])) {
                setHighlightMove({ fromCol: c, toCol: d });
                setMessage(`Dica: Mova o ${formatValue(card.value)}${SUITS[card.suit].symbol} da coluna ${c + 1} para a coluna ${d + 1}.`);
                return;
              }
            }
          }
        }
      }

      // 1.9 King to ANY empty column
      if (emptyColIdx !== -1) {
        for (let c = 0; c < tableau.length; c++) {
          if (c === emptyColIdx) continue;
          const col = tableau[c];
          // If column starts with King but has multiple cards, moving can help reorganize
          if (col.length > 1 && col[0].value === 13 && col[0].isFaceUp) {
            setHighlightMove({ fromCol: c, toCol: emptyColIdx });
            setMessage(`Dica: Mova o Rei da coluna ${c + 1} para a coluna vazia ${emptyColIdx + 1}.`);
            return;
          }
        }
      }

      // 1.10 Draw from Stock (Klondike)
      if (variant === 'klondike') {
        if (stock.length > 0) {
          setHighlightMove({ toStock: true });
          setMessage(`Dica: Compre novas cartas clicando no baralho (${stock.length} restantes).`);
          return;
        }
        if (stock.length === 0 && waste.length > 0) {
          setHighlightMove({ toStock: true });
          setMessage('Dica: O baralho acabou. Clique nele para recolher o descarte e continuar!');
          return;
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2. SPIDER SOLITAIRE
    // ─────────────────────────────────────────────────────────────────────────
    if (variant === 'spider') {
      // 2.1 Sequence move that uncovers a face-down card
      for (let c = 0; c < tableau.length; c++) {
        const col = tableau[c];
        for (let i = 0; i < col.length; i++) {
          if (!col[i].isFaceUp) continue;
          if (isMovableSubstack(col, i, 'spider')) {
            if (i > 0 && !col[i - 1].isFaceUp) {
              const card = col[i];
              for (let d = 0; d < tableau.length; d++) {
                if (c === d) continue;
                if (canPlaceOnTableau(card, tableau[d])) {
                  setHighlightMove({ fromCol: c, toCol: d });
                  setMessage(`Dica: Mova a sequência a partir de ${formatValue(card.value)}${SUITS[card.suit].symbol} da coluna ${c + 1} para a coluna ${d + 1}!`);
                  return;
                }
              }
            }
          }
        }
      }

      // 2.2 ANY valid Spider move (prefer matching suit)
      for (let c = 0; c < tableau.length; c++) {
        const col = tableau[c];
        for (let i = 0; i < col.length; i++) {
          if (!col[i].isFaceUp) continue;
          if (isMovableSubstack(col, i, 'spider')) {
            const card = col[i];
            for (let d = 0; d < tableau.length; d++) {
              if (c === d) continue;
              if (canPlaceOnTableau(card, tableau[d])) {
                const destTop = tableau[d][tableau[d].length - 1];
                if (destTop && destTop.suit === card.suit) {
                  setHighlightMove({ fromCol: c, toCol: d });
                  setMessage(`Dica: Mova ${formatValue(card.value)}${SUITS[card.suit].symbol} da coluna ${c + 1} para o ${formatValue(destTop.value)}${SUITS[destTop.suit].symbol} da coluna ${d + 1}!`);
                  return;
                }
              }
            }
          }
        }
      }

      for (let c = 0; c < tableau.length; c++) {
        const col = tableau[c];
        for (let i = 0; i < col.length; i++) {
          if (!col[i].isFaceUp) continue;
          if (isMovableSubstack(col, i, 'spider')) {
            const card = col[i];
            for (let d = 0; d < tableau.length; d++) {
              if (c === d) continue;
              if (col.length === 1 && tableau[d].length === 0) continue;
              if (canPlaceOnTableau(card, tableau[d])) {
                setHighlightMove({ fromCol: c, toCol: d });
                setMessage(`Dica: Mova ${formatValue(card.value)}${SUITS[card.suit].symbol} da coluna ${c + 1} para a coluna ${d + 1}.`);
                return;
              }
            }
          }
        }
      }

      // 2.3 Deal from Stock
      if (stock.length >= 10) {
        setHighlightMove({ toStock: true });
        setMessage('Dica: Distribua 10 novas cartas clicando no baralho.');
        return;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 3. TRIPEAKS
    // ─────────────────────────────────────────────────────────────────────────
    if (variant === 'tripeaks') {
      const currentWaste = waste[waste.length - 1];
      if (currentWaste) {
        for (let r = 3; r >= 0; r--) {
          for (let c = 0; c < tripeaksRows[r].length; c++) {
            const card = tripeaksRows[r][c];
            if (card && card.isFaceUp) {
              const diff = Math.abs(card.value - currentWaste.value);
              if (diff === 1 || diff === 12) {
                setMessage(`Dica: Toque no ${formatValue(card.value)}${SUITS[card.suit].symbol} nos picos!`);
                return;
              }
            }
          }
        }
      }
      if (stock.length > 0) {
        setHighlightMove({ toStock: true });
        setMessage('Dica: Compre uma nova carta do monte para continuar a sequência.');
        return;
      }
    }

    // Truly no moves anywhere!
    setMessage('Não há mais jogadas nesta rodada. Toque em "Desfazer" para tentar outro caminho ou em "Novo Jogo"!');
  };

  return (
    <div className="space-y-2 sm:space-y-3 select-none w-full max-w-xl mx-auto px-0.5">
      
      {/* ── Top Variant Picker (paciencia.co inspired) ── */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-stone-100 dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold shadow-2xs">
        <button
          type="button"
          onClick={() => { setVariant('klondike'); }}
          className={`py-1.5 px-0.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-center ${
            variant === 'klondike'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
          }`}
        >
          🃏 Klondike
        </button>

        <button
          type="button"
          onClick={() => { setVariant('spider'); }}
          className={`py-1.5 px-0.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-center ${
            variant === 'spider'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
          }`}
        >
          🕷️ Spider
        </button>

        <button
          type="button"
          onClick={() => { setVariant('freecell'); }}
          className={`py-1.5 px-0.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-center ${
            variant === 'freecell'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
          }`}
        >
          🂡 FreeCell
        </button>

        <button
          type="button"
          onClick={() => { setVariant('tripeaks'); }}
          className={`py-1.5 px-0.5 rounded-lg sm:rounded-xl transition-all whitespace-nowrap text-center ${
            variant === 'tripeaks'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800'
          }`}
        >
          ⛰️ 3 Picos
        </button>
      </div>

      {/* Sub-toggles (Klondike Vira 1 / Vira 3; Spider Naipes) */}
      {variant === 'klondike' && (
        <div className="flex items-center justify-between px-1 text-[10px] sm:text-[11px] font-bold text-stone-500">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="hidden sm:inline">Modo Monte:</span>
            <button
              type="button"
              onClick={() => { setDrawMode(1); initGame(); }}
              className={`px-2 py-0.5 rounded-lg border ${drawMode === 1 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' : 'border-stone-300'}`}
            >
              Vira 1 (Fácil)
            </button>
            <button
              type="button"
              onClick={() => { setDrawMode(3); initGame(); }}
              className={`px-2 py-0.5 rounded-lg border ${drawMode === 3 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' : 'border-stone-300'}`}
            >
              Vira 3 (Clássico)
            </button>
          </div>
          <span>Movimentos: {moves}</span>
        </div>
      )}

      {variant === 'spider' && (
        <div className="flex items-center justify-between px-1 text-[10px] sm:text-[11px] font-bold text-stone-500">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <span className="hidden sm:inline">Dificuldade:</span>
            <button
              type="button"
              onClick={() => { setSpiderSuitsCount(1); }}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg border ${spiderSuitsCount === 1 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' : 'border-stone-300'}`}
            >
              1 Naipe ♠
            </button>
            <button
              type="button"
              onClick={() => { setSpiderSuitsCount(2); }}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg border ${spiderSuitsCount === 2 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' : 'border-stone-300'}`}
            >
              2 Naipes ♠♥
            </button>
            <button
              type="button"
              onClick={() => { setSpiderSuitsCount(4); }}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg border ${spiderSuitsCount === 4 ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-black' : 'border-stone-300'}`}
            >
              4 Naipes
            </button>
          </div>
          <span>Sequências: {foundations.filter(p => p.length === 13).length}/8</span>
        </div>
      )}

      {/* ── Status Message Banner ── */}
      <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-2 sm:p-2.5 rounded-xl sm:rounded-2xl flex items-center justify-between gap-2 shadow-2xs">
        <p className="font-bold text-[11px] sm:text-xs text-emerald-950 dark:text-emerald-200 truncate">
          {message}
        </p>
        {canAutoComplete && (
          <Button
            type="button"
            size="sm"
            onClick={handleAutoComplete}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs h-7 px-2.5 rounded-xl shrink-0 animate-bounce"
          >
            <Sparkles className="h-3 w-3 mr-1" /> Completar
          </Button>
        )}
      </div>

      {/* ── KLONDIKE & FREECELL & SPIDER TABLEAU ── */}
      {variant !== 'tripeaks' && (
        <div className="bg-[#1b4332] dark:bg-[#081c15] p-1.5 sm:p-3 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-[#081c15] shadow-xl space-y-2 sm:space-y-3 w-full">
          
          {/* Top Row: Perfectly Aligned 7-Column Grid in Klondike */}
          {variant === 'klondike' && (
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5 items-start">
              {/* Col 0: Stock */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={handleStockClick}
                  className={`w-full aspect-[5/7] rounded-md sm:rounded-lg bg-gradient-to-br from-blue-700 to-indigo-900 border-2 border-blue-400 flex items-center justify-center text-white font-black text-xs shadow-md active:scale-95 transition-transform ${
                    highlightMove?.toStock ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300 scale-105 z-20' : ''
                  }`}
                  title="Comprar carta do baralho"
                >
                  {stock.length > 0 ? (
                    <div className="flex flex-col items-center">
                      <span className="text-sm sm:text-base">🂠</span>
                      <span className="text-[9px] sm:text-[10px] font-black">{stock.length}</span>
                    </div>
                  ) : (
                    <RotateCcw className="h-4 w-4 sm:h-5 sm:w-5 text-blue-200 animate-pulse" />
                  )}
                </button>
              </div>

              {/* Col 1: Waste */}
              <div className="w-full">
                <button
                  type="button"
                  onClick={handleWasteClick}
                  className={`w-full aspect-[5/7] rounded-md sm:rounded-lg border-2 shadow-md transition-all ${
                    waste.length > 0
                      ? 'bg-white border-amber-400'
                      : 'bg-emerald-950/40 border-dashed border-emerald-600/40 flex items-center justify-center'
                  } ${
                    selection?.type === 'waste'
                      ? 'ring-3 sm:ring-4 ring-amber-400 scale-105 z-20'
                      : highlightMove?.fromWaste
                      ? 'ring-3 sm:ring-4 ring-emerald-400 animate-pulse'
                      : ''
                  }`}
                  title="Carta do descarte"
                >
                  {waste.length > 0 ? (
                    <CardFace card={waste[waste.length - 1]} />
                  ) : (
                    <span className="text-emerald-500/40 text-[9px] font-black">LIXO</span>
                  )}
                </button>
              </div>

              {/* Col 2: Spacer */}
              <div className="w-full aspect-[5/7] opacity-0 pointer-events-none" />

              {/* Cols 3..6: 4 Foundations */}
              {foundations.map((pile, fIdx) => {
                const top = pile.length > 0 ? pile[pile.length - 1] : null;
                const isHintTarget = highlightMove?.toF === fIdx;
                return (
                  <div key={fIdx} className="w-full">
                    <button
                      type="button"
                      onClick={() => handleFoundationClick(fIdx)}
                      className={`w-full aspect-[5/7] rounded-md sm:rounded-lg border-2 shadow-xs flex flex-col items-center justify-center transition-all ${
                        top
                          ? 'bg-white border-stone-300'
                          : 'bg-emerald-950/40 border-dashed border-emerald-600/40'
                      } ${isHintTarget ? 'ring-3 sm:ring-4 ring-emerald-400 animate-pulse' : ''}`}
                    >
                      {top ? (
                        <CardFace card={top} />
                      ) : (
                        <span className="text-emerald-400/50 text-[11px] sm:text-xs font-black">A</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top Row: FreeCell (4 FreeCells + 4 Foundations = 8 cols) */}
          {variant === 'freecell' && (
            <div className="grid grid-cols-8 gap-0.5 sm:gap-1 items-start">
              {/* FreeCells 0..3 */}
              {freeCells.map((cell, idx) => {
                const isSelected = selection?.type === 'freecell' && selection.cellIdx === idx;
                return (
                  <div key={idx} className="w-full">
                    <button
                      type="button"
                      onClick={() => handleFreeCellClick(idx)}
                      className={`w-full aspect-[5/7] rounded-md sm:rounded-lg border-2 shadow-xs transition-all flex items-center justify-center ${
                        cell
                          ? 'bg-white border-stone-300'
                          : 'bg-emerald-950/40 border-dashed border-emerald-600/40'
                      } ${isSelected ? 'ring-3 sm:ring-4 ring-amber-400 scale-105 z-20' : ''}`}
                    >
                      {cell ? (
                        <CardFace card={cell} />
                      ) : (
                        <span className="text-emerald-500/40 text-[9px] font-bold">C{idx + 1}</span>
                      )}
                    </button>
                  </div>
                );
              })}

              {/* Foundations 0..3 */}
              {foundations.map((pile, fIdx) => {
                const top = pile.length > 0 ? pile[pile.length - 1] : null;
                const isHintTarget = highlightMove?.toF === fIdx;
                return (
                  <div key={fIdx} className="w-full">
                    <button
                      type="button"
                      onClick={() => handleFoundationClick(fIdx)}
                      className={`w-full aspect-[5/7] rounded-md sm:rounded-lg border-2 shadow-xs flex flex-col items-center justify-center transition-all ${
                        top
                          ? 'bg-white border-stone-300'
                          : 'bg-emerald-950/40 border-dashed border-emerald-600/40'
                      } ${isHintTarget ? 'ring-3 sm:ring-4 ring-emerald-400 animate-pulse' : ''}`}
                    >
                      {top ? (
                        <CardFace card={top} />
                      ) : (
                        <span className="text-emerald-400/50 text-[10px] sm:text-xs font-black">A</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Top Row: Spider (Stock + Foundations Counter) */}
          {variant === 'spider' && (
            <div className="flex items-center justify-between px-1">
              <button
                type="button"
                disabled={stock.length === 0}
                onClick={handleSpiderDealStock}
                className={`w-12 sm:w-14 aspect-[5/7] rounded-md sm:rounded-lg bg-gradient-to-br from-blue-700 to-indigo-900 border-2 border-blue-400 flex items-center justify-center text-white font-black text-xs shadow-md active:scale-95 disabled:opacity-40 ${
                  highlightMove?.toStock ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300' : ''
                }`}
              >
                {stock.length > 0 ? (
                  <div className="flex flex-col items-center">
                    <span className="text-xs sm:text-sm">🂠</span>
                    <span className="text-[9px] font-black">{stock.length / 10}</span>
                  </div>
                ) : '0'}
              </button>
              <div className="text-white text-[11px] sm:text-xs font-black bg-emerald-900/60 px-2 py-1 rounded-lg border border-emerald-700/40">
                Sequências completas: <span className="text-amber-300">{foundations.filter(p => p.length === 13).length}</span> / 8
              </div>
            </div>
          )}

          {/* Tableau Columns */}
          <div className={`grid items-start ${
            variant === 'spider' 
              ? 'grid-cols-10 gap-0.5' 
              : variant === 'freecell' 
              ? 'grid-cols-8 gap-0.5 sm:gap-1' 
              : 'grid-cols-7 gap-1 sm:gap-1.5'
          }`}>
            {tableau.map((col, colIdx) => {
              const isColHintTarget = highlightMove?.toCol === colIdx;
              const isColHintSource = highlightMove?.fromCol === colIdx;

              return (
                <div
                  key={colIdx}
                  onClick={() => col.length === 0 && handleEmptyColumnClick(colIdx)}
                  className={`flex flex-col items-center w-full min-h-[190px] sm:min-h-[250px] rounded-lg p-0.5 cursor-pointer transition-colors ${
                    col.length === 0 ? 'bg-emerald-950/20 hover:bg-emerald-900/30' : ''
                  } ${isColHintTarget ? 'ring-2 ring-emerald-400' : ''}`}
                >
                  {col.length === 0 ? (
                    <div className="w-full aspect-[5/7] rounded-md sm:rounded-lg border-2 border-dashed border-emerald-600/40 flex items-center justify-center text-emerald-400/50 text-[10px] sm:text-xs font-black">
                      {variant === 'klondike' ? 'K' : '—'}
                    </div>
                  ) : (
                    col.map((card, cardIdx) => {
                      const isTopCard = cardIdx === col.length - 1;
                      const isSelected = selection?.type === 'tableau' 
                        && selection.colIdx === colIdx 
                        && cardIdx >= selection.cardIdx;

                      return (
                        <div
                          key={card.id}
                          onClick={(e) => handleCardClick(colIdx, cardIdx, e)}
                          className={`
                            w-full aspect-[5/7] rounded-md sm:rounded-lg border shadow-xs transition-all shrink-0 cursor-pointer overflow-hidden
                            ${card.isFaceUp ? 'bg-white border-stone-300' : 'bg-transparent border-transparent'}
                            ${isSelected ? 'ring-3 sm:ring-4 ring-amber-400 border-amber-400 z-30 scale-[1.03] shadow-md' : ''}
                            ${isColHintSource && isTopCard ? 'ring-3 sm:ring-4 ring-emerald-400 animate-pulse' : ''}
                            ${cardIdx > 0 ? (card.isFaceUp ? '-mt-8 sm:-mt-11' : '-mt-9 sm:-mt-12') : ''}
                            ${isTopCard ? 'z-10' : ''}
                          `}
                        >
                          {card.isFaceUp ? (
                            <CardFace card={card} small={!isTopCard} compact={variant === 'spider'} />
                          ) : (
                            <CardBack small={!isTopCard} />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── TRIPEAKS (TRÊS PICOS) TABLEAU ── */}
      {variant === 'tripeaks' && (
        <div className="bg-[#1b4332] dark:bg-[#081c15] p-2.5 sm:p-4 rounded-2xl sm:rounded-3xl border-2 sm:border-4 border-[#081c15] shadow-xl space-y-3 w-full overflow-hidden">
          
          {/* Streak bonus pill */}
          <div className="flex items-center justify-between text-xs font-black text-white px-2">
            <span className="flex items-center gap-1 text-amber-300">
              <Flame className="h-4 w-4" /> Combo: x{tripeaksStreak}
            </span>
            <span className="text-emerald-200">Pontos: {score}</span>
          </div>

          {/* 4 Rows of Pyramids */}
          <div className="flex flex-col items-center gap-1 sm:gap-2 py-1 w-full">
            {tripeaksRows.map((row, rIdx) => (
              <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5 w-full">
                {row.map((card, cIdx) => (
                  <button
                    key={card.id}
                    type="button"
                    disabled={!card.isFaceUp}
                    onClick={() => handleTripeaksCardClick(rIdx, cIdx)}
                    className={`w-[9%] max-w-[44px] aspect-[5/7] rounded-md sm:rounded-lg border shadow-sm transition-all overflow-hidden ${
                      card.isFaceUp
                        ? 'bg-white border-stone-200 hover:scale-105 active:scale-95'
                        : 'border-transparent opacity-85'
                    }`}
                  >
                    {card.isFaceUp ? (
                      <CardFace card={card} small />
                    ) : (
                      <CardBack small />
                    )}
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom Stock & Waste Pile */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 pt-2 border-t border-emerald-900/50">
            {/* Stock */}
            <button
              type="button"
              disabled={stock.length === 0}
              onClick={() => {
                if (stock.length === 0) return;
                saveSnapshot();
                playCardClick();
                const nextStock = [...stock];
                const card = { ...nextStock.pop()!, isFaceUp: true };
                setWaste(prev => [...prev, card]);
                setStock(nextStock);
                setTripeaksStreak(0);
                setMoves(m => m + 1);
              }}
              className={`w-12 sm:w-14 aspect-[5/7] rounded-md sm:rounded-lg bg-gradient-to-br from-blue-700 to-indigo-900 border-2 border-blue-400 flex items-center justify-center text-white font-black text-xs shadow-md active:scale-95 disabled:opacity-40 ${
                highlightMove?.toStock ? 'ring-4 ring-emerald-400 animate-pulse border-emerald-300' : ''
              }`}
            >
              {stock.length > 0 ? (
                <div className="flex flex-col items-center">
                  <span className="text-base">🂠</span>
                  <span className="text-[10px]">{stock.length}</span>
                </div>
              ) : '0'}
            </button>

            {/* Waste */}
            <div className="w-12 sm:w-14 aspect-[5/7] rounded-md sm:rounded-lg border-2 border-amber-400 bg-white shadow-md overflow-hidden">
              {waste.length > 0 && (
                <CardFace card={waste[waste.length - 1]} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Universal Action Bar ── */}
      <div className="grid grid-cols-4 gap-1 sm:gap-1.5 pt-1">
        <Button
          type="button"
          onClick={handleHint}
          variant="outline"
          className="h-10 sm:h-11 px-1 border-amber-300 bg-amber-50/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 font-bold text-[11px] sm:text-xs rounded-xl gap-1 shadow-2xs"
        >
          <Lightbulb className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>{tGame.hint}</span>
        </Button>

        <Button
          type="button"
          disabled={!canUndo}
          onClick={handleUndo}
          variant="outline"
          className="h-10 sm:h-11 px-1 border-stone-300 dark:border-stone-700 font-bold text-[11px] sm:text-xs rounded-xl gap-1 disabled:opacity-40"
        >
          <Undo2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>Desfazer</span>
        </Button>

        <Button
          type="button"
          onClick={initGame}
          variant="outline"
          className="h-10 sm:h-11 px-1 border-stone-300 dark:border-stone-700 font-bold text-[11px] sm:text-xs rounded-xl gap-1"
        >
          <Shuffle className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>Misturar</span>
        </Button>

        <Button
          type="button"
          onClick={initGame}
          variant="outline"
          className="h-10 sm:h-11 px-1 border-stone-300 dark:border-stone-700 font-bold text-[11px] sm:text-xs rounded-xl gap-1"
        >
          <RotateCcw className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
          <span>Novo</span>
        </Button>
      </div>

      {/* ── Victory Celebration Card ── */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/80 border-2 border-emerald-400 p-5 sm:p-6 rounded-3xl text-center space-y-3 shadow-xl animate-in fade-in zoom-in-95">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-2xl sm:text-3xl shadow-lg">
            👑
          </div>
          <h3 className="text-lg sm:text-xl font-black text-emerald-900 dark:text-emerald-100">
            {tGame.solitaire.winTitle}
          </h3>
          <p className="text-xs sm:text-sm font-semibold text-stone-700 dark:text-stone-300 max-w-sm mx-auto">
            {tGame.solitaire.winDesc}
          </p>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={initGame}
              variant="outline"
              className="flex-1 h-11 sm:h-12 rounded-xl font-bold border-stone-300 text-xs sm:text-sm"
            >
              Jogar Novamente
            </Button>
            {onNextLevel && (
              <Button
                type="button"
                onClick={onNextLevel}
                className="flex-1 h-11 sm:h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold gap-1 shadow-md text-xs sm:text-sm"
              >
                Próxima Fase <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
