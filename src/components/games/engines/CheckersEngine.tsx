'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, RotateCcw, Bot } from 'lucide-react';

interface CheckersPiece {
  id: string;
  player: 'player' | 'bot'; // player is White, bot is Black/Red
  isKing: boolean;
  row: number;
  col: number;
}

interface CheckersEngineProps {
  levelNumber: number;
  onComplete: (stats: { stars: number; score: number; moves: number; hints: number }) => void;
  onNextLevel?: () => void;
}

export function CheckersEngine({ levelNumber, onComplete, onNextLevel }: CheckersEngineProps) {
  const [board, setBoard] = useState<(CheckersPiece | null)[][]>([]);
  const [selectedPiece, setSelectedPiece] = useState<CheckersPiece | null>(null);
  const [validMoves, setValidMoves] = useState<{ row: number; col: number; capturePiece?: CheckersPiece }[]>([]);
  const [turn, setTurn] = useState<'player' | 'bot'>('player');
  const [moves, setMoves] = useState(0);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [message, setMessage] = useState('Sua vez com as peças claras! Toque em uma peça.');
  const [botName] = useState(() => (levelNumber % 2 === 0 ? 'Dona Helena' : 'Seu Carlos'));

  useEffect(() => {
    initBoard();
  }, [levelNumber]);

  const initBoard = () => {
    // 8x8 board
    const newBoard: (CheckersPiece | null)[][] = Array.from({ length: 8 }, () =>
      Array(8).fill(null)
    );

    let id = 0;
    // Bot pieces (top 3 rows, only on dark squares (r + c) % 2 === 1)
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          newBoard[r][c] = { id: `bot-${id++}`, player: 'bot', isKing: false, row: r, col: c };
        }
      }
    }

    // Player pieces (bottom 3 rows)
    for (let r = 5; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 === 1) {
          newBoard[r][c] = { id: `p-${id++}`, player: 'player', isKing: false, row: r, col: c };
        }
      }
    }

    setBoard(newBoard);
    setSelectedPiece(null);
    setValidMoves([]);
    setTurn('player');
    setMoves(0);
    setHintsUsed(0);
    setIsCompleted(false);
    setMessage('Sua vez com as peças claras! Toque em uma peça para ver os movimentos.');
  };

  // Bot Turn Automation
  useEffect(() => {
    if (turn === 'bot' && !isCompleted && board.length > 0) {
      const timer = setTimeout(() => {
        executeBotTurn();
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [turn, isCompleted, board]);

  const calculateMovesForPiece = (
    piece: CheckersPiece,
    currentBoard: (CheckersPiece | null)[][]
  ): { row: number; col: number; capturePiece?: CheckersPiece }[] => {
    const movesList: { row: number; col: number; capturePiece?: CheckersPiece }[] = [];
    const directions: number[] = piece.isKing ? [-1, 1] : piece.player === 'player' ? [-1] : [1];

    directions.forEach(dr => {
      [-1, 1].forEach(dc => {
        const nextR = piece.row + dr;
        const nextC = piece.col + dc;

        // Normal move
        if (nextR >= 0 && nextR < 8 && nextC >= 0 && nextC < 8) {
          if (currentBoard[nextR][nextC] === null) {
            movesList.push({ row: nextR, col: nextC });
          } else if (currentBoard[nextR][nextC]?.player !== piece.player) {
            // Jump capture
            const jumpR = nextR + dr;
            const jumpC = nextC + dc;
            if (jumpR >= 0 && jumpR < 8 && jumpC >= 0 && jumpC < 8 && currentBoard[jumpR][jumpC] === null) {
              movesList.push({ row: jumpR, col: jumpC, capturePiece: currentBoard[nextR][nextC]! });
            }
          }
        }
      });
    });

    return movesList;
  };

  const handleSquareClick = (r: number, c: number) => {
    if (turn !== 'player' || isCompleted) return;

    const clickedPiece = board[r][c];

    // Clicked own piece: select and show valid moves
    if (clickedPiece && clickedPiece.player === 'player') {
      const possible = calculateMovesForPiece(clickedPiece, board);
      setSelectedPiece(clickedPiece);
      setValidMoves(possible);
      setMessage(possible.length > 0 ? 'Toque no círculo verde para mover.' : 'Esta peça não tem movimentos livres.');
      return;
    }

    // Clicked a valid destination
    if (selectedPiece && validMoves.some(m => m.row === r && m.col === c)) {
      const chosenMove = validMoves.find(m => m.row === r && m.col === c)!;
      executePlayerMove(selectedPiece, chosenMove);
    }
  };

  const executePlayerMove = (piece: CheckersPiece, move: { row: number; col: number; capturePiece?: CheckersPiece }) => {
    const nextBoard = board.map(row => [...row]);
    nextBoard[piece.row][piece.col] = null;

    // Check promotion to King
    const becomesKing = piece.isKing || move.row === 0;
    const movedPiece: CheckersPiece = {
      ...piece,
      row: move.row,
      col: move.col,
      isKing: becomesKing,
    };
    nextBoard[move.row][move.col] = movedPiece;

    if (move.capturePiece) {
      nextBoard[move.capturePiece.row][move.capturePiece.col] = null;
    }

    setBoard(nextBoard);
    setSelectedPiece(null);
    setValidMoves([]);
    setMoves(m => m + 1);

    // Check if player won
    const remainingBotPieces = nextBoard.flat().filter(p => p && p.player === 'bot');
    if (remainingBotPieces.length === 0) {
      finishGame(true);
      return;
    }

    setTurn('bot');
    setMessage(`${botName} está pensando no movimento...`);
  };

  const executeBotTurn = () => {
    const botPieces = board.flat().filter((p): p is CheckersPiece => p !== null && p.player === 'bot');
    if (botPieces.length === 0) {
      finishGame(true);
      return;
    }

    // Find all valid moves for bot pieces
    let allBotMoves: { piece: CheckersPiece; move: { row: number; col: number; capturePiece?: CheckersPiece } }[] = [];
    botPieces.forEach(p => {
      const pm = calculateMovesForPiece(p, board);
      pm.forEach(m => allBotMoves.push({ piece: p, move: m }));
    });

    if (allBotMoves.length === 0) {
      // Bot has no moves, player wins!
      finishGame(true);
      return;
    }

    // Prioritize captures
    const captureMoves = allBotMoves.filter(m => m.move.capturePiece);
    const chosen = captureMoves.length > 0
      ? captureMoves[Math.floor(Math.random() * captureMoves.length)]
      : allBotMoves[Math.floor(Math.random() * allBotMoves.length)];

    const nextBoard = board.map(row => [...row]);
    nextBoard[chosen.piece.row][chosen.piece.col] = null;

    const becomesKing = chosen.piece.isKing || chosen.move.row === 7;
    nextBoard[chosen.move.row][chosen.move.col] = {
      ...chosen.piece,
      row: chosen.move.row,
      col: chosen.move.col,
      isKing: becomesKing,
    };

    if (chosen.move.capturePiece) {
      nextBoard[chosen.move.capturePiece.row][chosen.move.capturePiece.col] = null;
    }

    setBoard(nextBoard);

    // Check player remaining pieces
    const remainingPlayerPieces = nextBoard.flat().filter(p => p && p.player === 'player');
    if (remainingPlayerPieces.length === 0) {
      finishGame(false);
      return;
    }

    setTurn('player');
    setMessage(`${botName} moveu uma peça. Sua vez!`);
  };

  const finishGame = (won: boolean) => {
    setIsCompleted(true);
    const stars = won ? (hintsUsed === 0 ? 3 : 2) : 1;
    setMessage(won ? 'Vitória! Você capturou as peças adversárias com sucesso!' : `${botName} venceu desta vez. Muito bem jogado!`);

    onComplete({
      stars,
      score: won ? 500 : 150,
      moves,
      hints: hintsUsed,
    });
  };

  const handleHint = () => {
    setHintsUsed(h => h + 1);
    const playerPieces = board.flat().filter((p): p is CheckersPiece => p !== null && p.player === 'player');
    const pieceWithMove = playerPieces.find(p => calculateMovesForPiece(p, board).length > 0);
    if (pieceWithMove) {
      setSelectedPiece(pieceWithMove);
      setValidMoves(calculateMovesForPiece(pieceWithMove, board));
      setMessage(`Dica: A peça na linha ${8 - pieceWithMove.row} pode avançar.`);
    } else {
      setMessage('Dica: Fique atento às diagonais livres.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Opponent Info */}
      <div className="flex items-center justify-between bg-stone-100 dark:bg-stone-800 p-3 rounded-2xl border border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-700">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-sm text-stone-800 dark:text-stone-200">{botName}</p>
            <p className="text-xs text-stone-500 font-semibold">Peças Escuras</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs font-bold text-stone-500">Seu Lado:</span>
          <p className="text-sm font-black text-emerald-700 dark:text-emerald-400">Peças Claras ⚪</p>
        </div>
      </div>

      {/* Message */}
      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded-2xl text-center">
        <p className="font-bold text-sm text-amber-900 dark:text-amber-200">{message}</p>
      </div>

      {/* Checkers Board */}
      <div className="max-w-[340px] sm:max-w-[380px] mx-auto aspect-square border-4 border-amber-900 rounded-3xl p-1 bg-amber-950 shadow-xl overflow-hidden">
        <div className="grid grid-cols-8 grid-rows-8 w-full h-full rounded-2xl overflow-hidden">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const isDark = (r + c) % 2 === 1;
              const isSelected = selectedPiece?.row === r && selectedPiece?.col === c;
              const isValidDestination = validMoves.some(m => m.row === r && m.col === c);

              return (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleSquareClick(r, c)}
                  disabled={turn !== 'player' || isCompleted}
                  className={`w-full h-full flex items-center justify-center relative transition-all ${
                    isDark ? 'bg-amber-800 dark:bg-stone-800' : 'bg-amber-100 dark:bg-stone-300'
                  } ${isSelected ? 'ring-4 ring-emerald-400 z-10' : ''}`}
                >
                  {/* Destination marker */}
                  {isValidDestination && (
                    <div className="w-5 h-5 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
                  )}

                  {/* Piece */}
                  {cell && (
                    <div
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center font-black text-xs sm:text-sm shadow-md transition-transform ${
                        cell.player === 'player'
                          ? 'bg-stone-50 border-stone-400 text-stone-800 shadow-stone-900/40'
                          : 'bg-rose-700 border-rose-900 text-white shadow-stone-900/60'
                      }`}
                    >
                      {cell.isKing ? '👑' : ''}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex gap-2">
        <Button
          type="button"
          onClick={handleHint}
          disabled={isCompleted}
          variant="outline"
          className="flex-1 h-12 border-amber-300 text-amber-800 dark:text-amber-300 font-bold text-sm rounded-xl gap-1.5"
        >
          <Lightbulb className="h-4 w-4" /> Dica
        </Button>
        <Button
          type="button"
          onClick={initBoard}
          variant="outline"
          className="flex-1 h-12 border-stone-300 font-bold text-sm rounded-xl gap-1.5"
        >
          <RotateCcw className="h-4 w-4" /> Reiniciar
        </Button>
      </div>

      {/* Completion */}
      {isCompleted && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-400 p-6 rounded-3xl text-center space-y-3">
          <div className="text-4xl">🏆</div>
          <h3 className="text-xl font-black text-emerald-900 dark:text-emerald-100">
            Fim do Jogo de Damas!
          </h3>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">{message}</p>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              onClick={initBoard}
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
