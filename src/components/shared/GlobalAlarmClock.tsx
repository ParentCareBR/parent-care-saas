'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { 
  BellRing, 
  Volume2, 
  Check, 
  Clock, 
  X, 
  Pill, 
  Calendar, 
  Activity, 
  CheckCircle2, 
  VolumeX,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AlarmEvent {
  id: string;
  type: 'medication' | 'appointment' | 'task';
  title: string;
  subtitle?: string;
  timeStr: string; // HH:mm
  scheduledDate: Date;
  caredPersonId: string;
  caredPersonName: string;
  organizationId: string;
  raw?: any;
}

// ── Web Audio API Engine for High-Audibility Multi-Tone Alarm ──
let globalAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!globalAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        globalAudioCtx = new AudioCtxClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch {
    return null;
  }
}

function playAlarmBeep(ctx: AudioContext) {
  try {
    if (ctx.state === 'suspended') ctx.resume();
    // High-visibility pleasant alert melody: C5, E5, G5, C6
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.16;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.4, start + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.52);
    });
  } catch (err) {
    console.warn('[GlobalAlarmClock] Audio playback warning:', err);
  }
}

import { speakPleasantVoice } from '@/lib/audio/voice-synthesizer';

function speakVoicePrompt(text: string, locale: string = 'pt-BR') {
  speakPleasantVoice(text, { locale });
}

