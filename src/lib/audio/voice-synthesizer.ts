'use client';

/**
 * Parent Care - Pleasant Voice Synthesizer
 * 
 * Inteligência de voz natural para idosos e cuidadores:
 * 1. Prioriza vozes neurais e naturais (Microsoft Natural / Google Neural / Apple Enhanced).
 * 2. Normaliza e humaniza o texto (remove marcações, traduz unidades como '50mg' -> '50 miligramas', '22:32' -> '22 horas e 32 minutos').
 * 3. Permite alternar entre personas acolhedoras (Nina Acolhedora, Dr. Amigo, Google Natural).
 * 4. Salva a preferência do usuário de forma persistente.
 */

export interface VoicePersona {
  id: string;
  name: string;
  gender: 'female' | 'male' | 'neutral';
  description: string;
  previewText: string;
  recommendedKeywords: string[];
  preferredRate: number;
  preferredPitch: number;
}

export const VOICE_PERSONAS: VoicePersona[] = [
  {
    id: 'nina_warm',
    name: 'Nina Acolhedora (Feminina & Afetuosa)',
    gender: 'female',
    description: 'Voz feminina suave, calma e paciente. Ideal para rotinas, remédios e apoio emocional.',
    previewText: 'Olá! Sou a Nina do Parent Care. Estou aqui para cuidar do seu dia com todo carinho.',
    recommendedKeywords: ['francisca', 'brenda', 'luciana', 'female', 'mulher', 'maria natural', 'google'],
    preferredRate: 0.96,
    preferredPitch: 1.0,
  },
  {
    id: 'doctor_gentle',
    name: 'Dr. Amigo (Masculina & Serena)',
    gender: 'male',
    description: 'Voz masculina acolhedora, serena e segura. Excelente para lembretes e consultas.',
    previewText: 'Olá! Sou o assistente do Parent Care. Vamos juntos acompanhar seus compromissos com tranquilidade.',
    recommendedKeywords: ['antonio', 'donato', 'felipe', 'male', 'homem', 'jorge', 'guy'],
    preferredRate: 0.95,
    preferredPitch: 0.95,
  },
  {
    id: 'google_natural',
    name: 'Voz Neural Fluida (Google / Apple Natural)',
    gender: 'neutral',
    description: 'Voz moderna, límpida e com dicção perfeita para qualquer dispositivo.',
    previewText: 'Olá! Sua agenda e horários de medicamentos estão sempre atualizados com precisão.',
    recommendedKeywords: ['natural', 'neural', 'google', 'enhanced', 'online'],
    preferredRate: 1.0,
    preferredPitch: 1.0,
  },
];

const PREFERRED_VOICE_KEY = 'parentcare_preferred_voice_persona';
const PREFERRED_VOICE_URI_KEY = 'parentcare_preferred_voice_uri';
const PREFERRED_VOICE_SPEED_KEY = 'parentcare_preferred_voice_speed';

// Cache for available voices
let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesLoadedPromise: Promise<SpeechSynthesisVoice[]> | null = null;

/**
 * Humanizes text for natural speech:
 * - Expands units (mg, ml, comprimidos, horas)
 * - Strips emojis, asterisks, URLs, and code brackets
 * - Adds natural conversational pauses
 */
