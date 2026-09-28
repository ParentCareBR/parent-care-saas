'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaredPersonSelector } from '@/components/shared/CaredPersonSelector';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { createClient } from '@/lib/supabase/client';
import { TrialBanner } from '@/components/billing/TrialBanner';
import { PaywallOverlay } from '@/components/billing/PaywallOverlay';
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
  const { signOut, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [loadingCheckoutSeats, setLoadingCheckoutSeats] = useState<number | null>(null);

  const tNav = useTranslations('DashboardNav');
  const tHeader = useTranslations('DashboardHeader');

  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] || 'pt-BR';

  useEffect(() => {
    if (!currentOrganizationId) return;
    let isMounted = true;
    fetch(`/api/billing/entitlements?organizationId=` + currentOrganizationId)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.entitlements) {
          setEntitlements(data.entitlements);
        }
      })
      .catch((err) => console.error('[DashboardLayout] Error fetching entitlements:', err));
    return () => {
      isMounted = false;
    };
  }, [currentOrganizationId]);

  const handlePaywallCheckout = async (seats: number, interval: 'month' | 'year') => {
    if (!currentOrganizationId) return;
    setLoadingCheckoutSeats(seats);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          seatQuantity: seats,
          locale,
          billingInterval: interval,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erro ao iniciar checkout.');
        setLoadingCheckoutSeats(null);
        return;
      }
      if (data.transactionId && typeof window !== 'undefined' && (window as any).Paddle) {
        try {
          (window as any).Paddle.Checkout?.open({
            transactionId: data.transactionId,
            settings: {
              displayMode: 'overlay',
              theme: 'light',
              successUrl: `${window.location.origin}/${locale}/dashboard/settings/subscription?success=true`,
            },
          });
          setLoadingCheckoutSeats(null);
          return;
        } catch {
        }
      }
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err: any) {
      console.error(err);
      alert('Falha ao conectar com o gateway de pagamento.');
    }
    setLoadingCheckoutSeats(null);
  };

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
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#07111F] overflow-hidden text-stone-900 dark:text-[#F8FAFC] font-sans">
      
      <aside className="w-64 bg-white dark:bg-[#08162A] text-stone-700 dark:text-slate-100 border-r border-stone-200 dark:border-[#172433] flex flex-col hidden md:flex transition-colors shrink-0">
        <div className="p-5 border-b border-stone-200 dark:border-[#172433] space-y-4">
          <div className="flex items-center justify-between">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#19D3A2]/20 border border-[#19D3A2]/40 flex items-center justify-center text-[#19D3A2] group-hover:scale-105 transition-transform">
                <Heart className="h-4 w-4 fill-[#19D3A2]" />
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-stone-900 dark:text-[#F8FAFC] tracking-tight">Parent Care</h1>
                <span className="w-2 h-2 rounded-full bg-[#19D3A2] animate-pulse shadow-[0_0_8px_#19D3A2]" title="Sistema Online" />
              </div>
            </Link>
            <div className="flex items-center gap-1 hidden">
              <LanguageSwitcher />
              <ThemeToggle />
            </div>
          </div>

          <div className="bg-stone-50 dark:bg-[#101D2B] border border-stone-200 dark:border-[#172433] rounded-2xl p-2.5 space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] text-stone-500 dark:text-slate-400 uppercase tracking-wider font-bold">{tHeader('caring_for')}</span>
              <Link 
                href={`/${locale}/dashboard/cared-people/new`}
                className="text-[11px] text-[#19D3A2] hover:text-[#5DE5BE] hover:underline flex items-center gap-1 font-semibold"
                title={tHeader('add_person')}
              >
                <UserPlus className="h-3 w-3" /> {tHeader('new_person')}
              </Link>
            </div>
            <CaredPersonSelector />
          </div>

          {selectedPerson && (
            <Link
              href={`/${locale}/care/${selectedPerson.id}`}
              target="_blank"
              className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-50 dark:bg-[#19D3A2]/10 hover:bg-emerald-100/70 dark:hover:bg-[#19D3A2]/20 border border-emerald-200 dark:border-[#19D3A2]/30 text-emerald-700 dark:text-[#5DE5BE] transition group shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#19D3A2] shadow-[0_0_8px_#19D3A2] animate-pulse" />
                <div>
                  <p className="text-xs font-bold text-stone-900 dark:text-[#F8FAFC] leading-tight">Tela do Idoso</p>
                  <p className="text-[10px] text-emerald-600 dark:text-[#19D3A2]/80 font-medium">Abrir Modo Sênior</p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 text-emerald-600 dark:text-[#19D3A2] group-hover:translate-x-0.5 transition" />
            </Link>
          )}
        </div>

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
                    ? "bg-emerald-50 dark:bg-[#19D3A2]/10 text-emerald-700 dark:text-[#F8FAFC] font-bold border-l-4 border-emerald-600 dark:border-[#19D3A2] shadow-xs dark:shadow-[inset_0_0_12px_rgba(25,211,162,0.15)]" 
                    : "text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-[#F8FAFC]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-4 w-4 transition-colors", isActive ? "text-emerald-600 dark:text-[#19D3A2]" : "text-stone-400 dark:text-slate-400 group-hover:text-stone-700 dark:group-hover:text-slate-200")} />
                  <span>{item.name}</span>
                </div>
                {isActive ? (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_5px_#19D3A2] animate-pulse" />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-stone-300 dark:bg-[#172433] opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-stone-200 dark:border-[#172433] space-y-1">
          <Link
            href={`/${locale}/dashboard/family`}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group",
              pathname.includes('/dashboard/family')
                ? "bg-emerald-50 dark:bg-[#19D3A2]/10 text-emerald-700 dark:text-[#F8FAFC] font-bold border-l-4 border-emerald-600 dark:border-[#19D3A2]"
                : "text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-[#F8FAFC]"
            )}
          >
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4" />
              <span>{tNav('family')}</span>
            </div>
            {pathname.includes('/dashboard/family') && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_5px_#19D3A2]" />
            )}
          </Link>
          <Link
            href={`/${locale}/dashboard/settings/monitoring`}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group",
              pathname.includes('/dashboard/settings/monitoring')
                ? "bg-emerald-50 dark:bg-[#19D3A2]/10 text-emerald-700 dark:text-[#F8FAFC] font-bold border-l-4 border-emerald-600 dark:border-[#19D3A2]"
                : "text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-[#F8FAFC]"
            )}
          >
            <div className="flex items-center gap-3">
              <Sliders className="h-4 w-4" />
              <span>{tNav('monitoring')}</span>
            </div>
            {pathname.includes('/dashboard/settings/monitoring') && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_5px_#19D3A2]" />
            )}
          </Link>
          <Link
            href={`/${locale}/dashboard/settings`}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all group",
              pathname === `/${locale}/dashboard/settings`
                ? "bg-emerald-50 dark:bg-[#19D3A2]/10 text-emerald-700 dark:text-[#F8FAFC] font-bold border-l-4 border-emerald-600 dark:border-[#19D3A2]"
                : "text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-[#F8FAFC]"
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="h-4 w-4" />
              <span>{tNav('settings')}</span>
            </div>
            {pathname === `/${locale}/dashboard/settings` && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_5px_#19D3A2]" />
            )}
          </Link>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>{tNav('logout')}</span>
          </button>
        </div>
      </aside>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white dark:bg-[#08162A] text-stone-800 dark:text-slate-100 h-full flex flex-col z-10 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-stone-200 dark:border-[#172433]">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-[#19D3A2] fill-[#19D3A2]" />
                <h2 className="text-lg font-bold text-stone-900 dark:text-white">Parent Care</h2>
                <span className="w-2 h-2 rounded-full bg-[#19D3A2] shadow-[0_0_5px_#19D3A2] animate-pulse" />
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-500 dark:text-slate-400 uppercase tracking-wider">{tHeader('caring_for')}</span>
                <Link 
                  href={`/${locale}/dashboard/cared-people/new`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-[#19D3A2] font-semibold hover:underline"
                >
                  {tHeader('new_person')}
                </Link>
              </div>
              <CaredPersonSelector />
            </div>

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
                        ? "bg-emerald-50 dark:bg-[#19D3A2]/20 text-emerald-700 dark:text-[#F8FAFC] font-bold border-l-4 border-emerald-600 dark:border-[#19D3A2]" 
                        : "text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5 text-emerald-600 dark:text-[#19D3A2]" />
                      <span>{item.name}</span>
                    </div>
                    {isActive && <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_5px_#19D3A2]" />}
                  </Link>
                );
              })}

              <div className="pt-3 border-t border-stone-200 dark:border-[#172433] space-y-1">
                <Link
                  href={`/${locale}/dashboard/family`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                >
                  <Users className="h-5 w-5" />
                  {tNav('family')}
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings/monitoring`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                >
                  <Sliders className="h-5 w-5" />
                  {tNav('monitoring')}
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                >
                  <Settings className="h-5 w-5" />
                  {tNav('settings')}
                </Link>
              </div>
            </nav>

            <div className="pt-4 border-t border-stone-200 dark:border-[#172433] flex items-center justify-between">
              <button
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="flex items-center gap-2 text-sm font-semibold text-[#F43F5E] hover:underline"
              >
                <LogOut className="h-4 w-4" /> {tNav('logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#07111F]">
        
        <header className="bg-white/95 dark:bg-[#08162A]/95 backdrop-blur-md border-b border-stone-200 dark:border-[#172433] px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-xs transition-colors shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B] focus:outline-none"
              aria-label="Menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5 md:hidden">
              <span className="font-extrabold text-[#19D3A2] text-lg tracking-tight">Parent Care</span>
              <span className="w-2 h-2 rounded-full bg-[#19D3A2] shadow-[0_0_5px_#19D3A2] animate-pulse" />
            </Link>
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-[#19D3A2]/10 border border-emerald-200 dark:border-[#19D3A2]/30 text-xs font-semibold text-emerald-700 dark:text-[#5DE5BE] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_5px_#19D3A2] animate-pulse" />
                <span>{selectedPerson ? `${selectedPerson.full_name} • Rotina Conectada` : 'Família Conectada'}</span>
              </div>
              {selectedPerson && (
                <Link 
                  href={`/${locale}/care/${selectedPerson.id}`}
                  target="_blank"
                  className="text-xs text-stone-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-[#5DE5BE] flex items-center gap-1 font-medium transition"
                >
                  <ExternalLink className="h-3 w-3" /> Tela do Idoso
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle className="hidden sm:inline-flex" />
            <Button 
              asChild 
              size="sm" 
              variant="outline" 
              className="hidden sm:inline-flex border-stone-200 dark:border-[#172433] text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B] rounded-xl text-xs font-medium"
            >
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-[#19D3A2]" />
                {tHeader('add_person')}
              </Link>
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              className="rounded-xl text-xs font-bold px-3 h-8 sm:h-9 bg-[#F43F5E] hover:bg-[#F43F5E]/90 text-white shadow-xs"
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

        {entitlements?.isTrial && !entitlements?.isPaywallBlocked && (
          <TrialBanner daysRemaining={entitlements.daysRemaining} locale={locale} />
        )}


        {entitlements?.isPaywallBlocked && !pathname.includes('/settings/subscription') && (
          <PaywallOverlay
            locale={locale}
            organizationId={currentOrganizationId || ''}
            onCheckout={handlePaywallCheckout}
            loadingSeats={loadingCheckoutSeats}
          />
        )}

        <div className="flex-1 overflow-y-auto pb-24 md:pb-8">
          {children}
        </div>

        {/* ── Mobile Bottom Navigation ── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/98 dark:bg-[#08162A]/98 backdrop-blur-md border-t border-stone-200 dark:border-[#172433] px-1 pt-1.5 pb-2 flex items-end justify-around z-40 shadow-lg">
          {/* Início */}
          <Link
            href={`/${locale}/dashboard`}
            className="flex flex-col items-center gap-0.5 min-w-[52px] group"
          >
            <div className={cn(
              'w-11 h-9 flex items-center justify-center rounded-2xl transition-all',
              pathname === `/${locale}/dashboard`
                ? 'bg-emerald-100 dark:bg-[#19D3A2]/20'
                : 'group-active:bg-stone-100 dark:group-active:bg-stone-800'
            )}>
              <LayoutDashboard className={cn('h-5 w-5', pathname === `/${locale}/dashboard` ? 'text-emerald-600 dark:text-[#19D3A2]' : 'text-stone-500 dark:text-slate-400')} />
            </div>
            <span className={cn('text-[10px] font-semibold', pathname === `/${locale}/dashboard` ? 'text-emerald-600 dark:text-[#19D3A2]' : 'text-stone-500 dark:text-slate-400')}>Início</span>
          </Link>

          {/* Remédios */}
          <Link
            href={`/${locale}/dashboard/medications`}
            className="flex flex-col items-center gap-0.5 min-w-[52px] group"
          >
            <div className={cn(
              'w-11 h-9 flex items-center justify-center rounded-2xl transition-all',
              pathname.includes('/medications')
                ? 'bg-emerald-100 dark:bg-[#19D3A2]/20'
                : 'group-active:bg-stone-100 dark:group-active:bg-stone-800'
            )}>
              <Pill className={cn('h-5 w-5', pathname.includes('/medications') ? 'text-emerald-600 dark:text-[#19D3A2]' : 'text-stone-500 dark:text-slate-400')} />
            </div>
            <span className={cn('text-[10px] font-semibold', pathname.includes('/medications') ? 'text-emerald-600 dark:text-[#19D3A2]' : 'text-stone-500 dark:text-slate-400')}>Remédios</span>
          </Link>

          {/* Agenda (central — destaque) */}
          <Link
            href={`/${locale}/dashboard/appointments`}
            className="flex flex-col items-center gap-0.5 min-w-[60px] -mt-3 group"
          >
            <div className={cn(
              'w-14 h-12 flex items-center justify-center rounded-2xl shadow-md transition-all border-2',
              pathname.includes('/appointments')
                ? 'bg-indigo-600 border-indigo-600 shadow-indigo-200 dark:shadow-indigo-900'
                : 'bg-white dark:bg-[#101D2B] border-stone-200 dark:border-[#172433]'
            )}>
              <Calendar className={cn('h-6 w-6', pathname.includes('/appointments') ? 'text-white' : 'text-stone-600 dark:text-slate-300')} />
            </div>
            <span className={cn('text-[10px] font-bold', pathname.includes('/appointments') ? 'text-indigo-600 dark:text-indigo-400' : 'text-stone-500 dark:text-slate-400')}>Agenda</span>
          </Link>

          {/* Tarefas */}
          <Link
            href={`/${locale}/dashboard/tasks`}
            className="flex flex-col items-center gap-0.5 min-w-[52px] group"
          >
            <div className={cn(
              'w-11 h-9 flex items-center justify-center rounded-2xl transition-all',
              pathname.includes('/tasks')
                ? 'bg-amber-100 dark:bg-amber-500/20'
                : 'group-active:bg-stone-100 dark:group-active:bg-stone-800'
            )}>
              <CheckSquare className={cn('h-5 w-5', pathname.includes('/tasks') ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-slate-400')} />
            </div>
            <span className={cn('text-[10px] font-semibold', pathname.includes('/tasks') ? 'text-amber-600 dark:text-amber-400' : 'text-stone-500 dark:text-slate-400')}>Tarefas</span>
          </Link>

          {/* Menu */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 min-w-[52px] group"
          >
            <div className="w-11 h-9 flex items-center justify-center rounded-2xl group-active:bg-stone-100 dark:group-active:bg-stone-800 transition-all">
              <Menu className="h-5 w-5 text-stone-500 dark:text-slate-400" />
            </div>
            <span className="text-[10px] font-semibold text-stone-500 dark:text-slate-400">Menu</span>
          </button>
        </nav>

      </main>
    </div>
  );
}

