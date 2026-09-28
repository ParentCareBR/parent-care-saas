'use client';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { TrendingUp, TrendingDown, DollarSign, CreditCard, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { startOfMonth } from 'date-fns';

export default function FinancePage() {
  const [stats, setStats] = useState({ revenue: 0, expenses: 0, refunds: 0, net: 0 });
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

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
    { label: 'Receita (mês)', value: stats.revenue, icon: TrendingUp, color: 'text-emerald-400', borderColor: 'border-emerald-500/20', bg: 'bg-emerald-500/10' },
    { label: 'Despesas (mês)', value: stats.expenses, icon: TrendingDown, color: 'text-rose-400', borderColor: 'border-rose-500/20', bg: 'bg-rose-500/10' },
    { label: 'Reembolsos', value: stats.refunds, icon: CreditCard, color: 'text-amber-400', borderColor: 'border-amber-500/20', bg: 'bg-amber-500/10' },
    { label: 'Resultado líquido', value: stats.net, icon: DollarSign, color: stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400', borderColor: stats.net >= 0 ? 'border-emerald-500/20' : 'border-rose-500/20', bg: stats.net >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10' },
  ];

  const subPages = [
    { href: '/admin/finance/revenue', title: 'Receitas & Assinaturas', desc: 'Entradas, reembolsos e taxas de gateway', color: 'text-emerald-400' },
    { href: '/admin/finance/expenses', title: 'Despesas & Fornecedores', desc: 'Custos operacionais e contas a pagar', color: 'text-rose-400' },
    { href: '/admin/finance/cashflow', title: 'Fluxo de Caixa', desc: 'Entradas e saídas por período', color: 'text-blue-400' },
    { href: '/admin/finance/revenue', title: 'Conciliação por Gateway', desc: 'Paddle Billing e conciliação de moedas', color: 'text-purple-400' },
  ];

  return (
    <div className="space-y-5">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <RefreshCw className="h-6 w-6 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4">
            {cards.map(c => (
              <div key={c.label} className={`bg-[#0d1829] border ${c.borderColor} rounded-2xl p-5`}>
                <div className={`inline-flex p-2 rounded-xl ${c.bg} mb-3`}>
                  <c.icon className={`h-4 w-4 ${c.color}`} />
                </div>
                <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{c.label}</p>
                <p className={`text-2xl font-black mt-1 ${c.color}`}>R$ {c.value.toFixed(2)}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {subPages.map(item => (
              <Link
                key={item.href + item.title}
                href={item.href}
                className="bg-[#0d1829] border border-[#1a2744] rounded-2xl p-5 hover:bg-white/[0.03] hover:border-[#1e3048] transition-all group"
              >
                <h3 className={`font-bold text-sm ${item.color} group-hover:brightness-125 transition-all`}>
                  {item.title}
                </h3>
                <p className="text-slate-500 text-xs mt-1.5">{item.desc}</p>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
