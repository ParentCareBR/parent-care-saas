'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaredPersonSelector } from '@/components/shared/CaredPersonSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { 
  LayoutDashboard, 
  Pill, 
  Utensils, 
  Calendar, 
  CheckSquare, 
  FileText, 
  Receipt,
  Users, 
  Settings, 
  LogOut, 
  AlertTriangle,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { selectedPerson } = useCaredPerson();

  // Extract locale from current pathname
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] || 'pt-BR';

  const navigation = [
    { name: 'Visão Geral', href: `/${locale}/dashboard`, exact: true, icon: LayoutDashboard },
    { name: 'Medicamentos', href: `/${locale}/dashboard/medications`, icon: Pill },
    { name: 'Alimentação', href: `/${locale}/dashboard/meals`, icon: Utensils },
    { name: 'Agenda', href: `/${locale}/dashboard/appointments`, icon: Calendar },
    { name: 'Tarefas', href: `/${locale}/dashboard/tasks`, icon: CheckSquare },
    { name: 'Despesas', href: `/${locale}/dashboard/expenses`, icon: Receipt },
    { name: 'Histórico', href: `/${locale}/dashboard/history`, icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-stone-200 space-y-4">
          <Link href={`/${locale}/dashboard`} className="block">
            <h1 className="text-xl font-bold text-brand-green">Parent Care</h1>
          </Link>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Cuidando de</span>
              <Link 
                href={`/${locale}/dashboard/cared-people/new`}
                className="text-xs text-brand-green hover:underline flex items-center gap-1 font-medium"
                title="Cadastrar nova pessoa"
              >
                <UserPlus className="h-3.5 w-3.5" /> + Novo
              </Link>
            </div>
            <CaredPersonSelector />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = item.exact 
              ? pathname === item.href 
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-soft text-brand-green font-semibold shadow-sm" 
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-brand-green" : "text-stone-400")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-1">
          <Link
            href={`/${locale}/dashboard/family`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname.includes('/dashboard/family')
                ? "bg-brand-soft text-brand-green font-semibold"
                : "text-stone-600 hover:bg-stone-100"
            )}
          >
            <Users className="h-5 w-5" />
            Família
          </Link>
          <Link
            href={`/${locale}/dashboard/settings`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname.includes('/dashboard/settings')
                ? "bg-brand-soft text-brand-green font-semibold"
                : "text-stone-600 hover:bg-stone-100"
            )}
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-4">
            <div className="md:hidden flex items-center gap-2">
              <h1 className="text-lg font-bold text-brand-green">Parent Care</h1>
              <CaredPersonSelector />
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-stone-500">
              <span>Painel Familiar</span>
              {selectedPerson && (
                <>
                  <span>/</span>
                  <span className="font-semibold text-stone-800">{selectedPerson.full_name}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Botão de Cadastrar Pessoa fixo no topo */}
            <Button 
              asChild 
              size="sm" 
              variant="outline" 
              className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-xl"
            >
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-4 w-4 mr-2 text-emerald-600" />
                Cadastrar Pessoa
              </Link>
            </Button>

            {/* Global Emergency Button */}
            {selectedPerson && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="rounded-xl shadow-xs"
                asChild
              >
                <Link href={`/${locale}/dashboard/emergency`}>
                  <AlertTriangle className="h-4 w-4 mr-1.5" />
                  Emergência
                </Link>
              </Button>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