export function GlobalAlarmClock({ locale = 'pt-BR' }: { locale?: string }) {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson, caredPeople } = useCaredPerson();
  const supabase = createClient() as any;

  // Host toggle preference: "Tocar despertador neste celular/aparelho"
  const [alarmEnabled, setAlarmEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('parentcare_host_alarm_enabled');
      return saved !== null ? saved === 'true' : true; // default enabled
    } catch {
      return true;
    }
  });

  const [activeAlarm, setActiveAlarm] = useState<AlarmEvent | null>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [dismissedAlarms, setDismissedAlarms] = useState<Set<string>>(() => new Set());
  const [snoozeMap, setSnoozeMap] = useState<Record<string, number>>({});
  const [confirmingAction, setConfirmingAction] = useState(false);

  const ringIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const speechIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const todayEventsRef = useRef<AlarmEvent[]>([]);

  // Toggle host alarm setting
  const toggleHostAlarm = (enabled?: boolean) => {
    const nextVal = enabled !== undefined ? enabled : !alarmEnabled;
    setAlarmEnabled(nextVal);
    try {
      localStorage.setItem('parentcare_host_alarm_enabled', String(nextVal));
    } catch {}
    if (!nextVal) {
      stopRinging();
    }
  };

  // Unlock AudioContext on first touch/click
  const unlockAudio = useCallback(() => {
    const ctx = getAudioContext();
    if (ctx) {
      setAudioUnlocked(true);
    }
  }, []);

  useEffect(() => {
    const handleGesture = () => {
      unlockAudio();
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
    window.addEventListener('click', handleGesture);
    window.addEventListener('touchstart', handleGesture);
    return () => {
      window.removeEventListener('click', handleGesture);
      window.removeEventListener('touchstart', handleGesture);
    };
  }, [unlockAudio]);

  // Start continuous alarm ringing
  const startRinging = useCallback((alarm: AlarmEvent) => {
    setActiveAlarm(alarm);
    setIsRinging(true);

    const ctx = getAudioContext();
    if (ctx) {
      playAlarmBeep(ctx);
    }

    const voiceText = alarm.type === 'medication'
      ? `Atenção: Horário do remédio de ${alarm.caredPersonName}. ${alarm.title}`
      : `Atenção: Horário de compromisso de ${alarm.caredPersonName}. ${alarm.title}`;
    speakVoicePrompt(voiceText, locale);

    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([500, 250, 500, 250, 500]);
      } catch {}
    }

    if (ringIntervalRef.current) clearInterval(ringIntervalRef.current);
    if (speechIntervalRef.current) clearInterval(speechIntervalRef.current);

    ringIntervalRef.current = setInterval(() => {
      const c = getAudioContext();
      if (c) playAlarmBeep(c);
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        try { navigator.vibrate([400, 200, 400]); } catch {}
      }
    }, 2400);

    speechIntervalRef.current = setInterval(() => {
      speakVoicePrompt(voiceText, locale);
    }, 8500);
  }, [locale]);

  // Stop continuous ringing
  const stopRinging = useCallback(() => {
    if (ringIntervalRef.current) {
      clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
    if (speechIntervalRef.current) {
      clearInterval(speechIntervalRef.current);
      speechIntervalRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsRinging(false);
  }, []);

  // Dismiss current alarm
  const handleDismiss = () => {
    if (activeAlarm) {
      setDismissedAlarms(prev => new Set(prev).add(activeAlarm.id));
    }
    stopRinging();
    setActiveAlarm(null);
  };

  // Snooze for 10 minutes
  const handleSnooze = () => {
    if (activeAlarm) {
      const snoozeUntil = Date.now() + 10 * 60 * 1000;
      setSnoozeMap(prev => ({ ...prev, [activeAlarm.id]: snoozeUntil }));
    }
    stopRinging();
    setActiveAlarm(null);
  };

  // Confirm medication or appointment
  const handleConfirmAction = async () => {
    if (!activeAlarm || !currentOrganizationId) return;
    setConfirmingAction(true);

    try {
      if (activeAlarm.type === 'medication' && activeAlarm.raw?.medication_id) {
        await supabase.from('medication_confirmations').insert({
          organization_id: currentOrganizationId,
          cared_person_id: activeAlarm.caredPersonId,
          medication_id: activeAlarm.raw.medication_id,
          confirmed_by: user?.id || null,
          status: 'taken',
          taken_at: new Date().toISOString(),
        });
      } else if (activeAlarm.type === 'task' && activeAlarm.raw?.task_id) {
        await supabase.from('tasks').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        }).eq('id', activeAlarm.raw.task_id);
      }

      setDismissedAlarms(prev => new Set(prev).add(activeAlarm.id));
      stopRinging();
      setActiveAlarm(null);
    } catch (err) {
      console.error('[GlobalAlarmClock] Error confirming:', err);
    } finally {
      setConfirmingAction(false);
    }
  };

  // Test sound function
  const triggerTestAlarm = () => {
    unlockAudio();
    const testItem: AlarmEvent = {
      id: 'test-alarm-' + Date.now(),
      type: 'medication',
      title: 'Losartana 50mg (TESTE DE SOM)',
      subtitle: 'Demonstração do despertador',
      timeStr: format(new Date(), 'HH:mm'),
      scheduledDate: new Date(),
      caredPersonId: selectedPerson?.id || 'demo',
      caredPersonName: selectedPerson?.full_name ? selectedPerson.full_name.split(' ')[0] : 'Idoso',
      organizationId: currentOrganizationId || '',
    };
    startRinging(testItem);
  };

  // Fetch today's scheduled events for alarm monitoring
  const fetchTodayAlarmEvents = useCallback(async () => {
    if (!currentOrganizationId) return;

    const peopleToMonitor = selectedPerson ? [selectedPerson] : (caredPeople || []);
    if (peopleToMonitor.length === 0) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayStart = `${todayStr}T00:00:00`;
    const todayEnd = `${todayStr}T23:59:59`;

    const collectedEvents: AlarmEvent[] = [];

    for (const person of peopleToMonitor) {
      const personName = person.full_name ? person.full_name.split(' ')[0] : 'Idoso';

      // 1. Medications
      const { data: meds } = await supabase
        .from('medications')
        .select('id, name, dosage, unit, medication_schedules(id, time_of_day)')
        .eq('cared_person_id', person.id)
        .eq('is_active', true);

      (meds || []).forEach((med: any) => {
        const schedules = med.medication_schedules || [];
        schedules.forEach((sched: any) => {
          if (sched.time_of_day) {
            const timeSlice = sched.time_of_day.slice(0, 5); // "08:00"
            const [h, m] = timeSlice.split(':').map(Number);
            const schedDate = new Date();
            schedDate.setHours(h, m, 0, 0);

            collectedEvents.push({
              id: `med-${med.id}-${sched.id}-${todayStr}`,
              type: 'medication',
              title: `${med.name} ${med.dosage || ''}${med.unit || ''}`.trim(),
              subtitle: `Horário: ${timeSlice}`,
              timeStr: timeSlice,
              scheduledDate: schedDate,
              caredPersonId: person.id,
              caredPersonName: personName,
              organizationId: currentOrganizationId,
              raw: { medication_id: med.id, schedule_id: sched.id },
            });
          }
        });
      });

      // 2. Appointments
      const { data: appts } = await supabase
        .from('appointments')
        .select('id, title, starts_at, doctor_name, location')
        .eq('cared_person_id', person.id)
        .gte('starts_at', todayStart)
        .lte('starts_at', todayEnd)
        .order('starts_at', { ascending: true });

      (appts || []).forEach((appt: any) => {
        const d = new Date(appt.starts_at);
        const timeSlice = format(d, 'HH:mm');
        collectedEvents.push({
          id: `appt-${appt.id}-${todayStr}`,
          type: 'appointment',
          title: appt.title,
          subtitle: appt.doctor_name ? `Dr(a). ${appt.doctor_name}` : appt.location || 'Consulta médica',
          timeStr: timeSlice,
          scheduledDate: d,
          caredPersonId: person.id,
          caredPersonName: personName,
          organizationId: currentOrganizationId,
          raw: { appointment_id: appt.id },
        });
      });
    }

    todayEventsRef.current = collectedEvents;
  }, [currentOrganizationId, selectedPerson, caredPeople, supabase]);

  // Initial fetch and reload every 5 minutes
  useEffect(() => {
    fetchTodayAlarmEvents();
    const refreshTimer = setInterval(fetchTodayAlarmEvents, 5 * 60 * 1000);
    return () => clearInterval(refreshTimer);
  }, [fetchTodayAlarmEvents]);

  // Clock tick every 10 seconds to check if any alarm should fire
  useEffect(() => {
    if (!alarmEnabled) return;

    const checkAlarms = () => {
      if (isRinging) return; // already ringing

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      for (const ev of todayEventsRef.current) {
        if (dismissedAlarms.has(ev.id)) continue;

        // Check if snoozed
        const snoozedUntil = snoozeMap[ev.id];
        if (snoozedUntil && Date.now() < snoozedUntil) continue;

        const [evH, evM] = ev.timeStr.split(':').map(Number);
        const evMinutes = evH * 60 + evM;

        // Trigger alarm if within 0 to 4 minutes of scheduled time
        const diff = currentMinutes - evMinutes;
        if (diff >= 0 && diff <= 4) {
          startRinging(ev);
          break;
        }
      }
    };

    const interval = setInterval(checkAlarms, 10000);
    return () => clearInterval(interval);
  }, [alarmEnabled, isRinging, dismissedAlarms, snoozeMap, startRinging]);

  // Clean-up on unmount
  useEffect(() => {
    return () => {
      stopRinging();
    };
  }, [stopRinging]);

  return (
    <>
      {/* ─── FLOATING ALARM MODAL TAKEOVER (HIGH AUDIBILITY & CONTRAST) ──────── */}
      {isRinging && activeAlarm && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0B1526] border-4 border-amber-400 dark:border-amber-500 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200 ring-8 ring-amber-400/20">
            
            {/* Pulsing Alarm Icon */}
            <div className="mx-auto w-24 h-24 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 dark:border-amber-600 flex items-center justify-center animate-bounce">
              <BellRing className="h-14 w-14 text-amber-600 dark:text-amber-400" />
            </div>

            {/* Alarm Information */}
            <div>
              <span className="inline-block px-3.5 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-black text-xs rounded-full tracking-wider uppercase mb-2">
                ⏰ DESPERTADOR · HORA PROGRAMADA
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white leading-tight">
                {activeAlarm.title}
              </h2>
              <p className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 mt-2">
                Para: {activeAlarm.caredPersonName} às {activeAlarm.timeStr}
              </p>
              {activeAlarm.subtitle && (
                <p className="text-sm font-semibold text-stone-500 dark:text-slate-400 mt-1">
                  {activeAlarm.subtitle}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                type="button"
                onClick={handleConfirmAction}
                disabled={confirmingAction}
                className="w-full h-16 text-lg sm:text-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Check className="h-6 w-6 stroke-[3]" />
                {confirmingAction ? 'Registrando...' : '✓ Confirmar Tomado / Visto'}
              </Button>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={handleSnooze}
                  variant="outline"
                  className="h-12 text-sm font-bold border-2 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Clock className="h-4 w-4" />
                  Soneca (10 min)
                </Button>

                <Button
                  type="button"
                  onClick={handleDismiss}
                  variant="ghost"
                  className="h-12 text-sm font-bold text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl"
                >
                  <VolumeX className="h-4 w-4 mr-1.5" />
                  Parar Som
                </Button>
              </div>

              {/* Quick toggle link */}
              <button
                type="button"
                onClick={() => { toggleHostAlarm(false); handleDismiss(); }}
                className="text-[11px] font-semibold text-stone-400 hover:text-stone-600 dark:hover:text-slate-300 underline pt-1"
              >
                Desativar despertador neste celular/aparelho
              </button>
            </div>

          </div>
        </div>
      )}
    </>
  );
}

// ── Standalone Toggle Button for Navbar & Settings ──
export function HostAlarmToggle({ className }: { className?: string }) {
  const [enabled, setEnabled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = localStorage.getItem('parentcare_host_alarm_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggle = () => {
    const nextVal = !enabled;
    setEnabled(nextVal);
    try {
      localStorage.setItem('parentcare_host_alarm_enabled', String(nextVal));
    } catch {}
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'touch-manipulation flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs active:scale-95',
        enabled
          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-[#0F4C3A] dark:text-emerald-400 border-emerald-300 dark:border-emerald-500/30'
          : 'bg-stone-100 dark:bg-stone-800 text-stone-400 border-stone-200 dark:border-stone-700',
        className
      )}
      title={enabled ? 'Despertador Ativo neste aparelho (clique para pausar)' : 'Despertador Pausado neste aparelho (clique para ativar)'}
      aria-label="Alternar despertador no meu celular"
    >
      <BellRing className={cn('h-3.5 w-3.5', enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-400')} />
      <span className="hidden sm:inline">
        {enabled ? 'Despertador Ativo' : 'Despertador Desligado'}
      </span>
    </button>
  );
}
