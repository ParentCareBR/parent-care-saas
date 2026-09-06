'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell
} from 'recharts';
import { DollarSign, Users, TrendingUp, TrendingDown, Activity, UserCheck, Heart, AlertTriangle } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function MetricCard({ label, value, sub, icon: Icon, color }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className={`inline-flex p-2 rounded-lg ${color} mb-3`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

const PLAN_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444'];

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    mrr: 0, arr: 0, activeClients: 0, activeUsers: 0,
    caredPeople: 0, churn: 0, trialConversion: 0, avgTicket: 0
  });
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [planData, setPlanData] = useState<any[]>([]);
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const fetchAll = async () => {
      const now = new Date();
      const startMonth = startOfMonth(now).toISOString();

      // Revenue last 6 months
      const months = Array.from({ length: 6 }, (_, i) => subMonths(now, 5 - i));
      const revByMonth = await Promise.all(months.map(async (month) => {
        const start = startOfMonth(month).toISOString();
        const end = endOfMonth(month).toISOString();
        const { data } = await supabase.from('erp_revenue')
          .select('amount,type').gte('created_at', start).lte('created_at', end);
        const receita = (data || []).filter((r: any) => r.type !== 'refund').reduce((a: number, r: any) => a + Number(r.amount), 0);
        const reembolso = (data || []).filter((r: any) => r.type === 'refund').reduce((a: number, r: any) => a + Number(r.amount), 0);
        return { mes: format(month, 'MMM/yy', { locale: ptBR }), Receita: receita, Reembolso: reembolso };
      }));
      setRevenueByMonth(revByMonth);

      // Current month MRR from revenue
      const { data: mrrData } = await supabase.from('erp_revenue')
        .select('amount').eq('type', 'subscription').gte('created_at', startMonth);
      const mrr = (mrrData || []).reduce((a: number, r: any) => a + Number(r.amount), 0);

      // Active orgs / clients
      const { count: activeClients } = await supabase.from('organizations')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_status', 'active');

      // Active users
      const { count: activeUsers } = await supabase.from('users')
        .select('*', { count: 'exact', head: true });

      // Cared people
      const { count: caredPeople } = await supabase.from('cared_people')
        .select('*', { count: 'exact', head: true });

      // Funnel
      const { data: leads } = await supabase.from('crm_leads').select('funnel_stage');
      const stageCounts: Record<string, number> = {};
      (leads || []).forEach((l: any) => { stageCounts[l.funnel_stage] = (stageCounts[l.funnel_stage] || 0) + 1; });
      setFunnelData([
        { name: 'Visitante', value: stageCounts['visitor'] || 0 },
        { name: 'Lead', value: stageCounts['lead'] || 0 },
        { name: 'Teste', value: stageCounts['trial'] || 0 },
        { name: 'Assinante', value: stageCounts['subscriber'] || 0 },
        { name: 'Cancelado', value: stageCounts['canceled'] || 0 },
      ]);

      // Plans distribution
      const { data: orgs } = await supabase.from('organizations').select('plan_id, plans(name)');
      const planCounts: Record<string, number> = {};
      (orgs || []).forEach((o: any) => {
        const name = o.plans?.name || 'Sem plano';
        planCounts[name] = (planCounts[name] || 0) + 1;
      });
      setPlanData(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

      // Trials
      const { count: trials } = await supabase.from('organizations')
        .select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial');
      const { count: canceled } = await supabase.from('organizations')
        .select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled');
      const total = (activeClients || 0) + (canceled || 0) + (trials || 0);
      const churnRate = total > 0 ? ((canceled || 0) / total * 100) : 0;
      const trialConv = (trials || 0) > 0 && (activeClients || 0) > 0
        ? ((activeClients || 0) / ((activeClients || 0) + (trials || 0)) * 100) : 0;

      setMetrics({
        mrr, arr: mrr * 12,
        activeClients: activeClients || 0,
        activeUsers: activeUsers || 0,
        caredPeople: caredPeople || 0,
        churn: Math.round(churnRate * 10) / 10,
        trialConversion: Math.round(trialConv * 10) / 10,
        avgTicket: (activeClients || 0) > 0 ? Math.round(mrr / (activeClients || 1)) : 0,
      });
      setLoading(false);
    };
    fetchAll();
  }, []);

  const isEmpty = metrics.mrr === 0 && metrics.activeClients === 0;

  const metricCards = [
    { label: 'MRR', value: `R$ ${metrics.mrr.toFixed(2)}`, sub: 'Receita Mensal Recorrente', icon: DollarSign, color: 'bg-emerald-500' },
    { label: 'ARR', value: `R$ ${metrics.arr.toFixed(2)}`, sub: 'Receita Anual Recorrente', icon: TrendingUp, color: 'bg-blue-500' },
    { label: 'Clientes Ativos', value: metrics.activeClients, sub: 'Assinaturas ativas', icon: UserCheck, color: 'bg-purple-500' },
    { label: 'Usuários', value: metrics.activeUsers, sub: 'Total de usuários cadastrados', icon: Users, color: 'bg-indigo-500' },
    { label: 'Pessoas Cuidadas', value: metrics.caredPeople, sub: 'Perfis ativos no sistema', icon: Heart, color: 'bg-pink-500' },
    { label: 'Ticket Médio', value: `R$ ${metrics.avgTicket}`, sub: 'Por cliente/mês', icon: Activity, color: 'bg-amber-500' },
    { label: 'Churn Rate', value: `${metrics.churn}%`, sub: 'Taxa de cancelamento', icon: TrendingDown, color: 'bg-red-500' },
    { label: 'Conv. Trial→Pago', value: `${metrics.trialConversion}%`, sub: 'Trials que converteram', icon: AlertTriangle, color: 'bg-orange-500' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Business Intelligence</h1>
        <p className="text-gray-500 text-sm mt-1">Métricas em tempo real do Parent Care SaaS</p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Carregando métricas...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {metricCards.map(c => <MetricCard key={c.label} {...c} />)}
          </div>

          {isEmpty && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-amber-700 text-sm">
              ℹ️ Os dados aparecem aqui conforme os clientes se cadastram, assinam e usam o sistema.
            </div>
          )}

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* Revenue chart */}
            <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Receita — Últimos 6 meses</h2>
              {revenueByMonth.every(d => d.Receita === 0) ? (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Nenhuma receita registrada ainda.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={revenueByMonth}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(v) => `R$ ${Number(v).toFixed(2)}`} />
                    <Legend />
                    <Area type="monotone" dataKey="Receita" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                    <Area type="monotone" dataKey="Reembolso" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Plans pie */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Receita por Plano</h2>
              {planData.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Nenhum dado ainda.</div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}>
                      {planData.map((_, i) => <Cell key={i} fill={PLAN_COLORS[i % PLAN_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Funnel chart */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Funil de Conversão</h2>
            {funnelData.every(d => d.value === 0) ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Nenhum dado de funil disponível.</div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip />
                  <Bar dataKey="value" name="Clientes" fill="#10b981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
