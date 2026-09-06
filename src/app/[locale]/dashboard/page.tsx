'use client';

import React, { useEffect, useState } from 'react';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Pill, 
  Clock, 
  Utensils, 
  Droplet, 
  Calendar, 
  CheckSquare, 
  AlertCircle,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function DashboardOverview() {
  const { selectedPerson, loading } = useCaredPerson();
  const [stats, setStats] = useState<any>(null);
  const supabase = createClient();

  useEffect(() => {
    async function fetchOverview() {
      if (!selectedPerson) return;
      
      // In a real implementation, we would fetch these from the DB
      // For now, we simulate fetching the dashboard data for the selected person
      // This ensures we have a real DB connection setup but fallback data if empty
      
      const { data: meds } = await supabase
        .from('medications')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .eq('is_active', true);
        
      const { data: appointments } = await supabase
        .from('appointments')
        .select('*')
        .eq('cared_person_id', selectedPerson.id)
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
        .limit(1);

      // Real Check In
      const { data: checkIns } = await supabase
        .from('check_ins')
        .select('mood, checked_at')
        .eq('cared_person_id', selectedPerson.id)
        .order('checked_at', { ascending: false })
        .limit(1);

      // Hydration today
      const startOfDay = new Date();
      startOfDay.setHours(0,0,0,0);
      const { data: hydration } = await supabase
        .from('hydration_logs')
        .select('amount_ml')
        .eq('cared_person_id', selectedPerson.id)
        .gte('logged_at', startOfDay.toISOString());
      const hydrationSum = (hydration || []).reduce((acc, log) => acc + (log.amount_ml || 0), 0);
      
      // Pending tasks
      const { count: pendingCount } = await supabase
        .from('tasks')
        .select('*', { count: 'exact', head: true })
        .eq('cared_person_id', selectedPerson.id)
        .neq('status', 'done');

      // Late meds today
      const { count: lateMeds } = await supabase
        .from('medication_confirmations')
        .select('*', { count: 'exact', head: true })
        .eq('cared_person_id', selectedPerson.id)
        .eq('status', 'late')
        .gte('created_at', startOfDay.toISOString());

      // Last meal
      const { data: meals } = await supabase
        .from('meals')
        .select('meal_type, consumed_at')
        .eq('cared_person_id', selectedPerson.id)
        .order('consumed_at', { ascending: false })
        .limit(1);

      setStats({
        medsCount: meds?.length || 0,
        nextAppointment: appointments?.[0] || null,
        lastCheckIn: checkIns && checkIns.length > 0 ? { status: checkIns[0].mood === 'great' ? 'Ótimo' : checkIns[0].mood, time: new Date(checkIns[0].checked_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } : null,
        hydrationProgress: Math.min((hydrationSum / 2000) * 100, 100), // Assuming 2000ml goal
        pendingTasks: pendingCount || 0,
        delayedMeds: lateMeds || 0,
        nextMeal: meals && meals.length > 0 ? { type: meals[0].meal_type, time: new Date(meals[0].consumed_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) } : null
      });
    }

    fetchOverview();
  }, [selectedPerson, supabase]);

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full"></div></div>;
  }

  if (!selectedPerson) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
        <div className="bg-stone-100 p-6 rounded-full">
          <Activity className="h-12 w-12 text-stone-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-stone-900">Nenhuma pessoa selecionada</h2>
          <p className="text-stone-500 mt-2 max-w-md">
            Selecione ou cadastre uma pessoa cuidada para visualizar o painel de acompanhamento.
          </p>
        </div>
        <Button asChild className="mt-4 bg-brand-green hover:bg-emerald-800">
          <Link href="/dashboard/cared-people/new">Cadastrar Pessoa</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Visão Geral</h1>
          <p className="text-stone-500">Acompanhamento atual de {selectedPerson.full_name}</p>
        </div>
        
        {stats?.lastCheckIn && (
          <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-stone-200 shadow-sm">
            <div className="bg-green-100 p-2 rounded-full text-green-700">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-stone-500 font-medium uppercase">Último Check-in</p>
              <p className="font-semibold text-stone-900">{stats.lastCheckIn.status} <span className="text-stone-400 font-normal text-sm">às {stats.lastCheckIn.time}</span></p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Medicamentos */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Pill className="h-5 w-5 text-brand-warm" />
              Medicamentos
            </CardTitle>
            <Link href="/dashboard/medications" className="text-sm text-brand-green font-medium hover:underline">Ver todos</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-stone-100">
                <div>
                  <p className="text-2xl font-bold text-stone-900">{stats?.medsCount || 0}</p>
                  <p className="text-sm text-stone-500">Para hoje</p>
                </div>
                {stats?.delayedMeds > 0 && (
                  <div className="bg-red-50 px-3 py-2 rounded-md flex items-center gap-2 text-red-700 border border-red-100">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-semibold">{stats.delayedMeds} atrasados</span>
                  </div>
                )}
              </div>
              
              {/* This would be a dynamic list in a full implementation */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-stone-300" />
                    <div>
                      <p className="font-medium text-sm text-stone-900">Losartana 50mg</p>
                      <p className="text-xs text-stone-500">1 comprimido</p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">08:00</span>
                </div>
                <Button variant="outline" size="sm" className="w-full text-xs h-8">Registrar Dose</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alimentação & Hidratação */}
        <Card className="border-stone-200 shadow-sm">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Utensils className="h-5 w-5 text-orange-500" />
              Nutrição
            </CardTitle>
            <Link href="/dashboard/meals" className="text-sm text-brand-green font-medium hover:underline">Detalhes</Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-stone-500 mb-2 flex items-center gap-1"><Clock className="h-4 w-4" /> Próxima refeição</p>
                <div className="bg-stone-50 p-3 rounded-md border border-stone-100 flex justify-between items-center">
                  <span className="font-medium text-stone-900">{stats?.nextMeal?.type || 'Almoço'}</span>
                  <Badge variant="secondary" className="bg-orange-100 text-orange-700">{stats?.nextMeal?.time || '12:30'}</Badge>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-stone-500 flex items-center gap-1"><Droplet className="h-4 w-4 text-blue-500" /> Hidratação</span>
                  <span className="font-medium text-stone-900">{stats?.hydrationProgress || 0}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${stats?.hydrationProgress || 0}%` }}></div>
                </div>
                <p className="text-xs text-stone-500 mt-1.5 text-right">Meta: 2000ml</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Agenda & Tarefas */}
        <div className="space-y-6">
          <Card className="border-stone-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-indigo-500" />
                Próximo Compromisso
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.nextAppointment ? (
                <div className="bg-indigo-50 p-3 rounded-md border border-indigo-100">
                  <p className="font-semibold text-indigo-900">{stats.nextAppointment.title}</p>
                  <p className="text-sm text-indigo-700 mt-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" /> 
                    {new Date(stats.nextAppointment.starts_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-stone-500 text-center py-2">Nenhum compromisso agendado</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-stone-200 shadow-sm bg-brand-green text-white">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-md">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">Tarefas Pendentes</p>
                  <p className="text-sm text-brand-soft/80">{stats?.pendingTasks || 0} aguardando</p>
                </div>
              </div>
              <Button size="sm" variant="secondary" className="bg-white text-brand-green hover:bg-stone-100" asChild>
                <Link href="/dashboard/tasks">Ver</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
