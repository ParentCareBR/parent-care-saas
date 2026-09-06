'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaredPersonSelector } from '@/components/shared/CaredPersonSelector';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
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
  UserPlus,
  Menu,
  X,
  ChevronRight
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
    <div className="flex h-screen bg-stone-50 dark:bg-stone-950 overflow-hidden text-stone-900 dark:text-stone-100">
      
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR                                          */}
      {/* ======================================================== */}
      <aside className="w-64 bg-white dark:bg-stone-900 border-r border-stone-200 dark:border-stone-800 flex flex-col hidden md:flex transition-colors">
        <div className="p-6 border-b border-stone-200 dark:border-stone-800 space-y-4">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/dashboard`} className="block">
              <h1 className="text-xl font-bold text-brand-green">Parent Care</h1>
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 dark:text-stone-400 uppercase tracking-wider font-semibold">Cuidando de</span>
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
                    ? "bg-brand-soft dark:bg-emerald-950/40 text-brand-green dark:text-emerald-400 font-semibold shadow-xs" 
                    : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-brand-green dark:text-emerald-400" : "text-stone-400 dark:text-stone-500")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-stone-200 dark:border-stone-800 space-y-1">
          <Link
            href={`/${locale}/dashboard/family`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              pathname.includes('/dashboard/family')
                ? "bg-brand-soft dark:bg-emerald-950/40 text-brand-green dark:text-emerald-400 font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
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
                ? "bg-brand-soft dark:bg-emerald-950/40 text-brand-green dark:text-emerald-400 font-semibold"
                : "text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            )}
          >
            <Settings className="h-5 w-5" />
            Configurações
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Sair
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MOBILE SLIDE-OVER DRAWER MENU                            */}
      {/* ======================================================== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white dark:bg-stone-900 h-full flex flex-col z-10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-stone-800">
              <h2 className="text-xl font-bold text-brand-green">Parent Care</h2>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Cared Person Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">Cuidando de</span>
                <Link 
                  href={`/${locale}/dashboard/cared-people/new`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-brand-green font-semibold hover:underline"
                >
                  + Cadastrar
                </Link>
              </div>
              <CaredPersonSelector />
            </div>

            {/* Nav Links */}
            <nav className="flex-1 space-y-1 overflow-y-auto pt-2">
              {navigation.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-brand-soft dark:bg-emerald-950/50 text-brand-green dark:text-emerald-400 font-semibold" 
                        : "text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}

              <div className="pt-3 border-t border-stone-200 dark:border-stone-800 space-y-1">
                <Link
                  href={`/${locale}/dashboard/family`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <Users className="h-5 w-5" />
                  Família
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800"
                >
                  <Settings className="h-5 w-5" />
                  Configurações
                </Link>
              </div>
            </nav>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-stone-200 dark:border-stone-800 flex items-center justify-between">
              <ThemeToggle />
              <button
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="flex items-center gap-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:underline"
              >
                <LogOut className="h-4 w-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN VIEWPORT AREA                                       */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header Bar */}
        <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs transition-colors">
          
          {/* Left: Mobile Hamburger + Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 focus:outline-none"
              aria-label="Abrir Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5 md:hidden">
              <span className="font-bold text-brand-green text-lg tracking-tight">Parent Care</span>
            </Link>

            {/* Desktop Breadcrumb */}
            <div className="hidden md:flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
              <span>Painel Familiar</span>
              {selectedPerson && (
                <>
                  <span>/</span>
                  <span className="font-semibold text-stone-800 dark:text-stone-200">{selectedPerson.full_name}</span>
                </>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle className="hidden sm:inline-flex" />

            {/* Desktop Cared Person button */}
            <Button 
              asChild 
              size="sm" 
              variant="outline" 
              className="hidden sm:inline-flex border-emerald-600 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl text-xs"
            >
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-4 w-4 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                Cadastrar Pessoa
              </Link>
            </Button>

            {/* Selector on mobile if space allows */}
            <div className="md:hidden max-w-[140px] xs:max-w-[170px]">
              <CaredPersonSelector />
            </div>

            {/* Global Emergency SOS button */}
            {selectedPerson && (
              <Button 
                variant="destructive" 
                size="sm" 
                className="rounded-xl shadow-xs text-xs font-bold px-2.5 sm:px-3 h-8 sm:h-9"
                asChild
              >
                <Link href={`/${locale}/dashboard/emergency`}>
                  <AlertTriangle className="h-3.5 w-3.5 sm:mr-1.5" />
                  <span className="hidden sm:inline">Emergência</span>
                  <span className="sm:hidden">SOS</span>
                </Link>
              </Button>
            )}
          </div>
        </header>

        {/* Global Compact Emergency Ribbon (Fully Responsive) */}
        {selectedPerson && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/50 px-4 py-1.5 flex items-center justify-between text-xs text-rose-800 dark:text-rose-300">
            <span className="flex items-center gap-1.5 font-medium truncate">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span className="truncate">Linha de Emergência de {selectedPerson.full_name}</span>
            </span>
            <Link 
              href={`/${locale}/dashboard/emergency`}
              className="font-bold underline text-rose-700 dark:text-rose-400 hover:text-rose-900 flex-shrink-0 ml-2"
            >
              Contatos Rápidos →
            </Link>
          </div>
        )}

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 pb-24 md:pb-8">
          {children}
        </div>

        {/* ======================================================== */}
        {/* MOBILE BOTTOM NAVIGATION BAR (Native App Feel)           */}
        {/* ======================================================== */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800 px-2 py-1.5 flex items-center justify-around z-40 shadow-lg">
          <Link
            href={`/${locale}/dashboard`}
            className={cn(
              "flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors",
              pathname === `/${locale}/dashboard` 
                ? "text-brand-green dark:text-emerald-400 font-bold" 
                : "text-stone-500 dark:text-stone-400"
            )}
          >
            <LayoutDashboard className="h-5 w-5 mb-0.5" />
            Início
          </Link>

          <Link
            href={`/${locale}/dashboard/medications`}
            className={cn(
              "flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors",
              pathname.includes('/medications') 
                ? "text-brand-green dark:text-emerald-400 font-bold" 
                : "text-stone-500 dark:text-stone-400"
            )}
          >
            <Pill className="h-5 w-5 mb-0.5" />
            Remédios
          </Link>

          <Link
            href={`/${locale}/dashboard/meals`}
            className={cn(
              "flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors",
              pathname.includes('/meals') 
                ? "text-brand-green dark:text-emerald-400 font-bold" 
                : "text-stone-500 dark:text-stone-400"
            )}
          >
            <Utensils className="h-5 w-5 mb-0.5" />
            Alimentação
          </Link>

          <Link
            href={`/${locale}/dashboard/appointments`}
            className={cn(
              "flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium transition-colors",
              pathname.includes('/appointments') 
                ? "text-brand-green dark:text-emerald-400 font-bold" 
                : "text-stone-500 dark:text-stone-400"
            )}
          >
            <Calendar className="h-5 w-5 mb-0.5" />
            Agenda
          </Link>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center py-1 px-2 rounded-lg text-[10px] font-medium text-stone-500 dark:text-stone-400"
          >
            <Menu className="h-5 w-5 mb-0.5" />
            Menu
          </button>
        </nav>

      </main>
    </div>
  );
}
