'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, RotateCcw, Lightbulb, Bot } from 'lucide-react';

interface DominoTile {
  id: string;
  left: number;
  right: number;
}

interface DominoEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

// Generate standard double-6 domino set (28 tiles)
function generateDominoSet(): DominoTile[] {
  const tiles: DominoTile[] = [];
  let idCounter = 0;
  for (let i = 0; i <= 6; i++) {
    for (let j = i; j <= 6; j++) {
      tiles.push({ id: `tile-${idCounter++}`, left: i, right: j });
    }
  }
  return tiles;
}

// Render domino dots with crisp high-contrast black pips
function renderDots(num: number, size: 'sm' | 'md' = 'sm') {
  const dotPatterns: Record<number, string[]> = {
    0: [],
    1: ['col-start-2 row-start-2'],
    2: ['col-start-1 row-start-1', 'col-start-3 row-start-3'],
    3: ['col-start-1 row-start-1', 'col-start-2 row-start-2', 'col-start-3 row-start-3'],
    4: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    5: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-2 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
    6: ['col-start-1 row-start-1', 'col-start-3 row-start-1', 'col-start-1 row-start-2', 'col-start-3 row-start-2', 'col-start-1 row-start-3', 'col-start-3 row-start-3'],
  };

  const dots = dotPatterns[num] || [];
  const boxDim = size === 'sm' ? 'w-5 h-5 sm:w-6 sm:h-6 p-0.5' : 'w-7 h-7 sm:w-8 sm:h-8 p-1';
  const pipDim = size === 'sm' ? 'w-1 h-1 sm:w-1.5 sm:h-1.5' : 'w-1.5 h-1.5 sm:w-2 sm:h-2';

  return (
    <div className={`grid grid-cols-3 grid-rows-3 ${boxDim}`}>
      {dots.map((pos, idx) => (
        <span key={idx} className={`${pipDim} bg-stone-900 rounded-full ${pos}`} />
      ))}
    </div>
  );
}

