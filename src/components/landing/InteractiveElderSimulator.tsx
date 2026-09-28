'use client';

import React, { useState } from 'react';
import { Heart, Droplet, Utensils, Pill, BellRing, CheckCircle2, Volume2, Sparkles, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InteractiveElderSimulator({ locale = 'pt-BR' }: { locale?: string }) {
  const [activeMessage, setActiveMessage] = useState<string | null>(null);
  const [lastClicked, setLastClicked] = useState<string | null>(null);

  const playChime = () => {
    if (typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const start = ctx.currentTime + idx * 0.12;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.55);
      });
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = locale === 'en' ? 'en-US' : 'pt-BR';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch {
      // Speech fallback
    }
  };

  const handleAction = (id: string, speech: string, familyNotice: string) => {
    setLastClicked(id);
    setActiveMessage(familyNotice);
    playChime();
    speakText(speech);
  };

  return (
    <div className="relative max-w-4xl mx-auto my-12 p-4 sm:p-8 bg-gradient-to-b from-stone-50 to-emerald-50/40 rounded-3xl border-2 border-emerald-100 shadow-xl">
      {/* Badge Header */}
      <div className="text-center space-y-2 mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-600 text-white text-xs sm:text-sm font-bold shadow-md">
          <Sparkles className="h-4 w-4" />
          Simulador Interativo da Tela do Idoso
        </div>
        <h3 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
          Toque nos botões abaixo e experimente a simplicidade
        </h3>
        <p className="text-sm sm:text-base text-gray-600 max-w-xl mx-auto">
          Veja como é fácil para o seu pai ou mãe interagir. O tablet fala em voz alta e notifica toda a família instantaneamente.
        </p>
      </div>

      {/* Simulated Tablet Frame */}
      <div className="max-w-md mx-auto bg-stone-900 p-3 sm:p-4 rounded-[2.5rem] shadow-2xl border-4 border-stone-700 relative">
        {/* Tablet Camera / speaker bar */}
        <div className="flex items-center justify-center gap-2 pb-3">
          <div className="w-2.5 h-2.5 rounded-full bg-stone-800 border border-stone-600" />
          <div className="w-12 h-1 rounded-full bg-stone-800" />
        </div>

        {/* Tablet Screen Content */}
        <div className="bg-stone-100 rounded-[1.8rem] p-4 sm:p-5 space-y-4 overflow-hidden border border-stone-300">
          {/* Senior Screen Header */}
          <div className="flex items-center justify-between border-b border-stone-200 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 font-black">
                <Heart className="h-5 w-5 fill-emerald-600" />
              </div>
              <div>
                <p className="text-base font-black text-stone-900 leading-tight">Olá, Dona Maria!</p>
                <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Família Conectada
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-stone-600 bg-white px-2.5 py-1 rounded-lg border border-stone-200">
              09:30
            </span>
          </div>

          {/* Prompt */}
          <p className="text-xs font-bold text-center text-stone-600 uppercase tracking-wide">
            Toque para avisar seus filhos:
          </p>

          {/* Interactive Senior Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Estou Bem */}
            <button
              type="button"
              onClick={() => handleAction('well', 'Que ótimo Dona Maria! Avisamos a família que você está bem.', 'Dona Maria avisou: "Estou bem!"')}
              className={cn(
                'bg-white border-2 p-3 sm:p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all active:scale-95 shadow-sm',
                lastClicked === 'well' ? 'border-emerald-500 bg-emerald-50/50 scale-102 ring-2 ring-emerald-400' : 'border-emerald-200 hover:border-emerald-400'
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Heart className="h-6 w-6 fill-emerald-600" />
              </div>
              <div>
                <span className="text-sm font-black text-stone-900 block leading-tight">Estou Bem</span>
                <span className="text-[10px] text-emerald-700 font-medium">Tudo tranquilo</span>
              </div>
            </button>

            {/* Tomei Remédio */}
            <button
              type="button"
              onClick={() => handleAction('med', 'Parabéns Dona Maria! Remédio Losartana das nove horas confirmado.', 'Remédio tomado: Losartana 50mg confirmado às 09:30')}
              className={cn(
                'bg-white border-2 p-3 sm:p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all active:scale-95 shadow-sm',
                lastClicked === 'med' ? 'border-blue-500 bg-blue-50/50 scale-102 ring-2 ring-blue-400' : 'border-blue-200 hover:border-blue-400'
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600">
                <Pill className="h-6 w-6" />
              </div>
              <div>
                <span className="text-sm font-black text-stone-900 block leading-tight">Tomei Remédio</span>
                <span className="text-[10px] text-blue-700 font-medium">Losartana 50mg</span>
              </div>
            </button>

            {/* Bebi Água */}
            <button
              type="button"
              onClick={() => handleAction('water', 'Muito bem Dona Maria! Hidratação registrada.', 'Dona Maria bebeu +1 copo de água (250ml)')}
              className={cn(
                'bg-white border-2 p-3 sm:p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all active:scale-95 shadow-sm',
                lastClicked === 'water' ? 'border-sky-500 bg-sky-50/50 scale-102 ring-2 ring-sky-400' : 'border-sky-200 hover:border-sky-400'
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
                <Droplet className="h-6 w-6 fill-sky-600" />
              </div>
              <div>
                <span className="text-sm font-black text-stone-900 block leading-tight">Bebi Água</span>
                <span className="text-[10px] text-sky-700 font-medium">+ 1 copo</span>
              </div>
            </button>

            {/* Já Comi */}
            <button
              type="button"
              onClick={() => handleAction('meal', 'Ótimo Dona Maria! Café da manhã registrado com sucesso.', 'Dona Maria confirmou o café da manhã')}
              className={cn(
                'bg-white border-2 p-3 sm:p-4 rounded-2xl flex flex-col items-center gap-2 text-center transition-all active:scale-95 shadow-sm',
                lastClicked === 'meal' ? 'border-amber-500 bg-amber-50/50 scale-102 ring-2 ring-amber-400' : 'border-amber-200 hover:border-amber-400'
              )}
            >
              <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600">
                <Utensils className="h-6 w-6" />
              </div>
              <div>
                <span className="text-sm font-black text-stone-900 block leading-tight">Já Comi</span>
                <span className="text-[10px] text-amber-700 font-medium">Café da manhã</span>
              </div>
            </button>
          </div>

          {/* Emergency SOS button */}
          <button
            type="button"
            onClick={() => handleAction('help', 'Atenção! Enviamos um chamado de atenção urgente para os seus filhos agora mesmo.', '🚨 ALERTA: Dona Maria solicitou atenção da família!')}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-3 rounded-2xl flex items-center justify-center gap-2 font-black text-sm shadow-md active:scale-95 transition-all"
          >
            <BellRing className="h-4 w-4" />
            Preciso de Ajuda / Ligar para Família
          </button>
        </div>
      </div>

      {/* Simulated Live Family Notification Banner */}
      {activeMessage && (
        <div className="mt-6 max-w-md mx-auto bg-emerald-600 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-100">
              Notificação no Celular dos Filhos
            </p>
            <p className="text-sm font-extrabold truncate">{activeMessage}</p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-200 shrink-0" />
        </div>
      )}
    </div>
  );
}
