'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  DollarSign, Users, TrendingUp, TrendingDown,
  UserCheck, Heart, RefreshCw, ArrowUpRight,
  ArrowDownRight, CheckCircle2,
} from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CHART_COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ef4444', '#8b5cf6'];

const DarkTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0e1a2e] border border-[#1e3048] rounded-xl p-3 shadow-xl text-xs">
        <p className="text-slate-400 mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="font-semibold">
            {p.name}: {typeof p.value === 'number' ? `R$ ${Number(p.value).toFixed(2)}` : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

function SparkCard({
  label, value, sub, color, icon: Icon, sparkData,
}: {
  label: string; value: string | number; sub?: string;
  color: string; icon: any; sparkData?: number[];
}) {
  const data = (sparkData || [0, 0]).map((v) => ({ v }));
  return (
    <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5 overflow-hidden">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-black text-white mt-1 leading-none">{value}</p>
          {sub && <p className="text-[11px] text-slate-500 mt-1.5">{sub}</p>}
        </div>
        <div className="p-2 rounded-xl flex-shrink-0" style={{ background: `${color}22` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
      </div>
      {data.length > 1 && (
        <ResponsiveContainer width="100%" height={48}>
          <LineChart data={data}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-[#0d1829] border border-[#1a2744] rounded-xl p-4">
      <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-black ${color || 'text-white'}`}>{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState('');
  const [metrics, setMetrics] = useState({
    mrr: 0, arr: 0, activeClients: 0, activeUsers: 0,
    caredPeople: 0, churn: 0, trialConversion: 0, avgTicket: 0,
    trials: 0, canceled: 0,
  });
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [funnelData, setFunnelData] = useState<any[]>([]);
  const [planData, setPlanData] = useState<any[]>([]);
  const [recentClients, setRecentClients] = useState<any[]>([]);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchAll = async () => {
    setLoading(true);
    const now = new Date();
    setLastUpdate(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
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
      return { mes: format(month, 'MMM', { locale: ptBR }), Receita: receita, Reembolso: reembolso };
    }));
    setRevenueByMonth(revByMonth);

    // MRR
    const { data: mrrData } = await supabase.from('erp_revenue')
      .select('amount').eq('type', 'subscription').gte('created_at', startMonth);
    const mrr = (mrrData || []).reduce((a: number, r: any) => a + Number(r.amount), 0);

    // Counts
    const [{ count: activeClients }, { count: activeUsers }, { count: caredPeople },
           { count: trials }, { count: canceled }] = await Promise.all([
      supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('cared_people').select('*', { count: 'exact', head: true }),
      supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'trial'),
      supabase.from('organizations').select('*', { count: 'exact', head: true }).eq('subscription_status', 'canceled'),
    ]);

    // Funnel
    const { data: leads } = await supabase.from('crm_leads').select('funnel_stage');
    const stageCounts: Record<string, number> = {};
    (leads || []).forEach((l: any) => { stageCounts[l.funnel_stage] = (stageCounts[l.funnel_stage] || 0) + 1; });
    setFunnelData([
      { name: 'Visitante', value: stageCounts['visitor'] || 0, color: '#64748b' },
      { name: 'Lead', value: stageCounts['lead'] || 0, color: '#3b82f6' },
      { name: 'Trial', value: stageCounts['trial'] || 0, color: '#8b5cf6' },
      { name: 'Assinante', value: stageCounts['subscriber'] || 0, color: '#10b981' },
      { name: 'Cancelado', value: stageCounts['canceled'] || 0, color: '#ef4444' },
    ]);

    // Plans
    const { data: orgs } = await supabase.from('organizations').select('plan_id, plans(name)');
    const planCounts: Record<string, number> = {};
    (orgs || []).forEach((o: any) => {
      const name = (o as any).plans?.name || 'Sem plano';
      planCounts[name] = (planCounts[name] || 0) + 1;
    });
    setPlanData(Object.entries(planCounts).map(([name, value]) => ({ name, value })));

    // Recent orgs
    const { data: recentOrgs } = await supabase
      .from('organizations')
      .select('id, name, created_at, subscription_status')
      .order('created_at', { ascending: false })
      .limit(6);
    setRecentClients(recentOrgs || []);

    const totalOrgs = (activeClients || 0) + (canceled || 0) + (trials || 0);
    const churnRate = totalOrgs > 0 ? ((canceled || 0) / totalOrgs * 100) : 0;
    const trialConv = ((trials || 0) + (activeClients || 0)) > 0
      ? ((activeClients || 0) / ((activeClients || 0) + (trials || 0)) * 100) : 0;

    setMetrics({
      mrr, arr: mrr * 12,
      activeClients: activeClients || 0,
      activeUsers: activeUsers || 0,
      caredPeople: caredPeople || 0,
      churn: Math.round(churnRate * 10) / 10,
      trialConversion: Math.round(trialConv * 10) / 10,
      avgTicket: (activeClients || 0) > 0 ? Math.round(mrr / (activeClients || 1)) : 0,
      trials: trials || 0,
      canceled: canceled || 0,
    });
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const mrrSpark = revenueByMonth.map(d => d.Receita);

  const statusStyles: Record<string, string> = {
    active: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
    trial: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
    canceled: 'bg-rose-500/15 text-rose-400 border-rose-500/25',
    past_due: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  };
  const statusLabels: Record<string, string> = {
    active: 'Ativo', trial: 'Trial', canceled: 'Cancelado', past_due: 'Inadimplente',
  };

  return (
    <div className="space-y-5">
      {!loading && lastUpdate && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          Atualizado às {lastUpdate}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="h-7 w-7 text-emerald-500 animate-spin" />
            <p className="text-slate-400 text-sm">Carregando métricas...</p>
          </div>
        </div>
      ) : (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-4 gap-4">
            <SparkCard label="MRR" value={`R$ ${metrics.mrr.toFixed(2)}`} sub="Receita mensal recorrente"
              color="#10b981" icon={DollarSign} sparkData={mrrSpark} />
            <SparkCard label="ARR" value={`R$ ${metrics.arr.toFixed(2)}`} sub="Projeção anual"
              color="#6366f1" icon={TrendingUp} sparkData={mrrSpark.map(v => v * 12)} />
            <SparkCard label="Clientes Ativos" value={metrics.activeClients} sub="Assinaturas pagas"
              color="#f59e0b" icon={UserCheck} sparkData={[metrics.activeClients]} />
            <SparkCard label="Churn Rate" value={`${metrics.churn}%`} sub="Taxa de cancelamento"
              color={metrics.churn > 5 ? '#ef4444' : '#10b981'} icon={TrendingDown}
              sparkData={[metrics.churn]} />
          </div>

          {/* Secondary metrics */}
          <div className="grid grid-cols-4 gap-4">
            <MiniStat label="Total Usuários" value={metrics.activeUsers} color="text-white" />
            <MiniStat label="Trials Ativos" value={metrics.trials} color="text-purple-400" />
            <MiniStat label="Pessoas Cuidadas" value={metrics.caredPeople} color="text-pink-400" />
            <MiniStat label="Ticket Médio" value={`R$ ${metrics.avgTicket}`} color="text-amber-400" />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Area chart */}
            <div className="col-span-2 bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white">Receita — Últimos 6 meses</h2>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-4">Receita líquida vs Reembolsos</p>
              {revenueByMonth.every(d => d.Receita === 0) ? (
                <div className="h-48 flex items-center justify-center text-slate-500 text-sm">
                  Nenhuma receita registrada ainda.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={revenueByMonth}>
                    <defs>
                      <linearGradient id="gReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gReembolso" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a2744" />
                    <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<DarkTooltip />} />
                    <Area type="monotone" dataKey="Receita" stroke="#10b981" fill="url(#gReceita)" strokeWidth={2} />
                    <Area type="monotone" dataKey="Reembolso" stroke="#ef4444" fill="url(#gReembolso)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Plan distribution */}
            <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white">Distribuição por Plano</h2>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-3">Organizações por plano</p>
              {planData.length === 0 ? (
                <div className="h-44 flex items-center justify-center text-slate-500 text-sm">Sem dados</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={planData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
                        {planData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<DarkTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {planData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span className="text-slate-400">{d.name}</span>
                        </div>
                        <span className="text-white font-bold">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Funnel + Recent */}
          <div className="grid grid-cols-2 gap-4">
            {/* Funnel bars */}
            <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white">Funil de Conversão</h2>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-4">Leads por etapa</p>
              {funnelData.every(d => d.value === 0) ? (
                <div className="h-36 flex items-center justify-center text-slate-500 text-sm">Nenhum dado.</div>
              ) : (
                <div className="space-y-3">
                  {funnelData.map((stage) => {
                    const max = Math.max(...funnelData.map(d => d.value), 1);
                    const pct = (stage.value / max) * 100;
                    return (
                      <div key={stage.name}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-slate-400">{stage.name}</span>
                          <span className="font-bold" style={{ color: stage.color }}>{stage.value}</span>
                        </div>
                        <div className="h-2 bg-[#1a2744] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: stage.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent clients */}
            <div className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5">
              <h2 className="text-sm font-bold text-white">Clientes Recentes</h2>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-4">Últimos cadastros</p>
              {recentClients.length === 0 ? (
                <div className="h-36 flex items-center justify-center text-slate-500 text-sm">Nenhum cadastro.</div>
              ) : (
                <div className="space-y-3">
                  {recentClients.map((c: any) => (
                    <div key={c.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-xs font-bold flex-shrink-0">
                          {(c.name || 'F').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white leading-none">{c.name || 'Família'}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(c.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-bold ${statusStyles[c.subscription_status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                        {statusLabels[c.subscription_status] || c.subscription_status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
