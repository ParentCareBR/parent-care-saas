'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Stethoscope,
  Heart,
  AlertTriangle,
  RefreshCw,
  X,
  MessageCircle,
  HelpCircle,
  Lightbulb,
  ShieldCheck,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface NinaAIChatbotProps {
  caredPersonId?: string;
  caredPersonName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
  userRole?: 'host' | 'elderly';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const SUGGESTED_QUESTIONS = [
  'Quais os cuidados com a pressão alta no idoso?',
  'Como identificar sinais precoces de desidratação?',
  'O que fazer em caso de tontura súbita?',
  'Dicas para melhorar o apetite do idoso',
  'Exercícios respiratórios leves para fazer em casa',
  'Como prevenir quedas no banheiro e quarto?',
];

export function NinaAIChatbot({
  caredPersonId,
  caredPersonName = 'seu familiar',
  isOpen = true,
  onClose,
  inline = false,
  userRole = 'host',
}: NinaAIChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Olá! Eu sou a **Nina IA**, sua enfermeira e especialista virtual no Parent Care 🩺💙\n\nEstou aqui para tirar dúvidas sobre sintomas, alimentação, horários de remédios, prevenção e o bem-estar de ${caredPersonName}.\n\nComo posso cuidar de vocês hoje?`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [chatStarted, setChatStarted] = useState(!inline ? true : false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Voice recognition setup
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInput(transcript);
          setIsRecording(false);
        };
        recognition.onerror = () => setIsRecording(false);
        recognition.onend = () => setIsRecording(false);
        recognitionRef.current = recognition;
      }
    }
  }, []);

  const handleToggleVoice = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      if (recognitionRef.current) {
        setIsRecording(true);
        recognitionRef.current.start();
      } else {
        alert('Reconhecimento de voz não suportado pelo seu navegador.');
      }
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const clean = text.replace(/[*#_`]/g, '');
      const utterance = new SpeechSynthesisUtterance(clean);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.1;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('Speech synthesis error:', err);
    }
  };

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend.trim(),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/nina/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          caredPersonId,
          userRole,
        }),
      });

      const data = await res.json();
      const replyContent = data.reply || 'Estou aqui com você. Pode repetir sua dúvida? 🩺';

      const botMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: replyContent,
        time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (voiceEnabled) {
        speakText(replyContent);
      }
    } catch (err) {
      console.error('Erro na Nina IA:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: 'Desculpe, tive uma instabilidade passageira. Por favor, tente enviar novamente.',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickQuestion = (q: string) => {
    if (!chatStarted) setChatStarted(true);
    handleSend(q);
  };

  // ─── TELA INICIAL DA NINA IA (EXATAMENTE COMO NA IMAGEM 2) ───────────────────
  if (!chatStarted) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-sky-300/40 dark:border-sky-700/40 bg-gradient-to-b from-[#818CF8]/25 via-[#38BDF8]/20 to-[#6366F1]/30 p-6 sm:p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
        {/* Fire/Glow borders background effect inspired by reference image */}
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10 pointer-events-none" />

        {/* 1. Avatar da Enfermeira Nina */}
        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 p-1 shadow-xl ring-4 ring-white dark:ring-stone-900 mx-auto">
            <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 flex items-center justify-center overflow-hidden">
              <span className="text-5xl select-none" role="img" aria-label="Nina IA">
                👩‍⚕️
              </span>
            </div>
          </div>
          <span className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 animate-pulse" />
        </div>

        {/* 2. Título & Subtítulo */}
        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-stone-800/80 border border-sky-300 dark:border-sky-600 text-xs font-black text-indigo-700 dark:text-sky-300 uppercase tracking-widest shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            Inteligência Artificial em Saúde
          </div>

          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">
            Nina IA
          </h2>

          <p className="text-sm sm:text-base font-extrabold text-indigo-900 dark:text-sky-200 leading-snug">
            Núcleo Inteligente de Navegação e Apoio com Inteligência Artificial
          </p>

          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-semibold leading-relaxed">
            Assistência humanizada e respostas rápidas para suas dúvidas em saúde 🩺💡
          </p>
        </div>

        {/* 3. Botão Principal Acessar Chatbot */}
        <div>
          <button
            type="button"
            onClick={() => setChatStarted(true)}
            className="w-full sm:max-w-xs mx-auto bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-stone-950 font-black text-base sm:text-lg py-4 px-8 rounded-full shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-amber-300"
          >
            <span>Acessar Chatbot</span>
            <span className="text-xl">🚀</span>
          </button>
        </div>

        {/* 4. Cards de Benefícios / Destaque */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left max-w-lg mx-auto">
          <div className="bg-white/80 dark:bg-stone-900/80 border border-white/60 dark:border-stone-800 rounded-3xl p-4 shadow-sm backdrop-blur-xs flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                Responda dúvidas de saúde
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                Perguntas sobre sintomas, prevenção, cuidados e bem-estar. Orientação instantânea e responsável.
              </p>
            </div>
          </div>

          <div className="bg-white/80 dark:bg-stone-900/80 border border-white/60 dark:border-stone-800 rounded-3xl p-4 shadow-sm backdrop-blur-xs flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                Cuidado com a família
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                Para os nossos familiares e idosos: organização, cuidado e atenção em tempo real.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── TELA DO CHATBOT EM FUNCIONAMENTO ─────────────────────────────────────────
  return (
    <div className="flex flex-col h-[600px] max-h-[85vh] bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden">
      {/* ── Header ── */}
      <div className="bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 text-white p-4 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-white text-stone-900 flex items-center justify-center text-2xl shadow-md">
              👩‍⚕️
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-indigo-700" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black leading-tight text-white">Nina IA</h3>
              <Badge className="bg-white/20 text-white hover:bg-white/30 text-[10px] font-bold px-2 py-0 border-0">
                Online 24h
              </Badge>
            </div>
            <p className="text-[11px] text-sky-100 leading-tight">
              Apoiando o cuidado de {caredPersonName}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setVoiceEnabled((v) => !v);
              if (voiceEnabled && typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }}
            className={cn(
              'p-2 rounded-xl text-xs font-bold transition-all',
              voiceEnabled ? 'bg-white text-indigo-700' : 'bg-white/15 text-white hover:bg-white/25'
            )}
            title={voiceEnabled ? 'Voz ativada' : 'Ativar voz'}
          >
            {voiceEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Messages Thread ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50 dark:bg-[#070F1E]/60">
        {messages.map((msg) => {
          const isBot = msg.role === 'assistant';
          return (
            <div
              key={msg.id}
              className={cn('flex items-start gap-2.5 max-w-[88%]', isBot ? 'self-start' : 'self-end ml-auto flex-row-reverse')}
            >
              {isBot ? (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white flex items-center justify-center text-sm shrink-0 shadow-xs mt-1">
                  👩‍⚕️
                </div>
              ) : (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs mt-1">
                  <User className="h-4 w-4" />
                </div>
              )}

              <div
                className={cn(
                  'rounded-3xl p-3.5 text-xs sm:text-sm shadow-xs space-y-1',
                  isBot
                    ? 'bg-white dark:bg-[#16253C] text-stone-900 dark:text-white border border-stone-200/80 dark:border-stone-700 rounded-tl-xs'
                    : 'bg-[#1D4ED8] text-white rounded-tr-xs'
                )}
              >
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <div className={cn('text-[10px] text-right', isBot ? 'text-stone-400' : 'text-blue-100')}>
                  {msg.time}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-2.5 max-w-[85%] self-start">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-600 text-white flex items-center justify-center text-sm shrink-0">
              👩‍⚕️
            </div>
            <div className="bg-white dark:bg-[#16253C] border border-stone-200 dark:border-stone-700 rounded-3xl rounded-tl-xs p-3.5 shadow-xs flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-sky-500 animate-spin" />
              <span className="text-xs text-stone-500 dark:text-stone-300 font-semibold">
                Nina está analisando e redigindo sua orientação...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested Questions Chips ── */}
      <div className="px-3 py-2 bg-white dark:bg-[#0C1728] border-t border-stone-100 dark:border-[#1E293B] overflow-x-auto flex gap-1.5 shrink-0">
        {SUGGESTED_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickQuestion(q)}
            className="text-[11px] font-bold text-indigo-700 dark:text-sky-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-full px-3 py-1 whitespace-nowrap shrink-0 transition-all active:scale-95"
          >
            💡 {q}
          </button>
        ))}
      </div>

      {/* ── Input bar ── */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white dark:bg-[#0C1728] border-t border-stone-200 dark:border-[#1E293B] flex items-center gap-2 shrink-0"
      >
        <button
          type="button"
          onClick={handleToggleVoice}
          className={cn(
            'w-10 h-10 rounded-2xl flex items-center justify-center transition-all shrink-0',
            isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-stone-100 dark:bg-[#16253C] text-stone-600 dark:text-stone-300 hover:bg-stone-200'
          )}
          title="Falar por voz"
        >
          {isRecording ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </button>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Pergunte algo sobre a saúde de ${caredPersonName}...`}
          className="flex-1 bg-stone-50 dark:bg-[#16253C] border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />

        <Button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl w-10 h-10 p-0 flex items-center justify-center shrink-0 shadow-md active:scale-95"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
