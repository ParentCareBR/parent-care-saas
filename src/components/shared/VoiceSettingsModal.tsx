'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Play, Square, Check, Sparkles, Mic, Sliders } from 'lucide-react';
import {
  VOICE_PERSONAS,
  VoicePersona,
  loadVoices,
  getBestVoice,
  speakPleasantVoice,
  stopVoiceSpeech,
  saveVoicePreferences,
} from '@/lib/audio/voice-synthesizer';

interface VoiceSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale?: string;
}

export function VoiceSettingsModal({ open, onOpenChange, locale = 'pt-BR' }: VoiceSettingsModalProps) {
  const [selectedPersonaId, setSelectedPersonaId] = useState<string>('nina_warm');
  const [speed, setSpeed] = useState<number>(0.96);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceUri, setSelectedVoiceUri] = useState<string>('');
  const [playingPersonaId, setPlayingPersonaId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPersona = localStorage.getItem('parentcare_preferred_voice_persona');
      if (savedPersona) setSelectedPersonaId(savedPersona);

      const savedUri = localStorage.getItem('parentcare_preferred_voice_uri');
      if (savedUri) setSelectedVoiceUri(savedUri);

      const savedSpeed = localStorage.getItem('parentcare_preferred_voice_speed');
      if (savedSpeed) setSpeed(parseFloat(savedSpeed));
    }

    loadVoices().then((voices) => {
      const langPrefix = locale.startsWith('pt') ? 'pt' : locale.split('-')[0];
      const filtered = voices.filter((v) => v.lang.toLowerCase().startsWith(langPrefix));
      setAvailableVoices(filtered.length > 0 ? filtered : voices);
    });
  }, [locale, open]);

  const handleSelectPersona = (persona: VoicePersona) => {
    setSelectedPersonaId(persona.id);
    setSpeed(persona.preferredRate);
    saveVoicePreferences(persona.id, undefined, persona.preferredRate);
  };

  const handleTestVoice = async (persona: VoicePersona) => {
    if (playingPersonaId === persona.id) {
      stopVoiceSpeech();
      setPlayingPersonaId(null);
      return;
    }

    stopVoiceSpeech();
    setPlayingPersonaId(persona.id);

    await speakPleasantVoice(persona.previewText, {
      locale,
      personaId: persona.id,
      onEnd: () => setPlayingPersonaId(null),
      onError: () => setPlayingPersonaId(null),
    });
  };

  const handleSave = () => {
    saveVoicePreferences(selectedPersonaId, selectedVoiceUri || undefined, speed);
    stopVoiceSpeech();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) stopVoiceSpeech(); onOpenChange(val); }}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden rounded-3xl bg-white dark:bg-stone-900 border-2 border-stone-200 dark:border-stone-800 shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-5 text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-xl shadow-xs">
              🎙️
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-white">Vozes Agradáveis de IA</DialogTitle>
              <DialogDescription className="text-xs text-white/80 font-medium">
                Escolha o tom de voz mais acolhedor e natural para o seu Parent Care
              </DialogDescription>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Persona Cards */}
          <div className="space-y-2.5">
            <label className="text-xs font-black uppercase tracking-wider text-stone-500 dark:text-stone-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
              Estilos de Voz Disponíveis
            </label>

            {VOICE_PERSONAS.map((persona) => {
              const isSelected = selectedPersonaId === persona.id;
              const isPlaying = playingPersonaId === persona.id;

              return (
                <div
                  key={persona.id}
                  onClick={() => handleSelectPersona(persona)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col gap-2 ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/70 dark:bg-indigo-950/40 shadow-sm ring-2 ring-indigo-500/20'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 bg-white dark:bg-stone-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                          isSelected
                            ? 'bg-indigo-600 text-white'
                            : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300'
                        }`}
                      >
                        {persona.gender === 'female' ? '🌸' : persona.gender === 'male' ? '👨‍⚕️' : '🌿'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-black text-stone-900 dark:text-stone-100 truncate">
                            {persona.name}
                          </h4>
                          {isSelected && (
                            <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 font-bold border-0">
                              Ativa
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 dark:text-stone-400 mt-0.5 leading-snug">
                          {persona.description}
                        </p>
                      </div>
                    </div>

                    {/* Test Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTestVoice(persona);
                      }}
                      className={`h-9 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition active:scale-95 ${
                        isPlaying
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200'
                      }`}
                      title={isPlaying ? 'Parar teste' : 'Ouvir demonstração'}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="h-3.5 w-3.5 fill-white" />
                          <span>Parar</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3.5 w-3.5 fill-current" />
                          <span>Ouvir</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Speed Control */}
          <div className="bg-stone-50 dark:bg-stone-800/60 p-3.5 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-stone-700 dark:text-stone-300">
              <span className="flex items-center gap-1.5">
                <Sliders className="h-3.5 w-3.5 text-indigo-600" />
                Velocidade da Fala
              </span>
              <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400">
                {speed <= 0.88 ? 'Mais Pausada (Idoso)' : speed >= 1.05 ? 'Rápida' : 'Natural (Recomendada)'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Pausada', val: 0.88 },
                { label: 'Natural', val: 0.96 },
                { label: 'Fluida', val: 1.05 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  type="button"
                  onClick={() => {
                    setSpeed(btn.val);
                    saveVoicePreferences(selectedPersonaId, selectedVoiceUri || undefined, btn.val);
                  }}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all border ${
                    Math.abs(speed - btn.val) < 0.04
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          </div>

          {/* Device specific voices dropdown (Optional Advanced) */}
          {availableVoices.length > 0 && (
            <div className="pt-1">
              <details className="text-xs text-stone-500">
                <summary className="cursor-pointer font-bold hover:text-indigo-600 transition">
                  Avançado: Selecionar voz específica instalada no aparelho ({availableVoices.length} vozes detectadas)
                </summary>
                <div className="mt-2 space-y-1 max-h-36 overflow-y-auto pr-1">
                  {availableVoices.map((v) => (
                    <button
                      key={v.voiceURI}
                      type="button"
                      onClick={() => {
                        setSelectedVoiceUri(v.voiceURI);
                        saveVoicePreferences(selectedPersonaId, v.voiceURI, speed);
                      }}
                      className={`w-full text-left p-2 rounded-xl text-xs font-medium flex items-center justify-between transition ${
                        selectedVoiceUri === v.voiceURI
                          ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'hover:bg-stone-100 dark:hover:bg-stone-800'
                      }`}
                    >
                      <span className="truncate">{v.name} ({v.lang})</span>
                      {selectedVoiceUri === v.voiceURI && <Check className="h-3.5 w-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-stone-50 dark:bg-stone-800/80 border-t border-stone-200 dark:border-stone-700 flex items-center justify-end gap-2">
          <Button
            type="button"
            onClick={handleSave}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl h-12 shadow-md active:scale-95 transition"
          >
            ✓ Salvar Voz Preferida
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
