'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const STAGES = [
  { key: 'visitor', label: 'Visitante', color: '#94a3b8' },
  { key: 'lead', label: 'Lead', color: '#60a5fa' },
  { key: 'signup_started', label: 'Cadastro', color: '#fbbf24' },
  { key: 'trial', label: 'Teste', color: '#a78bfa' },
  { key: 'subscriber', label: 'Assinante', color: '#34d399' },
  { key: 'past_due', label: 'Inadimplente', color: '#fb923c' },
  { key: 'canceled', label: 'Cancelado', color: '#f87171' },
  { key: 'reactivated', label: 'Reativado', color: '#6ee7b7' },
];

export default function FunnelPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    const fetchFunnel = async () => {
      const { data: leads } = await supabase.from('crm_leads').select('funnel_stage');
      const counts: Record<string, number> = {};
      (leads || []).forEach((l: any) => { counts[l.funnel_stage] = (counts[l.funnel_stage] || 0) + 1; });
      setData(STAGES.map(s => ({ ...s, count: counts[s.key] || 0 })));
      setLoading(false);
    };
    fetchFunnel();
  }, []);

  const isEmpty = data.every(d => d.count === 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Funil de Conversão</h1>
      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {isEmpty ? (
            <div className="text-center py-16">
              <p className="text-gray-500 font-medium">Nenhum dado de funil disponível ainda.</p>
              <p className="text-gray-400 text-sm mt-2">Os dados aparecem conforme os usuários interagem com o sistema.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" name="Clientes" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <div className="mt-6 grid grid-cols-4 gap-3">
            {data.map(s => (
              <div key={s.key} className="text-center p-3 rounded-lg border" style={{ borderColor: s.color + '40', backgroundColor: s.color + '15' }}>
                <p className="text-2xl font-bold" style={{ color: s.color }}>{s.count}</p>
                <p className="text-xs text-gray-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
