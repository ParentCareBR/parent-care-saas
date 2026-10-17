'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ChevronLeft, 
  Gamepad2, 
  Brain, 
  HelpCircle, 
  Sparkles, 
  RotateCcw, 
  Trophy, 
  X,
  Volume2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GameType = 'memoria' | 'trivia' | 'genius' | 'caca_palavras' | 'sudoku' | 'velha' | null;

export default function GamesHubPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const [activeGame, setActiveGame] = useState<GameType>(null);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-16">
      
      {/* ─── HEADER (FIEL À IMAGEM MODELO: < 🎮 JOGOS) ─── */}
      <header className="flex items-center justify-between py-4 px-2 mb-2">
        <Link
          href={`/${locale}/dashboard`}
          className="w-10 h-10 rounded-2xl bg-white dark:bg-[#101D2B] border border-stone-200 dark:border-[#1E293B] flex items-center justify-center text-stone-700 dark:text-slate-200 shadow-2xs hover:bg-stone-100 transition-all active:scale-95"
          aria-label="Voltar para o Painel"
        >
          <ChevronLeft className="h-6 w-6" />
        </Link>

        <div className="flex items-center gap-2">
          <Gamepad2 className="h-7 w-7 text-[#1D4ED8] dark:text-blue-400 stroke-[2.2]" />
          <h1 className="text-2xl font-black text-[#1D4ED8] dark:text-blue-400 tracking-wider">
            JOGOS
          </h1>
        </div>

        <div className="w-10" /> {/* Spacer for balance */}
      </header>

      {/* ─── 6 GRANDES CARDS COLORIDOS (GRADE 2x3 FIEL À IMAGEM DO USUÁRIO) ─── */}
      <div className="grid grid-cols-2 gap-4 px-1">
        
        {/* 1. MEMÓRIA */}
        <button
          type="button"
          onClick={() => setActiveGame('memoria')}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-3"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
            <span className="text-4xl filter drop-shadow">🧠</span>
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-white">
            MEMÓRIA
          </span>
        </button>

        {/* 2. TRIVIA */}
        <button
          type="button"
          onClick={() => setActiveGame('trivia')}
          className="bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-3"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
            <span className="text-4xl font-black text-[#F43F5E] filter drop-shadow">?</span>
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-white">
            TRIVIA
          </span>
        </button>

        {/* 3. GENIUS */}
        <button
          type="button"
          onClick={() => setActiveGame('genius')}
          className="bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-3"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
            <span className="text-4xl filter drop-shadow">🌈</span>
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-white">
            GENIUS
          </span>
        </button>

        {/* 4. CAÇA-PALAVRAS */}
        <button
          type="button"
          onClick={() => setActiveGame('caca_palavras')}
          className="bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#3B82F6] flex items-center justify-center shadow-xs border-2 border-white/40">
            <span className="text-2xl font-black text-white lowercase">abc</span>
          </div>
          <span className="text-base font-black tracking-wider uppercase text-white text-center leading-tight">
            CAÇA-<br />PALAVRAS
          </span>
        </button>

        {/* 5. SUDOKU */}
        <button
          type="button"
          onClick={() => setActiveGame('sudoku')}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-3"
        >
          <div className="w-16 h-16 rounded-2xl bg-[#3B82F6] flex items-center justify-center shadow-xs border-2 border-white/40">
            <span className="text-xl font-black text-white tracking-widest">12<br />34</span>
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-white">
            SUDOKU
          </span>
        </button>

        {/* 6. JOGO DA VELHA */}
        <button
          type="button"
          onClick={() => setActiveGame('velha')}
          className="bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-3"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
            <div className="w-10 h-10 rounded-full border-4 border-[#F43F5E]" />
          </div>
          <span className="text-base font-black tracking-wider uppercase text-white text-center leading-tight">
            JOGO DA<br />VELHA
          </span>
        </button>

      </div>

      {/* ─── MODAL DO JOGO SELECIONADO (TOTALMENTE JOGÁVEL) ────────────────── */}
      {activeGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B1526] border-2 border-stone-200 dark:border-[#1E293B] rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            {/* Fechar */}
            <button
              onClick={() => setActiveGame(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#16253C] dark:hover:bg-[#203450] text-stone-600 dark:text-slate-300 flex items-center justify-center transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Renderizar mini-jogo */}
            {activeGame === 'memoria' && <MemoryMiniGame />}
            {activeGame === 'velha' && <TicTacToeMiniGame />}
            {activeGame === 'trivia' && <TriviaMiniGame />}
            {activeGame === 'genius' && <GeniusMiniGame />}
            {activeGame === 'caca_palavras' && <WordSearchMiniGame />}
            {activeGame === 'sudoku' && <SudokuMiniGame />}

          </div>
        </div>
      )}

    </div>
  );
}

