'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Users, DollarSign, BarChart3,
  HeadphonesIcon, Settings, LogOut, Heart,
  GitBranch, Receipt, TrendingUp, MessageSquare, Tag, FileText,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { cn } from '@/lib/utils';

const navGroups = [
  {
    label: null,
    items: [
      { name: 'Dashboard', href: '/admin/analytics', icon: LayoutDashboard },
    ],
  },
  {
    label: 'CRM',
    items: [
      { name: 'Clientes & Leads', href: '/admin/crm', icon: Users },
      { name: 'Funil', href: '/admin/crm/funnel', icon: GitBranch },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { name: 'Visão Geral', href: '/admin/finance', icon: TrendingUp },
      { name: 'Receitas', href: '/admin/finance/revenue', icon: DollarSign },
      { name: 'Despesas', href: '/admin/finance/expenses', icon: Receipt },
      { name: 'Fluxo de Caixa', href: '/admin/finance/cashflow', icon: BarChart3 },
    ],
  },
  {
    label: 'Suporte',
    items: [
      { name: 'Tickets', href: '/admin/support', icon: HeadphonesIcon },
    ],
  },
  {
    label: 'Configurações',
    items: [
      { name: 'Planos & Preços', href: '/admin/settings/plans', icon: Tag },
      { name: 'Cupons', href: '/admin/settings/coupons', icon: FileText },
      { name: 'Conteúdo', href: '/admin/settings/content', icon: MessageSquare },
    ],
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  return (
    <div className="flex flex-col h-full w-60 bg-[#060d1a] border-r border-[#1a2744] text-white flex-shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-[#1a2744]">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
          <Heart className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-sm font-bold text-white leading-none">Parent Care</p>
          <p className="text-[10px] text-emerald-400 font-medium mt-0.5">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {navGroups.map((group, gi) => (
          <div key={gi} className={gi > 0 ? 'pt-4' : ''}>
            {group.label && (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/admin/analytics' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      isActive ? 'text-emerald-400' : 'text-slate-500'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer logout */}
      <div className="px-3 pb-4 border-t border-[#1a2744] pt-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}
