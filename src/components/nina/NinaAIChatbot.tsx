'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Sparkles,
  User,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Stethoscope,
  Heart,
  RefreshCw,
  X,
  Lightbulb,
  ShieldCheck,
  Square,
  Sliders,
  Loader2,
  Check,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { speakPleasantVoice, stopVoiceSpeech, unlockAudio } from '@/lib/audio/voice-synthesizer';
import { VoiceSettingsModal } from '@/components/shared/VoiceSettingsModal';

export interface NinaAIChatbotProps {
  caredPersonId?: string;
  caredPersonName?: string;
  isOpen?: boolean;
  onClose?: () => void;
  inline?: boolean;
  userRole?: 'host' | 'elderly';
  locale?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  time: string;
}

const SUGGESTED_QUESTIONS_BY_LOCALE: Record<string, string[]> = {
  'pt-BR': [
    'Qual a agenda de hoje?',
    'Quais os remédios cadastrados?',
    'Quais os cuidados com a pressão alta no idoso?',
    'Como identificar sinais de desidratação?',
    'O que fazer em caso de tontura súbita?',
    'Como prevenir quedas no banheiro?',
  ],
  'en': [
    'What is on the schedule for today?',
    'What medications are registered?',
    'How to prevent falls at home?',
    'What are the signs of dehydration in seniors?',
    'What to do in case of sudden dizziness?',
  ],
  'es': [
    '¿Cuál es la agenda de hoy?',
    '¿Cuáles son los medicamentos registrados?',
    '¿Cómo prevenir caídas en el hogar?',
    '¿Cuáles son los signos de deshidratación?',
    '¿Qué hacer en caso de mareo repentino?',
  ],
  'fr': [
    'Quel est le programme d’aujourd’hui ?',
    'Quels sont les médicaments enregistrés ?',
    'Comment prévenir les chutes à domicile ?',
    'Quels sont les signes de déshydratation ?',
  ],
  'de': [
    'Was steht heute auf dem Plan?',
    'Welche Medikamente sind registriert?',
    'Wie beugt man Stürzen zu Hause vor?',
    'Was sind Anzeichen von Dehydrierung?',
  ],
};

const WELCOME_MESSAGES: Record<string, (name: string) => string> = {
  'pt-BR': (name) => `Olá! Eu sou a **Nina IA**, sua assistente virtual no Parent Care 🩺💙\n\nEstou aqui para tirar dúvidas sobre a agenda, remédios, saúde e bem-estar de ${name}.\n\nComo posso ajudar hoje?`,
  'en': (name) => `Hello! I am **Nina AI**, your virtual assistant in Parent Care 🩺💙\n\nI am here to answer questions about ${name}’s schedule, medications, health, and well-being.\n\nHow can I help today?`,
  'es': (name) => `¡Hola! Soy **Nina IA**, tu asistente virtual en Parent Care 🩺💙\n\nEstoy aquí para responder dudas sobre la agenda, medicamentos y bienestar de ${name}.\n\n¿Cómo puedo ayudarte hoy?`,
  'fr': (name) => `Bonjour ! Je suis **Nina IA**, votre assistante virtuelle dans Parent Care 🩺💙\n\nJe suis là pour répondre à vos questions sur le planning, les médicaments et la santé de ${name}.\n\nComment puis-je vous aider aujourd’hui ?`,
  'de': (name) => `Hallo! Ich bin **Nina KI**, Ihre virtuelle Assistentin bei Parent Care 🩺💙\n\nIch helfe Ihnen bei Fragen zum Tagesablauf, zu Medikamenten und zum Wohlbefinden von ${name}.\n\nWie kann ich heute helfen?`,
};

