'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaredPersonSelector } from '@/components/shared/CaredPersonSelector';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
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
  ChevronRight,
  Sparkles,
  BarChart3,
  Sliders,
  Heart,
  ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const tNav = useTranslations('DashboardNav');
  const tHeader = useTranslations('DashboardHeader');

  // Extract locale from current pathname
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] || 'pt-BR';

  const navigation = [
    { name: tNav('overview'), href: `/${locale}/dashboard`, exact: true, icon: LayoutDashboard },
    { name: tNav('reports'), href: `/${locale}/dashboard/reports`, icon: BarChart3 },
    { name: tNav('medications'), href: `/${locale}/dashboard/medications`, icon: Pill },
    { name: tNav('meals'), href: `/${locale}/dashboard/meals`, icon: Utensils },
    { name: tNav('appointments'), href: `/${locale}/dashboard/appointments`, icon: Calendar },
    { name: tNav('tasks'), href: `/${locale}/dashboard/tasks`, icon: CheckSquare },
    { name: tNav('expenses'), href: `/${locale}/dashboard/expenses`, icon: Receipt },
    { name: tNav('history'), href: `/${locale}/dashboard/history`, icon: FileText },
    { name: tNav('plans'), href: `/${locale}/dashboard/settings/subscription`, icon: Sparkles },
  ];

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-stone-950 overflow-hidden text-stone-900 dark:text-stone-100">
      
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR WITH MODERN LED NAVIGATION               */}
      {/* ======================================================== */}
      <aside className="w-64 bg-[#0B1528] text-slate-100 border-r border-slate-800/80 flex flex-col hidden md:flex transition-colors shrink-0">
        <div className="p-5 border-b border-slate-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                <Heart className="h-4 w-4 fill-emerald-400" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-white tracking-tight">Parent Care</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green animate-led-pulse" title="Sistema Online" />
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          {/* Cared Person Selector Container */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-2.5 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{tHeader('caring_for')}</span>
              <Link 
                href={`/${locale}/dashboard/cared-people/new`}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1 font-semibold"
                title={tHeader('add_person')}
              >
                <UserPlus className="h-3 w-3" /> {tHeader('new_person')}
              </Link>
            </div>
            <CaredPersonSelector />
          </div>

          {/* Direct Senior View Shortcut */}
          {selectedPerson && (
            <Link
              href={`/${locale}/care/${selectedPerson.id}`}
              target="_blank"
              className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/30 text-emerald-300 hover:border-emerald-400/70 transition group shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green animate-led-pulse" />
                <div>
                  <p className="text-xs font-bold text-white leading-tight">Tela do Idoso</p>
                  <p className="text-[10px] text-emerald-400/80">Abrir Modo Sênior</p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-400 group-hover:translate-x-0.5 transition" />
            </Link>
          )}
        </div>

        {/* Navigation Menu with LED Active Indicators */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
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
                  "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all group",
                  isActive 
                    ? "bg-emerald-500/15 text-white font-bold border-l-4 border-emerald-400 shadow-[inset_0_0_12px_rgba(16,185,129,0.15)]" 
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-emerald-400" : "text-slate-400 group-hover:text-slate-200")} />
                  <span>{item.name}</span>
                </div>
                {/* LED Indicator */}
                {isActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green animate-led-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Actions */}
        <div className="p-3 border-t border-slate-800/80 space-y-1">
          <Link
            href={`/${locale}/dashboard/family`}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group",
              pathname.includes('/dashboard/family')
                ? "bg-emerald-500/15 text-white font-bold border-l-4 border-emerald-400"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4" />
              <span>{tNav('family')}</span>
            </div>
            {pathname.includes('/dashboard/family') && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-glow-green" />
            )}
          </Link>
          <Link
            href={`/${locale}/dashboard/settings/monitoring`}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group",
              pathname.includes('/dashboard/settings/monitoring')
                ? "bg-emerald-500/15 text-white font-bold border-l-4 border-emerald-400"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Sliders className="h-4 w-4" />
              <span>{tNav('monitoring')}</span>
            </div>
            {pathname.includes('/dashboard/settings/monitoring') && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-glow-green" />
            )}
          </Link>
          <Link
            href={`/${locale}/dashboard/settings`}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group",
              pathname === `/${locale}/dashboard/settings`
                ? "bg-emerald-500/15 text-white font-bold border-l-4 border-emerald-400"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              <span>{tNav('settings')}</span>
            </div>
            {pathname === `/${locale}/dashboard/settings` && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 led-glow-green" />
            )}
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{tNav('logout')}</span>
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
          <div className="relative w-4/5 max-w-xs bg-[#0B1528] text-slate-100 h-full flex flex-col z-10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-400 fill-emerald-400" />
                <h2 className="text-lg font-bold text-white">Parent Care</h2>
                <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green animate-led-pulse" />
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 text-white"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Cared Person Selector */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{tHeader('caring_for')}</span>
                <Link 
                  href={`/${locale}/dashboard/cared-people/new`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-emerald-400 font-semibold hover:underline"
                >
                  {tHeader('new_person')}
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
                      "flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      isActive 
                        ? "bg-emerald-500/20 text-white font-bold border-l-4 border-emerald-400" 
                        : "text-slate-300 hover:bg-slate-800/60"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-emerald-400" />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-400 led-glow-green" />}
                  </Link>
                );
              })}

              <div className="pt-3 border-t border-slate-800 space-y-1">
                <Link
                  href={`/${locale}/dashboard/family`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  <Users className="h-5 w-5" />
                  {tNav('family')}
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings/monitoring`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  <Sliders className="h-5 w-5" />
                  {tNav('monitoring')}
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800"
                >
                  <Settings className="h-5 w-5" />
                  {tNav('settings')}
                </Link>
              </div>
            </nav>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <button
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="flex items-center gap-2 text-sm font-semibold text-rose-400 hover:underline"
              >
                <LogOut className="h-4 w-4" /> {tNav('logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MAIN VIEWPORT AREA                                       */}
      {/* ======================================================== */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-50/70 dark:bg-stone-950">
        {/* Top Header Bar */}
        <header className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-stone-800 px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs transition-colors shrink-0">
          
          {/* Left: Mobile Hamburger + Brand & Status LED */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 focus:outline-none"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5 md:hidden">
              <span className="font-extrabold text-emerald-600 text-lg tracking-tight">Parent Care</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 led-glow-green animate-led-pulse" />
            </Link>

            {/* Status Pill with LED indicator */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-semibold text-emerald-800 dark:text-emerald-300 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 led-glow-green animate-led-pulse" />
                <span>{selectedPerson ? `${selectedPerson.full_name} • Rotina Conectada` : 'Família Conectada'}</span>
              </div>
              {selectedPerson && (
                <Link 
                  href={`/${locale}/care/${selectedPerson.id}`}
                  target="_blank"
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 font-medium transition"
                >
                  <ExternalLink className="h-3 w-3" /> Tela do Idoso
                </Link>
              )}
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle className="hidden sm:inline-flex" />

            {/* Desktop Add Person button */}
            <Button 
              asChild 
              size="sm" 
              variant="outline" 
              className="hidden sm:inline-flex border-slate-200 dark:border-stone-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-stone-800 rounded-xl text-xs font-medium"
            >
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                {tHeader('add_person')}
              </Link>
            </Button>

            {/* Global Emergency SOS button with LED pulse */}
            <Button 
              variant="destructive" 
              size="sm" 
              className="rounded-xl text-xs font-bold px-3 h-8 sm:h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-xs led-glow-red"
              asChild
            >
              <Link href={`/${locale}/dashboard/emergency`}>
                <AlertTriangle className="h-3.5 w-3.5 sm:mr-1.5" />
                <span className="hidden sm:inline">{tHeader('emergency')}</span>
                <span className="sm:hidden">SOS</span>
              </Link>
            </Button>
          </div>
        </header>

        {/* Streamlined Status Ribbon */}
        <div className="bg-slate-100/90 dark:bg-stone-900/80 border-b border-slate-200/80 dark:border-stone-800 px-4 py-1.5 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 led-glow-green" />
            <span className="truncate">{tHeader('trial_banner')}</span>
          </div>
          <Link 
            href={`/${locale}/dashboard/settings/subscription`}
            className="font-bold underline text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 flex-shrink-0 ml-2"
          >
            {tHeader('view_plan')} →
          </Link>
        </div>

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
