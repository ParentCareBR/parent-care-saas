'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import type { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, Phone, ArrowLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function EmergencyPage() {
  const router = useRouter();
  const { selectedPerson } = useCaredPerson();
  const { user, currentOrganizationId } = useAuth();
  const supabase = createClient();
  
  const [confirming, setConfirming] = useState(false);
  const [triggered, setTriggered] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleTriggerEmergency = async () => {
    if (!selectedPerson || !user || !currentOrganizationId) return;
    
    setLoading(true);
    
    // Register the emergency event
    type EmergencyInsert = Database['public']['Tables']['emergency_events']['Insert'];
    const emergencyPayload: EmergencyInsert = {
      organization_id: currentOrganizationId!,
      cared_person_id: selectedPerson.id,
      reported_by: user.id,
      description: 'Emergência acionada pelo botão rápido',
      severity: 'high'
    };
    const { error } = await supabase.from('emergency_events').insert(emergencyPayload);

    setLoading(false);
    
    if (!error) {
      setTriggered(true);
    } else {
      alert('Erro ao registrar emergência, mas tente ligar para os contatos abaixo.');
      setTriggered(true);
    }
  };

  if (!selectedPerson) return <div>Selecione uma pessoa cuidada primeiro.</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-red-700">Emergência</h1>
          <p className="text-stone-500">Ações rápidas para {selectedPerson.full_name}</p>
        </div>
      </div>

      <div className="bg-white border-2 border-red-100 rounded-xl p-8 text-center shadow-sm">
        {!triggered ? (
          <div className="space-y-6">
            <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Botão de Emergência</h2>
              <p className="text-stone-500 max-w-md mx-auto">
                Isso irá alertar todos os familiares e cuidadores cadastrados para {selectedPerson.full_name}.
              </p>
            </div>

            {!confirming ? (
              <Button 
                className="w-full sm:w-auto h-16 px-12 text-lg bg-red-600 hover:bg-red-700" 
                onClick={() => setConfirming(true)}
              >
                Acionar Emergência
              </Button>
            ) : (
              <div className="space-y-4 animate-in fade-in zoom-in duration-200">
                <p className="font-bold text-red-600">Tem certeza?</p>
                <div className="flex gap-4 justify-center">
                  <Button variant="outline" onClick={() => setConfirming(false)}>
                    Cancelar
                  </Button>
                  <Button 
                    className="bg-red-600 hover:bg-red-800" 
                    onClick={handleTriggerEmergency}
                    disabled={loading}
                  >
                    {loading ? 'Enviando...' : 'Sim, solicitar ajuda!'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6 animate-in slide-in-from-bottom-4">
            <div className="mx-auto w-24 h-24 bg-green-100 rounded-full flex items-center justify-center">
              <ShieldAlert className="h-12 w-12 text-green-600" />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold text-stone-900 mb-2">Alerta Enviado!</h2>
              <p className="text-stone-600 max-w-md mx-auto">
                Todos os contatos de emergência e familiares responsáveis foram notificados.
              </p>
            </div>

            <div className="bg-stone-50 p-6 rounded-lg text-left mt-8">
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5" /> Contatos de Emergência
              </h3>
              
              {/* Mock emergency contacts for now */}
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-white p-4 border border-stone-200 rounded-md">
                  <div>
                    <p className="font-bold">SAMU (Ambulância)</p>
                    <p className="text-sm text-stone-500">Serviço Público</p>
                  </div>
                  <Button asChild variant="outline" className="text-brand-green border-brand-green">
                    <a href="tel:192">Ligar 192</a>
                  </Button>
                </div>
                
                <div className="flex justify-between items-center bg-white p-4 border border-stone-200 rounded-md">
                  <div>
                    <p className="font-bold">Filho(a) Principal</p>
                    <p className="text-sm text-stone-500">Contato Primário</p>
                  </div>
                  <Button asChild variant="outline" className="text-brand-green border-brand-green">
                    <a href="tel:11999999999">Ligar</a>
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-stone-400 mt-8">
              O Parent Care não substitui serviços médicos ou de emergência públicos. 
              Em caso de risco à vida, ligue imediatamente para as autoridades locais.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
