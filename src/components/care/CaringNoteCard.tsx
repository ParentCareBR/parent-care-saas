'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, Heart } from 'lucide-react';
import { speakPleasantVoice } from '@/lib/audio/voice-synthesizer';

interface CaringNoteCardProps {
  locale?: string;
  elderName?: string;
}

// Mensagens diárias serenas, respeitosas, adultas e acolhedoras por idioma
// Sem promessas de saúde, sem infantilização, sem suposições religiosas ou familiares
const CARING_MESSAGES_BY_LOCALE: Record<string, string[]> = {
  'pt-BR': [
    'Desejamos que o seu dia seja sereno e tranquilo. Viva cada momento no seu próprio ritmo.',
    'Cada novo dia traz a oportunidade de apreciar momentos simples de calma e bem-estar.',
    'Respeite o seu tempo e desfrute de um dia agradável. Cuidar de si é sempre importante.',
    'Que o dia de hoje seja leve e confortável. Lembre-se de fazer pausas e respirar com calma.',
    'Tenha um bom dia, com tranquilidade e serenidade em cada pequena atividade.',
    'A calma é uma grande aliada do bem-estar. Aproveite o seu dia com paciência e tranquilidade.',
    'Desejamos a você uma jornada tranquila, cercada de serenidade e momentos agradáveis.',
  ],
  'en': [
    'We wish you a peaceful and serene day. Take every moment at your own comfortable pace.',
    'Each new day brings the opportunity to appreciate simple moments of calm and comfort.',
    'Respect your own time and enjoy a pleasant day. Your well-being is always important.',
    'May today be light and comfortable. Remember to take gentle pauses throughout your day.',
    'Have a good and serene day, with peace in every little activity.',
  ],
  'es': [
    'Le deseamos un día sereno y tranquilo. Viva cada momento a su propio ritmo.',
    'Cada nuevo día brinda la oportunidad de apreciar momentos sencillos de calma y bienestar.',
    'Respete su propio tiempo y disfrute de un día agradable. Cuidar de sí mismo siempre es importante.',
    'Que el día de hoy sea ligero y confortable. Recuerde hacer pausas y respirar con calma.',
    'Tenga un buen día, con serenidad y tranquilidad en cada pequeña actividad.',
  ],
  'fr': [
    'Nous vous souhaitons une journée paisible et sereine. Vivez chaque instant à votre propre rythme.',
    'Chaque nouveau jour offre l’occasion d’apprécier des moments simples de calme et de bien-être.',
    'Prenez votre temps et profitez d’une agréable journée. Prendre soin de soi est toujours précieux.',
    'Que cette journée soit douce et réconfortante. Pensez à faire des pauses en toute quiétude.',
  ],
  'de': [
    'Wir wünschen Ihnen einen friedlichen und ruhigen Tag. Gehen Sie jeden Moment in Ihrem eigenen Tempo an.',
    'Jeder neue Tag bringt die Gelegenheit, einfache Momente der Ruhe und des Wohlbefindens zu genießen.',
    'Gönnen Sie sich Zeit und genießen Sie einen angenehmen Tag. Das eigene Wohlbefinden ist stets wichtig.',
    'Möge der heutige Tag leicht und angenehm sein. Denken Sie daran, in Ruhe Pausen einzulegen.',
  ],
};

const TITLE_BY_LOCALE: Record<string, string> = {
  'pt-BR': 'Recado com Carinho',
  'en': 'Warm Thought',
  'es': 'Mensaje con Cariño',
  'fr': 'Pensée Bienveillante',
  'de': 'Herzlicher Gruß',
};

const LISTEN_BY_LOCALE: Record<string, string> = {
  'pt-BR': 'Ouvir',
  'en': 'Listen',
  'es': 'Escuchar',
  'fr': 'Écouter',
  'de': 'Anhören',
};

export function CaringNoteCard({ locale = 'pt-BR', elderName }: CaringNoteCardProps) {
  const [message, setMessage] = useState<string>('');
  const normalizedLocale = locale.startsWith('pt') ? 'pt-BR' : locale.split('-')[0];

  useEffect(() => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const cacheKey = `parentcare_daily_caring_note_${dateStr}_${normalizedLocale}`;

    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setMessage(cached);
        return;
      }
    }

    // Deterministic daily message index based on day of year
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const list = CARING_MESSAGES_BY_LOCALE[normalizedLocale] || CARING_MESSAGES_BY_LOCALE['pt-BR'];
    const selectedMsg = list[dayOfYear % list.length];

    setMessage(selectedMsg);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(cacheKey, selectedMsg);
      } catch {}
    }
  }, [normalizedLocale]);

  const handleListen = () => {
    if (!message) return;
    speakPleasantVoice(message, { locale: normalizedLocale });
  };

  const title = TITLE_BY_LOCALE[normalizedLocale] || TITLE_BY_LOCALE['pt-BR'];
  const listenLabel = LISTEN_BY_LOCALE[normalizedLocale] || LISTEN_BY_LOCALE['pt-BR'];

  if (!message) return null;

  return (
    <div className="bg-gradient-to-br from-rose-50/90 via-amber-50/50 to-orange-50/80 dark:from-stone-900 dark:via-rose-950/20 dark:to-stone-900 border-2 border-rose-200 dark:border-rose-900/60 rounded-3xl p-4 sm:p-5 shadow-xs space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center text-lg shrink-0">
            <Heart className="h-4 w-4 fill-current" />
          </div>
          <h3 className="text-sm font-black text-rose-900 dark:text-rose-200 tracking-tight">
            {title}
          </h3>
        </div>

        <button
          type="button"
          onClick={handleListen}
          className="h-8 px-2.5 rounded-xl border border-rose-300 dark:border-rose-800 bg-white dark:bg-stone-800 text-rose-800 dark:text-rose-300 text-xs font-bold flex items-center gap-1 active:scale-95 shadow-2xs transition-all shrink-0 hover:bg-rose-50"
          title={listenLabel}
        >
          <Volume2 className="h-3.5 w-3.5" />
          <span>{listenLabel}</span>
        </button>
      </div>

      {/* Message content */}
      <div className="bg-white/90 dark:bg-stone-800/90 border border-rose-100 dark:border-rose-900/50 rounded-2xl p-4">
        <p className="text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100 leading-relaxed">
          &ldquo;{message}&rdquo;
        </p>
      </div>
    </div>
  );
}
