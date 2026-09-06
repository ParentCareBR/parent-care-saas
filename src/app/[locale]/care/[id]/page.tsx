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
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ElderlyViewPage({ 
  params
}: { 
  params: { id: string, locale: string }
}) {
  const supabase = createClient();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
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
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
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

      // Puxar próxima medicação (Simplificado para MVP: pegar o primeiro medicamento ativo que tem um schedule hoje futuro)
      // Em produção real faríamos query nos medication_schedules cruzando horários
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

      // Puxar próxima consulta futura
      const { data: appt } = await supabase
        .from('appointments')
        .select('title, starts_at')
        .eq('cared_person_id', params.id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1)
        .single();

      let nextAppt = null;
      if (appt) {
        nextAppt = `${appt.title} (${format(new Date(appt.starts_at), "dd/MM 'às' HH:mm", { locale: ptBR })})`;
      }

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
  }, [params.id, params.locale, router, supabase]);

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
    <div className="min-h-screen bg-stone-50 elderly-mode">
      {/* Top Bar */}
      <div className="bg-white border-b-4 border-stone-200 p-6 flex justify-between items-center sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 bg-brand-soft rounded-full flex items-center justify-center">
            <Heart className="h-8 w-8 text-brand-green" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Olá, {personInfo.name}</h1>
            <p className="text-xl text-stone-500 font-medium">
              {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        </div>
        
        <Button 
          variant="ghost" 
          onClick={() => {
            supabase.auth.signOut();
            router.push(`/${params.locale}/care/login`);
          }} 
          className="text-stone-400 hover:text-stone-600 h-16 w-16"
        >
          Sair
        </Button>
      </div>

      <div className="p-6 max-w-2xl mx-auto space-y-6 pb-32">
        {successMsg && (
          <div className="bg-emerald-100 border-4 border-emerald-500 text-emerald-800 p-6 rounded-3xl flex items-center gap-4 mb-8 shadow-lg animate-in slide-in-from-top-4">
            <CheckCircle2 className="h-10 w-10 shrink-0" />
            <p className="text-2xl font-bold flex-1">{successMsg}</p>
            {lastAction && (
              <Button onClick={undoLastAction} variant="outline" className="h-14 border-emerald-500 text-emerald-700 bg-emerald-50 hover:bg-emerald-200 text-xl px-6 rounded-2xl gap-2">
                <RotateCcw className="h-6 w-6" /> Desfazer
              </Button>
            )}
          </div>
        )}

        {/* Daily Summary Cards */}
        {personInfo.nextMedication && (
          <div className="bg-white p-6 rounded-3xl border-4 border-blue-100 flex items-center gap-6 shadow-sm">
            <div className="bg-blue-100 p-4 rounded-2xl">
              <Pill className="h-10 w-10 text-blue-600" />
            </div>
            <div>
              <p className="text-stone-500 font-bold text-xl uppercase tracking-wider mb-1">Próximo Remédio</p>
              <p className="text-3xl font-bold text-stone-900">{personInfo.nextMedication}</p>
            </div>
          </div>
        )}

        {personInfo.nextAppointment && (
          <div className="bg-white p-6 rounded-3xl border-4 border-purple-100 flex items-center gap-6 shadow-sm">
            <div className="bg-purple-100 p-4 rounded-2xl">
              <Calendar className="h-10 w-10 text-purple-600" />
            </div>
            <div>
              <p className="text-stone-500 font-bold text-xl uppercase tracking-wider mb-1">Próxima Consulta</p>
              <p className="text-2xl font-bold text-stone-900">{personInfo.nextAppointment}</p>
            </div>
          </div>
        )}

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-6 mt-8">
          <button 
            disabled={loading}
            onClick={() => handleAction('mood', 'Estou bem', 'check_ins', { mood: 'great', checked_by: personInfo.userId, notes: 'Estou bem' })}
            className="bg-white border-4 border-stone-200 hover:border-emerald-500 active:bg-emerald-50 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all shadow-sm active:scale-95"
          >
            <div className="bg-emerald-100 p-6 rounded-full">
              <Heart className="h-14 w-14 text-emerald-600" />
            </div>
            <span className="text-3xl font-bold text-stone-800 text-center leading-tight">Estou<br/>Bem</span>
          </button>

          <button 
            disabled={loading}
            onClick={() => handleAction('meal', 'Já me alimentei', 'meals', { meal_type: 'other', logged_by: personInfo.userId })}
            className="bg-white border-4 border-stone-200 hover:border-amber-500 active:bg-amber-50 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all shadow-sm active:scale-95"
          >
            <div className="bg-amber-100 p-6 rounded-full">
              <Coffee className="h-14 w-14 text-amber-600" />
            </div>
            <span className="text-3xl font-bold text-stone-800 text-center leading-tight">Já<br/>Comi</span>
          </button>

          <button 
            disabled={loading || !personInfo.medicationId}
            onClick={() => handleAction('medication', 'Remédio tomado', 'medication_confirmations', { medication_id: personInfo.medicationId, confirmed_by: personInfo.userId, status: 'taken' })}
            className="bg-white border-4 border-stone-200 hover:border-blue-500 active:bg-blue-50 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <div className="bg-blue-100 p-6 rounded-full">
              <Pill className="h-14 w-14 text-blue-600" />
            </div>
            <span className="text-3xl font-bold text-stone-800 text-center leading-tight">Tomei o<br/>Remédio</span>
          </button>

          <button 
            disabled={loading}
            onClick={() => handleAction('hydration', 'Bebi água', 'hydration_logs', { amount_ml: 250, logged_by: personInfo.userId })}
            className="bg-white border-4 border-stone-200 hover:border-cyan-500 active:bg-cyan-50 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-6 transition-all shadow-sm active:scale-95"
          >
            <div className="bg-cyan-100 p-6 rounded-full">
              <Droplet className="h-14 w-14 text-cyan-600" />
            </div>
            <span className="text-3xl font-bold text-stone-800 text-center leading-tight">Bebi<br/>Água</span>
          </button>
        </div>

        <button 
          disabled={loading}
          onClick={() => {
            if(window.confirm('Tem certeza que precisa de ajuda agora?')) {
              handleAction('help', 'Preciso de ajuda', 'help_requests', { message: 'Preciso de ajuda geral', requested_by: personInfo.userId });
            }
          }}
          className="w-full bg-white border-4 border-orange-200 hover:border-orange-500 active:bg-orange-50 p-8 rounded-[2rem] flex items-center justify-center gap-6 transition-all shadow-sm active:scale-95 mt-6"
        >
          <div className="bg-orange-100 p-5 rounded-full">
            <BellRing className="h-12 w-12 text-orange-600" />
          </div>
          <span className="text-4xl font-bold text-stone-800">Preciso de Ajuda</span>
        </button>
      </div>

      {/* Emergency Button - Fixed Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
        <div className="max-w-2xl mx-auto">
          <button 
            disabled={loading}
            onClick={() => {
              if(window.confirm('ALERTA DE EMERGÊNCIA! Deseja enviar um alerta para todos os familiares agora?')) {
                handleAction('emergency', 'EMERGÊNCIA! Preciso de ajuda imediata', 'emergency_events', { reported_by: personInfo.userId, description: 'Emergência acionada pela tela do idoso', severity: 'critical' });
              }
            }}
            className="w-full bg-red-600 hover:bg-red-700 active:bg-red-800 text-white p-8 rounded-[2rem] flex items-center justify-center gap-6 shadow-[0_10px_30px_rgba(220,38,38,0.4)] transition-all active:scale-95 active:translate-y-2 border-b-8 border-red-800"
          >
            <AlertCircle className="h-14 w-14" />
            <span className="text-4xl font-black tracking-widest uppercase">Emergência</span>
          </button>
        </div>
      </div>
    </div>
  );
}
