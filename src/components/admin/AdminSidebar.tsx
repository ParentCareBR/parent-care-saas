'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Users, DollarSign, BarChart3,
  HeadphonesIcon, Settings, LogOut, ShieldAlert,
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

const navigation = [
  { name: 'Dashboard', href: '/admin/analytics', icon: LayoutDashboard },
  {
    name: 'CRM', icon: Users, children: [
      { name: 'Clientes & Leads', href: '/admin/crm' },
      { name: 'Funil', href: '/admin/crm/funnel' },
    ]
  },
  {
    name: 'Financeiro', icon: DollarSign, children: [
      { name: 'Visão Geral', href: '/admin/finance' },
      { name: 'Receitas', href: '/admin/finance/revenue' },
      { name: 'Despesas', href: '/admin/finance/expenses' },
      { name: 'Fluxo de Caixa', href: '/admin/finance/cashflow' },
    ]
  },
  { name: 'Analytics / BI', href: '/admin/analytics', icon: BarChart3 },
  {
    name: 'Suporte', icon: HeadphonesIcon, children: [
      { name: 'Tickets', href: '/admin/support' },
    ]
  },
  {
    name: 'Configurações', icon: Settings, children: [
      { name: 'Planos & Preços', href: '/admin/settings/plans' },
      { name: 'Cupons', href: '/admin/settings/coupons' },
      { name: 'Conteúdo', href: '/admin/settings/content' },
    ]
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
    <div className="flex flex-col h-full w-64 bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-2 px-6 py-5 border-b border-gray-800">
        <ShieldAlert className="h-6 w-6 text-emerald-400" />
        <div>
          <p className="text-sm font-bold text-white">Parent Care</p>
          <p className="text-xs text-gray-400">Admin Panel</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-1">
        {navigation.map((item) => {
          if (item.children) {
            return (
              <div key={item.name} className="mb-2">
                <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </div>
                <div className="ml-4 space-y-1">
                  {item.children.map((child) => {
                    const active = pathname === child.href;
                    return (
                      <Link
                        key={child.href}
                        href={child.href}
                        className={`block px-3 py-2 rounded-md text-sm transition-colors ${
                          active
                            ? 'bg-emerald-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href!}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-emerald-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}