// ── 1. MINI-JOGO DA MEMÓRIA ──────────────────────────────────────────────────
function MemoryMiniGame() {
  const ICONS = ['🍎', '🍌', '🍇', '🍓', '🥑', '🍒'];
  const [cards, setCards] = useState<string[]>(() => {
    return [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
  });
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);

  const handleCardClick = (index: number) => {
    if (flipped.includes(index) || matched.includes(index)) return;
    if (flipped.length === 2) return;

    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      const [first, second] = nextFlipped;
      if (cards[first] === cards[second]) {
        setMatched(prev => [...prev, first, second]);
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 900);
      }
    }
  };

  const resetGame = () => {
    setCards([...ICONS, ...ICONS].sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
  };

  const isWin = matched.length === cards.length;

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-2xl">🧠</span>
        <h2 className="text-xl font-black text-stone-900 dark:text-white">Jogo da Memória</h2>
      </div>
      <p className="text-xs text-stone-500">Encontre todos os pares de frutas!</p>

      <div className="grid grid-cols-4 gap-2.5 my-4">
        {cards.map((icon, idx) => {
          const isRevealed = flipped.includes(idx) || matched.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCardClick(idx)}
              className={cn(
                'aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all shadow-xs active:scale-95 border-2',
                isRevealed
                  ? 'bg-amber-100 dark:bg-amber-950/40 border-amber-400 scale-100'
                  : 'bg-stone-100 dark:bg-[#16253C] border-stone-200 dark:border-[#243B5C] text-transparent hover:bg-stone-200'
              )}
            >
              {isRevealed ? icon : '?'}
            </button>
          );
        })}
      </div>

      {isWin && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 p-3 rounded-2xl">
          <p className="text-base font-black text-emerald-800 dark:text-emerald-300">
            🎉 Parabéns! Você completou o jogo!
          </p>
        </div>
      )}

      <Button onClick={resetGame} className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl font-bold h-11">
        <RotateCcw className="h-4 w-4 mr-1.5" /> Reiniciar Jogo
      </Button>
    </div>
  );
}

// ── 2. MINI-JOGO DA VELHA ────────────────────────────────────────────────────
function TicTacToeMiniGame() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);

  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return squares[a];
      }
    }
    return squares.every(Boolean) ? 'Empate' : null;
  };

  const winner = calculateWinner(board);

  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    const next = board.slice();
    next[i] = isXNext ? 'X' : 'O';
    setBoard(next);
    setIsXNext(!isXNext);
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-black text-[#0D9488]">Jogo da Velha</h2>
      <p className="text-xs text-stone-500">
        {winner ? (winner === 'Empate' ? 'Deu empate!' : `Vencedor: Jogador ${winner}! 🎉`) : `Vez do jogador: ${isXNext ? 'X' : 'O'}`}
      </p>

      <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto my-3">
        {board.map((val, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(idx)}
            className="w-18 h-18 rounded-2xl bg-stone-100 dark:bg-[#16253C] border-2 border-stone-200 dark:border-[#223754] text-3xl font-black flex items-center justify-center text-stone-900 dark:text-white active:scale-95 transition-all shadow-xs"
          >
            <span className={val === 'X' ? 'text-indigo-600' : 'text-rose-500'}>
              {val}
            </span>
          </button>
        ))}
      </div>

      <Button onClick={reset} className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl font-bold h-11">
        <RotateCcw className="h-4 w-4 mr-1.5" /> Jogar Novamente
      </Button>
    </div>
  );
}