export function humanizeTextForSpeech(text: string): string {
  if (!text) return '';

  let clean = text
    // Remove markdown formatting
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/_(.*?)_/g, '$1')
    .replace(/#+\s+/g, '')
    .replace(/`{1,3}.*?`{1,3}/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    // Expand time format: "22:32" -> "22 horas e 32 minutos"
    .replace(/\b(\d{1,2}):(\d{2})\b/g, (match, h, m) => {
      const hours = parseInt(h, 10);
      const minutes = parseInt(m, 10);
      const hourStr = hours === 1 ? '1 hora' : `${hours} horas`;
      if (minutes === 0) return hourStr;
      return `${hourStr} e ${minutes} minutos`;
    })
    // Expand medical / dosage units
    .replace(/\b(\d+)\s*mg\b/gi, '$1 miligramas')
    .replace(/\b(\d+)\s*ml\b/gi, '$1 mililitros')
    .replace(/\b(\d+)\s*g\b/gi, '$1 gramas')
    .replace(/\b(\d+)\s*cp\b/gi, '$1 comprimido')
    .replace(/\b(\d+)\s*gotas\b/gi, '$1 gotas')
    // Remove emojis and surrogate pairs
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/[\u2600-\u26FF\u2700-\u27BF]/g, '')
    // Remove bullets and symbols
    .replace(/[•●▪►✓✔✕✖🚨💊💧🍽️🩺🏃📚🩹🎭]/g, '')
    // Clean up spaces and punctuation
    .replace(/\s{2,}/g, ' ')
    .trim();

  return clean;
}

/**
 * Loads and caches system and online voices, ensuring full initialization
 */
export function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return Promise.resolve([]);
  }

  if (cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }

  if (voicesLoadedPromise) {
    return voicesLoadedPromise;
  }

  voicesLoadedPromise = new Promise((resolve) => {
    const checkVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        cachedVoices = voices;
        resolve(voices);
        return true;
      }
      return false;
    };

    if (checkVoices()) return;

    window.speechSynthesis.onvoiceschanged = () => {
      if (checkVoices()) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };

    // Fallback timeout in case onvoiceschanged does not fire
    setTimeout(() => {
      const voices = window.speechSynthesis.getVoices();
      cachedVoices = voices;
      resolve(voices);
    }, 400);
  });

  return voicesLoadedPromise;
}

/**
 * Score a voice according to naturalness and pleasantness for senior care
 */
function scoreVoice(voice: SpeechSynthesisVoice, personaKeywords: string[], targetLangPrefix: string): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();

  let score = 0;

  // Language match is essential
  if (lang.startsWith(targetLangPrefix.toLowerCase())) {
    score += 100;
  } else if (lang.includes(targetLangPrefix.split('-')[0].toLowerCase())) {
    score += 50;
  } else {
    return -100; // Wrong language
  }

  // Tier 1: Natural / Neural / Online (Highest quality available)
  if (name.includes('natural') || name.includes('online (natural)') || name.includes('neural')) {
    score += 80;
  }

  // Tier 2: Enhanced / Google / Apple Neural
  if (name.includes('google') || name.includes('enhanced') || name.includes('premium')) {
    score += 40;
  }

  // Persona match
  for (const kw of personaKeywords) {
    if (name.includes(kw.toLowerCase())) {
      score += 35;
      break;
    }
  }

  // Penalize harsh or robotic desktop engines
  if (name.includes('desktop') || name.includes('espeak') || name.includes('compact')) {
    score -= 60;
  }

  return score;
}

/**
 * Get the best matching natural voice for a given persona and locale
 */
export async function getBestVoice(
  personaId?: string,
  rawLocale: string = 'pt-BR'
): Promise<{ voice: SpeechSynthesisVoice | null; persona: VoicePersona; rate: number; pitch: number }> {
  const voices = await loadVoices();
  const langPrefix = rawLocale.startsWith('pt') ? 'pt' : rawLocale.split('-')[0];

  // Retrieve preferred persona
  const currentPersonaId = personaId || (typeof window !== 'undefined' ? localStorage.getItem(PREFERRED_VOICE_KEY) : null) || 'nina_warm';
  const persona = VOICE_PERSONAS.find((p) => p.id === currentPersonaId) || VOICE_PERSONAS[0];

  // Check if a specific voice URI was saved
  const savedUri = typeof window !== 'undefined' ? localStorage.getItem(PREFERRED_VOICE_URI_KEY) : null;
  if (savedUri) {
    const exactVoice = voices.find((v) => v.voiceURI === savedUri);
    if (exactVoice) {
      return {
        voice: exactVoice,
        persona,
        rate: getSavedSpeed(persona.preferredRate),
        pitch: persona.preferredPitch,
      };
    }
  }

  // Find the highest-scoring voice
  let bestVoice: SpeechSynthesisVoice | null = null;
  let highestScore = -999;

  for (const v of voices) {
    const s = scoreVoice(v, persona.recommendedKeywords, langPrefix);
    if (s > highestScore) {
      highestScore = s;
      bestVoice = v;
    }
  }

  // Fallback to any voice matching language if score was low
  if (!bestVoice) {
    bestVoice = voices.find((v) => v.lang.toLowerCase().startsWith(langPrefix)) || voices[0] || null;
  }

  return {
    voice: bestVoice,
    persona,
    rate: getSavedSpeed(persona.preferredRate),
    pitch: persona.preferredPitch,
  };
}

