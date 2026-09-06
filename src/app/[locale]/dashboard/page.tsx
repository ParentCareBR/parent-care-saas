'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Droplet,
  Pill,
  Calendar,
  CheckSquare,
  Clock,
  Activity,
  Plus,
  Heart,
  Utensils,
  AlertCircle,
  ChevronRight,
  User,
} from 'lucide-react';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  time_of_day: string;
  is_active: boolean;
}

interface Task {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
}

function calculateAge(birthDate: string | null): number | null {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function DashboardPage() {
  const { user, currentOrganizationId } = useAuth();
  const { selectedPerson, loading: personLoading, caredPeople } = useCaredPerson();
  const supabase = createClient();

  const [medications, setMedications] = useState<Medication[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [hydrationMl, setHydrationMl] = useState(0);
  const [dataLoading, setDataLoading] = useState(false);

  const fetchDashboardData = useCallback(async () => {
    if (!selectedPerson || !currentOrganizationId) return;
    setDataLoading(true);

    // Fetch medications
    const { data: meds } = await supabase
      .from('medications')
      .select('id, name, dosage, time_of_day, is_active')
      .eq('cared_person_id', selectedPerson.id)
      .eq('is_active', true)
      .order('time_of_day', { ascending: true });

    if (meds) setMedications(meds);

    // Fetch tasks
    const { data: taskData } = await supabase
      .from('tasks')
      .select('id, title, status, due_date')
      .eq('cared_person_id', selectedPerson.id)
      .eq('status', 'pending')
      .order('due_date', { ascending: true })
      .limit(5);

    if (taskData) setTasks(taskData);

    // Fetch today's hydration
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const { data: hydrationData } = await supabase
      .from('hydration_logs')
      .select('amount_ml')
      .eq('cared_person_id', selectedPerson.id)
      .gte('logged_at', todayStart.toISOString());

    if (hydrationData) {
      const total = hydrationData.reduce((sum, h) => sum + (h.amount_ml || 0), 0);
      setHydrationMl(total);
    }

    setDataLoading(false);
  }, [selectedPerson, currentOrganizationId, supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const addWater = async () => {
    if (!selectedPerson || !currentOrganizationId || !user) return;
    await supabase.from('hydration_logs').insert({
      cared_person_id: selectedPerson.id,
      organization_id: currentOrganizationId,
      amount_ml: 250,
      logged_by: user.id,
    });
    setHydrationMl((prev) => prev + 250);
  };

  // Loading state
  if (personLoading) {
    return (
      <div className="p-8 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Empty state — no cared person
  if (!selectedPerson) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6">
        <div className="bg-emerald-50 p-8 rounded-full">
          <Heart className="h-16 w-16 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Bem-vindo ao Parent Care!</h2>
          <p className="text-stone-500 mt-3 max-w-md mx-auto text-lg">
            Para começar, cadastre a pessoa que receberá os cuidados.
          </p>
        </div>
        <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-lg px-8 py-6 rounded-xl shadow-lg shadow-emerald-200">
          <Link href="/pt-BR/dashboard/cared-people/new">
            <Plus className="h-5 w-5 mr-2" />
            Cadastrar Pessoa
          </Link>
        </Button>
      </div>
    );
  }

  const age = calculateAge(selectedPerson.birth_date);
  const initials = getInitials(selectedPerson.full_name);
  const hydrationGoalMl = 2000;
  const hydrationGlasses = Math.floor(hydrationMl / 250);
  const hydrationGoalGlasses = 8;
  const hydrationPercent = Math.min((hydrationMl / hydrationGoalMl) * 100, 100);

  // SVG circle values
  const circleRadius = 45;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circumference - (hydrationPercent / 100) * circumference;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Visão Geral</h1>
          <p className="text-stone-500">
            Acompanhamento de{' '}
            <span className="font-semibold text-stone-700">
              {selectedPerson.nickname || selectedPerson.full_name}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild className="rounded-lg">
            <Link href="/pt-BR/dashboard/medications/new">
              <Plus className="h-4 w-4 mr-1" /> Medicamento
            </Link>
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 rounded-lg" onClick={addWater}>
            <Droplet className="h-4 w-4 mr-1" /> + Água
          </Button>
        </div>
      </div>

      {/* Person Card */}
      <Card className="border-0 shadow-md bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-2xl overflow-hidden">
        <CardContent className="p-6 flex items-center gap-5">
          <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
            {initials}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold">{selectedPerson.full_name}</h2>
            <div className="flex items-center gap-4 mt-1 text-emerald-100 text-sm">
              {age !== null && <span>{age} anos</span>}
              {selectedPerson.blood_type && (
                <Badge className="bg-white/20 text-white border-0 text-xs">{selectedPerson.blood_type}</Badge>
              )}
              {selectedPerson.gender && <span className="capitalize">{selectedPerson.gender}</span>}
            </div>
          </div>
          <Link href="/pt-BR/dashboard/cared-people/new" className="bg-white/20 p-2 rounded-lg hover:bg-white/30 transition">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Medications Widget */}
        <Card className="border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="bg-emerald-50 p-1.5 rounded-lg">
                <Pill className="h-4 w-4 text-emerald-600" />
              </div>
              Medicamentos
            </CardTitle>
            <Link href="/pt-BR/dashboard/medications" className="text-xs text-emerald-600 font-medium hover:underline flex items-center gap-1">
              Ver todos <ChevronRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent>
            {medications.length === 0 ? (
              <div className="text-center py-6 text-stone-400">
                <Pill className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum medicamento cadastrado</p>
                <Button variant="ghost" size="sm" asChild className="mt-2 text-emerald-600">
                  <Link href="/pt-BR/dashboard/medications/new">
                    <Plus className="h-4 w-4 mr-1" /> Adicionar
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {medications.slice(0, 4).map((med) => (
                  <div key={med.id} className="flex items-center justify-between bg-stone-50 p-3 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <div>
                        <p className="font-medium text-sm text-stone-900">{med.name}</p>
                        <p className="text-xs text-stone-500">{med.dosage}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {med.time_of_day?.slice(0, 5)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hydration Widget */}
        <Card className="border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="bg-blue-50 p-1.5 rounded-lg">
                <Droplet className="h-4 w-4 text-blue-600" />
              </div>
              Hidratação
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            {/* SVG Circle Progress */}
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={circleRadius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r={circleRadius}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-500"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-stone-900">
                  {hydrationGlasses}/{hydrationGoalGlasses}
                </span>
                <span className="text-xs text-stone-500">copos</span>
              </div>
            </div>

            <p className="text-sm text-stone-500 mb-3">{hydrationMl}ml de {hydrationGoalMl}ml</p>

            <Button onClick={addWater} className="w-full bg-blue-500 hover:bg-blue-600 rounded-xl" size="sm">
              <Plus className="h-4 w-4 mr-1" /> Registrar 250ml
            </Button>
          </CardContent>
        </Card>

        {/* Tasks & Calendar Widget */}
        <Card className="border-stone-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="bg-indigo-50 p-1.5 rounded-lg">
                <CheckSquare className="h-4 w-4 text-indigo-600" />
              </div>
              Tarefas Pendentes
            </CardTitle>
            <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
              {tasks.length}
            </Badge>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <div className="text-center py-6 text-stone-400">
                <CheckSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma tarefa pendente</p>
                <Button variant="ghost" size="sm" className="mt-2 text-indigo-600">
                  <Plus className="h-4 w-4 mr-1" /> Nova Tarefa
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 bg-stone-50 p-3 rounded-xl">
                    <div className="h-5 w-5 rounded border-2 border-indigo-300 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">{task.title}</p>
                      {task.due_date && (
                        <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href="/pt-BR/dashboard/medications" className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 p-4 rounded-2xl flex flex-col items-center gap-2 transition-colors">
          <Pill className="h-6 w-6 text-emerald-600" />
          <span className="text-sm font-medium text-emerald-700">Medicamentos</span>
        </Link>
        <Link href="/pt-BR/dashboard/expenses" className="bg-orange-50 hover:bg-orange-100 border border-orange-100 p-4 rounded-2xl flex flex-col items-center gap-2 transition-colors">
          <Utensils className="h-6 w-6 text-orange-600" />
          <span className="text-sm font-medium text-orange-700">Despesas</span>
        </Link>
        <Link href="/pt-BR/dashboard/emergency" className="bg-red-50 hover:bg-red-100 border border-red-100 p-4 rounded-2xl flex flex-col items-center gap-2 transition-colors">
          <AlertCircle className="h-6 w-6 text-red-600" />
          <span className="text-sm font-medium text-red-700">Emergência</span>
        </Link>
        <Link href="/pt-BR/dashboard/settings/subscription" className="bg-blue-50 hover:bg-blue-100 border border-blue-100 p-4 rounded-2xl flex flex-col items-center gap-2 transition-colors">
          <Activity className="h-6 w-6 text-blue-600" />
          <span className="text-sm font-medium text-blue-700">Assinatura</span>
        </Link>
      </div>
    </div>
  );
}