export function DominoEngine({ levelNumber, onComplete, onNextLevel }: DominoEngineProps) {
  const [playerHand, setPlayerHand] = useState<DominoTile[]>([]);
  const [botHand, setBotHand] = useState<DominoTile[]>([]);
  const [boneyard, setBoneyard] = useState<DominoTile[]>([]);
  const [boardChain, setBoardChain] = useState<DominoTile[]>([]);
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState('Sua vez! Toque em uma peça com borda verde para jogar.');
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);
  const [botName] = useState(() => (levelNumber % 2 === 0 ? 'Dona Rosa' : 'Seu José'));

  const boardRef = useRef<HTMLDivElement>(null);

  // Start round
  useEffect(() => {
    startNewGame();
  }, [levelNumber]);

  const startNewGame = () => {
    const fullDeck = generateDominoSet().sort(() => Math.random() - 0.5);
    const pHand = fullDeck.slice(0, 7);
    const bHand = fullDeck.slice(7, 14);
    const yard = fullDeck.slice(14);

    const firstTile = yard.pop() || { id: 'first', left: 3, right: 3 };

    setPlayerHand(pHand);
    setBotHand(bHand);
    setBoneyard(yard);
    setBoardChain([firstTile]);
    setTurn('player');
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
    setMessage(`Jogo aberto na mesa com [${firstTile.left} | ${firstTile.right}]. Sua vez!`);
  };

  const leftEnd = boardChain.length > 0 ? boardChain[0].left : null;
  const rightEnd = boardChain.length > 0 ? boardChain[boardChain.length - 1].right : null;

  // Bot Turn Logic
  useEffect(() => {
    if (turn === 'bot' && !isCompleted) {
      const timer = setTimeout(() => {
        handleBotMove();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turn, isCompleted, boardChain, botHand, boneyard]);

  // Scroll table into view smoothly when new tiles are added
  useEffect(() => {
    if (boardRef.current) {
      boardRef.current.scrollTop = boardRef.current.scrollHeight;
    }
  }, [boardChain.length]);

  const canPlayTile = (t: DominoTile) => {
    if (leftEnd === null || rightEnd === null) return true;
    return t.left === leftEnd || t.right === leftEnd || t.left === rightEnd || t.right === rightEnd;
  };

  const handleTileSelect = (tile: DominoTile) => {
    if (turn !== 'player' || isCompleted) return;
    if (!canPlayTile(tile)) {
      setMessage(`Esta peça [${tile.left}|${tile.right}] não encaixa nas pontas (${leftEnd} ou ${rightEnd}).`);
      return;
    }

    playPlayerTile(tile);
  };

  const playPlayerTile = (tile: DominoTile) => {
    let newChain = [...boardChain];
    let placed = false;

    // Try matching right end first, then left end
    if (rightEnd !== null && (tile.left === rightEnd || tile.right === rightEnd)) {
      const orientedTile = tile.left === rightEnd ? tile : { ...tile, left: tile.right, right: tile.left };
      newChain.push(orientedTile);
      placed = true;
    } else if (leftEnd !== null && (tile.left === leftEnd || tile.right === leftEnd)) {
      const orientedTile = tile.right === leftEnd ? tile : { ...tile, left: tile.right, right: tile.left };
      newChain.unshift(orientedTile);
      placed = true;
    }

    if (placed) {
      const nextHand = playerHand.filter(t => t.id !== tile.id);
      setBoardChain(newChain);
      setPlayerHand(nextHand);
      setMoves(m => m + 1);

      if (nextHand.length === 0) {
        finishGame('player');
        return;
      }

      setTurn('bot');
      setMessage(`${botName} está jogando...`);
    }
  };

  const handleBotMove = () => {
    const playable = botHand.find(t => canPlayTile(t));

    if (playable) {
      let newChain = [...boardChain];
      const curLeft = newChain[0].left;
      const curRight = newChain[newChain.length - 1].right;

      if (playable.left === curRight || playable.right === curRight) {
        const oriented = playable.left === curRight ? playable : { ...playable, left: playable.right, right: playable.left };
        newChain.push(oriented);
      } else {
        const oriented = playable.right === curLeft ? playable : { ...playable, left: playable.right, right: playable.left };
        newChain.unshift(oriented);
      }

      const nextBotHand = botHand.filter(t => t.id !== playable.id);
      setBoardChain(newChain);
      setBotHand(nextBotHand);

      if (nextBotHand.length === 0) {
        finishGame('bot');
        return;
      }

      setTurn('player');
      setMessage(`${botName} jogou [${playable.left}|${playable.right}]. Pontas agora: [${newChain[0].left}] e [${newChain[newChain.length - 1].right}].`);
    } else if (boneyard.length > 0) {
      const [drawn, ...rest] = boneyard;
      setBoneyard(rest);
      setBotHand([...botHand, drawn]);
      setMessage(`${botName} comprou uma peça do monte.`);
      setTurn('bot');
    } else {
      setTurn('player');
      setMessage(`${botName} não tem peça e passou a vez. Sua vez!`);
    }
  };

  const handleDrawTile = () => {
    if (turn !== 'player' || isCompleted || boneyard.length === 0) return;
    const [drawn, ...rest] = boneyard;
    setBoneyard(rest);
    setPlayerHand(prev => [...prev, drawn]);
    setMessage('Você comprou uma peça do monte.');
  };

  const handlePassTurn = () => {
    if (turn !== 'player' || isCompleted) return;
    setTurn('bot');
    setMessage(`Você passou a vez para ${botName}.`);
  };

  const finishGame = (winner: 'player' | 'bot') => {
    setIsCompleted(true);
    const won = winner === 'player';
    const stars = won ? (hintsUsed === 0 ? 3 : 2) : 1;
    setEarnedStars(stars);
    setMessage(won ? 'Parabéns! Você bateu o dominó e venceu!' : `${botName} bateu o dominó. Bom jogo!`);

    onComplete({
      stars,
      score: won ? 400 + (boneyard.length * 10) : 120,
      moves: moves + 1,
      hints: hintsUsed,
    });
  };

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    const playable = playerHand.find(t => canPlayTile(t));
    if (playable) {
      setMessage(`Dica: A peça [${playable.left}|${playable.right}] combina com uma das pontas da mesa.`);
    } else if (boneyard.length > 0) {
      setMessage('Dica: Não há peças que combinam. Compre do monte.');
    } else {
      setMessage('Dica: Não há peças no monte, passe a vez.');
    }
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Opponent Info & Open Ends */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-black text-sm text-stone-900 dark:text-stone-100">{botName}</p>
            <p className="text-xs text-stone-500 font-bold">{botHand.length} peças na mão</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[11px] font-bold text-stone-500 uppercase block">Pontas da Mesa</span>
          <div className="inline-flex items-center gap-1.5 mt-0.5">
            <span className="px-2.5 py-0.5 bg-amber-400 text-stone-900 font-black rounded-lg text-sm">
              {leftEnd !== null ? leftEnd : '-'}
            </span>
            <span className="text-xs text-stone-400 font-bold">e</span>
            <span className="px-2.5 py-0.5 bg-amber-400 text-stone-900 font-black rounded-lg text-sm">
              {rightEnd !== null ? rightEnd : '-'}
            </span>
          </div>
        </div>
      </div>

      {/* Message Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-2.5 rounded-2xl text-center">
        <p className="font-bold text-xs sm:text-sm text-amber-900 dark:text-amber-200">{message}</p>
      </div>

      {/* Domino Table Board (wrapping flex layout so all stones stay visible) */}
      <div
        ref={boardRef}
        className="bg-emerald-900 rounded-3xl p-3 sm:p-4 border-4 border-emerald-950 min-h-[170px] max-h-[260px] overflow-y-auto shadow-inner"
      >
        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300/70 text-center mb-2">
          Mesa de Jogo ({boardChain.length} peças jogadas)
        </p>

        {/* Tiles wrap into organized rows so the entire chain is visible */}
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {boardChain.map((tile, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === boardChain.length - 1;

            return (
              <div
                key={tile.id || idx}
                className={`bg-white border-2 rounded-xl p-0.5 flex items-center shadow-md transition-all ${
                  isFirst || isLast
                    ? 'border-amber-400 ring-2 ring-amber-300'
                    : 'border-stone-400'
                }`}
                title={`Peça [${tile.left}|${tile.right}]`}
              >
                {renderDots(tile.left, 'sm')}
                <div className="w-[1.5px] h-5 bg-stone-300 mx-0.5" />
                {renderDots(tile.right, 'sm')}
              </div>
            );
          })}
        </div>
      </div>

      {/* Player's Hand */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between px-1">
          <p className="font-black text-sm text-stone-800 dark:text-stone-200">
            Suas Peças ({playerHand.length}):
          </p>
          <span className="text-xs text-stone-500 font-bold">Borda verde = compatível</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center bg-stone-100 dark:bg-stone-800/60 p-3 rounded-2xl min-h-[85px] border border-stone-200 dark:border-stone-700">
          {playerHand.map(tile => {
            const playable = canPlayTile(tile);
            const isMyTurn = turn === 'player' && !isCompleted;

            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleTileSelect(tile)}
                disabled={!isMyTurn || !playable}
                className={`bg-white border-2 rounded-2xl p-1.5 flex items-center shadow-md transition-all active:scale-95 ${
                  playable && isMyTurn
                    ? 'border-emerald-500 ring-3 ring-emerald-300 cursor-pointer scale-105'
                    : 'border-stone-300 opacity-60 cursor-not-allowed'
                }`}
              >
                {renderDots(tile.left, 'md')}
                <div className="w-[1.5px] h-6 bg-stone-300 mx-1" />
                {renderDots(tile.right, 'md')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <Button
          type="button"
          onClick={handleDrawTile}
          disabled={turn !== 'player' || boneyard.length === 0 || isCompleted}
          className="h-12 bg-amber-600 hover:bg-amber-700 text-white font-black text-xs sm:text-sm rounded-xl"
        >
          Comprar ({boneyard.length})
        </Button>

        <Button
          type="button"
          onClick={handlePassTurn}
          disabled={turn !== 'player' || isCompleted}
          variant="outline"
          className="h-12 border-stone-300 font-bold text-xs sm:text-sm rounded-xl"
        >
          Passar a Vez
        </Button>

        <Button
          type="button"
          onClick={handleHint}
          disabled={isCompleted}
          variant="outline"
          className="h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-1"
        >
          <Lightbulb className="h-4 w-4" /> Dica
        </Button>
      </div>

      {/* Win Modal / Congratulations */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/50 border-2 border-emerald-400 p-5 rounded-3xl text-center space-y-3 animate-in zoom-in-95">
          <div className="text-4xl">🁄</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Fim da Partida!
          </h3>
          <div className="flex justify-center gap-1">
            {[1, 2, 3].map(s => (
              <span key={s} className="text-2xl">
                {s <= earnedStars ? '⭐' : '☆'}
              </span>
            ))}
          </div>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{message}</p>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={startNewGame}
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
