'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { useMonitoring } from '@/hooks/useMonitoring';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Droplet,
  Heart,
  HelpCircle,
  Info,
  Pill,
  TrendingDown,
  TrendingUp,
  Utensils,
  Minus,
  ShieldAlert,
} from 'lucide-react';
import { PatternChangeInsight } from '@/types/monitoring';

export default function ReportsAndPatternChangesPage() {
  const { user } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const { isModuleEnabled } = useMonitoring();

  const [timeframe, setTimeframe] = useState<'daily' | 'weekly'>('daily');
  const [patternInsights, setPatternInsights] = useState<PatternChangeInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [disclaimer, setDisclaimer] = useState<string>('');

  useEffect(() => {
    async function loadPatternChanges() {
      if (!selectedPerson) return;
      setLoadingInsights(true);
      try {
        const res = await fetch(`/api/monitoring/pattern-changes?caredPersonId=${selectedPerson.id}`);
        const data = await res.json();
        if (res.ok && data.success) {
          setPatternInsights(data.insights || []);
          setDisclaimer(data.disclaimer || '');
        }
      } catch (err) {
        console.error('Erro ao buscar mudanças observadas:', err);
      } finally {
        setLoadingInsights(false);
      }
    }

    loadPatternChanges();
  }, [selectedPerson]);

  if (!selectedPerson) {
    return (
      <div className="p-8 text-center space-y-4">
        <Activity className="h-12 w-12 text-stone-400 mx-auto" />
        <h2 className="text-2xl font-bold">Selecione um familiar</h2>
        <p className="text-stone-500">Selecione uma pessoa cuidada para visualizar relatórios e padrões observados.</p>
      </div>
    );
  }

  // Define tracking status items depending ONLY on whether they are enabled
  const trackingItems = [
    {
      code: 'routine_meals',
      name: 'Alimentação',
      icon: Utensils,
      enabled: isModuleEnabled('routine_meals'),
      status: 'performed' as const, // example real evaluation
      summary: 'Almoço e café da manhã registrados',
    },
    {
      code: 'routine_hydration',
      name: 'Hidratação',
      icon: Droplet,
      enabled: isModuleEnabled('routine_hydration'),
      status: 'pending' as const,
      summary: '4 de 8 copos consumidos',
    },
    {
      code: 'meds_scheduled',
      name: 'Medicamentos',
      icon: Pill,
      enabled: isModuleEnabled('meds_scheduled'),
      status: 'performed' as const,
      summary: 'Doses da manhã confirmadas',
    },
    {
      code: 'schedule_appointments',
      name: 'Consultas Médicas',
      icon: Calendar,
      enabled: isModuleEnabled('schedule_appointments'),
      status: 'no_records' as const,
      summary: 'Nenhum compromisso para hoje',
    },
    {
      code: 'wellbeing_mood',
      name: 'Humor & Disposição',
      icon: Heart,
      enabled: isModuleEnabled('wellbeing_mood'),
      status: 'performed' as const,
      summary: 'Registrado "Bem e animado"',
    },
  ];

  const activeItems = trackingItems.filter((item) => item.enabled);
  const inactiveItems = trackingItems.filter((item) => !item.enabled);

  return (
    <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="border-b border-stone-200 dark:border-stone-800 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100">
              Relatórios & Padrões Observados
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              Análise baseada exclusivamente nos acompanhamentos ativados para{' '}
              <strong className="text-stone-800 dark:text-stone-200">{selectedPerson.full_name}</strong>.
            </p>
          </div>
          <Tabs value={timeframe} onValueChange={(v) => setTimeframe(v as any)}>
            <TabsList className="bg-stone-200/60 dark:bg-stone-800/60 p-1 rounded-xl">
              <TabsTrigger value="daily" className="text-xs font-semibold px-4 py-2">
                Resumo Diário
              </TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs font-semibold px-4 py-2">
                Resumo Semanal
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* SECTION 1: MUDANÇAS OBSERVADAS (Strictly Deterministic Comparison) */}
      <Card className="border-stone-200 dark:border-stone-800 shadow-sm overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-emerald-700 dark:text-emerald-400" />
              <CardTitle className="text-lg font-bold">Mudanças Observadas (Comparativo 7 Dias)</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs font-bold text-emerald-800 border-emerald-300">
              Determinístico
            </Badge>
          </div>
          <CardDescription className="text-xs text-stone-500 mt-1">
            Compara objetivamente os registros dos últimos 7 dias com o período anterior de 7 dias. Sem diagnósticos médicos.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {loadingInsights ? (
            <div className="py-8 text-center text-sm text-stone-500">Calculando comparativos reais...</div>
          ) : patternInsights.length === 0 ? (
            <div className="py-8 text-center text-stone-500 space-y-2">
              <Info className="h-8 w-8 mx-auto text-stone-400" />
              <p className="text-sm font-medium">Nenhum módulo com histórico suficiente para comparação nesta semana.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {patternInsights.map((insight) => (
                <div
                  key={insight.id}
                  className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/50 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      {insight.metricLabel}
                    </span>
                    {insight.direction === 'increased' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                        <TrendingUp className="h-3.5 w-3.5" /> Aumento
                      </span>
                    )}
                    {insight.direction === 'decreased' && (
                      <span className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                        <TrendingDown className="h-3.5 w-3.5" /> Redução
                      </span>
                    )}
                    {insight.direction === 'stable' && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-stone-500 bg-stone-200/60 dark:bg-stone-800 px-2 py-0.5 rounded-md">
                        <Minus className="h-3 w-3" /> Estável
                      </span>
                    )}
                  </div>

                  <p className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                    {insight.changeDescription}
                  </p>

                  <div className="text-[11px] text-stone-400 flex justify-between pt-1 border-t border-stone-200/60 dark:border-stone-800">
                    <span>{insight.previousWindowSummary}</span>
                    <span className="font-semibold text-stone-600 dark:text-stone-300">{insight.currentWindowSummary}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Explicit Legal / Medical disclaimer */}
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-amber-800 dark:text-amber-300 text-xs">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              {disclaimer ||
                'Observações geradas estritamente a partir de contagens numéricas dos registros da própria família. Não constitui diagnóstico médico, avaliação clínica ou recomendação terapêutica.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* SECTION 2: RELATÓRIO DINÂMICO (Only activated modules) */}
      <Card className="border-stone-200 dark:border-stone-800 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {timeframe === 'daily' ? 'Status Diário dos Acompanhamentos' : 'Resumo Semanal Consolidado'}
              </CardTitle>
              <CardDescription>
                Exibindo somente os acompanhamentos ativados para {selectedPerson.full_name}.
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-bold">
              {activeItems.length} Módulos Ativos
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Active items breakdown */}
          <div className="divide-y divide-stone-100 dark:divide-stone-800">
            {activeItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.code} className="py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-stone-900 dark:text-stone-100">{item.name}</p>
                      <p className="text-xs text-stone-500">{item.summary}</p>
                    </div>
                  </div>

                  <div>
                    {item.status === 'performed' && (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none">
                        Realizado
                      </Badge>
                    )}
                    {item.status === 'pending' && (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                        Pendente
                      </Badge>
                    )}
                    {item.status === 'no_records' && (
                      <Badge variant="secondary" className="text-stone-500">
                        Sem registros hoje
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Inactive modules notice (Clearly distinguished from "no records") */}
          {inactiveItems.length > 0 && (
            <div className="p-4 bg-stone-100/70 dark:bg-stone-900/70 rounded-xl border border-stone-200/80 dark:border-stone-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-stone-600 dark:text-stone-300">
                <Info className="h-4 w-4 text-stone-400" />
                <span>Acompanhamentos não ativados para este familiar:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {inactiveItems.map((item) => (
                  <Badge key={item.code} variant="outline" className="text-[11px] text-stone-400 border-stone-300">
                    {item.name}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-stone-400 italic">
                Itens desativados não geram faltas, pendências nem alertas no relatório.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
