'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { startOfMonth } from 'date-fns';

export default function FinancePage() {
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, refunds: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    const fetchStats = async () => {
      const startOfMonth_ = startOfMonth(new Date()).toISOString();
      const [{ data: rev }, { data: exp }] = await Promise.all([
        supabase.from('erp_revenue').select('amount, type').gte('created_at', startOfMonth_),
        supabase.from('erp_expenses').select('amount').gte('created_at', startOfMonth_),
      ]);
      const revenue = (rev || []).filter((r: any) => r.type !== 'refund').reduce((a: number, r: any) => a + Number(r.amount), 0);
      const refunds = (rev || []).filter((r: any) => r.type === 'refund').reduce((a: number, r: any) => a + Number(r.amount), 0);
      const expenses = (exp || []).reduce((a: number, e: any) => a + Number(e.amount), 0);
      setStats({ revenue, refunds, expenses, net: revenue - refunds - expenses });
      setLoading(false);
    };
    fetchStats();
  }, []);

  const cards = [
    { label: 'Receita (mês)', value: stats.revenue, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Despesas (mês)', value: stats.expenses, icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Reembolsos (mês)', value: stats.refunds, icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Resultado líquido', value: stats.net, icon: DollarSign, color: stats.net >= 0 ? 'text-emerald-600' : 'text-red-600', bg: stats.net >= 0 ? 'bg-emerald-50' : 'bg-red-50' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-1">ERP Financeiro</h1>
      <p className="text-gray-400 text-sm mb-6">Finanças do negócio Parent Care — separado das despesas pessoais das famílias.</p>
      {loading ? <div className="text-center py-12 text-gray-400">Carregando...</div> : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className={`inline-flex p-2 rounded-lg ${c.bg} mb-3`}>
                  <c.icon className={`h-5 w-5 ${c.color}`} />
                </div>
                <p className="text-xs text-gray-500">{c.label}</p>
                <p className={`text-2xl font-bold mt-1 ${c.color}`}>R$ {c.value.toFixed(2)}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { href: '/admin/finance/revenue', title: 'Receitas & Assinaturas', desc: 'Entradas, reembolsos e taxas de gateway' },
              { href: '/admin/finance/expenses', title: 'Despesas & Fornecedores', desc: 'Custos operacionais e contas a pagar' },
              { href: '/admin/finance/cashflow', title: 'Fluxo de Caixa', desc: 'Entradas e saídas por período (últimos 6 meses)' },
              { href: '/admin/finance/revenue', title: 'Conciliação por Gateway', desc: 'Paddle Billing, moedas e conciliação' },
            ].map(item => (
              <Link key={item.href + item.title} href={item.href}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:border-emerald-300 hover:shadow-sm transition-all">
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