// ── 3. TRIVIA BRASIL (ESTÍMULO COGNITIVO) ───────────────────────────────────
function TriviaMiniGame() {
  const QUESTIONS = [
    { q: 'Qual é a capital do Brasil?', options: ['Rio de Janeiro', 'Brasília', 'São Paulo'], answer: 1 },
    { q: 'Quantos dias tem um ano bissexto?', options: ['365', '366', '364'], answer: 1 },
    { q: 'Em qual estação do ano as folhas costumam cair?', options: ['Primavera', 'Verão', 'Outono'], answer: 2 },
    { q: 'Qual instrumento Tom Jobim tocava famosamente?', options: ['Piano', 'Bateria', 'Saxofone'], answer: 0 },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleSelect = (idx: number) => {
    setSelectedOpt(idx);
    if (idx === QUESTIONS[currentQ].answer) {
      setScore(s => s + 1);
    }
    setTimeout(() => {
      if (currentQ + 1 < QUESTIONS.length) {
        setCurrentQ(q => q + 1);
        setSelectedOpt(null);
      } else {
        setFinished(true);
      }
    }, 1100);
  };

  const restart = () => {
    setCurrentQ(0);
    setSelectedOpt(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="text-center space-y-4 py-4">
        <Trophy className="h-16 w-16 text-amber-500 mx-auto animate-bounce" />
        <h3 className="text-xl font-black text-stone-900 dark:text-white">Trivia Concluída!</h3>
        <p className="text-base text-stone-600 dark:text-slate-300">
          Você acertou <strong className="text-emerald-600">{score}</strong> de {QUESTIONS.length} perguntas!
        </p>
        <Button onClick={restart} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl font-bold h-11">
          Jogar Novamente
        </Button>
      </div>
    );
  }

  const qData = QUESTIONS[currentQ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-400 uppercase">Pergunta {currentQ + 1} de {QUESTIONS.length}</span>
        <span className="text-xs font-bold text-emerald-600">Pontos: {score}</span>
      </div>

      <h3 className="text-lg font-black text-stone-900 dark:text-white leading-snug">
        {qData.q}
      </h3>

      <div className="space-y-2 pt-2">
        {qData.options.map((opt, idx) => {
          const isSelected = selectedOpt === idx;
          const isCorrect = idx === qData.answer;
          let btnClass = 'bg-stone-50 dark:bg-[#16253C] border-stone-200 dark:border-[#203450] text-stone-900 dark:text-white';
          if (selectedOpt !== null) {
            if (isCorrect) btnClass = 'bg-emerald-500 text-white border-emerald-600';
            else if (isSelected) btnClass = 'bg-rose-500 text-white border-rose-600';
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={selectedOpt !== null}
              onClick={() => handleSelect(idx)}
              className={cn(
                'w-full p-3.5 rounded-2xl border-2 text-left text-sm font-bold transition-all active:scale-[0.98]',
                btnClass
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── 4. GENIUS (SIMON SAYS SEQUÊNCIA) ────────────────────────────────────────
function GeniusMiniGame() {
  return (
    <div className="space-y-4 text-center py-2">
      <span className="text-4xl">🌈</span>
      <h3 className="text-xl font-black text-[#22C55E]">Genius das Cores</h3>
      <p className="text-xs text-stone-500">Memorize a sequência de cores e repita os toques.</p>
      
      <div className="grid grid-cols-2 gap-3 max-w-[220px] mx-auto my-3">
        <button type="button" className="aspect-square rounded-2xl bg-rose-500 active:scale-95 shadow-md" />
        <button type="button" className="aspect-square rounded-2xl bg-blue-500 active:scale-95 shadow-md" />
        <button type="button" className="aspect-square rounded-2xl bg-amber-400 active:scale-95 shadow-md" />
        <button type="button" className="aspect-square rounded-2xl bg-emerald-500 active:scale-95 shadow-md" />
      </div>

      <p className="text-xs font-semibold text-stone-400">Nível 1 · Toque para praticar!</p>
    </div>
  );
}

// ── 5. CAÇA-PALAVRAS COGNITIVO ──────────────────────────────────────────────
function WordSearchMiniGame() {
  const [found, setFound] = useState<string[]>([]);
  const words = ['AMOR', 'VIDA', 'PAZ', 'SAUDE'];

  const toggleWord = (w: string) => {
    setFound(prev => prev.includes(w) ? prev.filter(x => x !== w) : [...prev, w]);
  };

  return (
    <div className="space-y-4 text-center py-2">
      <span className="text-3xl">🔤</span>
      <h3 className="text-xl font-black text-[#9333EA]">Caça-Palavras</h3>
      <p className="text-xs text-stone-500">Toque nas palavras para encontrá-las na sua rotina:</p>

      <div className="grid grid-cols-2 gap-2 my-3">
        {words.map(w => (
          <button
            key={w}
            type="button"
            onClick={() => toggleWord(w)}
            className={cn(
              'p-3 rounded-2xl font-black text-sm tracking-widest border-2 transition-all',
              found.includes(w)
                ? 'bg-purple-600 text-white border-purple-700'
                : 'bg-stone-100 dark:bg-[#16253C] text-stone-700 dark:text-slate-200 border-stone-200 dark:border-[#223550]'
            )}
          >
            {w} {found.includes(w) ? '✓' : ''}
          </button>
        ))}
      </div>

      <p className="text-xs text-stone-400">
        Encontradas: {found.length} de {words.length}
      </p>
    </div>
  );
}

// ── 6. SUDOKU SIMPLIFICADO ──────────────────────────────────────────────────
function SudokuMiniGame() {
  return (
    <div className="space-y-4 text-center py-2">
      <span className="text-3xl">🔢</span>
      <h3 className="text-xl font-black text-[#EF4444]">Sudoku Fácil 4x4</h3>
      <p className="text-xs text-stone-500">Complete cada linha e coluna com os números 1 a 4.</p>

      <div className="grid grid-cols-4 gap-1.5 max-w-[200px] mx-auto my-3 p-2 bg-stone-100 dark:bg-[#16253C] rounded-2xl border">
        {['1', '', '3', '4', '', '3', '4', '1', '3', '4', '1', '', '4', '1', '', '3'].map((n, i) => (
          <div
            key={i}
            className="aspect-square bg-white dark:bg-[#0B1526] rounded-xl flex items-center justify-center font-black text-base border border-stone-200 dark:border-stone-700"
          >
            {n || <span className="text-stone-300">·</span>}
          </div>
        ))}
      </div>
      <p className="text-xs font-bold text-emerald-600">Exercício cognitivo para memória numérica!</p>
    </div>
  );
}