function getSavedSpeed(defaultRate: number): number {
  if (typeof window === 'undefined') return defaultRate;
  const saved = localStorage.getItem(PREFERRED_VOICE_SPEED_KEY);
  if (saved) {
    const parsed = parseFloat(saved);
    if (!isNaN(parsed) && parsed >= 0.7 && parsed <= 1.4) {
      return parsed;
    }
  }
  return defaultRate;
}

// Active audio instances for cancellation and iOS unlocking
let activeAudioElement: HTMLAudioElement | null = null;
let activeAudioContext: AudioContext | null = null;
let activeSourceNode: AudioBufferSourceNode | null = null;
let currentBlobUrl: string | null = null;

/**
 * Unlocks audio on iOS Safari and mobile browsers.
 * MUST be called directly within a user gesture (click/tap/touch) before async operations.
 */
export function unlockAudio(): void {
  if (typeof window === 'undefined') return;

  try {
    // 1. Pre-warm HTMLAudioElement
    if (!activeAudioElement) {
      activeAudioElement = new Audio();
    }

    // 2. Resume or instantiate Web Audio Context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!activeAudioContext || activeAudioContext.state === 'closed') {
        activeAudioContext = new AudioContextClass();
      }
      if (activeAudioContext.state === 'suspended') {
        activeAudioContext.resume().catch(() => {});
      }
    }

    // 3. Touch SpeechSynthesis to prepare Safari Web Speech engine
    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
    }
  } catch (err) {
    console.warn('[voice-synthesizer] Audio unlock note:', err);
  }
}

/**
 * Plays audio via Gemini Neural TTS API (high quality).
 * Falls back to Web Speech API if the fetch fails or audio cannot play.
 */
async function speakViaGeminiTTS(
  text: string,
  locale: string,
  personaId: string | undefined,
  onEnd?: () => void,
  onError?: (err: any) => void
): Promise<boolean> {
  try {
    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, locale, persona: personaId }),
    });

    if (!response.ok) {
      console.warn('[voice-synthesizer] /api/tts HTTP', response.status);
      return false;
    }

    const arrayBuffer = await response.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) return false;

    // Clean up previous playback if any
    stopVoiceSpeech();

    // Strategy A: HTMLAudioElement with Blob URL (Universal compatibility across iOS Safari and Android)
    try {
      const blob = new Blob([arrayBuffer], { type: 'audio/wav' });
      const blobUrl = URL.createObjectURL(blob);
      currentBlobUrl = blobUrl;

      if (!activeAudioElement) {
        activeAudioElement = new Audio();
      }

      const audio = activeAudioElement;
      audio.src = blobUrl;

      const handleAudioEnd = () => {
        audio.removeEventListener('ended', handleAudioEnd);
        audio.removeEventListener('error', handleAudioErr);
        if (currentBlobUrl) {
          URL.revokeObjectURL(currentBlobUrl);
          currentBlobUrl = null;
        }
        onEnd?.();
      };

      const handleAudioErr = (e: any) => {
        audio.removeEventListener('ended', handleAudioEnd);
        audio.removeEventListener('error', handleAudioErr);
        console.warn('[voice-synthesizer] HTMLAudio error, trying Web Audio buffer:', e);
      };

      audio.addEventListener('ended', handleAudioEnd);
      audio.addEventListener('error', handleAudioErr);

      await audio.play();
      return true;
    } catch (htmlAudioErr) {
      console.warn('[voice-synthesizer] HTMLAudio.play() failed, trying Web Audio Context:', htmlAudioErr);
    }

    // Strategy B: Web Audio Context Buffer Source
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!activeAudioContext || activeAudioContext.state === 'closed') {
        activeAudioContext = new AudioContextClass();
      }

      if (activeAudioContext.state === 'suspended') {
        await activeAudioContext.resume();
      }

      const decoded = await activeAudioContext.decodeAudioData(arrayBuffer.slice(0));
      const source = activeAudioContext.createBufferSource();
      source.buffer = decoded;
      source.connect(activeAudioContext.destination);

      activeSourceNode = source;

      source.onended = () => {
        activeSourceNode = null;
        onEnd?.();
      };

      source.start(0);
      return true;
    } catch (webAudioErr) {
      console.warn('[voice-synthesizer] Web Audio Buffer playback failed:', webAudioErr);
      return false;
    }
  } catch (err) {
    console.warn('[voice-synthesizer] Gemini TTS failed, falling back to Web Speech:', err);
    return false;
  }
}

