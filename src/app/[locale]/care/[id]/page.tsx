'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

export default function ElderlyViewPage({ 
  params,
  searchParams 
}: { 
  params: { id: string, locale: string },
  searchParams: { demo?: string, token?: string } 
}) {
  const isDemo = searchParams.demo === 'true';
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [personInfo, setPersonInfo] = useState({
    name: isDemo ? 'Dona Maria' : 'Carregando...',
    nextAppointment: isDemo ? 'Consulta Dr. Silva (Amanhã, 14:00)' : null,
    nextMedication: isDemo ? 'Losartana 50mg - 08:00' : null,
  });

  const [lastAction, setLastAction] = useState<{id: string, type: string, table: string} | null>(null);

  // Update clock every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (isDemo) return;
      
      // Ideally, validate token here for secure access
      // Fetch person data
      const { data: person } = await supabase
        .from('cared_people')
        .select('full_name, organization_id')
        .eq('id', params.id)
        .single();
        
      if (person) {
        const typedPerson = person as any;
        setPersonInfo(prev => ({ ...prev, name: typedPerson.full_name.split(' ')[0] }));
        localStorage.setItem('parentcare_org', typedPerson.organization_id);
      }
    }
    fetchData();
  }, [isDemo, params.id, supabase]);

  const triggerVibration = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(200); // 200ms vibration
    }
  };

  const handleAction = async (type: string, message: string, dbTable: string, data: any) => {
    setLoading(true);
    
    let actionId = '';
    
    if (isDemo) {
      await new Promise(resolve => setTimeout(resolve, 800)); // simulate network
      actionId = 'demo-id';
    } else {
      const orgId = localStorage.getItem('parentcare_org') || '';
      
      const payload = {
        organization_id: orgId,
        cared_person_id: params.id,
        ...data
      };
      
      const { data: result, error } = await supabase.from(dbTable).insert(payload).select().single();
      
      if (error) {
        setLoading(false);
        alert('Falha na comunicação. Verifique sua internet.');
        return;
      }
      
      const typedResult = result as any;
      actionId = typedResult.id;
    }
    
    triggerVibration();
    setLastAction({ id: actionId, type, table: dbTable });
    setLoading(false);
    setSuccessMsg(`${message}! A família foi avisada.`);
    
    setTimeout(() => setSuccessMsg(''), 6000);
  };

  const undoLastAction = async () => {
    if (!lastAction || isDemo) {
      setLastAction(null);
      setSuccessMsg('Ação cancelada.');
      setTimeout(() => setSuccessMsg(''), 3000);
      return;
    }
    
    setLoading(true);
    await supabase.from(lastAction.table).delete().eq('id', lastAction.id);
    setLoading(false);
    setLastAction(null);
    setSuccessMsg('Ação corrigida.');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-stone-100 flex justify-center text-stone-900 elderly-mode selection:bg-brand-green selection:text-white">
      <div className="w-full max-w-lg bg-white min-h-screen shadow-2xl flex flex-col">
        
        {/* Header - Greeting and Time */}
        <header className="bg-brand-green text-white p-6 pb-8 rounded-b-[2rem] shadow-md relative z-10" role="banner">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-1">Olá, {personInfo.name}!</h1>
              <p className="text-xl opacity-90 font-medium">
                {currentTime.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <div className="text-right">
              <span className="text-4xl font-bold tracking-tighter" aria-label={`Hora atual: ${currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}>
                {currentTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 -mt-4 z-0 flex flex-col gap-4 overflow-y-auto" role="main">
          
          {/* Important Reminders */}
          {(personInfo.nextMedication || personInfo.nextAppointment) && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 shadow-sm mb-2" role="region" aria-label="Lembretes">
              {personInfo.nextMedication && (
                <div className="flex items-center gap-3 text-amber-900 font-semibold text-lg mb-2">
                  <div className="bg-amber-200 p-2 rounded-full text-amber-700">
                    <BellRing className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <span>Lembrete: {personInfo.nextMedication}</span>
                </div>
              )}
              {personInfo.nextAppointment && (
                <div className="flex items-center gap-3 text-indigo-900 font-medium text-lg pt-2 border-t border-amber-200/50">
                  <Calendar className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                  <span>{personInfo.nextAppointment}</span>
                </div>
              )}
            </div>
          )}

          {/* Feedback Message */}
          {successMsg && (
            <div 
              className="bg-green-100 border-2 border-green-500 text-green-900 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-4 shadow-md"
              role="alert"
              aria-live="assertive"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-10 w-10 text-green-600 shrink-0" aria-hidden="true" />
                <span className="font-bold text-xl">{successMsg}</span>
              </div>
              
              {lastAction && (
                <Button 
                  variant="outline" 
                  className="border-green-300 text-green-800 bg-white hover:bg-green-50 w-full sm:w-auto h-12 text-lg rounded-xl shrink-0"
                  onClick={undoLastAction}
                  disabled={loading}
                  aria-label="Desfazer ação"
                >
                  <RotateCcw className="h-5 w-5 mr-2" aria-hidden="true" /> Corrigir
                </Button>
              )}
            </div>
          )}

          {/* Quick Actions Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2 flex-1 content-start">
            <Button 
              className="h-28 text-2xl rounded-2xl bg-green-600 hover:bg-green-700 text-white shadow-lg flex flex-col justify-center items-center gap-2"
              onClick={() => handleAction('mood', 'Estou bem', 'check_ins', { mood: 'great', checked_by: isDemo ? null : undefined, notes: 'Estou bem' })}
              disabled={loading}
              aria-label="Informar que estou bem"
            >
              <Heart className="h-10 w-10" aria-hidden="true" />
              Estou bem
            </Button>

            <Button 
              className="h-28 text-2xl rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-lg flex flex-col justify-center items-center gap-2"
              onClick={() => handleAction('medication', 'Medicamento tomado', 'check_ins', { notes: 'Tomei o medicamento' })}
              disabled={loading}
              aria-label="Confirmar que tomei medicamento"
            >
              <Pill className="h-10 w-10" aria-hidden="true" />
              Tomei Remédio
            </Button>

            <Button 
              className="h-28 text-2xl rounded-2xl bg-orange-500 hover:bg-orange-600 text-white shadow-lg flex flex-col justify-center items-center gap-2"
              onClick={() => handleAction('meal', 'Refeição registrada', 'check_ins', { notes: 'Já me alimentei' })}
              disabled={loading}
              aria-label="Confirmar que me alimentei"
            >
              <Coffee className="h-10 w-10" aria-hidden="true" />
              Me Alimentei
            </Button>

            <Button 
              className="h-28 text-2xl rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg flex flex-col justify-center items-center gap-2"
              onClick={() => handleAction('hydration', 'Água registrada', 'check_ins', { notes: 'Bebi água' })}
              disabled={loading}
              aria-label="Confirmar que bebi água"
            >
              <Droplet className="h-10 w-10" aria-hidden="true" />
              Bebi Água
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <Button 
              className="w-full h-24 text-2xl rounded-2xl bg-amber-500 hover:bg-amber-600 text-white shadow-lg flex justify-start px-6 gap-4"
              onClick={() => handleAction('help', 'Pedido de ajuda enviado', 'help_requests', { message: 'Preciso de ajuda com tarefas cotidianas' })}
              disabled={loading}
              aria-label="Solicitar ajuda não urgente"
            >
              <div className="bg-white/20 p-3 rounded-full"><AlertCircle className="h-8 w-8" aria-hidden="true" /></div>
              <span className="font-bold">Preciso de ajuda</span>
            </Button>

            <Button 
              className="w-full h-28 text-3xl font-black tracking-wide rounded-2xl bg-red-600 hover:bg-red-700 text-white shadow-xl flex justify-center items-center gap-4 border-4 border-red-700/50"
              onClick={() => {
                triggerVibration();
                if (window.confirm("Atenção! Isso enviará um alerta de EMERGÊNCIA para todos os familiares imediatamente. Confirmar?")) {
                  handleAction('emergency', 'ALERTA DE EMERGÊNCIA ENVIADO', 'emergency_events', { description: 'Botão de pânico acionado pela tela simplificada', severity: 'critical' });
                }
              }}
              disabled={loading}
              aria-label="Acionar botão de emergência"
            >
              <AlertCircle className="h-12 w-12" aria-hidden="true" />
              EMERGÊNCIA
            </Button>
          </div>

        </main>
        
        {isDemo && (
          <div className="bg-stone-800 text-stone-200 text-center p-2 text-sm font-medium">
            MODO DEMONSTRAÇÃO ATIVADO
          </div>
        )}
      </div>
    </div>
  );
}
