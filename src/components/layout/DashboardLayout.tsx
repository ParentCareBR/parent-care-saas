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
  AlertTriangle
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

  const navigation = [
    { name: 'Visão Geral', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Medicamentos', href: '/dashboard/medications', icon: Pill },
    { name: 'Alimentação', href: '/dashboard/meals', icon: Utensils },
    { name: 'Agenda', href: '/dashboard/appointments', icon: Calendar },
    { name: 'Tarefas', href: '/dashboard/tasks', icon: CheckSquare },
    { name: 'Despesas', href: '/dashboard/expenses', icon: Receipt },
    { name: 'Histórico', href: '/dashboard/history', icon: FileText },
  ];

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-stone-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-stone-200">
          <h1 className="text-xl font-bold text-brand-green mb-4">Parent Care</h1>
          <div className="flex flex-col gap-2">
            <span className="text-xs text-stone-500 uppercase tracking-wider font-semibold">Cuidando de</span>
            <CaredPersonSelector />
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                  isActive 
                    ? "bg-brand-soft text-brand-green" 
                    : "text-stone-600 hover:bg-stone-100 hover:text-stone-900"
                )}
              >
                <Icon className="h-5 w-5" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 space-y-1">
          <Link
            href="/dashboard/family"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <Users className="h-5 w-5" />
            Família
          </Link>
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-stone-600 hover:bg-stone-100 transition-colors"
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-stone-200">
          <h1 className="text-lg font-bold text-brand-green">Parent Care</h1>
          <CaredPersonSelector />
        </header>

        {/* Global Emergency Button for this person */}
        {selectedPerson && (
          <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center justify-between">
            <span className="text-sm text-red-800 font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Botão de Emergência Rápido
            </span>
            <Button variant="destructive" size="sm" onClick={() => window.location.href = '/dashboard/emergency'}>
              Emergência
            </Button>
          </div>
        )}

        {/* Global Subscription Alert */}
        {/* We would fetch subscription status via context in a real app, here checking if user needs to pay */}
        <div id="subscription-alert" className="hidden bg-orange-50 border-b border-orange-200 px-6 py-3 items-center justify-between">
           <span className="text-sm text-orange-800 font-medium">Sua assinatura está com pagamento pendente. Atualize seu cartão.</span>
           <Button variant="outline" size="sm" asChild className="border-orange-300 text-orange-800 hover:bg-orange-100">
             <Link href="/dashboard/settings/subscription">Resolver</Link>
           </Button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