/**
 * Main pleasant speech function: speaks text out loud.
 * Priority: Gemini Neural TTS API → Web Speech API (local voices).
 */
export async function speakPleasantVoice(
  text: string,
  options?: {
    locale?: string;
    personaId?: string;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): Promise<void> {
  if (typeof window === 'undefined') return;

  // Immediate unlock attempt
  unlockAudio();

  const clean = humanizeTextForSpeech(text);
  if (!clean) return;

  const locale = options?.locale || 'pt-BR';
  const personaId = options?.personaId;

  // 1. Try Gemini Neural TTS (high quality)
  const geminiSuccess = await speakViaGeminiTTS(clean, locale, personaId, options?.onEnd, options?.onError);
  if (geminiSuccess) return;

  // 2. Fallback: Web Speech API (local device voices)
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();

    const { voice, rate, pitch } = await getBestVoice(personaId, locale);

    const utterance = new SpeechSynthesisUtterance(clean);
    if (voice) {
      utterance.voice = voice;
      utterance.lang = voice.lang;
    } else {
      utterance.lang = locale;
    }

    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.volume = 1.0;

    if (options?.onEnd) utterance.onend = () => options.onEnd?.();
    if (options?.onError) utterance.onerror = (e) => options.onError?.(e);

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('[voice-synthesizer] Web Speech fallback error:', err);
    options?.onError?.(err);
  }
}

/**
 * Stop any active speech synthesis (HTML audio, Web Audio node, or browser synthesis)
 */
export function stopVoiceSpeech(): void {
  if (typeof window === 'undefined') return;

  // 1. Stop HTMLAudioElement
  if (activeAudioElement) {
    try {
      activeAudioElement.pause();
      activeAudioElement.currentTime = 0;
      activeAudioElement.removeAttribute('src');
    } catch {}
  }

  // 2. Clean up blob URL
  if (currentBlobUrl) {
    try {
      URL.revokeObjectURL(currentBlobUrl);
    } catch {}
    currentBlobUrl = null;
  }

  // 3. Stop Web Audio Buffer Source
  if (activeSourceNode) {
    try {
      activeSourceNode.stop();
      activeSourceNode.disconnect();
    } catch {}
    activeSourceNode = null;
  }

  // 4. Stop Web Speech Synthesis
  if ('speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}

/**
 * Save user voice preferences
 */
export function saveVoicePreferences(personaId: string, voiceUri?: string, speed?: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PREFERRED_VOICE_KEY, personaId);
  if (voiceUri) {
    localStorage.setItem(PREFERRED_VOICE_URI_KEY, voiceUri);
  }
  if (speed) {
    localStorage.setItem(PREFERRED_VOICE_SPEED_KEY, speed.toString());
  }
}
