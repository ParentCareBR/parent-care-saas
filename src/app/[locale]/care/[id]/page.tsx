'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { 
  Heart, 
  AlertCircle, 
  Pill, 
  Coffee, 
  Droplet, 
  CheckCircle2,
  Calendar,
  BellRing,
  RotateCcw,
  Sun,
  Moon,
  Activity as ActivityIcon,
  Clock,
  Volume2
} from 'lucide-react';
import { format } from 'date-fns';
import { getDateFnsLocale, getSpeechSynthesisLang, getCareTexts } from '@/lib/i18n/care-translations';

function playAlarmChime() {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const startTime = ctx.currentTime + idx * 0.18;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.35, startTime + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.65);
    });
  } catch (err) {
    console.warn('Audio error:', err);
  }
}

function speakReminder(text: string, rawLocale: string = 'pt-BR') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = getSpeechSynthesisLang(rawLocale);
    utterance.rate = 0.88;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech error:', err);
  }
}

export default function ElderlyViewPage({ 
  params
}: { 
  params: { id: string, locale: string }
}) {
  const supabase = createClient();
  const router = useRouter();
  
  const tCare = getCareTexts(params.locale);
  const dateFnsLoc = getDateFnsLocale(params.locale);

  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [enabledModules, setEnabledModules] = useState<Set<string>>(new Set());
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const [nextAppointmentData, setNextAppointmentData] = useState<any>(null);
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmDismissedId, setAlarmDismissedId] = useState<string | null>(null);
  const [snoozeUntil, setSnoozeUntil] = useState<Date | null>(null);
  
  const [personInfo, setPersonInfo] = useState({
    name: 'Carregando...',
    organizationId: '',
    userId: '',
    nextAppointment: null as string | null,
    nextMedication: null as string | null,
    medicationId: null as string | null,
    medicationScheduleId: null as string | null,
  });

  const [lastAction, setLastAction] = useState<{id: string, type: string, table: string} | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push(`/${params.locale}/care/login`);
        return;
      }

      // Fetch person data
      const { data: person, error: pErr } = await supabase
        .from('cared_people')
        .select('full_name, organization_id')
        .eq('id', params.id)
        .single();
        
      if (!person || pErr) {
        router.push(`/${params.locale}/care/login`);
        return;
      }

      const orgId = person.organization_id;
      const firstName = person.full_name.split(' ')[0];

      // Puxar próxima medicação
      const { data: meds } = await supabase
        .from('medications')
        .select('id, name')
        .eq('cared_person_id', params.id)
        .eq('is_active', true)
        .limit(1);

      let nextMed = null;
      let medId = null;
      if (meds && meds.length > 0) {
        nextMed = `${meds[0].name} (Verifique Horário)`;
        medId = meds[0].id;
      }

      // Puxar próxima consulta
      const { data: appt } = await (supabase as any)
        .from('appointments')
        .select('id, title, starts_at, doctor_name, location, description')
        .eq('cared_person_id', params.id)
        .gte('starts_at', new Date(Date.now() - 45 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      let nextAppt = null;
      if (appt) {
        nextAppt = `${appt.title} (${format(new Date(appt.starts_at), "dd/MM 'às' HH:mm", { locale: dateFnsLoc })})`;
        setNextAppointmentData(appt);
      } else {
        setNextAppointmentData(null);
      }

      // Fetch monitoring settings for this cared person
      const enabledSet = new Set<string>();

      // Check organization settings first (fastest and always up-to-date)
      const { data: orgData } = await (supabase as any)
        .from('organizations')
        .select('settings')
        .eq('id', orgId)
        .maybeSingle();

      const orgSettings = (orgData?.settings as any) || {};
      const personConfig = orgSettings.monitoring?.[params.id];

      if (personConfig && Array.isArray(personConfig.enabled_codes)) {
        personConfig.enabled_codes.forEach((c: string) => enabledSet.add(c));
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: settingsData } = await (supabase as any)
          .from('cared_person_monitoring_settings')
          .select('enabled, monitoring_definitions(code)')
          .eq('cared_person_id', params.id);

        if (settingsData && settingsData.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          settingsData.forEach((row: any) => {
            const code = row.monitoring_definitions?.code;
            if (row.enabled && code) {
              enabledSet.add(code);
            }
          });
        } else {
          // Defaults if no custom configuration saved yet
          [
            'meds_scheduled',
            'schedule_appointments',
            'checkin_btn_im_well',
            'checkin_btn_need_help',
            'checkin_btn_took_med',
            'checkin_btn_ate',
            'checkin_btn_drank_water',
            'checkin_btn_emergency',
          ].forEach((c) => enabledSet.add(c));
        }
      }

      setEnabledModules(enabledSet);
      setSettingsLoaded(true);

      setPersonInfo({
        name: firstName,
        organizationId: orgId,
        userId: user.id,
        nextMedication: nextMed,
        medicationId: medId,
        medicationScheduleId: null,
        nextAppointment: nextAppt
      });
    }
    fetchData();
  }, [params.id, params.locale, router, supabase, dateFnsLoc]);

  // Automatic alarm check effect
  useEffect(() => {
    if (!nextAppointmentData) return;
    if (alarmDismissedId === nextAppointmentData.id) return;
    if (snoozeUntil && new Date() < snoozeUntil) return;

    const apptTime = new Date(nextAppointmentData.starts_at).getTime();
    const now = currentTime.getTime();

    let offsetMinutes = 15;
    const desc = nextAppointmentData.description || '';
    if (desc.includes('No horário')) offsetMinutes = 0;
    else if (desc.includes('30 min antes')) offsetMinutes = 30;
    else if (desc.includes('1 hora antes')) offsetMinutes = 60;
    else if (desc.includes('08:00 manhã')) {
      const apptDay = new Date(nextAppointmentData.starts_at);
      if (apptDay.toDateString() === currentTime.toDateString() && currentTime.getHours() >= 8) {
        offsetMinutes = 999999;
      }
    }

    const triggerTime = apptTime - offsetMinutes * 60 * 1000;
    const expiryTime = apptTime + 45 * 60 * 1000;

    if (now >= triggerTime && now <= expiryTime) {
      if (!alarmModalOpen) {
        setAlarmModalOpen(true);
        playAlarmChime();
        const timeStr = format(new Date(nextAppointmentData.starts_at), "HH:mm");
        const speech = tCare.alarmSpeech({
          name: personInfo.name,
          title: nextAppointmentData.title,
          time: timeStr,
          doctor: nextAppointmentData.doctor_name,
          location: nextAppointmentData.location,
        });
        speakReminder(speech, params.locale);
      }
    }
  }, [currentTime, nextAppointmentData, alarmDismissedId, snoozeUntil, alarmModalOpen, personInfo.name, params.locale, tCare]);

  const triggerAlarmManually = () => {
    if (!nextAppointmentData) return;
    setAlarmModalOpen(true);
    playAlarmChime();
    const timeStr = format(new Date(nextAppointmentData.starts_at), "dd/MM 'às' HH:mm", { locale: dateFnsLoc });
    const speech = tCare.alarmSpeech({
      name: personInfo.name,
      title: nextAppointmentData.title,
      time: timeStr,
      doctor: nextAppointmentData.doctor_name,
      location: nextAppointmentData.location,
    });
    speakReminder(speech, params.locale);
  };

  const testAlarmDemo = () => {
    setAlarmModalOpen(true);
    playAlarmChime();
    speakReminder(tCare.demoSpeech(personInfo.name), params.locale);
  };

  const triggerVibration = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(200);
    }
  };

  const handleAction = async (type: string, message: string, dbTable: string, payloadData: any) => {
    setLoading(true);
    
    const payload = {
      organization_id: personInfo.organizationId,
      cared_person_id: params.id,
      ...payloadData
    };
    
    const { data: result, error } = await supabase.from(dbTable).insert(payload).select().single();
    
    if (error) {
      setLoading(false);
      alert('Falha na comunicação. Verifique sua internet.');
      return;
    }
    
    triggerVibration();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLastAction({ id: (result as any).id, type, table: dbTable });
    setLoading(false);
    setSuccessMsg(`${message}! A família foi avisada.`);
    
    // Create a real notification for the organization members
    const { data: members } = await supabase.from('organization_members')
      .select('user_id')
      .eq('organization_id', personInfo.organizationId)
      .neq('user_id', personInfo.userId);
      
    if (members && members.length > 0) {
       // eslint-disable-next-line @typescript-eslint/no-explicit-any
       const notifications: any[] = members.map(m => ({
          user_id: m.user_id,
          organization_id: personInfo.organizationId,
          type: type === 'emergency' ? 'alert' : 'info',
          title: `Aviso de ${personInfo.name}`,
          message: message,
          link_url: `/${params.locale}/dashboard`
       }));
       await supabase.from('notifications').insert(notifications);
    }

    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const undoLastAction = async () => {
    if (!lastAction) return;
    
    setLoading(true);
    await supabase.from(lastAction.table).delete().eq('id', lastAction.id);
    setLoading(false);
    setLastAction(null);
    setSuccessMsg('Ação cancelada.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-stone-100/80 elderly-mode text-stone-900 pb-36">
      {/* Top Bar with Live LED Connection */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-xs px-4 py-4 sm:px-8">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-14 w-14 sm:h-16 sm:w-16 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-700 shadow-xs">
              <Heart className="h-8 w-8 fill-emerald-600 text-emerald-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-stone-900">Olá, {personInfo.name}!</h1>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 led-glow-green animate-led-pulse" />
                  <span className="text-xs font-bold text-emerald-800">Família Conectada</span>
                </span>
                <span className="text-xs sm:text-sm text-stone-500 font-medium">
                  {currentTime.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-2xl font-black text-stone-800 tabular-nums">
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => {
                supabase.auth.signOut();
                router.push(`/${params.locale}/care/login`);
              }} 
              className="text-stone-600 border-stone-300 hover:bg-stone-100 h-11 px-4 text-sm font-bold rounded-xl"
            >
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6">
        {/* Success / Notification Banner */}
        {successMsg && (
          <div className="bg-emerald-50 border-2 border-emerald-500 text-emerald-900 p-5 rounded-3xl flex items-center gap-4 shadow-md animate-in slide-in-from-top-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <p className="text-xl font-black leading-tight">{successMsg}</p>
            </div>
            {lastAction && (
              <Button 
                onClick={undoLastAction} 
                variant="outline" 
                className="h-12 border-emerald-600 text-emerald-800 bg-white hover:bg-emerald-100 text-base font-bold px-4 rounded-xl gap-2"
              >
                <RotateCcw className="h-5 w-5" /> Desfazer
              </Button>
            )}
          </div>
        )}

        {/* PRÓXIMO MEDICAMENTO: Destaque de 1-toque com confirmação direta */}
        {enabledModules.has('meds_scheduled') && personInfo.nextMedication && (
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Pill className="h-8 w-8 text-white" />
              </div>
              <div>
                <span className="inline-block uppercase tracking-wider text-xs font-bold text-blue-200">
                  Próximo Remédio de Hoje
                </span>
                <p className="text-2xl font-black">{personInfo.nextMedication}</p>
              </div>
            </div>
            {personInfo.medicationId && (
              <Button
                disabled={loading}
                onClick={() => handleAction('medication', `Tomei ${personInfo.nextMedication}`, 'medication_confirmations', { medication_id: personInfo.medicationId, confirmed_by: personInfo.userId, status: 'taken' })}
                className="w-full sm:w-auto h-14 px-6 bg-white hover:bg-blue-50 text-blue-800 font-black text-lg rounded-2xl shadow-md active:scale-95 transition-transform"
              >
                ✓ Já Tomei
              </Button>
            )}
          </div>
        )}

        {/* PRÓXIMA CONSULTA COM ALARME / DESPERTADOR */}
        {enabledModules.has('schedule_appointments') && (
          <div className="bg-white p-5 sm:p-6 rounded-3xl border-2 border-purple-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center text-purple-700 shrink-0">
                <Calendar className="h-8 w-8" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-stone-500 font-bold text-xs uppercase tracking-wider">{tCare.nextAppointment}</span>
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                    <BellRing className="h-3 w-3" /> {tCare.alarmActive}
                  </span>
                </div>
                <p className="text-xl sm:text-2xl font-black text-stone-900 mt-0.5">
                  {personInfo.nextAppointment || tCare.noPending}
                </p>
              </div>
            </div>

            <Button
              type="button"
              onClick={nextAppointmentData ? triggerAlarmManually : testAlarmDemo}
              className="w-full sm:w-auto h-12 px-5 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-black text-base rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <BellRing className="h-5 w-5 animate-bounce" />
              {nextAppointmentData ? tCare.listenAlarmBtn : tCare.testAlarmBtn}
            </Button>
          </div>
        )}

        {/* INSTRUÇÃO CLARA */}
        <div className="text-center pt-2">
          <p className="text-lg font-extrabold text-stone-600">
            Toque em um dos botões abaixo para avisar sua família:
          </p>
        </div>

        {/* GRID DE BOTÕES GIGANTES TÁTEIS */}
        {settingsLoaded && (
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {enabledModules.has('checkin_btn_im_well') && (
              <button 
                disabled={loading}
                onClick={() => handleAction('mood', 'Estou bem!', 'check_ins', { mood: 'great', checked_by: personInfo.userId, notes: 'Estou bem' })}
                className="bg-white hover:bg-emerald-50/70 border-3 border-emerald-300 hover:border-emerald-500 active:bg-emerald-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors shadow-xs">
                  <Heart className="h-12 w-12 sm:h-14 sm:w-14 text-emerald-600 fill-emerald-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Estou Bem</span>
                  <span className="text-xs sm:text-sm font-semibold text-emerald-700">Tudo calmo por aqui</span>
                </div>
              </button>
            )}

            {enabledModules.has('checkin_btn_drank_water') && (
              <button 
                disabled={loading}
                onClick={() => handleAction('hydration', 'Bebi água!', 'hydration_logs', { amount_ml: 250, logged_by: personInfo.userId })}
                className="bg-white hover:bg-sky-50/70 border-3 border-sky-300 hover:border-sky-500 active:bg-sky-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center transition-colors shadow-xs">
                  <Droplet className="h-12 w-12 sm:h-14 sm:w-14 text-sky-600 fill-sky-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Bebi Água</span>
                  <span className="text-xs sm:text-sm font-semibold text-sky-700">+ 1 copo d’água</span>
                </div>
              </button>
            )}

            {enabledModules.has('checkin_btn_ate') && (
              <button 
                disabled={loading}
                onClick={() => handleAction('meal', 'Já me alimentei!', 'meals', { meal_type: 'other', logged_by: personInfo.userId })}
                className="bg-white hover:bg-amber-50/70 border-3 border-amber-300 hover:border-amber-500 active:bg-amber-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors shadow-xs">
                  <Coffee className="h-12 w-12 sm:h-14 sm:w-14 text-amber-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Já Comi</span>
                  <span className="text-xs sm:text-sm font-semibold text-amber-700">Refeição feita</span>
                </div>
              </button>
            )}

            {enabledModules.has('checkin_btn_took_med') && (
              <button 
                disabled={loading || !personInfo.medicationId}
                onClick={() => handleAction('medication', 'Remédio tomado!', 'medication_confirmations', { medication_id: personInfo.medicationId, confirmed_by: personInfo.userId, status: 'taken' })}
                className="bg-white hover:bg-blue-50/70 border-3 border-blue-300 hover:border-blue-500 active:bg-blue-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center disabled:opacity-50"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center transition-colors shadow-xs">
                  <Pill className="h-12 w-12 sm:h-14 sm:w-14 text-blue-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Tomei Remédio</span>
                  <span className="text-xs sm:text-sm font-semibold text-blue-700">Horário cumprido</span>
                </div>
              </button>
            )}

            {enabledModules.has('checkin_btn_woke_up') && (
              <button 
                disabled={loading}
                onClick={() => handleAction('wake', 'Bom dia! Avisamos que você acordou', 'check_ins', { mood: 'great', checked_by: personInfo.userId, notes: 'Acordou - Início do dia' })}
                className="bg-white hover:bg-yellow-50/70 border-3 border-yellow-300 hover:border-yellow-500 active:bg-yellow-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-yellow-100 group-hover:bg-yellow-200 flex items-center justify-center transition-colors shadow-xs">
                  <Sun className="h-12 w-12 sm:h-14 sm:w-14 text-yellow-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Acordei</span>
                  <span className="text-xs sm:text-sm font-semibold text-yellow-700">Bom dia!</span>
                </div>
              </button>
            )}

            {enabledModules.has('checkin_btn_going_to_sleep') && (
              <button 
                disabled={loading}
                onClick={() => handleAction('sleep', 'Boa noite! Registramos seu descanso', 'check_ins', { mood: 'good', checked_by: personInfo.userId, notes: 'Foi dormir - Descanso noturno' })}
                className="bg-white hover:bg-indigo-50/70 border-3 border-indigo-300 hover:border-indigo-500 active:bg-indigo-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-indigo-100 group-hover:bg-indigo-200 flex items-center justify-center transition-colors shadow-xs">
                  <Moon className="h-12 w-12 sm:h-14 sm:w-14 text-indigo-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Vou Dormir</span>
                  <span className="text-xs sm:text-sm font-semibold text-indigo-700">Boa noite!</span>
                </div>
              </button>
            )}

            {enabledModules.has('checkin_btn_activity_done') && (
              <button 
                disabled={loading}
                onClick={() => handleAction('activity', 'Parabéns! Atividade concluída', 'check_ins', { mood: 'great', checked_by: personInfo.userId, notes: 'Atividade concluída com sucesso' })}
                className="bg-white hover:bg-violet-50/70 border-3 border-violet-300 hover:border-violet-500 active:bg-violet-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors shadow-xs">
                  <ActivityIcon className="h-12 w-12 sm:h-14 sm:w-14 text-violet-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Atividade</span>
                  <span className="text-xs sm:text-sm font-semibold text-violet-700">Caminhada/exercício</span>
                </div>
              </button>
            )}

            {enabledModules.has('checkin_btn_remind_later') && (
              <button 
                disabled={loading}
                onClick={() => handleAction('remind_later', 'Lembrete adiado em 15 minutos', 'check_ins', { checked_by: personInfo.userId, notes: 'Lembrar mais tarde (15 min)' })}
                className="bg-white hover:bg-slate-50/70 border-3 border-slate-300 hover:border-slate-500 active:bg-slate-100 p-6 sm:p-8 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all shadow-sm active:scale-95 group text-center"
              >
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center transition-colors shadow-xs">
                  <Clock className="h-12 w-12 sm:h-14 sm:w-14 text-slate-600" />
                </div>
                <div>
                  <span className="text-2xl sm:text-3xl font-black text-stone-900 block leading-tight">Depois</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-600">Lembrar em 15 min</span>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Preciso de Ajuda */}
        {enabledModules.has('checkin_btn_need_help') && (
          <button 
            disabled={loading}
            onClick={() => {
              if (window.confirm('Tem certeza que deseja pedir a atenção da família agora?')) {
                handleAction('help', 'Preciso de ajuda com a rotina', 'help_requests', { message: 'Preciso de ajuda geral', requested_by: personInfo.userId });
              }
            }}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white p-6 sm:p-7 rounded-3xl flex items-center justify-center gap-5 transition-all shadow-lg active:scale-95"
          >
            <div className="bg-white/20 p-3 rounded-2xl">
              <BellRing className="h-10 w-10 text-white" />
            </div>
            <div className="text-left">
              <span className="text-2xl sm:text-3xl font-black block leading-none">Preciso de Ajuda</span>
              <span className="text-sm font-medium text-amber-100">Avisar a família para me ligar</span>
            </div>
          </button>
        )}
      </main>

      {/* SOS / EMERGÊNCIA FIXED BOTTOM */}
      {enabledModules.has('checkin_btn_emergency') && (
        <div className="fixed bottom-0 left-0 right-0 p-4 sm:p-6 bg-gradient-to-t from-white via-white/95 to-transparent z-30">
          <div className="max-w-3xl mx-auto">
            <button 
              disabled={loading}
              onClick={() => {
                if (window.confirm('ALERTA DE EMERGÊNCIA! Deseja enviar um aviso urgente com som para toda a família agora?')) {
                  handleAction('emergency', 'EMERGÊNCIA! Preciso de socorro imediato', 'emergency_events', { reported_by: personInfo.userId, description: 'Emergência acionada pela tela do idoso', severity: 'critical' });
                }
              }}
              className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-5 sm:p-6 rounded-3xl flex items-center justify-center gap-4 sm:gap-6 shadow-xl led-glow-red transition-all active:scale-95 border-b-6 border-red-800"
            >
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center animate-ping shrink-0">
                <AlertCircle className="h-7 w-7 text-white" />
              </div>
              <span className="text-2xl sm:text-4xl font-black tracking-wider uppercase">
                EMERGÊNCIA / SOS
              </span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL / TELA DO DESPERTADOR DO IDOSO */}
      {alarmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-stone-900 border-4 border-amber-400 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
            {/* Animated Bell Header */}
            <div className="mx-auto w-24 h-24 rounded-3xl bg-amber-100 dark:bg-amber-950/60 border-2 border-amber-300 flex items-center justify-center shadow-inner">
              <BellRing className="h-14 w-14 text-amber-600 dark:text-amber-400 animate-bounce" />
            </div>

            <div>
              <span className="inline-block px-3 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-extrabold text-sm rounded-full tracking-wider uppercase mb-2">
                {tCare.appointmentAlarmTitle}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100 leading-tight">
                {nextAppointmentData ? nextAppointmentData.title : tCare.demoTitle}
              </h2>
              <p className="text-lg font-bold text-amber-700 dark:text-amber-400 mt-2">
                {nextAppointmentData
                  ? `${tCare.scheduledFor} ${format(new Date(nextAppointmentData.starts_at), "dd/MM 'às' HH:mm", { locale: dateFnsLoc })}`
                  : tCare.demoText}
              </p>
              {nextAppointmentData?.doctor_name && (
                <p className="text-base font-semibold text-stone-700 dark:text-stone-300 mt-1">
                  {tCare.doctorLabel}: {nextAppointmentData.doctor_name}
                </p>
              )}
              {nextAppointmentData?.location && (
                <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
                  {tCare.locationLabel}: {nextAppointmentData.location}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              <Button
                type="button"
                onClick={() => {
                  if (nextAppointmentData) {
                    triggerAlarmManually();
                  } else {
                    testAlarmDemo();
                  }
                }}
                variant="outline"
                className="w-full h-14 text-lg font-bold border-2 border-indigo-400 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-2xl flex items-center justify-center gap-2"
              >
                <Volume2 className="h-5 w-5 text-indigo-600" /> {tCare.listenAgain}
              </Button>

              <Button
                type="button"
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  if (nextAppointmentData) {
                    setAlarmDismissedId(nextAppointmentData.id);
                  }
                  setAlarmModalOpen(false);
                }}
                className="w-full h-16 text-xl font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl shadow-lg active:scale-95 transition-transform"
              >
                {tCare.confirmSeen}
              </Button>

              {nextAppointmentData && (
                <Button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                    setSnoozeUntil(new Date(Date.now() + 10 * 60 * 1000));
                    setAlarmModalOpen(false);
                  }}
                  variant="ghost"
                  className="w-full h-12 text-base font-bold text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
                >
                  {tCare.snooze10m}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
