'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, RotateCcw, Lightbulb, UserCheck, Bot } from 'lucide-react';

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

// Render domino dots
function renderDots(num: number) {
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

  return (
    <div className="grid grid-cols-3 grid-rows-3 w-7 h-7 sm:w-8 sm:h-8 p-1">
      {dots.map((pos, idx) => (
        <span key={idx} className={`w-1.5 h-1.5 sm:w-2 sm:h-2 bg-stone-900 dark:bg-stone-100 rounded-full ${pos}`} />
      ))}
    </div>
  );
}

export function DominoEngine({ levelNumber, onComplete, onNextLevel }: DominoEngineProps) {
  const [playerHand, setPlayerHand] = useState<DominoTile[]>([]);
  const [botHand, setBotHand] = useState<DominoTile[]>([]);
  const [boneyard, setBoneyard] = useState<DominoTile[]>([]);
  const [boardChain, setBoardChain] = useState<DominoTile[]>([]);
  const [selectedTile, setSelectedTile] = useState<DominoTile | null>(null);
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [message, setMessage] = useState('Sua vez! Toque em uma peça compatível.');
  const [isCompleted, setIsCompleted] = useState(false);
  const [earnedStars, setEarnedStars] = useState(3);
  const [botName] = useState(() => (levelNumber % 2 === 0 ? 'Dona Rosa' : 'Seu José'));

  // Start round
  useEffect(() => {
    startNewGame();
  }, [levelNumber]);

  const startNewGame = () => {
    const fullDeck = generateDominoSet().sort(() => Math.random() - 0.5);
    const pHand = fullDeck.slice(0, 7);
    const bHand = fullDeck.slice(7, 14);
    const yard = fullDeck.slice(14);

    // Initial tile on board (highest double or first)
    const firstTile = yard.pop() || { id: 'first', left: 3, right: 3 };

    setPlayerHand(pHand);
    setBotHand(bHand);
    setBoneyard(yard);
    setBoardChain([firstTile]);
    setSelectedTile(null);
    setTurn('player');
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
    setMessage(`Jogo iniciado com [${firstTile.left}|${firstTile.right}]. Sua vez!`);
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

  const canPlayTile = (t: DominoTile) => {
    if (leftEnd === null || rightEnd === null) return true;
    return t.left === leftEnd || t.right === leftEnd || t.left === rightEnd || t.right === rightEnd;
  };

  const handleTileSelect = (tile: DominoTile) => {
    if (turn !== 'player' || isCompleted) return;
    if (!canPlayTile(tile)) {
      setMessage('Esta peça não combina com as pontas da mesa.');
      return;
    }

    // Play tile to left or right end
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
      setMessage(`${botName} está pensando na jogada...`);
    }
  };

  const handleBotMove = () => {
    // Find bot playable tile
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
      setMessage(`${botName} jogou [${playable.left}|${playable.right}]. Sua vez!`);
    } else if (boneyard.length > 0) {
      // Bot buys
      const [drawn, ...rest] = boneyard;
      setBoneyard(rest);
      setBotHand([...botHand, drawn]);
      setMessage(`${botName} comprou uma peça do monte.`);
      // Retry or pass
      setTurn('bot');
    } else {
      // Bot passes
      setTurn('player');
      setMessage(`${botName} não tem jogada e passou a vez. Sua vez!`);
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
    setMessage(won ? 'Parabéns! Você bateu o dominó e venceu a partida!' : `${botName} bateu o dominó desta vez. Bom jogo!`);

    onComplete({
      stars,
      score: won ? 350 + (boneyard.length * 10) : 100,
      moves: moves + 1,
      hints: hintsUsed,
    });
  };

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    const playable = playerHand.find(t => canPlayTile(t));
    if (playable) {
      setMessage(`Dica: A peça [${playable.left}|${playable.right}] pode ser jogada na mesa.`);
    } else if (boneyard.length > 0) {
      setMessage('Dica: Compre uma peça no monte para continuar.');
    } else {
      setMessage('Dica: Não há peças no monte, passe a vez.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Opponent Info */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-stone-800 dark:text-stone-200">{botName}</p>
            <p className="text-xs text-stone-500 font-semibold">{botHand.length} peças na mão</p>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-stone-500 font-bold">Monte restante</p>
          <p className="text-base font-black text-amber-700 dark:text-amber-400">{boneyard.length} peças</p>
        </div>
      </div>

      {/* Message Banner */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-2xl text-center">
        <p className="font-bold text-sm text-amber-900 dark:text-amber-200">{message}</p>
      </div>

      {/* Domino Table Board */}
      <div className="bg-emerald-900/90 rounded-3xl p-4 sm:p-5 border-4 border-amber-800 min-h-[160px] flex items-center justify-center shadow-inner overflow-x-auto">
        <div className="flex items-center gap-1.5 py-2">
          {boardChain.map((tile, idx) => (
            <div
              key={tile.id || idx}
              className="bg-stone-50 dark:bg-stone-900 border-2 border-stone-800 rounded-xl p-1 flex items-center shadow-md shrink-0"
            >
              {renderDots(tile.left)}
              <div className="w-[1.5px] h-6 bg-stone-400 mx-0.5" />
              {renderDots(tile.right)}
            </div>
          ))}
        </div>
      </div>

      {/* Player's Hand */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="font-bold text-sm text-stone-700 dark:text-stone-300">
            Suas Peças ({playerHand.length}):
          </p>
          <span className="text-xs text-stone-500 font-semibold">Toque para jogar</span>
        </div>

        <div className="flex flex-wrap gap-2 justify-center bg-stone-100 dark:bg-stone-800/60 p-3 rounded-2xl min-h-[90px]">
          {playerHand.map(tile => {
            const playable = canPlayTile(tile);
            return (
              <button
                key={tile.id}
                type="button"
                onClick={() => handleTileSelect(tile)}
                disabled={turn !== 'player' || !playable || isCompleted}
                className={`bg-white dark:bg-stone-900 border-2 rounded-xl p-1.5 flex items-center shadow-md transition-all active:scale-95 ${
                  playable && turn === 'player'
                    ? 'border-emerald-500 ring-2 ring-emerald-300 dark:ring-emerald-700 cursor-pointer'
                    : 'border-stone-300 opacity-60'
                }`}
              >
                {renderDots(tile.left)}
                <div className="w-[1.5px] h-6 bg-stone-400 mx-0.5" />
                {renderDots(tile.right)}
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
          className="h-12 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs sm:text-sm rounded-xl"
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
