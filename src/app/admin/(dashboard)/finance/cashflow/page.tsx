'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CashflowPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    const fetchCashflow = async () => {
      const months = Array.from({ length: 6 }, (_, i) => subMonths(new Date(), 5 - i));
      const result = await Promise.all(months.map(async (month) => {
        const start = startOfMonth(month).toISOString();
        const end = endOfMonth(month).toISOString();
        const [{ data: rev }, { data: exp }] = await Promise.all([
          supabase.from('erp_revenue').select('amount,type').gte('created_at', start).lte('created_at', end),
          supabase.from('erp_expenses').select('amount').gte('created_at', start).lte('created_at', end),
        ]);
        const receita = (rev || []).filter((r: any) => r.type !== 'refund').reduce((a: number, r: any) => a + Number(r.amount), 0);
        const despesa = (exp || []).reduce((a: number, e: any) => a + Number(e.amount), 0);
        return { mes: format(month, 'MMM/yy', { locale: ptBR }), Receita: receita, Despesa: despesa, Resultado: receita - despesa };
      }));
      setData(result);
      setLoading(false);
    };
    fetchCashflow();
  }, []);

  const hasData = data.some(d => d.Receita > 0 || d.Despesa > 0);

  const totals = data.reduce((acc, d) => ({
    receita: acc.receita + d.Receita,
    despesa: acc.despesa + d.Despesa,
    resultado: acc.resultado + d.Resultado,
  }), { receita: 0, despesa: 0, resultado: 0 });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Fluxo de Caixa — Últimos 6 meses</h1>
      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Total Receita (6m)</p>
              <p className="text-2xl font-bold text-green-600 mt-1">R$ {totals.receita.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Total Despesa (6m)</p>
              <p className="text-2xl font-bold text-red-600 mt-1">R$ {totals.despesa.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <p className="text-xs text-gray-500">Resultado (6m)</p>
              <p className={`text-2xl font-bold mt-1 ${totals.resultado >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>R$ {totals.resultado.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {!hasData ? (
              <div className="text-center py-16">
                <p className="text-gray-500 font-medium">Nenhum dado financeiro disponível ainda.</p>
                <p className="text-gray-400 text-sm mt-1">Registre receitas e despesas para ver o fluxo de caixa.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={360}>
                <AreaChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Area type="monotone" dataKey="Receita" stroke="#10b981" fill="#d1fae5" strokeWidth={2} />
                  <Area type="monotone" dataKey="Despesa" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
                  <Area type="monotone" dataKey="Resultado" stroke="#6366f1" fill="#e0e7ff" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
