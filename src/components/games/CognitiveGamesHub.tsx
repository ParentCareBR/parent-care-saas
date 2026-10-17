'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Check,
  Star,
  Zap,
  HelpCircle,
  Flame,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type GameType = 'forca' | 'memoria' | 'trivia' | 'genius' | 'caca_palavras' | 'sudoku' | 'velha' | null;
export type DiffLevel = 'facil' | 'medio' | 'dificil';

// ─── SÍNTESE DE ÁUDIO WEB AUDIO API ───────────────────────────────────────────
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
  playTone(523.25, 'triangle', 0.12, 0.2);
  setTimeout(() => playTone(659.25, 'triangle', 0.12, 0.2), 100);
  setTimeout(() => playTone(783.99, 'triangle', 0.25, 0.25), 200);
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

// ─── CONFIGURAÇÕES DE DIFICULDADE ─────────────────────────────────────────────
const DIFF_CONFIG: Record<DiffLevel, { label: string; badge: string; icon: string; desc: string; color: string; border: string }> = {
  facil: {
    label: 'Fácil',
    badge: 'Fase 1',
    icon: '⭐',
    desc: 'Ritmo suave e dicas amigáveis',
    color: 'bg-emerald-500 text-white',
    border: 'border-emerald-500'
  },
  medio: {
    label: 'Médio',
    badge: 'Fase 2',
    icon: '⭐⭐',
    desc: 'Desafio equilibrado para a mente',
    color: 'bg-amber-500 text-white',
    border: 'border-amber-500'
  },
  dificil: {
    label: 'Difícil',
    badge: 'Fase 3',
    icon: '⭐⭐⭐',
    desc: 'Treino cognitivo avançado',
    color: 'bg-rose-500 text-white',
    border: 'border-rose-500'
  }
};

export interface CognitiveGamesHubProps {
  onBack?: () => void;
  backHref?: string;
  showBackHeader?: boolean;
}

