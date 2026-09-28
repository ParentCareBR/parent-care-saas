'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
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
  const [contacts, setContacts] = useState<any[]>([]);

  useEffect(() => {
    async function loadContacts() {
      if (!selectedPerson || !currentOrganizationId) return;
      const { data } = await supabase
        .from('emergency_contacts')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .order('is_primary', { ascending: false });
      
      setContacts(data || []);
    }
    loadContacts();
  }, [selectedPerson, currentOrganizationId, supabase]);

  const handleTriggerEmergency = async () => {
    if (!selectedPerson || !user || !currentOrganizationId) return;
    
    setLoading(true);
    
    // Register the emergency event
    const emergencyPayload = {
      organization_id: currentOrganizationId,
      cared_person_id: selectedPerson.id,
      reported_by: user.id,
      description: 'Emergência acionada pelo botão rápido',
      severity: 'critical'
    };
    const { error } = await supabase.from('emergency_events').insert(emergencyPayload);

    // Create notifications for organization members
    const { data: members } = await supabase.from('organization_members')
      .select('user_id')
      .eq('organization_id', currentOrganizationId)
      .neq('user_id', user.id);
      
    if (members && members.length > 0) {
       const notifications = members.map(m => ({
          user_id: m.user_id,
          organization_id: currentOrganizationId,
          type: 'alert',
          title: `EMERGÊNCIA: ${selectedPerson.full_name}`,
          message: 'Um alerta de emergência foi acionado.',
          link_url: `/dashboard/emergency`
       }));
       await supabase.from('notifications').insert(notifications);
    }

    setLoading(false);
    
    if (!error) {
      setTriggered(true);
    } else {
      alert('Erro ao registrar emergência no sistema, mas os contatos abaixo podem ser acionados manualmente.');
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
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">Emergência</h1>
          <p className="text-stone-500 dark:text-slate-400">Ações rápidas para {selectedPerson.full_name}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#101D2B] border-2 border-red-100 dark:border-red-900/30 rounded-3xl p-8 text-center shadow-sm">
        {!triggered ? (
          <div className="space-y-6">
            <div className="mx-auto w-24 h-24 bg-red-100 dark:bg-red-950/50 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-12 w-12 text-red-600 dark:text-red-400" />
            </div>
            
            <div>
              <h2 className="text-xl font-bold text-stone-900 dark:text-[#F8FAFC] mb-2">Botão de Emergência</h2>
              <p className="text-stone-500 dark:text-slate-400 max-w-md mx-auto">
                Isso irá alertar todos os familiares e cuidadores cadastrados para {selectedPerson.full_name}.
              </p>
            </div>

            {!confirming ? (
              <Button 
                className="w-full sm:w-auto h-16 px-12 text-lg bg-red-600 hover:bg-red-700 font-bold text-white shadow-lg shadow-red-200 dark:shadow-none rounded-2xl" 
                onClick={() => setConfirming(true)}
              >
                Acionar Emergência
              </Button>
            ) : (
              <div className="space-y-4 animate-in slide-in-from-bottom-2">
                <p className="font-bold text-red-600">Tem certeza? Esta ação criará um registro de incidente crítico.</p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button 
                    variant="outline" 
                    className="h-14 px-8" 
                    onClick={() => setConfirming(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    className="h-14 px-8 bg-red-600 hover:bg-red-700 font-bold" 
                    onClick={handleTriggerEmergency}
                    disabled={loading}
                  >
                    {loading ? 'Registrando...' : 'Sim, Confirmar Alerta'}
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
              <h2 className="text-2xl font-bold text-stone-900 dark:text-[#F8FAFC] mb-2">Alerta Registrado!</h2>
              <p className="text-stone-600 dark:text-slate-300 max-w-md mx-auto">
                O evento de emergência foi salvo no sistema e notificações internas foram geradas para a família.
              </p>
            </div>

            <div className="bg-stone-50 dark:bg-[#172433] p-6 rounded-2xl text-left mt-8 border border-stone-100 dark:border-[#1f3147]">
              <h3 className="font-semibold text-stone-900 dark:text-[#F8FAFC] mb-4 flex items-center gap-2">
                <Phone className="h-5 w-5 text-emerald-500" /> Contatos Cadastrados
              </h3>
              
              {contacts.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-slate-400">Nenhum contato de emergência cadastrado para esta pessoa.</p>
              ) : (
                <div className="space-y-4">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="flex justify-between items-center bg-white dark:bg-[#101D2B] p-4 border border-stone-200 dark:border-[#1f3147] rounded-xl">
                      <div>
                        <p className="font-bold text-stone-900 dark:text-[#F8FAFC]">{contact.name}</p>
                        <p className="text-sm text-stone-500 dark:text-slate-400">{contact.relationship} {contact.is_primary && '(Principal)'}</p>
                      </div>
                      <Button asChild variant="outline" className="text-emerald-600 dark:text-emerald-400 border-emerald-600 dark:border-emerald-500 rounded-xl">
                        <a href={`tel:${contact.phone}`}>Ligar {contact.phone}</a>
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs text-stone-500 mt-8 font-medium">
              Aviso: O Parent Care auxilia na organização familiar, mas NÃO substitui serviços médicos ou de emergência públicos (SAMU, Polícia, Bombeiros). Em caso de risco à vida, ligue imediatamente para as autoridades locais (Ex: 192). O alerta gerado restringe-se aos usuários do aplicativo.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
