'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaredPersonSelector } from '@/components/shared/CaredPersonSelector';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { TrialBanner } from '@/components/billing/TrialBanner';
import { PaywallOverlay } from '@/components/billing/PaywallOverlay';
import {
  LayoutDashboard,
  Pill,
  Utensils,
  Calendar,
  Receipt,
  Users,
  Settings,
  LogOut,
  AlertTriangle,
  UserPlus,
  Menu,
  Sparkles,
  BarChart3,
  Sliders,
  Heart,
  ExternalLink,
  MessageSquare,
  Activity,
  ShoppingCart,
  ArrowLeftRight,
  ShieldCheck,
  ChevronDown,
  Plus,
  ClipboardList,
  Home,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { QuickActionFAB } from '@/components/shared/QuickActionFAB';
import { MobileCardMenu } from '@/components/layout/MobileCardMenu';

interface NavItem {
  name: string;
  href: string;
  exact?: boolean;
  icon: any;
  desc?: string;
  accentColor: string;
  accentBg: string;
}

interface NavGroup {
  label: string;
  icon: any;
  color: string;
  items: NavItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// ── Dropdown Menu Component ──────────────────────────────────────────────────
function DropdownMenu({
  group,
  pathname,
}: {
  group: NavGroup;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const GroupIcon = group.icon;

  const isGroupActive = group.items.some((item) =>
    item.exact ? pathname === item.href : pathname.startsWith(item.href)
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all select-none',
          isGroupActive
            ? `${group.color} bg-emerald-500/10 dark:bg-emerald-500/15`
            : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white'
        )}
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        <span>{group.label}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform duration-200',
            open ? 'rotate-180' : ''
          )}
        />
      </button>

      {/* Dropdown Panel */}
      <div
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={cn(
          'absolute top-full left-0 mt-1.5 w-60 bg-white dark:bg-[#0d1829] border border-stone-200 dark:border-[#1a2744] rounded-2xl shadow-xl shadow-stone-200/60 dark:shadow-black/40 overflow-hidden z-50 transition-all duration-200',
          open
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        )}
      >
        <div className="p-1.5">
          {group.items.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all group',
                  isActive
                    ? `${item.accentBg} ${item.accentColor} font-bold`
                    : 'text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white font-medium'
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                    isActive ? item.accentBg : 'bg-stone-100 dark:bg-white/5'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4',
                      isActive
                        ? item.accentColor
                        : 'text-stone-500 dark:text-slate-400'
                    )}
                  />
                </div>
                <div className="min-w-0">
                  <p className="leading-tight truncate">{item.name}</p>
                  {item.desc && (
                    <p className="text-[11px] text-stone-400 dark:text-slate-500 leading-tight mt-0.5 truncate">
                      {item.desc}
                    </p>
                  )}
                </div>
                {isActive && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0" />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Layout ──────────────────────────────────────────────────────────────
export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut, currentOrganizationId } = useAuth();
  const { selectedPerson } = useCaredPerson();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [loadingCheckoutSeats, setLoadingCheckoutSeats] = useState<number | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const tNav = useTranslations('DashboardNav');
  const tHeader = useTranslations('DashboardHeader');

  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] || 'pt-BR';

  useEffect(() => {
    let isMounted = true;
    const url = currentOrganizationId
      ? `/api/billing/entitlements?organizationId=${currentOrganizationId}`
      : `/api/billing/entitlements`;
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.entitlements) setEntitlements(data.entitlements);
      })
      .catch((err) => console.error('[DashboardLayout] Error fetching entitlements:', err));
    return () => { isMounted = false; };
  }, [currentOrganizationId]);

  // Close settings dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
        } catch {}
      }
      if (data.url) { window.location.href = data.url; return; }
    } catch (err: any) {
      console.error(err);
      alert('Falha ao conectar com o gateway de pagamento.');
    }
    setLoadingCheckoutSeats(null);
  };

  // ── DESKTOP TOP NAV GROUPS (menus suspensos) ─────────────────────────────
  const navGroups: NavGroup[] = [
    {
      label: 'Rotina & Cuidado',
      icon: Heart,
      color: 'text-emerald-600 dark:text-emerald-400',
      items: [
        {
          name: tNav('activities'),
          href: `/${locale}/dashboard/activities`,
          icon: Activity,
          desc: 'Registro de atividades',
          accentColor: 'text-amber-600 dark:text-amber-400',
          accentBg: 'bg-amber-500/10',
        },
        {
          name: tNav('appointments'),
          href: `/${locale}/dashboard/appointments`,
          icon: Calendar,
          desc: 'Consultas e compromissos',
          accentColor: 'text-indigo-600 dark:text-indigo-400',
          accentBg: 'bg-indigo-500/10',
        },
        {
          name: tNav('medications'),
          href: `/${locale}/dashboard/medications`,
          icon: Pill,
          desc: 'Remédios e horários',
          accentColor: 'text-sky-600 dark:text-sky-400',
          accentBg: 'bg-sky-500/10',
        },
        {
          name: tNav('meals'),
          href: `/${locale}/dashboard/meals`,
          icon: Utensils,
          desc: 'Alimentação e nutrição',
          accentColor: 'text-orange-600 dark:text-orange-400',
          accentBg: 'bg-orange-500/10',
        },
        {
          name: 'Tarefas',
          href: `/${locale}/dashboard/tasks`,
          icon: ClipboardList,
          desc: 'Lista de afazeres',
          accentColor: 'text-rose-600 dark:text-rose-400',
          accentBg: 'bg-rose-500/10',
        },
      ],
    },
    {
      label: 'O Lar',
      icon: Home,
      color: 'text-purple-600 dark:text-purple-400',
      items: [
        {
          name: tNav('shopping'),
          href: `/${locale}/dashboard/shopping`,
          icon: ShoppingCart,
          desc: 'Lista de compras',
          accentColor: 'text-purple-600 dark:text-purple-400',
          accentBg: 'bg-purple-500/10',
        },
        {
          name: tNav('homeSafety'),
          href: `/${locale}/dashboard/home-safety`,
          icon: ShieldCheck,
          desc: 'Segurança residencial',
          accentColor: 'text-teal-600 dark:text-teal-400',
          accentBg: 'bg-teal-500/10',
        },
        {
          name: tNav('memories'),
          href: `/${locale}/dashboard/memories`,
          icon: Sparkles,
          desc: 'Memórias e histórias',
          accentColor: 'text-pink-600 dark:text-pink-400',
          accentBg: 'bg-pink-500/10',
        },
        {
          name: tNav('expenses'),
          href: `/${locale}/dashboard/expenses`,
          icon: Receipt,
          desc: 'Gastos e despesas',
          accentColor: 'text-emerald-700 dark:text-emerald-400',
          accentBg: 'bg-emerald-500/10',
        },
      ],
    },
    {
      label: 'Família & Equipe',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      items: [
        {
          name: tNav('handovers'),
          href: `/${locale}/dashboard/handovers`,
          icon: ArrowLeftRight,
          desc: 'Passagens de turno',
          accentColor: 'text-blue-600 dark:text-blue-400',
          accentBg: 'bg-blue-500/10',
        },
        {
          name: tNav('family'),
          href: `/${locale}/dashboard/family`,
          icon: Users,
          desc: 'Membros e cuidadores',
          accentColor: 'text-sky-600 dark:text-sky-400',
          accentBg: 'bg-sky-600/10',
        },
        {
          name: tNav('reports'),
          href: `/${locale}/dashboard/reports`,
          icon: BarChart3,
          desc: 'Relatórios e histórico',
          accentColor: 'text-violet-600 dark:text-violet-400',
          accentBg: 'bg-violet-500/10',
        },
      ],
    },
  ];

  return (
    <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#07111F] overflow-hidden text-stone-900 dark:text-[#F8FAFC] font-sans">

      {/* ─── DESKTOP TOP NAVBAR ──────────────────────────────────────────────── */}
      <header className="hidden md:flex flex-col shrink-0 z-30">
        {/* Top bar */}
        <div className="bg-white/95 dark:bg-[#08162A]/98 backdrop-blur-md border-b border-stone-200/80 dark:border-[#172433] shadow-sm">
          <div className="flex items-center justify-between px-5 py-2.5 gap-4">

            {/* Left: Logo + Person Selector */}
            <div className="flex items-center gap-4 min-w-0">
              {/* Logo */}
              <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 group shrink-0">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                  <Heart className="h-4 w-4 fill-emerald-500 dark:fill-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-black text-stone-900 dark:text-white tracking-tight leading-none">Parent Care</p>
                  <p className="text-[10px] text-stone-400 dark:text-slate-500 leading-none mt-0.5">Gestão de Vida & Cuidado</p>
                </div>
              </Link>

              {/* Divider */}
              <div className="w-px h-7 bg-stone-200 dark:bg-stone-700 shrink-0" />

              {/* Person selector (compact) */}
              <div className="min-w-0 max-w-[200px]">
                <CaredPersonSelector />
              </div>

              {/* Quick chips */}
              {selectedPerson && (
                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href={`/${locale}/care/${selectedPerson.id}`}
                    target="_blank"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold transition group"
                    title="Abrir tela simplificada para o idoso"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Modo Idoso
                    <ExternalLink className="h-3 w-3 text-emerald-500 group-hover:text-emerald-700" />
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/cared-people/${selectedPerson.id}?tab=whatsapp`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-stone-50 dark:bg-white/5 hover:bg-green-50 dark:hover:bg-green-500/10 border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-slate-300 hover:text-green-700 dark:hover:text-green-400 text-xs font-bold transition"
                    title="Configurar assistente do WhatsApp"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-[#25D366]" />
                    WhatsApp IA
                  </Link>
                </div>
              )}
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Active person pill */}
              {selectedPerson && (
                <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedPerson.full_name} • Rotina Ativa
                </div>
              )}

              <LanguageSwitcher />
              <ThemeToggle />

              <Button
                asChild
                size="sm"
                variant="outline"
                className="border-stone-200 dark:border-[#172433] text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B] rounded-xl text-xs font-semibold h-8"
              >
                <Link href={`/${locale}/dashboard/cared-people/new`}>
                  <UserPlus className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                  {tHeader('add_person')}
                </Link>
              </Button>

              <Button
                variant="destructive"
                size="sm"
                className="rounded-xl text-xs font-black px-3.5 h-8 bg-rose-600 hover:bg-rose-700 text-white shadow-sm active:scale-95 transition-all"
                asChild
              >
                <Link href={`/${locale}/dashboard/emergency`}>
                  <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                  {tHeader('emergency')}
                </Link>
              </Button>
            </div>
          </div>

          {/* ── SECOND ROW: NAV DROPDOWNS ─────────────────────────────────── */}
          <div className="flex items-center gap-1 px-5 pb-1 border-t border-stone-100 dark:border-[#172433]/60">
            {/* Dashboard link */}
            <Link
              href={`/${locale}/dashboard`}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                pathname === `/${locale}/dashboard`
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                  : 'text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-900 dark:hover:text-white'
              )}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>

            {/* Dropdown groups */}
            {navGroups.map((group) => (
              <DropdownMenu key={group.label} group={group} pathname={pathname} />
            ))}

            {/* Settings dropdown */}
            <div ref={settingsRef} className="relative ml-auto">
              <button
                onMouseEnter={() => setSettingsOpen(true)}
                onMouseLeave={() => setSettingsOpen(false)}
                onClick={() => setSettingsOpen((v) => !v)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all',
                  pathname.includes('/settings') || pathname.includes('/subscription')
                    ? 'text-stone-800 dark:text-white bg-stone-100 dark:bg-white/10'
                    : 'text-stone-500 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-white/5 hover:text-stone-800 dark:hover:text-white'
                )}
              >
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline">Configurações</span>
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform duration-200', settingsOpen ? 'rotate-180' : '')} />
              </button>
              <div
                onMouseEnter={() => setSettingsOpen(true)}
                onMouseLeave={() => setSettingsOpen(false)}
                className={cn(
                  'absolute top-full right-0 mt-1.5 w-56 bg-white dark:bg-[#0d1829] border border-stone-200 dark:border-[#1a2744] rounded-2xl shadow-xl overflow-hidden z-50 transition-all duration-200',
                  settingsOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
                )}
              >
                <div className="p-1.5 space-y-0.5">
                  <Link
                    href={`/${locale}/dashboard/settings/subscription`}
                    onClick={() => setSettingsOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                      pathname.includes('/subscription')
                        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                        : 'text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-white/5'
                    )}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <p className="leading-tight">{tNav('plans')}</p>
                      <p className="text-[11px] text-stone-400 leading-tight">Plano & cobrança</p>
                    </div>
                    <span className="ml-auto text-[10px] font-bold uppercase text-amber-600 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900">SaaS</span>
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/settings/monitoring`}
                    onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-white/5 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-white/5 flex items-center justify-center">
                      <Sliders className="h-4 w-4 text-stone-500" />
                    </div>
                    {tNav('monitoring')}
                  </Link>
                  <Link
                    href={`/${locale}/dashboard/settings`}
                    onClick={() => setSettingsOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-50 dark:hover:bg-white/5 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-white/5 flex items-center justify-center">
                      <Settings className="h-4 w-4 text-stone-500" />
                    </div>
                    {tNav('settings')}
                  </Link>
                  <div className="border-t border-stone-100 dark:border-[#1a2744] my-1" />
                  <button
                    onClick={() => { setSettingsOpen(false); signOut(); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                  >
                    <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                      <LogOut className="h-4 w-4 text-rose-500" />
                    </div>
                    {tNav('logout')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─── MOBILE HEADER ───────────────────────────────────────────────────── */}
      <header className="md:hidden bg-white/95 dark:bg-[#08162A]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-[#172433] px-4 py-2.5 flex items-center justify-between shadow-sm shrink-0 z-20">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5">
            <span className="font-black text-emerald-600 dark:text-emerald-400 text-base tracking-tight">Parent Care</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#19D3A2] animate-pulse" />
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <Button
            variant="destructive"
            size="sm"
            className="rounded-xl text-xs font-black px-3 h-8 bg-rose-600 hover:bg-rose-700 text-white"
            asChild
          >
            <Link href={`/${locale}/dashboard/emergency`}>
              <AlertTriangle className="h-3.5 w-3.5 mr-1" />
              SOS
            </Link>
          </Button>
        </div>
      </header>

      {/* ─── MOBILE CARD MENU MODAL ──────────────────────────────────────────── */}
      <MobileCardMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        locale={locale}
        selectedPerson={selectedPerson}
        signOut={signOut}
      />

      {/* ─── MAIN CONTENT ────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">

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

        {/* SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 pb-24 md:pb-8">
          {children}
        </div>

        {/* ─── MOBILE BOTTOM TAB BAR ───────────────────────────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/98 dark:bg-[#08162A]/98 backdrop-blur-lg border-t border-stone-200/80 dark:border-[#172433] px-2 pt-1.5 pb-2 flex items-center justify-around z-40 shadow-lg">
          <Link href={`/${locale}/dashboard`} className="flex flex-col items-center gap-0.5 min-w-[54px] group">
            <div className={cn('w-10 h-8 flex items-center justify-center rounded-xl transition-all', pathname === `/${locale}/dashboard` ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'text-stone-400 dark:text-slate-400 group-active:scale-95')}>
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname === `/${locale}/dashboard` ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-500')}>Hoje</span>
          </Link>
          <Link href={`/${locale}/dashboard/activities`} className="flex flex-col items-center gap-0.5 min-w-[54px] group">
            <div className={cn('w-10 h-8 flex items-center justify-center rounded-xl transition-all', pathname.includes('/activities') ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-slate-400 group-active:scale-95')}>
              <Activity className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname.includes('/activities') ? 'text-amber-600' : 'text-stone-500')}>Atividades</span>
          </Link>
          <Link href={`/${locale}/dashboard/medications`} className="flex flex-col items-center gap-0.5 min-w-[54px] group">
            <div className={cn('w-10 h-8 flex items-center justify-center rounded-xl transition-all', pathname.includes('/medications') ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400' : 'text-stone-400 dark:text-slate-400 group-active:scale-95')}>
              <Pill className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname.includes('/medications') ? 'text-sky-600' : 'text-stone-500')}>Remédios</span>
          </Link>
          <Link href={`/${locale}/dashboard/shopping`} className="flex flex-col items-center gap-0.5 min-w-[54px] group">
            <div className={cn('w-10 h-8 flex items-center justify-center rounded-xl transition-all', pathname.includes('/shopping') ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400' : 'text-stone-400 dark:text-slate-400 group-active:scale-95')}>
              <ShoppingCart className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname.includes('/shopping') ? 'text-purple-600' : 'text-stone-500')}>Compras</span>
          </Link>
          <button onClick={() => setMobileMenuOpen(true)} className="flex flex-col items-center gap-0.5 min-w-[54px] group">
            <div className="w-10 h-8 flex items-center justify-center rounded-xl text-stone-400 dark:text-slate-400 group-active:scale-95">
              <Menu className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-stone-500">Menu</span>
          </button>
        </nav>

        <QuickActionFAB />
      </main>
    </div>
  );
}