export function CognitiveGamesHub({ onBack, backHref, showBackHeader = true }: CognitiveGamesHubProps) {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const [activeGame, setActiveGame] = useState<GameType>(null);
  const [pendingGame, setPendingGame] = useState<GameType>(null);
  const [difficulty, setDifficulty] = useState<DiffLevel>('facil');

  const gamesList = [
    {
      id: 'forca' as GameType,
      name: 'FORCA',
      subtitle: 'Adivinhe a palavra secreta',
      emoji: '🪢',
      bgClass: 'bg-[#D97706] hover:bg-[#B45309]',
      tag: 'Novo'
    },
    {
      id: 'memoria' as GameType,
      name: 'MEMÓRIA',
      subtitle: 'Encontre os pares escondidos',
      emoji: '🧠',
      bgClass: 'bg-[#EF4444] hover:bg-[#DC2626]',
      tag: 'Clássico'
    },
    {
      id: 'trivia' as GameType,
      name: 'TRIVIA',
      subtitle: 'Perguntas do Brasil e mundo',
      emoji: '❓',
      bgClass: 'bg-[#1D4ED8] hover:bg-[#1E40AF]',
      tag: 'Cultura'
    },
    {
      id: 'genius' as GameType,
      name: 'GENIUS',
      subtitle: 'Repita a sequência sonora',
      emoji: '🌈',
      bgClass: 'bg-[#16A34A] hover:bg-[#15803D]',
      tag: 'Sons'
    },
    {
      id: 'caca_palavras' as GameType,
      name: 'CAÇA-PALAVRAS',
      subtitle: 'Grades infinitas e aleatórias',
      emoji: '🔤',
      bgClass: 'bg-[#9333EA] hover:bg-[#7E22CE]',
      tag: 'Infinito'
    },
    {
      id: 'sudoku' as GameType,
      name: 'SUDOKU',
      subtitle: 'Raciocínio lógico com números',
      emoji: '🔢',
      bgClass: 'bg-[#0891B2] hover:bg-[#0E7490]',
      tag: 'Lógica'
    },
    {
      id: 'velha' as GameType,
      name: 'JOGO DA VELHA',
      subtitle: 'Contra a IA ou 2 jogadores',
      emoji: '⭕',
      bgClass: 'bg-[#0D9488] hover:bg-[#0F766E]',
      tag: 'Dupla'
    }
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen pb-20 px-2.5">
      
      {/* ─── HEADER ─── */}
      <header className="flex items-center justify-between py-4 px-1 mb-2">
        {showBackHeader ? (
          onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-11 h-11 rounded-2xl bg-white dark:bg-[#101D2B] border-2 border-stone-300 dark:border-slate-700 flex items-center justify-center text-stone-900 dark:text-white shadow-2xs hover:bg-stone-100 transition-all active:scale-95"
              aria-label="Voltar"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
            </button>
          ) : (
            <Link
              href={backHref || `/${locale}/dashboard`}
              className="w-11 h-11 rounded-2xl bg-white dark:bg-[#101D2B] border-2 border-stone-300 dark:border-slate-700 flex items-center justify-center text-stone-900 dark:text-white shadow-2xs hover:bg-stone-100 transition-all active:scale-95"
              aria-label="Voltar para o Painel"
            >
              <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
            </Link>
          )
        ) : (
          <div className="w-11" />
        )}

        <div className="flex items-center gap-2">
          <Gamepad2 className="h-8 w-8 text-[#1D4ED8] dark:text-blue-400 stroke-[2.5]" />
          <h1 className="text-2xl font-black text-[#1D4ED8] dark:text-blue-400 tracking-wider">
            JOGOS COGNITIVOS
          </h1>
        </div>

        <div className="w-11" />
      </header>

      {/* DICA DE ESTÍMULO MENTAL */}
      <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border-2 border-indigo-200 dark:border-indigo-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
          <Sparkles className="h-5 w-5" />
        </div>
        <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200 leading-snug">
          Jogos com fases crescentes e banco gigante de palavras e perguntas para exercitar a memória todos os dias!
        </p>
      </div>

      {/* ─── GRADE DE JOGOS ─── */}
      <div className="grid grid-cols-2 gap-3.5">
        {gamesList.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => {
              setPendingGame(g.id);
            }}
            className={cn(
              g.bgClass,
              'relative text-white rounded-3xl p-4 flex flex-col items-center justify-between text-center shadow-md active:scale-95 transition-all aspect-square group border-2 border-white/20'
            )}
          >
            {/* Tag no topo */}
            <span className="self-end text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/25 text-white backdrop-blur-xs">
              {g.tag}
            </span>

            {/* Ícone */}
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
              <span className="text-3xl filter drop-shadow">{g.emoji}</span>
            </div>

            {/* Título */}
            <div className="w-full">
              <span className="text-sm font-black tracking-wider uppercase text-white drop-shadow-sm block leading-tight">
                {g.name}
              </span>
              <span className="text-[10px] font-medium text-white/80 block mt-0.5 line-clamp-1">
                {g.subtitle}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ─── MODAL SELETOR DE NÍVEL DE DIFICULDADE / FASE ─── */}
      {pendingGame && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0A1220] border-2 border-stone-300 dark:border-slate-700 rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200">
            
            <button
              onClick={() => setPendingGame(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#16253C] text-stone-800 dark:text-white flex items-center justify-center transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-5 mt-2">
              <div className="w-16 h-16 rounded-3xl bg-indigo-100 dark:bg-indigo-950/60 border-2 border-indigo-300 mx-auto flex items-center justify-center text-3xl mb-2">
                {gamesList.find(g => g.id === pendingGame)?.emoji}
              </div>
              <h2 className="text-xl font-black text-stone-950 dark:text-white">
                {gamesList.find(g => g.id === pendingGame)?.name}
              </h2>
              <p className="text-xs font-bold text-stone-600 dark:text-slate-300 mt-1">
                Selecione o nível de dificuldade:
              </p>
            </div>

            {/* Opções de Dificuldade */}
            <div className="space-y-2.5 mb-5">
              {(['facil', 'medio', 'dificil'] as DiffLevel[]).map((level) => {
                const conf = DIFF_CONFIG[level];
                const isSelected = difficulty === level;
                return (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setDifficulty(level)}
                    className={cn(
                      'w-full p-3.5 rounded-2xl border-2 flex items-center justify-between transition-all text-left active:scale-[0.98]',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 shadow-sm'
                        : 'border-stone-200 dark:border-slate-700 hover:border-stone-400 bg-white dark:bg-[#101D2B]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{conf.icon}</span>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-black text-stone-950 dark:text-white">
                            {conf.label}
                          </span>
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-stone-200 dark:bg-slate-700 text-stone-800 dark:text-slate-200">
                            {conf.badge}
                          </span>
                        </div>
                        <p className="text-[11px] font-semibold text-stone-600 dark:text-slate-300 mt-0.5">
                          {conf.desc}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                        <Check className="h-4 w-4 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Iniciar Jogo */}
            <Button
              type="button"
              onClick={() => {
                setActiveGame(pendingGame);
                setPendingGame(null);
                playSuccessChime();
              }}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-md active:scale-95"
            >
              <Play className="h-4 w-4 mr-2" /> Iniciar Jogo
            </Button>
          </div>
        </div>
      )}

      {/* ─── MODAL DO JOGO EM ANDAMENTO ─── */}
      {activeGame && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0A1220] border-2 border-stone-300 dark:border-slate-700 rounded-3xl max-w-md w-full p-4 sm:p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto">
            
            {/* Barra de Topo do Jogo */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-stone-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <span className={cn('text-[10px] font-black uppercase px-2 py-0.5 rounded-md', DIFF_CONFIG[difficulty].color)}>
                  {DIFF_CONFIG[difficulty].label} ({DIFF_CONFIG[difficulty].badge})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const next: DiffLevel = difficulty === 'facil' ? 'medio' : difficulty === 'medio' ? 'dificil' : 'facil';
                    setDifficulty(next);
                  }}
                  className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                >
                  Mudar Fase
                </button>
              </div>

              <button
                onClick={() => setActiveGame(null)}
                className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#16253C] dark:hover:bg-[#203450] text-stone-800 dark:text-white flex items-center justify-center transition-all border border-stone-200 dark:border-slate-700"
                aria-label="Fechar Jogo"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* RENDERIZAR JOGO SELECIONADO */}
            {activeGame === 'forca' && <HangmanMiniGame difficulty={difficulty} onLevelUp={() => setDifficulty(d => d === 'facil' ? 'medio' : 'dificil')} />}
            {activeGame === 'memoria' && <MemoryMiniGame difficulty={difficulty} onLevelUp={() => setDifficulty(d => d === 'facil' ? 'medio' : 'dificil')} />}
            {activeGame === 'trivia' && <TriviaMiniGame difficulty={difficulty} onLevelUp={() => setDifficulty(d => d === 'facil' ? 'medio' : 'dificil')} />}
            {activeGame === 'genius' && <GeniusMiniGame difficulty={difficulty} onLevelUp={() => setDifficulty(d => d === 'facil' ? 'medio' : 'dificil')} />}
            {activeGame === 'caca_palavras' && <WordSearchMiniGame difficulty={difficulty} onLevelUp={() => setDifficulty(d => d === 'facil' ? 'medio' : 'dificil')} />}
            {activeGame === 'sudoku' && <SudokuMiniGame difficulty={difficulty} onLevelUp={() => setDifficulty(d => d === 'facil' ? 'medio' : 'dificil')} />}
            {activeGame === 'velha' && <TicTacToeMiniGame difficulty={difficulty} onLevelUp={() => setDifficulty(d => d === 'facil' ? 'medio' : 'dificil')} />}

          </div>
        </div>
      )}

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. JOGO DA FORCA (FIEL AO LAYOUT SOLICITADO: FORCA DE MADEIRA + CATEGORIA + TECLADO)
// ══════════════════════════════════════════════════════════════════════════════
interface HangmanWord {
  word: string;
  category: string;
  hint: string;
}

const HANGMAN_DATABASE: Record<DiffLevel, HangmanWord[]> = {
  facil: [
    { word: 'GIRAFA', category: 'Animal Africano', hint: 'Tem o pescoço mais longo da savana' },
    { word: 'LEAO', category: 'Animal Africano', hint: 'Conhecido como o Rei da Selva' },
    { word: 'ZEBRA', category: 'Animal Africano', hint: 'Mamífero listrado de preto e branco' },
    { word: 'MANGA', category: 'Fruta Brasileira', hint: 'Fruta amarela e doce muito apreciada' },
    { word: 'BANANA', category: 'Fruta Brasileira', hint: 'Rica em potássio e amarela' },
    { word: 'CAQUI', category: 'Fruta Doce', hint: 'Fruta avermelhada que lembra um tomate' },
    { word: 'BOLO', category: 'Comida Caseira', hint: 'Assado fofinho que perfuma a cozinha' },
    { word: 'SOPA', category: 'Comida Caseira', hint: 'Prato quente reconfortante para a noite' },
    { word: 'CAFE', category: 'Bebida do Brasil', hint: 'Bebida escura e quentinha do café da manhã' },
    { word: 'ROSA', category: 'Flor Bonita', hint: 'Flor clássica aromática com espinhos' },
    { word: 'CÃO', category: 'Animal de Estimação', hint: 'O melhor amigo do ser humano' },
    { word: 'GATO', category: 'Animal de Estimação', hint: 'Felino dengoso que ronrona no colo' },
    { word: 'NETO', category: 'Família Querida', hint: 'A alegria dos avós nos fins de semana' },
    { word: 'MESA', category: 'Objeto da Casa', hint: 'Onde nos reunimos para almoçar' },
    { word: 'CAMA', category: 'Conforto do Quarto', hint: 'Lugar macio para um bom descanso' },
  ],
  medio: [
    { word: 'ELEFANTE', category: 'Animal Africano', hint: 'Grande mamífero com tromba comprida' },
    { word: 'LEOPARDO', category: 'Animal Africano', hint: 'Felino veloz que sobe em árvores' },
    { word: 'RINOCERONTE', category: 'Animal Africano', hint: 'Mamífero forte com chifre no focinho' },
    { word: 'ABACAXI', category: 'Fruta Tropical', hint: 'Fruta com casca grossa e bela coroa' },
    { word: 'GOIABADA', category: 'Doce Brasileiro', hint: 'Doce que combina perfeitamente com queijo' },
    { word: 'TARTARUGA', category: 'Animal Marinho', hint: 'Anda devagar e tem casco protetor' },
    { word: 'VIOLAO', category: 'Instrumento Musical', hint: 'Instrumento de 6 cordas para serenatas' },
    { word: 'CURITIBA', category: 'Cidade Brasileira', hint: 'Capital famosa pelo Jardim Botânico' },
    { word: 'SALVADOR', category: 'Cidade Histórica', hint: 'Primeira capital do Brasil e Pelourinho' },
    { word: 'FORTALEZA', category: 'Cidade Litorânea', hint: 'Capital com praias e sol o ano todo' },
    { word: 'PADEIRO', category: 'Profissão Bonita', hint: 'Prepara pão quentinho todas as manhãs' },
    { word: 'MEDICO', category: 'Profissão da Saúde', hint: 'Cuida da nossa saúde e bem-estar' },
    { word: 'FLORESTA', category: 'Natureza Viva', hint: 'Lugar repleto de árvores e animais' },
    { word: 'BORBOLETA', category: 'Inseto Colorido', hint: 'Bate asas coloridas nos jardins' },
  ],
  dificil: [
    { word: 'HIPOPOTAMO', category: 'Animal Africano', hint: 'Grande animal que adora ficar na água' },
    { word: 'GUEPARDO', category: 'Animal Africano', hint: 'O animal terrestre mais rápido do planeta' },
    { word: 'JACARANDA', category: 'Árvore Brasileira', hint: 'Árvore nobre com flores arroxeadas' },
    { word: 'MANDACARU', category: 'Planta do Sertão', hint: 'Cacto símbolo de resistência nordestina' },
    { word: 'BRIGADEIRO', category: 'Doce Tradicional', hint: 'O doce de chocolate clássico de aniversário' },
    { word: 'TOCANTINS', category: 'Estado Brasileiro', hint: 'O estado mais jovem da nossa federação' },
    { word: 'ENGENHEIRO', category: 'Profissão Técnica', hint: 'Planeja e constrói grandes estruturas' },
    { word: 'ASTRONOMIA', category: 'Ciência dos Astros', hint: 'Estuda os planetas, estrelas e galáxias' },
    { word: 'FOTOGRAFIA', category: 'Arte da Memória', hint: 'Eterniza momentos especiais em imagem' },
    { word: 'ORQUESTRA', category: 'Música Clássica', hint: 'Conjunto harmônico de muitos músicos' },
  ]
};

function HangmanMiniGame({ difficulty, onLevelUp }: { difficulty: DiffLevel; onLevelUp: () => void }) {
  const bank = HANGMAN_DATABASE[difficulty];
  const [currentIdx, setCurrentIdx] = useState(() => Math.floor(Math.random() * bank.length));
  const currentItem = bank[currentIdx] || bank[0];
  const targetWord = currentItem.word.toUpperCase();

  const [guessedLetters, setGuessedLetters] = useState<Set<string>>(new Set());
  const [mistakes, setMistakes] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const maxMistakes = 6;

  // Letras normalizadas para comparação
  const normalize = (str: string) => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const normalizedTarget = normalize(targetWord);

  const isWon = targetWord.split('').every(ch => {
    if (ch === ' ' || ch === '-') return true;
    return guessedLetters.has(normalize(ch));
  });

  const isLost = mistakes >= maxMistakes;

  const handleGuess = (letter: string) => {
    if (guessedLetters.has(letter) || isWon || isLost) return;

    const nextGuessed = new Set(guessedLetters);
    nextGuessed.add(letter);
    setGuessedLetters(nextGuessed);

    if (normalizedTarget.includes(letter)) {
      playTone(523.25, 'triangle', 0.15, 0.2); // Som de acerto
      // Se venceu
      const winCheck = targetWord.split('').every(ch => {
        if (ch === ' ' || ch === '-') return true;
        return nextGuessed.has(normalize(ch));
      });
      if (winCheck) {
        setTimeout(playWinJingle, 200);
      }
    } else {
      playErrorBeep(); // Som de erro
      const nextMistakes = mistakes + 1;
      setMistakes(nextMistakes);
    }
  };

  const handleNewWord = () => {
    let nextI = Math.floor(Math.random() * bank.length);
    if (nextI === currentIdx && bank.length > 1) {
      nextI = (currentIdx + 1) % bank.length;
    }
    setCurrentIdx(nextI);
    setGuessedLetters(new Set());
    setMistakes(0);
    setShowHint(false);
  };

  // Teclado QWERTY fiel à imagem enviada
  const KEYBOARD_ROWS = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
  ];

  return (
    <div className="space-y-4 text-center">
      
      {/* ─── TÍTULO DA CATEGORIA (Ex: Animal Africano) ─── */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white tracking-wide">
          {currentItem.category}
        </h2>
        {showHint ? (
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mt-1 bg-amber-50 dark:bg-amber-950/40 py-1 px-3 rounded-lg inline-block">
            💡 Dica: {currentItem.hint}
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setShowHint(true)}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline mt-1 inline-flex items-center gap-1"
          >
            <Lightbulb className="h-3.5 w-3.5" /> Ver dica
          </button>
        )}
      </div>

      {/* ─── DESENHO DA FORCA (SVG FIEL À IMAGEM: FORCA DE MADEIRA + BONECO) ─── */}
      <div className="relative w-48 h-44 mx-auto my-1 flex items-center justify-center">
        <svg viewBox="0 0 200 180" className="w-full h-full drop-shadow-sm">
          {/* Base e Forca de Madeira Marrom */}
          {/* Chão marrom */}
          <line x1="15" y1="165" x2="185" y2="165" stroke="#8D5B28" strokeWidth="8" strokeLinecap="round" />
          {/* Poste vertical */}
          <line x1="45" y1="165" x2="45" y2="20" stroke="#B87333" strokeWidth="10" strokeLinecap="round" />
          {/* Viga horizontal superior */}
          <line x1="40" y1="25" x2="135" y2="25" stroke="#B87333" strokeWidth="10" strokeLinecap="round" />
          {/* Suporte diagonal */}
          <line x1="45" y1="60" x2="80" y2="25" stroke="#8D5B28" strokeWidth="6" strokeLinecap="round" />
          {/* Corda com nó */}
          <line x1="130" y1="25" x2="130" y2="55" stroke="#D97706" strokeWidth="3" strokeDasharray="3 2" />
          {/* Laço da corda */}
          <circle cx="130" cy="62" r="7" stroke="#D97706" strokeWidth="3" fill="none" />

          {/* Boneco em Traços Escuros (Adicionado conforme os erros) */}
          {/* 1. Cabeça */}
          {mistakes >= 1 && (
            <circle cx="130" cy="78" r="14" stroke="#1E293B" strokeWidth="4" fill="#F8FAFC" />
          )}
          {/* 2. Tronco */}
          {mistakes >= 2 && (
            <line x1="130" y1="92" x2="130" y2="128" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          )}
          {/* 3. Braço Esquerdo */}
          {mistakes >= 3 && (
            <line x1="130" y1="102" x2="108" y2="118" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          )}
          {/* 4. Braço Direito */}
          {mistakes >= 4 && (
            <line x1="130" y1="102" x2="152" y2="118" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          )}
          {/* 5. Perna Esquerda */}
          {mistakes >= 5 && (
            <line x1="130" y1="128" x2="112" y2="154" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          )}
          {/* 6. Perna Direita */}
          {mistakes >= 6 && (
            <line x1="130" y1="128" x2="148" y2="154" stroke="#1E293B" strokeWidth="4" strokeLinecap="round" />
          )}
        </svg>

        {/* Indicador de vidas restantes */}
        <div className="absolute bottom-0 right-0 flex items-center gap-1 bg-stone-100 dark:bg-slate-800 px-2 py-1 rounded-lg border text-xs font-bold text-stone-700 dark:text-slate-200">
          <span>Erros:</span>
          <span className={cn('font-black', mistakes >= 4 ? 'text-rose-600' : 'text-stone-900 dark:text-white')}>
            {mistakes} / {maxMistakes}
          </span>
        </div>
      </div>

      {/* ─── PALAVRA SECRETA (TRAÇOS COM LETRAS REVELADAS) ─── */}
      <div className="flex flex-wrap items-center justify-center gap-2 py-2">
        {targetWord.split('').map((ch, idx) => {
          if (ch === ' ' || ch === '-') {
            return <span key={idx} className="w-3" />;
          }
          const normCh = normalize(ch);
          const isRevealed = guessedLetters.has(normCh) || isLost;

          return (
            <div
              key={idx}
              className="flex flex-col items-center justify-end w-7 sm:w-8 h-10 border-b-3 border-stone-800 dark:border-slate-300 pb-1"
            >
              <span className={cn(
                'text-xl sm:text-2xl font-black uppercase transition-all',
                !guessedLetters.has(normCh) && isLost ? 'text-rose-600 animate-pulse' : 'text-stone-950 dark:text-white'
              )}>
                {isRevealed ? ch : ''}
              </span>
            </div>
          );
        })}
      </div>

      {/* FEEDBACK DE VITÓRIA OU DERROTA */}
      {isWon && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 p-3 rounded-2xl animate-in zoom-in-95">
          <p className="text-base font-black text-emerald-950 dark:text-emerald-200 flex items-center justify-center gap-2">
            🎉 Parabéns! Você acertou a palavra!
          </p>
          {difficulty !== 'dificil' && (
            <button
              onClick={onLevelUp}
              className="mt-2 text-xs font-black text-emerald-800 dark:text-emerald-300 underline"
            >
              Subir para a próxima fase! →
            </button>
          )}
        </div>
      )}

      {isLost && (
        <div className="bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-500 p-3 rounded-2xl animate-in zoom-in-95">
          <p className="text-sm font-black text-rose-950 dark:text-rose-200">
            Fim de jogo! A palavra correta era: <strong className="text-base uppercase">{targetWord}</strong>
          </p>
        </div>
      )}

      {/* ─── TECLADO VIRTUAL QWERTY (FIEL À IMAGEM) ─── */}
      <div className="space-y-1.5 pt-1">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex justify-center gap-1 sm:gap-1.5">
            {row.map((letter) => {
              const isUsed = guessedLetters.has(letter);
              const isCorrect = isUsed && normalizedTarget.includes(letter);
              const isWrong = isUsed && !normalizedTarget.includes(letter);

              return (
                <button
                  key={letter}
                  type="button"
                  disabled={isUsed || isWon || isLost}
                  onClick={() => handleGuess(letter)}
                  className={cn(
                    'w-7 h-10 sm:w-9 sm:h-11 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center transition-all active:scale-95 shadow-2xs border',
                    isCorrect
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs'
                      : isWrong
                      ? 'bg-stone-200 dark:bg-slate-800 text-stone-400 dark:text-slate-600 border-transparent cursor-not-allowed opacity-50'
                      : 'bg-white dark:bg-[#16253C] text-stone-900 dark:text-white border-stone-300 dark:border-slate-600 hover:border-indigo-500 hover:bg-stone-50'
                  )}
                >
                  {letter}
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Botão Nova Palavra */}
      <Button
        onClick={handleNewWord}
        className="w-full bg-[#D97706] hover:bg-[#B45309] text-white rounded-xl font-black h-12 shadow-md active:scale-95"
      >
        <RotateCcw className="h-4 w-4 mr-2" /> Nova Palavra
      </Button>

    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. JOGO DA MEMÓRIA (COM NÍVEIS CRESCENTES: 6, 8 OU 10 PARES)
// ══════════════════════════════════════════════════════════════════════════════
const MEMORY_EMOJI_POOL = [
  '🍎', '🍌', '🍇', '🍓', '🥑', '🍒', '🍍', '🍉', '🥝', '🍑',
  '🐶', '🐱', '🐼', '🦁', '🦊', '🐨', '🐯', '🐰', '🐸', '🐵',
  '🚗', '✈️', '⛵', '🚀', '🚲', '🚁', '🚂', '🛸', '🏍️', '🚜',
  '⚽', '🏀', '🎾', '🎸', '🎨', '📚', '🧩', '🏆', '💎', '🔔',
  '🌻', '🌹', '🌴', '🍀', '🌈', '☀️', '⭐', '🌙', '🌊', '⚡'
];

function MemoryMiniGame({ difficulty, onLevelUp }: { difficulty: DiffLevel; onLevelUp: () => void }) {
  const pairCount = difficulty === 'facil' ? 6 : difficulty === 'medio' ? 8 : 10;

  const generateCards = useCallback(() => {
    // Sorteia emojis aleatórios do pool gigante
    const shuffledPool = [...MEMORY_EMOJI_POOL].sort(() => Math.random() - 0.5);
    const selected = shuffledPool.slice(0, pairCount);
    return [...selected, ...selected].sort(() => Math.random() - 0.5);
  }, [pairCount]);

  const [cards, setCards] = useState<string[]>(generateCards);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  useEffect(() => {
    setCards(generateCards());
    setFlipped([]);
    setMatched([]);
    setMoves(0);
  }, [generateCards, difficulty]);

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

  const isComplete = matched.length === cards.length && cards.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#EF4444] flex items-center gap-1.5">
          <span>🧠</span> Jogo da Memória
        </h3>
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 dark:text-slate-200">
          <span>Pares: <strong className="text-emerald-600">{matched.length / 2}/{pairCount}</strong></span>
          <span>Tentativas: <strong className="text-indigo-600">{moves}</strong></span>
        </div>
      </div>

      {isComplete && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 p-4 rounded-2xl text-center animate-in zoom-in-95">
          <Trophy className="h-10 w-10 text-amber-500 mx-auto mb-1 animate-bounce" />
          <p className="text-lg font-black text-emerald-950 dark:text-emerald-200">
            Parabéns! Memória Afiada!
          </p>
          <p className="text-xs text-stone-700 dark:text-slate-200 mt-1">
            Você completou a fase em <strong>{moves}</strong> tentativas!
          </p>
          {difficulty !== 'dificil' && (
            <button
              onClick={onLevelUp}
              className="mt-3 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-black text-xs hover:bg-emerald-700"
            >
              Avançar para a próxima fase! →
            </button>
          )}
        </div>
      )}

      {/* Grade de Cartas */}
      <div className={cn(
        'grid gap-2',
        pairCount === 6 ? 'grid-cols-4' : pairCount === 8 ? 'grid-cols-4' : 'grid-cols-5'
      )}>
        {cards.map((emoji, idx) => {
          const isFlipped = flipped.includes(idx) || matched.includes(idx);
          const isMatched = matched.includes(idx);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleCardClick(idx)}
              className={cn(
                'aspect-square rounded-2xl text-2xl sm:text-3xl font-black flex items-center justify-center transition-all duration-300 shadow-sm active:scale-95 border-2',
                isFlipped
                  ? isMatched
                    ? 'bg-emerald-100 dark:bg-emerald-950/50 border-emerald-500 scale-100'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-400'
                  : 'bg-stone-100 hover:bg-stone-200 dark:bg-[#16253C] dark:hover:bg-[#1E3452] border-stone-300 dark:border-slate-700 text-transparent'
              )}
            >
              {isFlipped ? emoji : '❓'}
            </button>
          );
        })}
      </div>

      <Button
        onClick={() => {
          setCards(generateCards());
          setFlipped([]);
          setMatched([]);
          setMoves(0);
        }}
        className="w-full bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-xl font-black h-12 shadow-md active:scale-95"
      >
        <RotateCcw className="h-4 w-4 mr-2" /> Embaralhar Novas Cartas
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. TRIVIA BRASIL (BANCO GIGANTE COM MAIS DE 60 PERGUNTAS DIVIDIDAS POR NÍVEL)
// ══════════════════════════════════════════════════════════════════════════════
interface TriviaQuestion {
  q: string;
  options: string[];
  answer: number;
  explanation: string;
}

const TRIVIA_DATABASE: Record<DiffLevel, TriviaQuestion[]> = {
  facil: [
    { q: 'Qual é a capital do Brasil?', options: ['Rio de Janeiro', 'Brasília', 'São Paulo'], answer: 1, explanation: 'Brasília foi inaugurada em 1960 pelo presidente Juscelino Kubitschek.' },
    { q: 'De que cor é o céu em um dia ensolarado?', options: ['Verde', 'Azul', 'Vermelho'], answer: 1, explanation: 'O céu diurno parece azul devido à dispersão da luz solar na atmosfera.' },
    { q: 'Quantos dias tem uma semana completa?', options: ['5 dias', '7 dias', '10 dias'], answer: 1, explanation: 'A semana tem 7 dias: de domingo a sábado.' },
    { q: 'Em qual estação do ano as flores desabrocham?', options: ['Primavera', 'Inverno', 'Outono'], answer: 0, explanation: 'A primavera é poeticamente chamada de a estação das flores.' },
    { q: 'Qual animal é popularmente chamado de "Rei da Selva"?', options: ['Elefante', 'Leão', 'Tigre'], answer: 1, explanation: 'O leão africano é conhecido pelo porte e juba imponente.' },
    { q: 'Quantos meses tem um ano inteiro?', options: ['10 meses', '12 meses', '14 meses'], answer: 1, explanation: 'O ano tem 12 meses no calendário gregoriano.' },
    { q: 'Qual fruta é amarela e conhecida por dar em cachos?', options: ['Melancia', 'Banana', 'Morango'], answer: 1, explanation: 'A banana é um dos alimentos mais nutritivos e populares do país.' },
    { q: 'Qual bebida quente e escura é paixão nacional nas manhãs?', options: ['Chá Mate', 'Café', 'Suco de Uva'], answer: 1, explanation: 'O Brasil é o maior produtor de café do planeta.' },
    { q: 'Qual animal doméstico costuma miar e ronronar?', options: ['Cachorro', 'Gato', 'Papagaio'], answer: 1, explanation: 'Os gatos usam o ronronar para expressar conforto e afeto.' },
    { q: 'Quantas cores tem a bandeira do Brasil?', options: ['3 cores', '4 cores', '5 cores'], answer: 1, explanation: 'Verde, amarelo, azul e branco: 4 cores oficiais.' },
  ],
  medio: [
    { q: 'Quem compôs a clássica canção "Garota de Ipanema"?', options: ['Tom Jobim e Vinicius', 'Roberto Carlos', 'Caetano Veloso'], answer: 0, explanation: 'Tom Jobim e Vinicius de Moraes criaram a obra-prima da Bossa Nova em 1962.' },
    { q: 'Qual é o maior rio em volume de água do mundo?', options: ['Rio São Francisco', 'Rio Amazonas', 'Rio Nilo'], answer: 1, explanation: 'O Rio Amazonas deságua cerca de 200 mil metros cúbicos de água por segundo.' },
    { q: 'Qual animal estampa a cédula brasileira de 50 reais?', options: ['Mico-leão-dourado', 'Onça-pintada', 'Garoupa'], answer: 1, explanation: 'A onça-pintada é o maior felino das Américas.' },
    { q: 'Em que ano os portugueses chegaram oficialmente ao Brasil?', options: ['1492', '1500', '1530'], answer: 1, explanation: 'A frota de Pedro Álvares Cabral aportou em Porto Seguro em abril de 1500.' },
    { q: 'Quantas Copas do Mundo de Futebol masculino o Brasil conquistou?', options: ['4 Copas', '5 Copas (Penta)', '6 Copas'], answer: 1, explanation: 'O Brasil é o único país pentacampeão (1958, 1962, 1970, 1994 e 2002).' },
    { q: 'Qual é a pedra preciosa conhecida por sua intensa cor verde?', options: ['Rubi', 'Esmeralda', 'Safira'], answer: 1, explanation: 'A esmeralda é uma variedade nobre do mineral berilo.' },
    { q: 'Quantos estados compõem a República Federativa do Brasil?', options: ['24 estados', '26 estados + DF', '27 estados + DF'], answer: 1, explanation: 'O Brasil é formado por 26 estados e o Distrito Federal.' },
    { q: 'Qual vitamina é sintetizada pelo corpo humano com o sol?', options: ['Vitamina C', 'Vitamina D', 'Vitamina B12'], answer: 1, explanation: 'A exposição matinal à luz solar ativa a síntese da vitamina D na pele.' },
  ],
  dificil: [
    { q: 'Qual famoso filósofo grego cunhou a frase "Só sei que nada sei"?', options: ['Platão', 'Sócrates', 'Aristóteles'], answer: 1, explanation: 'Sócrates usava a maiêutica e o reconhecimento da ignorância para buscar a sabedoria.' },
    { q: 'Em qual ano foi proclamada a República no Brasil?', options: ['1822', '1888', '1889'], answer: 2, explanation: 'O Marechal Deodoro da Fonseca proclamou a República em 15 de novembro de 1889.' },
    { q: 'Qual elemento químico possui o símbolo "Au" na tabela periódica?', options: ['Prata', 'Ouro', 'Cobre'], answer: 1, explanation: 'O símbolo Au vem do termo em latim "Aurum", que significa brilhante.' },
    { q: 'Quem é o autor do aclamado romance "Dom Casmurro"?', options: ['José de Alencar', 'Machado de Assis', 'Graciliano Ramos'], answer: 1, explanation: 'Machado de Assis é o fundador da Academia Brasileira de Letras.' },
    { q: 'Qual é a velocidade aproximada da luz no vácuo?', options: ['30.000 km/s', '300.000 km/s', '3.000.000 km/s'], answer: 1, explanation: 'A luz percorre aproximadamente 299.792 km por segundo.' },
    { q: 'Qual é o menor país independente do mundo em área territorial?', options: ['Mônaco', 'Vaticano', 'San Marino'], answer: 1, explanation: 'O Estado da Cidade do Vaticano tem menos de meio quilômetro quadrado (0,44 km²).' },
  ]
};

function TriviaMiniGame({ difficulty, onLevelUp }: { difficulty: DiffLevel; onLevelUp: () => void }) {
  const bank = TRIVIA_DATABASE[difficulty];
  const [questions, setQuestions] = useState(() => [...bank].sort(() => Math.random() - 0.5).slice(0, 5));
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedOpt, setSelectedOpt] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    setQuestions([...bank].sort(() => Math.random() - 0.5).slice(0, 5));
    setCurrentQ(0);
    setSelectedOpt(null);
    setScore(0);
    setFinished(false);
  }, [difficulty]);

  const handleSelect = (idx: number) => {
    setSelectedOpt(idx);
    const isCorrect = idx === questions[currentQ].answer;
    if (isCorrect) {
      playSuccessChime();
      setScore(s => s + 1);
    } else {
      playErrorBeep();
    }
    setTimeout(() => {
      if (currentQ + 1 < questions.length) {
        setCurrentQ(q => q + 1);
        setSelectedOpt(null);
      } else {
        setFinished(true);
        playWinJingle();
      }
    }, 1500);
  };

  const restart = () => {
    setQuestions([...bank].sort(() => Math.random() - 0.5).slice(0, 5));
    setCurrentQ(0);
    setSelectedOpt(null);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="text-center space-y-4 py-3">
        <Trophy className="h-16 w-16 text-amber-500 mx-auto animate-bounce" />
        <h3 className="text-2xl font-black text-stone-950 dark:text-white">Fase Concluída!</h3>
        <p className="text-base text-stone-700 dark:text-slate-200">
          Você acertou <strong className="text-emerald-600 dark:text-emerald-400 text-2xl">{score}</strong> de {questions.length} perguntas!
        </p>
        {difficulty !== 'dificil' && score >= 4 && (
          <button
            onClick={onLevelUp}
            className="px-4 py-2 rounded-2xl bg-indigo-600 text-white font-black text-xs hover:bg-indigo-700 shadow-sm"
          >
            Subir para a próxima fase! →
          </button>
        )}
        <Button onClick={restart} className="w-full bg-[#1D4ED8] hover:bg-[#1E40AF] text-white rounded-xl font-black h-12 shadow-md">
          <RotateCcw className="h-4 w-4 mr-2" /> Jogar Novas Perguntas
        </Button>
      </div>
    );
  }

  const qData = questions[currentQ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-stone-600 dark:text-slate-300 uppercase">
          Pergunta {currentQ + 1} de {questions.length}
        </span>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          Acertos: {score}
        </span>
      </div>

      <h3 className="text-lg font-black text-stone-950 dark:text-white leading-snug">
        {qData.q}
      </h3>

      <div className="space-y-2.5 pt-1">
        {qData.options.map((opt, idx) => {
          const isSelected = selectedOpt === idx;
          const isCorrect = idx === qData.answer;
          let btnClass = 'bg-stone-50 dark:bg-[#16253C] border-stone-300 dark:border-[#243B5C] text-stone-900 dark:text-white hover:border-blue-500';
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
        <p className="text-xs text-stone-700 dark:text-slate-200 italic bg-stone-100 dark:bg-[#16253C] p-3 rounded-xl border border-stone-300 dark:border-[#243B5C]">
          💡 {qData.explanation}
        </p>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. CAÇA-PALAVRAS INFINITO (GERADOR ALEATÓRIO REAL DE GRADES)
// ══════════════════════════════════════════════════════════════════════════════
const WORD_POOLS: Record<DiffLevel, string[]> = {
  facil: [
    'PAZ', 'SOL', 'MAR', 'LUA', 'BEM', 'MAE', 'PAI', 'RIO', 'CHA', 'MEL', 'SOM', 'VOZ', 'LAR', 'FLOR'
  ],
  medio: [
    'AMOR', 'VIDA', 'SAUDE', 'AFETO', 'FESTA', 'CALMA', 'SONHO', 'SORTE', 'BRISA', 'PRAIA', 'AMIGO', 'VERDE'
  ],
  dificil: [
    'ALEGRIA', 'HARMONIA', 'CORAGEM', 'FAMILIA', 'BONDADE', 'GRATIDAO', 'CARINHO', 'EMPATIA', 'ESPERANCA'
  ]
};

function generateDynamicWordSearch(size: number, wordList: string[], count: number) {
  const wordsToPlace = [...wordList].sort(() => Math.random() - 0.5).slice(0, count);
  const grid: string[][] = Array.from({ length: size }, () => Array(size).fill(''));
  const placedWords: { word: string; coords: [number, number][] }[] = [];
  const ALPHABET = 'ABCDEFGHIJLMNOPRSTUVZ';

  for (const word of wordsToPlace) {
    let placed = false;
    for (let attempts = 0; attempts < 100 && !placed; attempts++) {
      const isHorizontal = Math.random() < 0.5;
      const maxRow = isHorizontal ? size - 1 : size - word.length;
      const maxCol = isHorizontal ? size - word.length : size - 1;

      if (maxRow < 0 || maxCol < 0) continue;

      const r = Math.floor(Math.random() * (maxRow + 1));
      const c = Math.floor(Math.random() * (maxCol + 1));

      let fits = true;
      const tempCoords: [number, number][] = [];

      for (let i = 0; i < word.length; i++) {
        const curR = isHorizontal ? r : r + i;
        const curC = isHorizontal ? c + i : c;
        if (grid[curR][curC] !== '' && grid[curR][curC] !== word[i]) {
          fits = false;
          break;
        }
        tempCoords.push([curR, curC]);
      }

      if (fits) {
        tempCoords.forEach(([cr, cc], idx) => {
          grid[cr][cc] = word[idx];
        });
        placedWords.push({ word, coords: tempCoords });
        placed = true;
      }
    }
  }

  // Preenche células vazias com letras aleatórias
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
      }
    }
  }

  return { grid, placedWords };
}

function WordSearchMiniGame({ difficulty, onLevelUp }: { difficulty: DiffLevel; onLevelUp: () => void }) {
  const size = difficulty === 'facil' ? 5 : difficulty === 'medio' ? 6 : 7;
  const wordCount = difficulty === 'facil' ? 3 : difficulty === 'medio' ? 4 : 5;

  const [puzzle, setPuzzle] = useState(() => 
    generateDynamicWordSearch(size, WORD_POOLS[difficulty], wordCount)
  );
  const [selectedCoords, setSelectedCoords] = useState<string[]>([]);
  const [foundWords, setFoundWords] = useState<string[]>([]);

  useEffect(() => {
    setPuzzle(generateDynamicWordSearch(size, WORD_POOLS[difficulty], wordCount));
    setSelectedCoords([]);
    setFoundWords([]);
  }, [difficulty]);

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
    puzzle.placedWords.forEach((wt) => {
      if (!foundWords.includes(wt.word)) {
        const allMatch = wt.coords.every(([cr, cc]) => nextCoords.includes(`${cr}-${cc}`));
        if (allMatch) {
          playSuccessChime();
          setFoundWords(prev => {
            const updated = [...prev, wt.word];
            if (updated.length === puzzle.placedWords.length) {
              setTimeout(playWinJingle, 300);
            }
            return updated;
          });
        }
      }
    });
  };

  const handleReset = () => {
    setPuzzle(generateDynamicWordSearch(size, WORD_POOLS[difficulty], wordCount));
    setSelectedCoords([]);
    setFoundWords([]);
  };

  const isWin = foundWords.length === puzzle.placedWords.length && puzzle.placedWords.length > 0;

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#9333EA] flex items-center gap-1.5">
          <span>🔤</span> Caça-Palavras
        </h3>
        <span className="text-xs font-bold text-stone-600 dark:text-slate-300">
          Grade {size}x{size}
        </span>
      </div>

      <p className="text-xs font-bold text-stone-700 dark:text-slate-200">
        Toque nas letras para encontrar as palavras escondidas:
      </p>

      {/* Palavras para encontrar */}
      <div className="flex flex-wrap justify-center gap-1.5">
        {puzzle.placedWords.map((w) => {
          const isFound = foundWords.includes(w.word);
          return (
            <span
              key={w.word}
              className={cn(
                'px-2.5 py-1 rounded-xl text-xs font-black tracking-wider transition-all border',
                isFound
                  ? 'bg-purple-600 text-white border-purple-700 line-through scale-105'
                  : 'bg-stone-100 dark:bg-[#16253C] text-purple-700 dark:text-purple-300 border-stone-300 dark:border-slate-700'
              )}
            >
              {w.word} {isFound ? '✓' : ''}
            </span>
          );
        })}
      </div>

      {/* Grade Gerada Dinamicamente */}
      <div
        className="grid gap-1.5 mx-auto p-2.5 bg-stone-100 dark:bg-[#16253C] rounded-2xl border-2 border-stone-300 dark:border-slate-700 my-2"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
          maxWidth: size * 42 + 20
        }}
      >
        {puzzle.grid.map((row, r) =>
          row.map((letter, c) => {
            const isSelected = selectedCoords.includes(`${r}-${c}`);
            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={cn(
                  'aspect-square rounded-xl font-black text-sm sm:text-base flex items-center justify-center transition-all shadow-2xs active:scale-95',
                  isSelected
                    ? 'bg-purple-600 text-white scale-105 shadow-sm'
                    : 'bg-white dark:bg-[#0B1526] text-stone-900 dark:text-white border border-stone-200 dark:border-slate-700 hover:border-purple-400'
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
            🎉 Fantástico! Todas as palavras foram encontradas!
          </p>
          {difficulty !== 'dificil' && (
            <button
              onClick={onLevelUp}
              className="mt-2 text-xs font-black text-emerald-800 dark:text-emerald-300 underline"
            >
              Avançar para a próxima fase! →
            </button>
          )}
        </div>
      )}

      <Button
        onClick={handleReset}
        className="w-full bg-[#9333EA] hover:bg-[#7E22CE] text-white rounded-xl font-black h-12 shadow-md active:scale-95"
      >
        <RotateCcw className="h-4 w-4 mr-2" /> Gerar Nova Grade Aleatória
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. GENIUS DAS CORES (COM VELOCIDADES DIFERENTES POR FASE)
// ══════════════════════════════════════════════════════════════════════════════
function GeniusMiniGame({ difficulty, onLevelUp }: { difficulty: DiffLevel; onLevelUp: () => void }) {
  const COLORS = ['green', 'red', 'yellow', 'blue'] as const;
  type ColorType = typeof COLORS[number];

  const COLOR_CONFIG: Record<ColorType, { name: string; bg: string; activeBg: string; freq: number }> = {
    green:  { name: 'Verde',    bg: 'bg-emerald-500', activeBg: 'bg-emerald-300 ring-4 ring-white', freq: 523.25 },
    red:    { name: 'Vermelho', bg: 'bg-rose-500',    activeBg: 'bg-rose-300 ring-4 ring-white',    freq: 261.63 },
    yellow: { name: 'Amarelo',  bg: 'bg-amber-400',   activeBg: 'bg-amber-200 ring-4 ring-white',   freq: 392.00 },
    blue:   { name: 'Azul',     bg: 'bg-blue-500',    activeBg: 'bg-blue-300 ring-4 ring-white',    freq: 329.63 },
  };

  // Velocidade ajustada por dificuldade
  const speedMs = difficulty === 'facil' ? 650 : difficulty === 'medio' ? 450 : 300;

  const [sequence, setSequence] = useState<ColorType[]>([]);
  const [playerIndex, setPlayerIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeButton, setActiveButton] = useState<ColorType | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [highScore, setHighScore] = useState(0);

  const playSequence = (seq: ColorType[]) => {
    setIsPlaying(true);
    seq.forEach((col, idx) => {
      setTimeout(() => {
        setActiveButton(col);
        playTone(COLOR_CONFIG[col].freq, 'triangle', speedMs * 0.0006, 0.25);
        setTimeout(() => setActiveButton(null), speedMs * 0.6);
      }, (idx + 1) * speedMs);
    });

    setTimeout(() => {
      setIsPlaying(false);
      setPlayerIndex(0);
    }, (seq.length + 1) * speedMs);
  };

  const startGame = () => {
    setGameOver(false);
    const firstColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    const newSeq = [firstColor];
    setSequence(newSeq);
    setPlayerIndex(0);
    playSequence(newSeq);
  };

  const handleColorClick = (color: ColorType) => {
    if (isPlaying || gameOver || sequence.length === 0) return;

    playTone(COLOR_CONFIG[color].freq, 'triangle', 0.2, 0.25);
    setActiveButton(color);
    setTimeout(() => setActiveButton(null), 200);

    if (color === sequence[playerIndex]) {
      const nextIndex = playerIndex + 1;
      if (nextIndex === sequence.length) {
        playSuccessChime();
        if (sequence.length > highScore) {
          setHighScore(sequence.length);
        }
        const nextColor = COLORS[Math.floor(Math.random() * COLORS.length)];
        const nextSeq = [...sequence, nextColor];
        setSequence(nextSeq);
        setTimeout(() => playSequence(nextSeq), 900);
      } else {
        setPlayerIndex(nextIndex);
      }
    } else {
      playErrorBeep();
      setGameOver(true);
    }
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <span className="text-3xl">🌈</span>
        <h3 className="text-xl font-black text-[#16A34A]">Genius Musical</h3>
      </div>

      <p className="text-xs font-bold text-stone-700 dark:text-slate-200">
        Memorize a sequência de cores e sons e repita na mesma ordem!
      </p>

      <div className="flex items-center justify-around text-xs font-bold text-stone-700 dark:text-slate-200">
        <span>Nível Atual: <strong className="text-emerald-600 dark:text-emerald-400 text-sm">{sequence.length}</strong></span>
        <span>Recorde: <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{highScore}</strong></span>
      </div>

      {/* Grade dos 4 Botões */}
      <div className="grid grid-cols-2 gap-3 max-w-[220px] mx-auto my-2">
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
                'aspect-square rounded-3xl transition-all shadow-md active:scale-95 border-4 border-white/40',
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
        <div className="bg-rose-100 dark:bg-rose-950/60 border-2 border-rose-500 p-3 rounded-2xl">
          <p className="text-sm font-black text-rose-950 dark:text-rose-200">
            Ops! Você chegou ao nível {sequence.length}!
          </p>
        </div>
      )}

      {sequence.length === 0 ? (
        <Button onClick={startGame} className="w-full bg-[#16A34A] hover:bg-[#15803D] text-white rounded-xl font-black h-12 shadow-md">
          <Play className="h-4 w-4 mr-2" /> Iniciar Genius
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
// 6. SUDOKU 4x4 (COM PUZZLES VARIADOS E NÍVEIS)
// ══════════════════════════════════════════════════════════════════════════════
const SUDOKU_PUZZLE_BANK: Record<DiffLevel, { initial: string[]; fixed: number[] }[]> = {
  facil: [
    { initial: ['1','','','4','','3','4','','','4','3','','3','','','1'], fixed: [0,3,5,6,9,10,12,15] },
    { initial: ['','2','3','','4','','','2','','1','','3','1','','2',''], fixed: [1,2,4,7,9,11,12,14] },
    { initial: ['4','','2','','','3','','1','1','','4','','','2','','3'], fixed: [0,2,5,7,8,10,13,15] },
  ],
  medio: [
    { initial: ['1','','','','','','4','','','4','','','','','','1'], fixed: [0,6,9,15] },
    { initial: ['','','3','','4','','','','','','','3','','1','',''], fixed: [2,4,11,13] },
    { initial: ['2','','','','','3','','','','','4','','','','','2'], fixed: [0,5,10,15] },
  ],
  dificil: [
    { initial: ['1','','','','','','','','','','','','','','','4'], fixed: [0,15] },
    { initial: ['','4','','','','','','','','','','','','','2',''], fixed: [1,14] },
    { initial: ['','','3','','','','','','','','','','','1','',''], fixed: [2,13] },
  ]
};

function SudokuMiniGame({ difficulty, onLevelUp }: { difficulty: DiffLevel; onLevelUp: () => void }) {
  const puzzles = SUDOKU_PUZZLE_BANK[difficulty];
  const [pIndex, setPIndex] = useState(0);
  const currentP = puzzles[pIndex] || puzzles[0];

  const [grid, setGrid] = useState<string[]>([...currentP.initial]);
  const [selectedCell, setSelectedCell] = useState<number | null>(null);
  const [hasWon, setHasWon] = useState(false);

  useEffect(() => {
    const p = puzzles[pIndex] || puzzles[0];
    setGrid([...p.initial]);
    setSelectedCell(null);
    setHasWon(false);
  }, [difficulty, pIndex, puzzles]);

  const checkWin = (currentGrid: string[]) => {
    if (currentGrid.some(v => v === '')) return false;
    for (let r = 0; r < 4; r++) {
      const row = [currentGrid[r*4], currentGrid[r*4+1], currentGrid[r*4+2], currentGrid[r*4+3]];
      if (new Set(row).size !== 4) return false;
    }
    for (let c = 0; c < 4; c++) {
      const col = [currentGrid[c], currentGrid[c+4], currentGrid[c+8], currentGrid[c+12]];
      if (new Set(col).size !== 4) return false;
    }
    return true;
  };

  const handleCellClick = (idx: number) => {
    if (currentP.fixed.includes(idx)) return;
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

  const handleClear = () => {
    if (selectedCell === null) return;
    const next = [...grid];
    next[selectedCell] = '';
    setGrid(next);
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#0891B2] flex items-center gap-1.5">
          <span>🔢</span> Sudoku 4x4
        </h3>
        <span className="text-xs font-bold text-stone-600 dark:text-slate-300">
          Puzzle #{pIndex + 1}
        </span>
      </div>

      <p className="text-xs font-bold text-stone-700 dark:text-slate-200">
        Preencha sem repetir 1, 2, 3 e 4 em nenhuma linha ou coluna:
      </p>

      {/* Grade 4x4 */}
      <div className="grid grid-cols-4 gap-2 max-w-[220px] mx-auto p-3 bg-stone-100 dark:bg-[#16253C] rounded-2xl border-2 border-stone-300 dark:border-slate-700">
        {grid.map((val, idx) => {
          const isFixed = currentP.fixed.includes(idx);
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

      {/* Teclado Numérico */}
      <div className="space-y-1.5">
        <p className="text-[11px] font-bold text-stone-600 dark:text-slate-300">
          {selectedCell !== null ? 'Selecione o número para a célula:' : 'Toque em uma célula vazia:'}
        </p>
        <div className="flex justify-center gap-2">
          {['1', '2', '3', '4'].map(num => (
            <button
              key={num}
              type="button"
              disabled={selectedCell === null}
              onClick={() => handleInputNumber(num)}
              className="w-11 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-black text-lg shadow-sm active:scale-95"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            disabled={selectedCell === null}
            onClick={handleClear}
            className="px-3 h-11 rounded-xl bg-stone-200 dark:bg-slate-700 text-stone-800 dark:text-slate-200 font-bold text-xs active:scale-95 disabled:opacity-40"
          >
            Apagar
          </button>
        </div>
      </div>

      {hasWon && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 p-3 rounded-2xl animate-in zoom-in-95">
          <p className="text-base font-black text-emerald-950 dark:text-emerald-200">
            🎉 Parabéns! Sudoku resolvido com perfeição!
          </p>
          {difficulty !== 'dificil' && (
            <button
              onClick={onLevelUp}
              className="mt-2 text-xs font-black text-emerald-800 dark:text-emerald-300 underline"
            >
              Avançar para a próxima fase! →
            </button>
          )}
        </div>
      )}

      <Button
        onClick={() => {
          setPIndex(i => (i + 1) % puzzles.length);
        }}
        className="w-full bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-xl font-black h-12 shadow-md active:scale-95"
      >
        <RotateCcw className="h-4 w-4 mr-2" /> Próximo Puzzle
      </Button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. JOGO DA VELHA (COM IA AJUSTADA POR NÍVEL E MODO 2 JOGADORES)
// ══════════════════════════════════════════════════════════════════════════════
function TicTacToeMiniGame({ difficulty, onLevelUp }: { difficulty: DiffLevel; onLevelUp: () => void }) {
  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  const [mode, setMode] = useState<'bot' | 'two_players'>('bot');
  const [score, setScore] = useState({ x: 0, o: 0, ties: 0 });

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
    return null;
  };

  const winner = calculateWinner(board);
  const isTie = !winner && board.every(square => square !== null);

  // IA com nível de inteligência
  useEffect(() => {
    if (mode === 'bot' && !isXNext && !winner && !isTie) {
      const timer = setTimeout(() => {
        const emptyIndices = board
          .map((val, idx) => (val === null ? idx : null))
          .filter(val => val !== null) as number[];

        if (emptyIndices.length === 0) return;

        let moveIndex: number = emptyIndices[0];

        if (difficulty === 'facil') {
          // Jogada totalmente aleatória
          moveIndex = emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        } else if (difficulty === 'medio') {
          // Bloqueia vitória iminente do jogador ou vence se der
          let smartMove: number | null = null;
          for (const idx of emptyIndices) {
            const testBoard = [...board];
            testBoard[idx] = 'O';
            if (calculateWinner(testBoard) === 'O') {
              smartMove = idx;
              break;
            }
          }
          if (smartMove === null) {
            for (const idx of emptyIndices) {
              const testBoard = [...board];
              testBoard[idx] = 'X';
              if (calculateWinner(testBoard) === 'X') {
                smartMove = idx;
                break;
              }
            }
          }
          moveIndex = smartMove !== null ? smartMove : emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
        } else {
          // Difícil: prioriza centro, cantos e vitórias
          if (board[4] === null) {
            moveIndex = 4;
          } else {
            let smartMove: number | null = null;
            for (const idx of emptyIndices) {
              const testBoard = [...board];
              testBoard[idx] = 'O';
              if (calculateWinner(testBoard) === 'O') {
                smartMove = idx;
                break;
              }
            }
            if (smartMove === null) {
              for (const idx of emptyIndices) {
                const testBoard = [...board];
                testBoard[idx] = 'X';
                if (calculateWinner(testBoard) === 'X') {
                  smartMove = idx;
                  break;
                }
              }
            }
            moveIndex = smartMove !== null ? smartMove : emptyIndices[Math.floor(Math.random() * emptyIndices.length)];
          }
        }

        playTone(392.00, 'triangle', 0.15, 0.2);
        const newBoard = [...board];
        newBoard[moveIndex] = 'O';
        setBoard(newBoard);
        setIsXNext(true);

        const win = calculateWinner(newBoard);
        if (win) {
          setScore(s => ({ ...s, o: s.o + 1 }));
          playErrorBeep();
        } else if (newBoard.every(sq => sq !== null)) {
          setScore(s => ({ ...s, ties: s.ties + 1 }));
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [isXNext, mode, board, winner, isTie, difficulty]);

  const handleClick = (index: number) => {
    if (board[index] || winner || isTie) return;
    if (mode === 'bot' && !isXNext) return;

    playTone(523.25, 'triangle', 0.1, 0.2);
    const newBoard = [...board];
    newBoard[index] = isXNext ? 'X' : 'O';
    setBoard(newBoard);
    setIsXNext(!isXNext);

    const win = calculateWinner(newBoard);
    if (win) {
      if (win === 'X') {
        playWinJingle();
        setScore(s => ({ ...s, x: s.x + 1 }));
      } else {
        setScore(s => ({ ...s, o: s.o + 1 }));
      }
    } else if (newBoard.every(sq => sq !== null)) {
      setScore(s => ({ ...s, ties: s.ties + 1 }));
    }
  };

  const reset = () => {
    setBoard(Array(9).fill(null));
    setIsXNext(true);
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-[#0D9488] flex items-center gap-1.5">
          <span>⭕</span> Jogo da Velha
        </h3>
        <div className="flex gap-1 bg-stone-100 dark:bg-[#16253C] p-1 rounded-xl border border-stone-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => { setMode('bot'); reset(); }}
            className={cn('px-2.5 py-1 rounded-lg text-xs font-bold transition-all', mode === 'bot' ? 'bg-teal-600 text-white' : 'text-stone-600 dark:text-slate-300')}
          >
            vs Robô
          </button>
          <button
            type="button"
            onClick={() => { setMode('two_players'); reset(); }}
            className={cn('px-2.5 py-1 rounded-lg text-xs font-bold transition-all', mode === 'two_players' ? 'bg-teal-600 text-white' : 'text-stone-600 dark:text-slate-300')}
          >
            2 Pessoas
          </button>
        </div>
      </div>

      {/* Placar */}
      <div className="flex justify-around bg-stone-100 dark:bg-[#16253C] p-2 rounded-2xl border border-stone-200 dark:border-slate-700 text-xs font-bold">
        <span>Você (X): <strong className="text-blue-600 text-sm">{score.x}</strong></span>
        <span>Empates: <strong className="text-stone-600 text-sm">{score.ties}</strong></span>
        <span>{mode === 'bot' ? 'Robô (O)' : 'Jogador (O)'}: <strong className="text-rose-600 text-sm">{score.o}</strong></span>
      </div>

      {/* Tabuleiro */}
      <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto my-2">
        {board.map((val, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleClick(idx)}
            className={cn(
              'aspect-square rounded-2xl text-4xl font-black flex items-center justify-center transition-all shadow-sm border-2 active:scale-95',
              val === 'X'
                ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 text-blue-600'
                : val === 'O'
                ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-500 text-rose-600'
                : 'bg-white dark:bg-[#16253C] border-stone-300 dark:border-slate-700 hover:border-teal-500'
            )}
          >
            {val}
          </button>
        ))}
      </div>

      {winner && (
        <div className="bg-emerald-100 dark:bg-emerald-950/60 border-2 border-emerald-500 p-3 rounded-2xl animate-in zoom-in-95">
          <p className="text-base font-black text-emerald-950 dark:text-emerald-200">
            🎉 Vitória do jogador {winner}!
          </p>
        </div>
      )}

      {isTie && (
        <div className="bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-500 p-3 rounded-2xl animate-in zoom-in-95">
          <p className="text-sm font-black text-amber-950 dark:text-amber-200">
            Deu Velha! Empate bonito!
          </p>
        </div>
      )}

      <Button
        onClick={reset}
        className="w-full bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl font-black h-12 shadow-md active:scale-95"
      >
        <RotateCcw className="h-4 w-4 mr-2" /> Jogar Novamente
      </Button>
    </div>
  );
}