export function NinaAIChatbot({
  caredPersonId,
  caredPersonName = 'seu familiar',
  isOpen = true,
  onClose,
  inline = false,
  userRole = 'host',
  locale = 'pt-BR',
}: NinaAIChatbotProps) {
  const normLocale = locale.startsWith('pt') ? 'pt-BR' : locale.split('-')[0];
  const welcomeFn = WELCOME_MESSAGES[normLocale] || WELCOME_MESSAGES['pt-BR'];
  const suggestedList = SUGGESTED_QUESTIONS_BY_LOCALE[normLocale] || SUGGESTED_QUESTIONS_BY_LOCALE['pt-BR'];

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: welcomeFn(caredPersonName),
      time: new Date().toLocaleTimeString(normLocale === 'pt-BR' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoVoice, setAutoVoice] = useState(true);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [chatStarted, setChatStarted] = useState(!inline);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);

  // ── Robust Voice Recording State ──
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingNotice, setRecordingNotice] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // MediaRecorder refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, loading, scrollToBottom]);

  // Clean up recording stream & timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      stopVoiceSpeech();
    };
  }, []);

  // ── Speech Synthesis Helpers ──
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    speakPleasantVoice(text, {
      locale: normLocale,
      onEnd,
      onError: () => onEnd?.(),
    });
  }, [normLocale]);

  // ── Send Message ──
  const handleSend = async (messageText?: string) => {
    unlockAudio();
    const textToSend = (messageText || input).trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: textToSend,
      time: new Date().toLocaleTimeString(normLocale === 'pt-BR' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    stopVoiceSpeech();
    setIsSpeaking(false);
    setSpeakingMsgId(null);
    setRecordingNotice(null);

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
      const replyContent = data.reply || (normLocale === 'en' ? 'Could you please repeat your question? I am here to help. 🩺' : 'Pode repetir sua dúvida? Estou aqui. 🩺');
      const botMsgId = `a-${Date.now()}`;

      const botMsg: Message = {
        id: botMsgId,
        role: 'assistant',
        content: replyContent,
        time: new Date().toLocaleTimeString(normLocale === 'pt-BR' ? 'pt-BR' : 'en-US', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (autoVoice) {
        setIsSpeaking(true);
        setSpeakingMsgId(botMsgId);
        speakText(replyContent, () => {
          setIsSpeaking(false);
          setSpeakingMsgId(null);
        });
      }
    } catch (err) {
      console.error('[Nina IA] Erro:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: normLocale === 'en'
            ? 'I had a brief connection issue. Please try sending again. 🩺'
            : 'Desculpe, tive uma instabilidade passageira. Por favor, tente enviar novamente. 🩺',
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // ── Stop Recording & Transcribe with Gemini AI ──
  const stopRecordingAndTranscribe = useCallback(async (discard = false) => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    setIsRecording(false);
    setRecordingSeconds(0);

    // Stop Web Speech if active
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }

    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    if (discard) {
      audioChunksRef.current = [];
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      setRecordingNotice(null);
      return;
    }

    // Wait for recorder to stop and deliver data
    await new Promise<void>((resolve) => {
      if (recorder.state === 'inactive') {
        resolve();
      } else {
        recorder.onstop = () => resolve();
        try { recorder.stop(); } catch { resolve(); }
      }
    });

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    const chunks = audioChunksRef.current;
    if (!chunks || chunks.length === 0) {
      setRecordingNotice(null);
      return;
    }

    const audioBlob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
    audioChunksRef.current = [];

    // Ignore accidental clicks under 0.4s or under 600 bytes
    if (audioBlob.size < 600) {
      setRecordingNotice(
        normLocale === 'en'
          ? 'Audio too short. Please speak while holding or tapping the microphone.'
          : 'Áudio muito curto. Por favor, fale por alguns segundos após tocar no microfone.'
      );
      setTimeout(() => setRecordingNotice(null), 4000);
      return;
    }

    setIsTranscribing(true);
    setRecordingNotice(
      normLocale === 'en' ? 'Transcribing your voice with AI...' : 'Transcrevendo sua voz com IA...'
    );

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      const res = await fetch('/api/nina/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Falha na transcrição');

      const data = await res.json();
      const transcribedText = (data.text || '').trim();

      if (transcribedText) {
        setRecordingNotice(null);
        setInput(transcribedText);
        // Auto-send voice question
        handleSend(transcribedText);
      } else {
        setRecordingNotice(
          normLocale === 'en'
            ? 'Could not hear clearly. Please speak closer to the microphone and try again.'
            : 'Não consegui ouvir com clareza. Fale mais próximo ao microfone e tente novamente.'
        );
        setTimeout(() => setRecordingNotice(null), 4000);
      }
    } catch (err: any) {
      console.error('[Transcribe] Error:', err);
      setRecordingNotice(
        normLocale === 'en'
          ? 'Error processing audio. Please try typing your question.'
          : 'Erro ao processar áudio. Você também pode digitar sua dúvida.'
      );
      setTimeout(() => setRecordingNotice(null), 4000);
    } finally {
      setIsTranscribing(false);
    }
  }, [normLocale]);

  // ── Start Audio Recording (Universal: iOS Safari, Android, Chrome, Edge) ──
  const startRecording = async () => {
    unlockAudio();
    stopVoiceSpeech();
    setIsSpeaking(false);
    setSpeakingMsgId(null);
    setRecordingNotice(null);

    if (typeof window === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setRecordingNotice(
        normLocale === 'en'
          ? 'Your browser does not support audio recording.'
          : 'Seu navegador não suporta gravação de áudio direto.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      // Detect supported mime type
      let chosenMime = '';
      const candidateTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/aac',
        'audio/ogg',
      ];
      for (const t of candidateTypes) {
        if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
          chosenMime = t;
          break;
        }
      }

      const recorder = chosenMime ? new MediaRecorder(stream, { mimeType: chosenMime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 45) {
            // Auto stop at 45 seconds
            stopRecordingAndTranscribe(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);

      // Optional: live Web Speech preview in parallel if supported
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        try {
          const rec = new SpeechRecognition();
          rec.lang = normLocale === 'pt-BR' ? 'pt-BR' : normLocale === 'es' ? 'es-ES' : normLocale === 'fr' ? 'fr-FR' : normLocale === 'de' ? 'de-DE' : 'en-US';
          rec.continuous = true;
          rec.interimResults = true;
          rec.onresult = (evt: any) => {
            const cur = evt.results[evt.results.length - 1];
            if (cur && cur[0]?.transcript) {
              setInput(cur[0].transcript);
            }
          };
          rec.onerror = () => {};
          rec.start();
          recognitionRef.current = rec;
        } catch {}
      }
    } catch (err: any) {
      console.error('[Microphone Permission Error]:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setRecordingNotice(
          normLocale === 'en'
            ? 'Microphone access was denied. Please allow microphone permissions in your browser settings.'
            : 'Acesso ao microfone negado. Por favor, libere a permissão de microfone nas configurações do seu navegador para falar com a Nina.'
        );
      } else {
        setRecordingNotice(
          normLocale === 'en'
            ? 'Could not activate microphone. Please check your device audio settings.'
            : 'Não foi possível ativar o microfone. Verifique o dispositivo de áudio do seu aparelho.'
        );
      }
    }
  };

  // ── Toggle Mic button ──
  const handleToggleMic = () => {
    if (isRecording) {
      stopRecordingAndTranscribe(false);
    } else {
      startRecording();
    }
  };

  // ── Speak a specific message toggle ──
  const handleSpeakMessage = (msg: Message) => {
    unlockAudio();
    if (speakingMsgId === msg.id && isSpeaking) {
      stopVoiceSpeech();
      setIsSpeaking(false);
      setSpeakingMsgId(null);
      return;
    }
    setIsSpeaking(true);
    setSpeakingMsgId(msg.id);
    speakText(msg.content, () => {
      setIsSpeaking(false);
      setSpeakingMsgId(null);
    });
  };

  const handleQuickQuestion = (q: string) => {
    unlockAudio();
    if (!chatStarted) setChatStarted(true);
    handleSend(q);
  };

  // Format seconds mm:ss
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // ─── Landing screen ────────────────────────────────────────────────────────
  if (!chatStarted) {
    return (
      <div className="relative overflow-hidden rounded-3xl border border-sky-300/40 dark:border-sky-700/40 bg-gradient-to-b from-[#818CF8]/25 via-[#38BDF8]/20 to-[#6366F1]/30 p-6 sm:p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10 pointer-events-none" />

        <div className="relative inline-block mx-auto">
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 p-1 shadow-xl ring-4 ring-white dark:ring-stone-900 mx-auto">
            <div className="w-full h-full rounded-full bg-white dark:bg-stone-800 flex items-center justify-center overflow-hidden">
              <span className="text-5xl select-none" role="img" aria-label="Nina IA">👩‍⚕️</span>
            </div>
          </div>
          <span className="absolute bottom-1 right-2 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white dark:border-stone-900 animate-pulse" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 dark:bg-stone-800/80 border border-sky-300 dark:border-sky-600 text-xs font-black text-indigo-700 dark:text-sky-300 uppercase tracking-widest shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            {normLocale === 'en' ? 'Healthcare Artificial Intelligence' : 'Inteligência Artificial em Saúde'}
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-stone-900 dark:text-white tracking-tight">Nina IA</h2>
          <p className="text-sm sm:text-base font-extrabold text-indigo-900 dark:text-sky-200 leading-snug">
            {normLocale === 'en' ? 'Smart Healthcare Navigation & Support' : 'Núcleo Inteligente de Navegação e Apoio'}
          </p>
          <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-300 font-semibold leading-relaxed">
            {normLocale === 'en'
              ? 'Humanized assistance and fast answers to your health and routine questions 🩺💡'
              : 'Assistência humanizada e respostas rápidas para suas dúvidas em saúde 🩺💡'}
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setChatStarted(true)}
            className="w-full sm:max-w-xs mx-auto bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:from-amber-500 hover:to-yellow-600 text-stone-950 font-black text-base sm:text-lg py-4 px-8 rounded-full shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 border-2 border-amber-300"
          >
            <span>{normLocale === 'en' ? 'Start Chatting' : 'Acessar Chatbot'}</span>
            <span className="text-xl">🚀</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 text-left max-w-lg mx-auto">
          <div className="bg-white/80 dark:bg-stone-900/80 border border-white/60 dark:border-stone-800 rounded-3xl p-4 shadow-sm backdrop-blur-xs flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <Stethoscope className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                {normLocale === 'en' ? 'Answers health questions' : 'Responde dúvidas de saúde'}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                {normLocale === 'en'
                  ? 'Schedule, medications, symptoms, prevention and well-being.'
                  : 'Agenda, remédios, sintomas, prevenção e bem-estar. Orientação responsável.'}
              </p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-stone-900/80 border border-white/60 dark:border-stone-800 rounded-3xl p-4 shadow-sm backdrop-blur-xs flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Heart className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                {normLocale === 'en' ? 'Natural voice speech' : 'Fala por áudio'}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                {normLocale === 'en'
                  ? 'Listen to Nina’s answers out loud with calm, warm tone.'
                  : 'Ouça as respostas da Nina em voz alta com calma e carinho.'}
              </p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-stone-900/80 border border-white/60 dark:border-stone-800 rounded-3xl p-4 shadow-sm backdrop-blur-xs flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
              <Mic className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                {normLocale === 'en' ? 'Voice input via microphone' : 'Entrada por voz'}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                {normLocale === 'en'
                  ? 'Speak your question directly without needing to type.'
                  : 'Fale sua pergunta pelo microfone, sem precisar digitar.'}
              </p>
            </div>
          </div>
          <div className="bg-white/80 dark:bg-stone-900/80 border border-white/60 dark:border-stone-800 rounded-3xl p-4 shadow-sm backdrop-blur-xs flex items-start gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xs font-black text-stone-900 dark:text-white">
                {normLocale === 'en' ? 'Real-time routine context' : 'Dados do app em tempo real'}
              </h4>
              <p className="text-[11px] text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                {normLocale === 'en'
                  ? `Routine and medications integrated — Nina knows about ${caredPersonName}.`
                  : `Agenda, remédios e rotina integrados — Nina sabe tudo sobre ${caredPersonName}.`}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Chat screen ───────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-[640px] max-h-[88vh] bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl shadow-2xl overflow-hidden">

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
              {normLocale === 'en' ? `Supporting ${caredPersonName}` : `Apoiando o cuidado de ${caredPersonName}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Voice settings */}
          <button
            type="button"
            onClick={() => setVoiceModalOpen(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-white/15 hover:bg-white/25 text-white transition-all"
            title="Escolher Voz Agradável da IA"
          >
            <Sliders className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{normLocale === 'en' ? 'Voice' : 'Voz'}</span>
          </button>

          {/* Auto-voz toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !autoVoice;
              setAutoVoice(next);
              if (!next) { stopVoiceSpeech(); setIsSpeaking(false); setSpeakingMsgId(null); }
            }}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all',
              autoVoice ? 'bg-white text-indigo-700 shadow-sm' : 'bg-white/15 text-white hover:bg-white/25'
            )}
            title={autoVoice ? 'Voz automática ativada' : 'Ativar voz automática'}
          >
            {autoVoice ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            <span className="hidden sm:inline">{autoVoice ? 'Voz ON' : 'Voz OFF'}</span>
          </button>

          {/* Stop speaking button */}
          {isSpeaking && (
            <button
              type="button"
              onClick={() => { stopVoiceSpeech(); setIsSpeaking(false); setSpeakingMsgId(null); }}
              className="flex items-center gap-1 px-2 py-1.5 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold transition-all"
              title="Parar áudio"
            >
              <Square className="h-3.5 w-3.5 fill-white" />
              <span className="hidden sm:inline">{normLocale === 'en' ? 'Stop' : 'Parar'}</span>
            </button>
          )}

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

      {/* ── Audio speaking status bar ── */}
      {isSpeaking && (
        <div className="bg-indigo-600/10 dark:bg-indigo-900/30 border-b border-indigo-200 dark:border-indigo-800 px-4 py-1.5 flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="w-1 bg-indigo-500 rounded-full animate-pulse"
                style={{ height: `${6 + i * 3}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {normLocale === 'en' ? 'Nina is speaking...' : 'Nina está falando...'}
          </span>
          <button
            type="button"
            onClick={() => { stopVoiceSpeech(); setIsSpeaking(false); setSpeakingMsgId(null); }}
            className="ml-auto text-xs text-indigo-500 hover:text-red-500 font-bold transition-colors"
          >
            {normLocale === 'en' ? 'Stop ✕' : 'Parar ✕'}
          </button>
        </div>
      )}

      {/* ── Messages Thread ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-stone-50/50 dark:bg-[#070F1E]/60">
        {messages.map((msg) => {
          const isBot = msg.role === 'assistant';
          const isThisSpeaking = speakingMsgId === msg.id && isSpeaking;
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

              <div className={cn(
                'rounded-3xl p-3.5 text-xs sm:text-sm shadow-xs space-y-2',
                isBot
                  ? cn(
                      'bg-white dark:bg-[#16253C] text-stone-900 dark:text-white border border-stone-200/80 dark:border-stone-700 rounded-tl-xs',
                      isThisSpeaking && 'ring-2 ring-indigo-400 dark:ring-indigo-500'
                    )
                  : 'bg-[#1D4ED8] text-white rounded-tr-xs'
              )}>
                <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                <div className={cn('flex items-center justify-between gap-2', isBot ? 'flex-row' : 'flex-row-reverse')}>
                  <span className={cn('text-[10px]', isBot ? 'text-stone-400' : 'text-blue-100')}>
                    {msg.time}
                  </span>
                  {isBot && (
                    <button
                      type="button"
                      onClick={() => handleSpeakMessage(msg)}
                      className={cn(
                        'flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all',
                        isThisSpeaking
                          ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                          : 'text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                      )}
                      title={isThisSpeaking ? 'Parar' : 'Ouvir resposta'}
                    >
                      {isThisSpeaking ? (
                        <><Square className="h-2.5 w-2.5 fill-current" /> {normLocale === 'en' ? 'Stop' : 'Parar'}</>
                      ) : (
                        <><Volume2 className="h-2.5 w-2.5" /> {normLocale === 'en' ? 'Listen' : 'Ouvir'}</>
                      )}
                    </button>
                  )}
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
                {normLocale === 'en' ? 'Nina is analyzing your question...' : 'Nina está analisando sua pergunta...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Suggested Questions ── */}
      <div className="px-3 py-2 bg-white dark:bg-[#0C1728] border-t border-stone-100 dark:border-[#1E293B] overflow-x-auto flex gap-1.5 shrink-0">
        {suggestedList.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleQuickQuestion(q)}
            disabled={loading || isRecording}
            className="text-[11px] font-bold text-indigo-700 dark:text-sky-300 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-full px-3 py-1 whitespace-nowrap shrink-0 transition-all active:scale-95 disabled:opacity-50"
          >
            <Lightbulb className="inline h-3 w-3 mr-1" />{q}
          </button>
        ))}
      </div>

      {/* ── Active Recording / Transcribing Bar ── */}
      {isRecording && (
        <div className="bg-red-500 text-white px-4 py-2.5 flex items-center justify-between gap-3 animate-pulse shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-3 h-3 rounded-full bg-white animate-ping shrink-0" />
            <span className="text-xs font-black truncate">
              {normLocale === 'en' ? 'Recording your voice...' : 'Gravando sua voz... Pode falar!'} ({formatTimer(recordingSeconds)})
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => stopRecordingAndTranscribe(true)}
              className="text-xs font-bold text-red-100 hover:text-white px-2 py-1 rounded-lg"
            >
              {normLocale === 'en' ? 'Cancel' : 'Cancelar'}
            </button>
            <button
              type="button"
              onClick={() => stopRecordingAndTranscribe(false)}
              className="bg-white text-red-700 hover:bg-red-50 text-xs font-black px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1 active:scale-95 transition"
            >
              <Check className="h-3.5 w-3.5 stroke-[3]" />
              <span>{normLocale === 'en' ? 'Done & Send' : 'Concluir'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Transcribing Status ── */}
      {isTranscribing && (
        <div className="bg-indigo-600 text-white px-4 py-2 flex items-center gap-2 text-xs font-bold shrink-0">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{normLocale === 'en' ? 'Processing audio with AI...' : 'Transcrevendo áudio com Inteligência Artificial...'}</span>
        </div>
      )}

      {/* ── Error / Notice Banner ── */}
      {recordingNotice && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200 shrink-0">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
          <span className="flex-1">{recordingNotice}</span>
          <button type="button" onClick={() => setRecordingNotice(null)} className="text-stone-400 hover:text-stone-700 ml-2">
            ✕
          </button>
        </div>
      )}

      {/* ── Input bar ── */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        className="p-3 bg-white dark:bg-[#0C1728] border-t border-stone-200 dark:border-[#1E293B] flex items-center gap-2 shrink-0"
      >
        {/* Mic button with recording visual */}
        <button
          type="button"
          onClick={handleToggleMic}
          disabled={loading || isTranscribing}
          className={cn(
            'w-11 h-11 rounded-2xl flex items-center justify-center transition-all shrink-0 active:scale-95 shadow-xs',
            isRecording
              ? 'bg-red-600 text-white ring-4 ring-red-400 animate-pulse'
              : 'bg-indigo-50 dark:bg-[#16253C] text-indigo-700 dark:text-sky-300 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800'
          )}
          title={isRecording ? 'Clique para concluir gravação' : 'Falar por áudio com a Nina'}
        >
          {isRecording ? <Square className="h-5 w-5 fill-white" /> : <Mic className="h-5 w-5" />}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isRecording
              ? (normLocale === 'en' ? 'Listening to your voice...' : 'Ouvindo sua voz... Fale com a Nina!')
              : (normLocale === 'en' ? 'Ask about medications, schedule, or health...' : 'Pergunte sobre remédios, agenda ou saúde...')
          }
          className="flex-1 bg-stone-50 dark:bg-[#16253C] border border-stone-200 dark:border-stone-700 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
        />

        <Button
          type="submit"
          disabled={!input.trim() || loading || isRecording}
          className="bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-2xl w-11 h-11 p-0 flex items-center justify-center shrink-0 shadow-md active:scale-95"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>

      {/* Voice Selection Modal */}
      <VoiceSettingsModal
        open={voiceModalOpen}
        onOpenChange={setVoiceModalOpen}
        locale={normLocale}
      />
    </div>
  );
}
