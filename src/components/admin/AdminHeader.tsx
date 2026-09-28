'use client';

import { usePathname } from 'next/navigation';
import { RefreshCw, Shield, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';

const PAGE_TITLES: Record<string, string> = {
  '/admin/analytics': 'Dashboard Geral',
  '/admin/crm': 'CRM — Clientes & Leads',
  '/admin/crm/funnel': 'Funil de Conversão',
  '/admin/finance': 'Financeiro',
  '/admin/finance/revenue': 'Receitas',
  '/admin/finance/expenses': 'Despesas',
  '/admin/finance/cashflow': 'Fluxo de Caixa',
  '/admin/support': 'Suporte — Tickets',
  '/admin/settings/plans': 'Planos & Preços',
  '/admin/settings/coupons': 'Cupons',
  '/admin/settings/content': 'Conteúdo',
};

export default function AdminHeader({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const [time, setTime] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Find longest matching path prefix
  const title =
    Object.entries(PAGE_TITLES)
      .filter(([k]) => pathname.startsWith(k))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] || 'Admin';

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    window.location.reload();
  };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-[#1a2744] bg-[#060d1a] flex-shrink-0">
      <div>
        <h1 className="text-base font-bold text-white">{title}</h1>
        <p className="text-xs text-slate-500 mt-0.5">Visão consolidada da operação</p>
      </div>

      <div className="flex items-center gap-3">
        {time && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {time}
          </div>
        )}

        <button
          onClick={handleRefresh}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a2744] bg-white/5 text-xs text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Atualizar
        </button>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1a2744] bg-white/5">
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-xs text-slate-300 font-medium">{adminName}</span>
        </div>
      </div>
    </header>
  );
}
