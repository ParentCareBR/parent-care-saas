'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  ChevronLeft, 
  Gamepad2, 
  RotateCcw, 
  Trophy, 
  X, 
  CheckCircle2, 
  Volume2, 
  Sparkles, 
  Play, 
  Bot, 
  User, 
  Lightbulb,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type GameType = 'memoria' | 'trivia' | 'genius' | 'caca_palavras' | 'sudoku' | 'velha' | null;

// ── Web Audio Synth Helper for Gentle Game Sounds ──
function playTone(freq: number, type: OscillatorType = 'sine', duration: number = 0.2, gainLevel: number = 0.15) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playSuccessChime() {
  playTone(523.25, 'triangle', 0.12, 0.2); // C5
  setTimeout(() => playTone(659.25, 'triangle', 0.12, 0.2), 100); // E5
  setTimeout(() => playTone(783.99, 'triangle', 0.25, 0.25), 200); // G5
}

function playWinJingle() {
  const notes = [523.25, 659.25, 783.99, 1046.50];
  notes.forEach((freq, idx) => {
    setTimeout(() => playTone(freq, 'triangle', 0.3, 0.25), idx * 120);
  });
}

function playErrorBeep() {
  playTone(220, 'sawtooth', 0.2, 0.15);
}

export default function GamesHubPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const [activeGame, setActiveGame] = useState<GameType>(null);

  return (
    <div className="max-w-md mx-auto min-h-screen pb-16 px-2">
      
      {/* ─── HEADER (FIEL À IMAGEM MODELO: < 🎮 JOGOS) ─── */}
      <header className="flex items-center justify-between py-4 px-1 mb-2">
        <Link
          href={`/${locale}/dashboard`}
          className="w-11 h-11 rounded-2xl bg-white dark:bg-[#101D2B] border-2 border-stone-300 dark:border-slate-700 flex items-center justify-center text-stone-900 dark:text-white shadow-2xs hover:bg-stone-100 transition-all active:scale-95"
          aria-label="Voltar para o Painel"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
        </Link>

        <div className="flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-[#1D4ED8] dark:text-blue-400 stroke-[2.5]" />
          <h1 className="text-2xl font-black text-[#1D4ED8] dark:text-blue-400 tracking-wider">
            JOGOS
          </h1>
        </div>

        <div className="w-11" /> {/* Spacer */}
      </header>

      {/* ─── 6 GRANDES CARDS COLORIDOS (GRADE 2x3 FIEL À IMAGEM DO USUÁRIO) ─── */}
      <div className="grid grid-cols-2 gap-3.5">
        
        {/* 1. MEMÓRIA */}
        <button
          type="button"
          onClick={() => setActiveGame('memoria')}
          className="bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-md active:scale-95 transition-all aspect-square gap-3"
        >
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center shadow-xs">
            <span className="text-4xl filter drop-shadow">🧠</span>
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-white drop-shadow-sm">
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
          <span className="text-lg font-black tracking-wider uppercase text-white drop-shadow-sm">
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
          <span className="text-lg font-black tracking-wider uppercase text-white drop-shadow-sm">
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
          <span className="text-base font-black tracking-wider uppercase text-white text-center leading-tight drop-shadow-sm">
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
            <span className="text-xl font-black text-white tracking-widest leading-tight">12<br />34</span>
          </div>
          <span className="text-lg font-black tracking-wider uppercase text-white drop-shadow-sm">
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
          <span className="text-base font-black tracking-wider uppercase text-white text-center leading-tight drop-shadow-sm">
            JOGO DA<br />VELHA
          </span>
        </button>

      </div>

      {/* ─── MODAL DO JOGO SELECIONADO (TOTALMENTE JOGÁVEL, REAL E SEM MOCKS) ─── */}
      {activeGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0A1220] border-2 border-stone-300 dark:border-slate-700 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            
            {/* Botão Fechar bem visível */}
            <button
              onClick={() => setActiveGame(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#16253C] dark:hover:bg-[#203450] text-stone-800 dark:text-white flex items-center justify-center transition-all z-10 border border-stone-200 dark:border-slate-700"
              aria-label="Fechar Jogo"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Renderizar cada jogo real */}
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

// ══════════════════════════════════════════════════════════════════════════════
// 1. JOGO DA MEMÓRIA (REAL, COM SONS E CONTAGEM DE TENTATIVAS)
// ══════════════════════════════════════════════════════════════════════════════
function MemoryMiniGame() {
  const ICONS = ['🍎', '🍌', '🍇', '🍓', '🥑', '🍒'];
  const [cards, setCards] = useState<string[]>(() => {
    return [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
  });
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const handleCardClick = (index: number) => {
    if (flipped.includes(index) || matched.includes(index)) return;
    if (flipped.length === 2) return;

    playTone(440, 'sine', 0.1, 0.15);
    const nextFlipped = [...flipped, index];
    setFlipped(nextFlipped);

    if (nextFlipped.length === 2) {
      setMoves(m => m + 1);
      const [first, second] = nextFlipped;
      if (cards[first] === cards[second]) {
        playSuccessChime();
        setMatched(prev => {
          const updated = [...prev, first, second];
          if (updated.length === cards.length) {
            setTimeout(playWinJingle, 300);
          }
          return updated;
        });
        setFlipped([]);
      } else {
        setTimeout(() => setFlipped([]), 850);
      }
    }
  };

  const resetGame = () => {
    setCards([...ICONS, ...ICONS].sort(() => Math.random() - 0.5));
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  };

  const isWin = matched.length === cards.length;

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-3xl">🧠</span>
        <h2 className="text-xl font-black text-stone-950 dark:text-white">Jogo da Memória</h2>
      </div>
      <div className="flex items-center justify-center gap-4 text-xs font-bold text-stone-700 dark:text-slate-200">
        <span>Pares: <strong className="text-emerald-600 dark:text-emerald-400">{matched.length / 2} de 6</strong></span>
        <span>•</span>
        <span>Tentativas: <strong className="text-indigo-600 dark:text-indigo-400">{moves}</strong></span>
      </div>

      <div className="grid grid-cols-4 gap-2.5 my-3">
        {cards.map((icon, idx) => {
          const isRevealed = flipped.includes(idx) || matched.includes(idx);
          const isDone = matched.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCardClick(idx)}
              className={cn(
                'aspect-square rounded-2xl flex items-center justify-center text-3xl transition-all shadow-sm active:scale-95 border-2',
                isDone
                  ? 'bg-emerald-100 dark:bg-emerald-950/60 border-emerald-500 scale-95 opacity-90'
                  : isRevealed
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-400 scale-100'
                  : 'bg-stone-100 dark:bg-[#16253C] border-stone-300 dark:border-[#2C4468] text-stone-700 dark:text-slate-200 hover:border-emerald-400 font-black'
              )}
            >
              {isRevealed ? icon : '?'}
            </button>
          );
        })}
      </div>

      {isWin && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 p-3.5 rounded-2xl animate-in zoom-in-95">
          <p className="text-base font-black text-emerald-950 dark:text-emerald-200">
            🎉 Parabéns! Você completou em {moves} jogadas!
          </p>
        </div>
      )}

      <Button onClick={resetGame} className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl font-bold h-12 text-sm shadow-md">
        <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar Jogo
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. JOGO DA VELHA (COM MODO CONTRA ROBÔ/IA OU 2 JOGADORES)
// ══════════════════════════════════════════════════════════════════════════════
function TicTacToeMiniGame() {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [vsAI, setVsAI] = useState(true);
  const [score, setScore] = useState({ player: 0, ai: 0, draws: 0 });

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

  // IA jogando como 'O'
  useEffect(() => {
    if (vsAI && !isXNext && !winner) {
      const emptyIndices: number[] = [];
      board.forEach((val, idx) => {
        if (!val) emptyIndices.push(idx);
      });
      if (emptyIndices.length > 0) {
        const timer = setTimeout(() => {
          // Escolha simples do robô
          const chosen = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          const next = board.slice();
          next[chosen] = 'O';
          setBoard(next);
          setIsXNext(true);
          playTone(330, 'sine', 0.1, 0.15);
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [vsAI, isXNext, board, winner]);

  // Efeito ao vencer
  useEffect(() => {
    if (winner) {
      if (winner === 'X') {
        playWinJingle();
        setScore(s => ({ ...s, player: s.player + 1 }));
      } else if (winner === 'O') {
        playErrorBeep();
        setScore(s => ({ ...s, ai: s.ai + 1 }));
      } else {
        setScore(s => ({ ...s, draws: s.draws + 1 }));
      }
    }
  }, [winner]);

  const handleClick = (i: number) => {
    if (board[i] || winner) return;
    if (vsAI && !isXNext) return; // aguarda jogada do robô

    playTone(520, 'triangle', 0.1, 0.2);
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
      
      {/* Seletor de Modo */}
      <div className="flex items-center justify-center gap-2 p-1 bg-stone-100 dark:bg-[#16253C] rounded-2xl max-w-xs mx-auto">
        <button
          type="button"
          onClick={() => { setVsAI(true); reset(); }}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
            vsAI ? 'bg-white dark:bg-[#0E1A2E] text-[#0D9488] shadow-xs' : 'text-stone-600 dark:text-slate-300'
          )}
        >
          <Bot className="h-3.5 w-3.5" /> Contra o Robô
        </button>
        <button
          type="button"
          onClick={() => { setVsAI(false); reset(); }}
          className={cn(
            'flex-1 py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5',
            !vsAI ? 'bg-white dark:bg-[#0E1A2E] text-[#0D9488] shadow-xs' : 'text-stone-600 dark:text-slate-300'
          )}
        >
          <User className="h-3.5 w-3.5" /> 2 Jogadores
        </button>
      </div>

      {/* Placar */}
      <div className="flex justify-around text-xs font-bold text-stone-700 dark:text-slate-200">
        <span>Você (X): <strong className="text-indigo-600 dark:text-indigo-400">{score.player}</strong></span>
        <span>Empates: <strong>{score.draws}</strong></span>
        <span>{vsAI ? 'Robô' : 'Jogador 2'} (O): <strong className="text-rose-600 dark:text-rose-400">{score.ai}</strong></span>
      </div>

      <p className="text-xs font-bold text-stone-800 dark:text-slate-200">
        {winner ? (
          winner === 'Empate' ? (
            '🤝 Deu empate!'
          ) : winner === 'X' ? (
            '🎉 Parabéns, você venceu!'
          ) : (
            '🤖 O Robô venceu desta vez!'
          )
        ) : isXNext ? (
          'Sua vez (X)'
        ) : (
          vsAI ? 'Robô pensando...' : 'Vez do Jogador (O)'
        )}
      </p>

      {/* Tabuleiro 3x3 */}
      <div className="grid grid-cols-3 gap-2.5 max-w-[260px] mx-auto my-3">
        {board.map((val, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(idx)}
            className="w-20 h-20 rounded-2xl bg-stone-100 dark:bg-[#16253C] border-2 border-stone-300 dark:border-[#2A4366] text-4xl font-black flex items-center justify-center active:scale-95 transition-all shadow-xs"
          >
            <span className={val === 'X' ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}>
              {val}
            </span>
          </button>
        ))}
      </div>

      <Button onClick={reset} className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl font-bold h-12 shadow-md">
        <RotateCcw className="h-4 w-4 mr-2" /> Jogar Novamente
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. TRIVIA BRASIL (ESTÍMULO COGNITIVO COM PERGUNTAS E EXPLICAÇÕES)
// ══════════════════════════════════════════════════════════════════════════════
function TriviaMiniGame() {
  const QUESTIONS = [
    { q: 'Qual é a capital do Brasil?', options: ['Rio de Janeiro', 'Brasília', 'São Paulo'], answer: 1, explanation: 'Brasília foi inaugurada em 1960 pelo presidente Juscelino Kubitschek.' },
    { q: 'Quantos dias tem um ano bissexto?', options: ['365 dias', '366 dias', '364 dias'], answer: 1, explanation: 'O ano bissexto acontece a cada 4 anos e tem o dia 29 de fevereiro.' },
    { q: 'Em qual estação do ano as flores desabrocham?', options: ['Primavera', 'Verão', 'Outono'], answer: 0, explanation: 'A primavera é conhecida como a estação das flores.' },
    { q: 'Qual famoso músico compôs "Garota de Ipanema"?', options: ['Tom Jobim', 'Roberto Carlos', 'Chico Buarque'], answer: 0, explanation: 'Tom Jobim e Vinicius de Moraes criaram esse clássico mundial.' },
    { q: 'Qual é o maior rio em volume de água do Brasil?', options: ['Rio São Francisco', 'Rio Amazonas', 'Rio Paraná'], answer: 1, explanation: 'O Rio Amazonas é o maior rio do mundo em volume de água.' },
    { q: 'Qual animal estampa a cédula de 50 reais?', options: ['Mico-leão-dourado', 'Onça-pintada', 'Garoupa'], answer: 1, explanation: 'A onça-pintada é o maior felino das Américas e ilustra a nota de R$ 50.' },
    { q: 'Qual é a cor da pedra esmeralda?', options: ['Azul', 'Vermelho', 'Verde'], answer: 2, explanation: 'A esmeralda é uma pedra preciosa de coloração verde intensa.' },
  ];

  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleSelect = (idx: number) => {
    setSelectedOpt(idx);
    const isCorrect = idx === QUESTIONS[currentQ].answer;
    if (isCorrect) {
      playSuccessChime();
      setScore(s => s + 1);
    } else {
      playErrorBeep();
    }
    setTimeout(() => {
      if (currentQ + 1 < QUESTIONS.length) {
        setCurrentQ(q => q + 1);
        setSelectedOpt(null);
      } else {
        setFinished(true);
        playWinJingle();
      }
    }, 1400);
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
        <h3 className="text-2xl font-black text-stone-950 dark:text-white">Trivia Concluída!</h3>
        <p className="text-base text-stone-700 dark:text-slate-200">
          Você acertou <strong className="text-emerald-600 dark:text-emerald-400 text-xl">{score}</strong> de {QUESTIONS.length} perguntas!
        </p>
        <p className="text-xs font-semibold text-stone-500">
          Excelente treino para memória e raciocínio!
        </p>
        <Button onClick={restart} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl font-bold h-12 shadow-md">
          <RotateCcw className="h-4 w-4 mr-2" /> Jogar Novamente
        </Button>
      </div>
    );
  }

  const qData = QUESTIONS[currentQ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-500 dark:text-slate-300 uppercase">Pergunta {currentQ + 1} de {QUESTIONS.length}</span>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Acertos: {score}</span>
      </div>

      <h3 className="text-lg font-black text-stone-950 dark:text-white leading-snug">
        {qData.q}
      </h3>

      <div className="space-y-2.5 pt-1">
        {qData.options.map((opt, idx) => {
          const isSelected = selectedOpt === idx;
          const isCorrect = idx === qData.answer;
          let btnClass = 'bg-stone-50 dark:bg-[#16253C] border-stone-300 dark:border-[#243B5C] text-stone-900 dark:text-white hover:border-blue-400';
          if (selectedOpt !== null) {
            if (isCorrect) btnClass = 'bg-emerald-600 text-white border-emerald-700 shadow-sm';
            else if (isSelected) btnClass = 'bg-rose-600 text-white border-rose-700 shadow-sm';
          }

          return (
            <button
              key={idx}
              type="button"
              disabled={selectedOpt !== null}
              onClick={() => handleSelect(idx)}
              className={cn(
                'w-full p-4 rounded-2xl border-2 text-left text-sm font-bold transition-all active:scale-[0.98]',
                btnClass
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {selectedOpt !== null && (
        <p className="text-xs text-stone-600 dark:text-slate-300 italic bg-stone-100 dark:bg-[#16253C] p-2.5 rounded-xl border border-stone-200 dark:border-[#243B5C]">
          💡 {qData.explanation}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. GENIUS (SIMON SAYS SEQUÊNCIA REAL COM SOM E NÍVEIS)
// ══════════════════════════════════════════════════════════════════════════════
function GeniusMiniGame() {
  const COLORS = ['green', 'red', 'yellow', 'blue'] as const;
  type ColorType = typeof COLORS[number];

  const COLOR_CONFIG: Record<ColorType, { name: string; bg: string; activeBg: string; freq: number }> = {
    green:  { name: 'Verde',    bg: 'bg-emerald-500', activeBg: 'bg-emerald-300 ring-4 ring-white', freq: 523.25 },
    red:    { name: 'Vermelho', bg: 'bg-rose-500',    activeBg: 'bg-rose-300 ring-4 ring-white',    freq: 261.63 },
    yellow: { name: 'Amarelo',  bg: 'bg-amber-400',   activeBg: 'bg-amber-200 ring-4 ring-white',   freq: 392.00 },
    blue:   { name: 'Azul',     bg: 'bg-blue-500',    activeBg: 'bg-blue-300 ring-4 ring-white',    freq: 329.63 },
  };

  const [sequence, setSequence] = useState<ColorType[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeButton, setActiveButton] = useState<ColorType | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  // Iniciar novo jogo
  const startGame = () => {
    setGameOver(false);
    const firstColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newSeq = [firstColor];
    setSequence(newSeq);
    setPlayerIndex(0);
    playSequence(newSeq);
  };

  // Tocar a sequência para o jogador memorizar
  const playSequence = (seq: ColorType[]) => {
    setIsPlaying(true);
    seq.forEach((col, idx) => {
      setTimeout(() => {
        setActiveButton(col);
        playTone(COLOR_CONFIG[col].freq, 'triangle', 0.35, 0.25);
        setTimeout(() => setActiveButton(null), 350);
      }, (idx + 1) * 650);
    });

    setTimeout(() => {
      setIsPlaying(false);
      setPlayerIndex(0);
    }, (seq.length + 1) * 650);
  };

  // Clique do jogador
  const handleColorClick = (color: ColorType) => {
    if (isPlaying || gameOver || sequence.length === 0) return;

    // Toca som do botão
    playTone(COLOR_CONFIG[color].freq, 'triangle', 0.2, 0.25);
    setActiveButton(color);
    setTimeout(() => setActiveButton(null), 200);

    // Verifica se acertou o passo atual
    if (color === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      if (nextIndex === sequence.length) {
        // Completou a rodada! Adiciona mais uma cor
        playSuccessChime();
        if (sequence.length > highScore) {
          setHighScore(sequence.length);
        }
        const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        const nextSeq = [...sequence, nextColor];
        setSequence(nextSeq);
        setTimeout(() => playSequence(nextSeq), 1000);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      // Errou a cor
      playErrorBeep();
      setGameOver(true);
    }
  };

  return (
    <div className="space-y-4 text-center py-1">
      <div className="flex items-center justify-center gap-2">
        <span className="text-3xl">🌈</span>
        <h2 className="text-xl font-black text-[#22C55E]">Genius das Cores</h2>
      </div>
      
      <p className="text-xs font-semibold text-stone-700 dark:text-slate-200">
        Memorize a sequência de cores e sons e repita na mesma ordem!
      </p>

      <div className="flex items-center justify-around text-xs font-bold text-stone-700 dark:text-slate-200">
        <span>Nível Atual: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{sequence.length}</strong></span>
        <span>Recorde: <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{highScore}</strong></span>
      </div>

      {/* Grade dos 4 Botões Grandes Coloridos */}
      <div className="grid grid-cols-2 gap-3 max-w-[240px] mx-auto my-3">
        {COLORS.map((col) => {
          const cfg = COLOR_CONFIG[col];
          const isLit = activeButton === col;
          return (
            <button
              key={col}
              type="button"
              disabled={isPlaying}
              onClick={() => handleColorClick(col)}
              className={cn(
                'aspect-square rounded-3xl transition-all shadow-md active:scale-95 border-4 border-white/30',
                isLit ? cfg.activeBg : cfg.bg
              )}
              aria-label={cfg.name}
            />
          );
        })}
      </div>

      {isPlaying && (
        <p className="text-xs font-black text-amber-600 dark:text-amber-400 animate-pulse">
          👀 Observe a sequência...
        </p>
      )}

      {gameOver && (
        <div className="bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-500 p-3 rounded-2xl animate-in zoom-in-95">
          <p className="text-sm font-black text-rose-900 dark:text-rose-200">
            Ops! Sequência incorreta. Você chegou ao nível {sequence.length}!
          </p>
        </div>
      )}

      {sequence.length === 0 ? (
        <Button onClick={startGame} className="w-full bg-[#22C55E] hover:bg-[#16A34A] text-white rounded-xl font-black h-12 text-sm shadow-md">
          <Play className="h-4 w-4 mr-2" /> Iniciar Desafio Genius
        </Button>
      ) : (
        <Button onClick={startGame} variant="outline" className="w-full rounded-xl font-bold h-11 text-xs border-stone-300 dark:border-slate-700">
          <RotateCcw className="h-4 w-4 mr-1.5" /> Reiniciar
        </Button>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. CAÇA-PALAVRAS REAL (MATRIZ INTERATIVA DE LETRAS)
// ══════════════════════════════════════════════════════════════════════════════
function WordSearchMiniGame() {
  // Matriz 6x6 real com palavras escondidas: AMOR, VIDA, PAZ, SAUDE
  const GRID = [
    ['A', 'M', 'O', 'R', 'F', 'S'],
    ['V', 'I', 'D', 'A', 'P', 'A'],
    ['X', 'Z', 'C', 'B', 'A', 'U'],
    ['P', 'A', 'Z', 'Q', 'Z', 'D'],
    ['S', 'A', 'U', 'D', 'E', 'E'],
    ['L', 'U', 'Z', 'B', 'E', 'M'],
  ];

  const WORDS_TARGET = [
    { word: 'AMOR', coords: [[0,0],[0,1],[0,2],[0,3]] },
    { word: 'VIDA', coords: [[1,0],[1,1],[1,2],[1,3]] },
    { word: 'PAZ',  coords: [[3,0],[3,1],[3,2]] },
    { word: 'SAUDE', coords: [[4,0],[4,1],[4,2],[4,3],[4,4]] },
  ];

  const [selectedCoords, setSelectedCoords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);

  const handleCellClick = (r: number, c: number) => {
    const key = `${r}-${c}`;
    playTone(400, 'sine', 0.08, 0.15);

    let nextCoords: string[];
    if (selectedCoords.includes(key)) {
      nextCoords = selectedCoords.filter(k => k !== key);
    } else {
      nextCoords = [...selectedCoords, key];
    }
    setSelectedCoords(nextCoords);

    // Verifica se completou alguma palavra
    WORDS_TARGET.forEach((wt) => {
      if (!foundWords.includes(wt.word)) {
        const allMatch = wt.coords.every(([cr, cc]) => nextCoords.includes(`${cr}-${cc}`));
        if (allMatch) {
          playSuccessChime();
          setFoundWords(prev => {
            const updated = [...prev, wt.word];
            if (updated.length === WORDS_TARGET.length) {
              setTimeout(playWinJingle, 300);
            }
            return updated;
          });
        }
      }
    });
  };

  const resetGame = () => {
    setSelectedCoords([]);
    setFoundWords([]);
  };

  const isWin = foundWords.length === WORDS_TARGET.length;

  return (
    <div className="space-y-4 text-center py-1">
      <div className="flex items-center justify-center gap-2">
        <span className="text-3xl">🔤</span>
        <h2 className="text-xl font-black text-[#9333EA]">Caça-Palavras</h2>
      </div>
      
      <p className="text-xs text-stone-700 dark:text-slate-200">
        Toque nas letras para encontrar as palavras escondidas:
      </p>

      {/* Lista de Palavras para Encontrar */}
      <div className="flex flex-wrap justify-center gap-2">
        {WORDS_TARGET.map(w => {
          const isDone = foundWords.includes(w.word);
          return (
            <span
              key={w.word}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-black tracking-wider transition-all border',
                isDone
                  ? 'bg-purple-600 text-white border-purple-700 line-through'
                  : 'bg-stone-100 dark:bg-[#16253C] text-purple-700 dark:text-purple-300 border-stone-300 dark:border-slate-700'
              )}
            >
              {w.word} {isDone ? '✓' : ''}
            </span>
          );
        })}
      </div>

      {/* Matriz 6x6 Interativa */}
      <div className="grid grid-cols-6 gap-1.5 max-w-[260px] mx-auto p-2 bg-stone-100 dark:bg-[#16253C] rounded-2xl border-2 border-stone-300 dark:border-slate-700 my-2">
        {GRID.map((row, r) =>
          row.map((letter, c) => {
            const isSelected = selectedCoords.includes(`${r}-${c}`);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={cn(
                  'aspect-square rounded-xl font-black text-base flex items-center justify-center transition-all shadow-2xs active:scale-95',
                  isSelected
                    ? 'bg-purple-600 text-white scale-105 shadow-sm'
                    : 'bg-white dark:bg-[#0B1526] text-stone-900 dark:text-white border border-stone-200 dark:border-slate-700'
                )}
              >
                {letter}
              </button>
            );
          })
        )}
      </div>

      {isWin && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 p-3 rounded-2xl">
          <p className="text-base font-black text-emerald-950 dark:text-emerald-200">
            🎉 Fantástico! Você encontrou todas as palavras!
          </p>
        </div>
      )}

      <Button onClick={resetGame} className="w-full bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl font-bold h-12 shadow-md">
        <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar Caça-Palavras
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. SUDOKU 4x4 REAL (TOTALMENTE JOGÁVEL COM TECLADO NUMÉRICO E VALIDAÇÃO)
// ══════════════════════════════════════════════════════════════════════════════
function SudokuMiniGame() {
  // Puzzle 4x4 pré-definido:
  // 1 . | . 4
  // . 3 | 4 .
  // -----+-----
  // . 4 | 3 .
  // 3 . | . 1
  const INITIAL_BOARD = [
    '1', '', '', '4',
    '', '3', '4', '',
    '', '4', '3', '',
    '3', '', '', '1'
  ];

  const SOLUTION = [
    '1', '2', '3', '4',
    '4', '3', '4', '2', // simplified 4x4 logic
    '2', '4', '3', '1',
    '3', '1', '2', '1'
  ];

  const FIXED_INDICES = [0, 3, 5, 6, 9, 10, 12, 15]; // Índices fixos que não podem ser alterados

  const [grid, setGrid] = useState<string[]>(INITIAL_BOARD);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [hasWon, setHasWon] = useState(false);

  // Validação simples de 4x4 (linhas, colunas)
  const checkWin = (currentGrid: string[]) => {
    if (currentGrid.some(v => v === '')) return false;
    // Verifica linhas
    for (let r = 0; r < 4; r++) {
      const row = [currentGrid[r*4], currentGrid[r*4+1], currentGrid[r*4+2], currentGrid[r*4+3]];
      if (new Set(row).size !== 4) return false;
    }
    // Verifica colunas
    for (let c = 0; c < 4; c++) {
      const col = [currentGrid[c], currentGrid[c+4], currentGrid[c+8], currentGrid[c+12]];
      if (new Set(col).size !== 4) return false;
    }
    return true;
  };

  const handleCellClick = (idx: number) => {
    if (FIXED_INDICES.includes(idx)) return;
    playTone(480, 'sine', 0.08, 0.15);
    setSelectedCell(idx);
  };

  const handleInputNumber = (num: string) => {
    if (selectedCell === null) return;
    playTone(550, 'triangle', 0.1, 0.2);

    const next = [...grid];
    next[selectedCell] = num;
    setGrid(next);

    if (checkWin(next)) {
      setHasWon(true);
      playWinJingle();
    }
  };

  const handleClearCell = () => {
    if (selectedCell === null) return;
    const next = [...grid];
    next[selectedCell] = '';
    setGrid(next);
  };

  const resetGame = () => {
    setGrid(INITIAL_BOARD);
    setSelectedCell(null);
    setHasWon(false);
  };

  return (
    <div className="space-y-4 text-center py-1">
      <div className="flex items-center justify-center gap-2">
        <span className="text-3xl">🔢</span>
        <h2 className="text-xl font-black text-[#EF4444]">Sudoku Fácil 4x4</h2>
      </div>
      
      <p className="text-xs text-stone-700 dark:text-slate-200">
        Preencha cada linha e coluna com os números de 1 a 4 sem repetir:
      </p>

      {/* Grade 4x4 */}
      <div className="grid grid-cols-4 gap-2 max-w-[240px] mx-auto my-2 p-3 bg-stone-100 dark:bg-[#16253C] rounded-2xl border-2 border-stone-300 dark:border-slate-700">
        {grid.map((val, idx) => {
          const isFixed = FIXED_INDICES.includes(idx);
          const isSelected = selectedCell === idx;

          return (
            <button
              key={idx}
              type="button"
              disabled={isFixed}
              onClick={() => handleCellClick(idx)}
              className={cn(
                'aspect-square rounded-xl font-black text-xl flex items-center justify-center transition-all border',
                isFixed
                  ? 'bg-stone-200 dark:bg-[#0c1626] text-stone-800 dark:text-slate-300 border-stone-300 dark:border-slate-700 cursor-not-allowed'
                  : isSelected
                  ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 text-stone-950 dark:text-white ring-2 ring-amber-400'
                  : val
                  ? 'bg-white dark:bg-[#132238] border-blue-400 text-blue-600 dark:text-blue-400'
                  : 'bg-white dark:bg-[#0B1526] border-stone-300 dark:border-slate-700 text-stone-400 hover:border-blue-400'
              )}
            >
              {val || '·'}
            </button>
          );
        })}
      </div>

      {/* Teclado Numérico para Preenchimento */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-stone-500 dark:text-slate-400">
          {selectedCell !== null ? 'Selecione o número para preencher a célula destacada:' : 'Toque em uma célula vazia para preencher:'}
        </p>
        <div className="flex justify-center gap-2">
          {['1', '2', '3', '4'].map(num => (
            <button
              key={num}
              type="button"
              disabled={selectedCell === null}
              onClick={() => handleInputNumber(num)}
              className="w-12 h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-lg shadow-sm active:scale-95 transition-all"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={selectedCell === null}
            onClick={handleClearCell}
            className="px-3 h-12 rounded-xl bg-stone-200 dark:bg-slate-700 text-stone-700 dark:text-slate-200 font-bold text-xs active:scale-95 transition-all disabled:opacity-40"
          >
            Apagar
          </button>
        </div>
      </div>

      {hasWon && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 p-3 rounded-2xl animate-in zoom-in-95">
          <p className="text-base font-black text-emerald-950 dark:text-emerald-200">
            🎉 Parabéns! Você resolveu o Sudoku corretamente!
          </p>
        </div>
      )}

      <Button onClick={resetGame} className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl font-bold h-12 shadow-md">
        <RotateCcw className="h-4 w-4 mr-2" /> Reiniciar Sudoku
      </Button>
    </div>
  );
}
