'use client';

import React, { useState, useEffect } from 'react';
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
  X,
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
  ChevronRight,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { QuickActionFAB } from '@/components/shared/QuickActionFAB';

interface NavItem {
  name: string;
  href: string;
  exact?: boolean;
  icon: any;
  accentColor: string;
  accentBg: string;
}

interface NavHub {
  title: string;
  items: NavItem[];
}

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
    let isMounted = true;
    const url = currentOrganizationId
      ? `/api/billing/entitlements?organizationId=${currentOrganizationId}`
      : `/api/billing/entitlements`;

    fetch(url)
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

  // ─── DESIGN SYSTEM: HUBS DE NAVEGAÇÃO COM MICRO-CORES FUNCIONAIS ───
  const navHubs: NavHub[] = [
    {
      title: 'Hoje',
      items: [
        { 
          name: tNav('overview'), 
          href: `/${locale}/dashboard`, 
          exact: true, 
          icon: LayoutDashboard,
          accentColor: 'text-emerald-500',
          accentBg: 'bg-emerald-500/10'
        },
      ],
    },
    {
      title: 'Rotina & Cuidado',
      items: [
        { 
          name: tNav('activities'), 
          href: `/${locale}/dashboard/activities`, 
          icon: Activity,
          accentColor: 'text-amber-500',
          accentBg: 'bg-amber-500/10'
        },
        { 
          name: tNav('appointments'), 
          href: `/${locale}/dashboard/appointments`, 
          icon: Calendar,
          accentColor: 'text-indigo-500',
          accentBg: 'bg-indigo-500/10'
        },
        { 
          name: tNav('medications'), 
          href: `/${locale}/dashboard/medications`, 
          icon: Pill,
          accentColor: 'text-sky-500',
          accentBg: 'bg-sky-500/10'
        },
        { 
          name: tNav('meals'), 
          href: `/${locale}/dashboard/meals`, 
          icon: Utensils,
          accentColor: 'text-orange-500',
          accentBg: 'bg-orange-500/10'
        },
      ],
    },
    {
      title: 'O Lar & Organização',
      items: [
        { 
          name: tNav('shopping'), 
          href: `/${locale}/dashboard/shopping`, 
          icon: ShoppingCart,
          accentColor: 'text-purple-500',
          accentBg: 'bg-purple-500/10'
        },
        { 
          name: tNav('homeSafety'), 
          href: `/${locale}/dashboard/home-safety`, 
          icon: ShieldCheck,
          accentColor: 'text-teal-500',
          accentBg: 'bg-teal-500/10'
        },
        { 
          name: tNav('memories'), 
          href: `/${locale}/dashboard/memories`, 
          icon: Sparkles,
          accentColor: 'text-pink-500',
          accentBg: 'bg-pink-500/10'
        },
        { 
          name: tNav('expenses'), 
          href: `/${locale}/dashboard/expenses`, 
          icon: Receipt,
          accentColor: 'text-emerald-600',
          accentBg: 'bg-emerald-600/10'
        },
      ],
    },
    {
      title: 'Rede de Apoio & Equipe',
      items: [
        { 
          name: tNav('handovers'), 
          href: `/${locale}/dashboard/handovers`, 
          icon: ArrowLeftRight,
          accentColor: 'text-blue-500',
          accentBg: 'bg-blue-500/10'
        },
        { 
          name: tNav('family'), 
          href: `/${locale}/dashboard/family`, 
          icon: Users,
          accentColor: 'text-sky-600',
          accentBg: 'bg-sky-600/10'
        },
        { 
          name: tNav('reports'), 
          href: `/${locale}/dashboard/reports`, 
          icon: BarChart3,
          accentColor: 'text-violet-500',
          accentBg: 'bg-violet-500/10'
        },
      ],
    },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#07111F] overflow-hidden text-stone-900 dark:text-[#F8FAFC] font-sans">
      
      {/* ─── DESKTOP SIDEBAR ────────────────────────────────────────────── */}
      <aside className="w-64 bg-white dark:bg-[#08162A] text-stone-700 dark:text-slate-100 border-r border-stone-200/90 dark:border-[#172433] flex flex-col hidden md:flex transition-colors shrink-0 shadow-xs z-20">
        
        {/* LOGO & BRAND */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-[#172433]">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 dark:bg-[#19D3A2]/20 border border-emerald-500/30 dark:border-[#19D3A2]/40 flex items-center justify-center text-emerald-600 dark:text-[#19D3A2] group-hover:scale-105 transition-transform shadow-xs">
              <Heart className="h-5 w-5 fill-emerald-500 dark:fill-[#19D3A2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-stone-900 dark:text-[#F8FAFC] tracking-tight">Parent Care</h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_8px_#19D3A2] animate-pulse" title="Online" />
              </div>
              <p className="text-[10px] text-stone-400 dark:text-slate-500 font-medium">Gestão de Vida & Cuidado</p>
            </div>
          </Link>
        </div>

        {/* ACTIVE CARED PERSON SELECTOR & QUICK CHIPS */}
        <div className="p-3 border-b border-stone-100 dark:border-[#172433] bg-stone-50/60 dark:bg-[#0d1c32]/50 space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-stone-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">
              {tHeader('caring_for')}
            </span>
            <Link 
              href={`/${locale}/dashboard/cared-people/new`}
              className="text-[10px] text-emerald-600 dark:text-[#19D3A2] hover:underline flex items-center gap-0.5 font-bold"
              title={tHeader('add_person')}
            >
              <Plus className="h-3 w-3" /> {tHeader('new_person')}
            </Link>
          </div>

          <CaredPersonSelector />

          {selectedPerson && (
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <Link
                href={`/${locale}/care/${selectedPerson.id}`}
                target="_blank"
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-white dark:bg-[#101D2B] hover:bg-emerald-50 dark:hover:bg-[#19D3A2]/20 border border-stone-200/80 dark:border-[#1e3048] text-stone-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-[#5DE5BE] text-[11px] font-bold transition shadow-2xs group"
                title="Abrir tela simplificada para o idoso"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Modo Idoso</span>
                <ExternalLink className="h-3 w-3 text-stone-400 group-hover:text-emerald-600" />
              </Link>

              <Link
                href={`/${locale}/dashboard/cared-people/${selectedPerson.id}?tab=whatsapp`}
                className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-white dark:bg-[#101D2B] hover:bg-emerald-50 dark:hover:bg-[#19D3A2]/20 border border-stone-200/80 dark:border-[#1e3048] text-stone-700 dark:text-slate-200 hover:text-emerald-700 dark:hover:text-[#5DE5BE] text-[11px] font-bold transition shadow-2xs group"
                title="Configurar assistente do WhatsApp"
              >
                <MessageSquare className="h-3 w-3 text-[#25D366]" />
                <span>WhatsApp IA</span>
              </Link>
            </div>
          )}
        </div>

        {/* NAVIGATION ITEMS (PILL DESIGN SYSTEM) */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-thin">
          {navHubs.map((hub, hi) => (
            <div key={hi} className="space-y-1">
              <div className="px-3 pt-1 pb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-stone-400 dark:text-slate-500">
                  {hub.title}
                </span>
              </div>

              {hub.items.map((item) => {
                const isActive = item.exact 
                  ? pathname === item.href 
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group",
                      isActive 
                        ? "bg-emerald-500/10 text-emerald-800 dark:text-[#5DE5BE] font-bold shadow-2xs ring-1 ring-emerald-500/25" 
                        : "text-stone-600 dark:text-slate-400 hover:bg-stone-100/80 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-[#F8FAFC]"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                        isActive ? item.accentBg : "bg-stone-100 dark:bg-[#101D2B] group-hover:" + item.accentBg
                      )}>
                        <Icon className={cn("h-4 w-4", isActive ? item.accentColor : "text-stone-500 dark:text-slate-400 group-hover:" + item.accentColor)} />
                      </div>
                      <span className="leading-tight">{item.name}</span>
                    </div>

                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_6px_#19D3A2] animate-pulse" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="p-3 border-t border-stone-100 dark:border-[#172433] space-y-1 bg-stone-50/50 dark:bg-[#07111F]/50">
          <Link
            href={`/${locale}/dashboard/settings/subscription`}
            className={cn(
              "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors group",
              pathname.includes('/settings/subscription')
                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold"
                : "text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-white"
            )}
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span>{tNav('plans')}</span>
            </div>
            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/50">
              SaaS
            </span>
          </Link>

          <Link
            href={`/${locale}/dashboard/settings/monitoring`}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors group",
              pathname.includes('/dashboard/settings/monitoring')
                ? "bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-white font-bold"
                : "text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-white"
            )}
          >
            <Sliders className="h-4 w-4 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-slate-200 shrink-0" />
            <span>{tNav('monitoring')}</span>
          </Link>

          <Link
            href={`/${locale}/dashboard/settings`}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors group",
              pathname === `/${locale}/dashboard/settings`
                ? "bg-stone-200 dark:bg-stone-800 text-stone-900 dark:text-white font-bold"
                : "text-stone-600 dark:text-slate-400 hover:bg-stone-100 dark:hover:bg-[#101D2B] hover:text-stone-900 dark:hover:text-white"
            )}
          >
            <Settings className="h-4 w-4 text-stone-400 group-hover:text-stone-600 dark:group-hover:text-slate-200 shrink-0" />
            <span>{tNav('settings')}</span>
          </Link>

          <button
            onClick={signOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>{tNav('logout')}</span>
          </button>
        </div>
      </aside>

      {/* ─── MOBILE DRAWER (MENU HAMBURGUER) ─────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)}
          />

          <div className="relative w-4/5 max-w-xs bg-white dark:bg-[#08162A] text-stone-800 dark:text-slate-100 h-full flex flex-col z-10 shadow-2xl p-4 space-y-3">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 dark:border-[#172433]">
              <div className="flex items-center gap-2">
                <Heart className="h-5 w-5 text-emerald-500 fill-emerald-500" />
                <h2 className="text-base font-black text-stone-900 dark:text-white">Parent Care</h2>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Cared Person Selector on Mobile */}
            <div className="space-y-1.5 bg-stone-50 dark:bg-[#101D2B] p-2.5 rounded-2xl border border-stone-200/80 dark:border-[#172433]">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold text-stone-400 uppercase tracking-wider">{tHeader('caring_for')}</span>
                <Link 
                  href={`/${locale}/dashboard/cared-people/new`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-xs text-emerald-600 font-bold hover:underline"
                >
                  {tHeader('new_person')}
                </Link>
              </div>
              <CaredPersonSelector />
            </div>

            {/* Navigation Links in Drawer */}
            <nav className="flex-1 space-y-3 overflow-y-auto pt-1 pr-1">
              {navHubs.map((hub, hi) => (
                <div key={hi} className="space-y-1">
                  <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-stone-400 dark:text-slate-500">
                    {hub.title}
                  </p>
                  {hub.items.map((item) => {
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
                          "flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors",
                          isActive 
                            ? "bg-emerald-500/10 text-emerald-800 dark:text-[#5DE5BE] font-bold" 
                            : "text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={cn("h-4 w-4", item.accentColor)} />
                          <span>{item.name}</span>
                        </div>
                        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_#19D3A2]" />}
                      </Link>
                    );
                  })}
                </div>
              ))}

              <div className="pt-2 border-t border-stone-200 dark:border-[#172433] space-y-1">
                <Link
                  href={`/${locale}/dashboard/settings/subscription`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                >
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span>{tNav('plans')}</span>
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings/monitoring`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                >
                  <Sliders className="h-4 w-4 text-stone-400" />
                  <span>{tNav('monitoring')}</span>
                </Link>
                <Link
                  href={`/${locale}/dashboard/settings`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B]"
                >
                  <Settings className="h-4 w-4 text-stone-400" />
                  <span>{tNav('settings')}</span>
                </Link>
              </div>
            </nav>

            {/* Logout on Drawer */}
            <div className="pt-2 border-t border-stone-200 dark:border-[#172433] flex items-center justify-between">
              <button
                onClick={() => { setMobileMenuOpen(false); signOut(); }}
                className="flex items-center gap-2 text-xs font-bold text-rose-600 hover:underline"
              >
                <LogOut className="h-4 w-4" /> {tNav('logout')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MAIN CONTENT VIEWPORT ───────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-[#F8FAFC] dark:bg-[#07111F]">
        
        {/* HEADER BAR */}
        <header className="bg-white/95 dark:bg-[#08162A]/95 backdrop-blur-md border-b border-stone-200/80 dark:border-[#172433] px-4 sm:px-6 py-2.5 flex items-center justify-between shadow-2xs transition-colors shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-1.5 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B] focus:outline-none"
              aria-label="Menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-1.5 md:hidden">
              <span className="font-black text-emerald-600 dark:text-[#19D3A2] text-base tracking-tight">Parent Care</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#19D3A2] animate-pulse" />
            </Link>

            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-[#19D3A2]/10 border border-emerald-200 dark:border-[#19D3A2]/30 text-xs font-semibold text-emerald-700 dark:text-[#5DE5BE] shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 dark:bg-[#19D3A2] shadow-[0_0_5px_#19D3A2] animate-pulse" />
                <span>{selectedPerson ? `${selectedPerson.full_name} • Rotina Ativa` : 'Família Conectada'}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle className="hidden sm:inline-flex" />

            <Button 
              asChild 
              size="sm" 
              variant="outline" 
              className="hidden sm:inline-flex border-stone-200 dark:border-[#172433] text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-[#101D2B] rounded-xl text-xs font-semibold"
            >
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5 text-emerald-600 dark:text-[#19D3A2]" />
                {tHeader('add_person')}
              </Link>
            </Button>

            <Button 
              variant="destructive" 
              size="sm" 
              className="rounded-xl text-xs font-black px-3.5 h-8 sm:h-9 bg-rose-600 hover:bg-rose-700 text-white shadow-xs active:scale-95 transition-all"
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

        {/* INNER SCROLLABLE CONTENT */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 pb-24 md:pb-8">
          {children}
        </div>

        {/* ─── MOBILE BOTTOM TAB BAR (HIGH TOUCH UX) ───────────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/98 dark:bg-[#08162A]/98 backdrop-blur-lg border-t border-stone-200/80 dark:border-[#172433] px-2 pt-1.5 pb-2 flex items-center justify-around z-40 shadow-lg">
          {/* 1. Hoje */}
          <Link
            href={`/${locale}/dashboard`}
            className="flex flex-col items-center gap-0.5 min-w-[54px] group"
          >
            <div className={cn(
              'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
              pathname === `/${locale}/dashboard`
                ? 'bg-emerald-500/15 text-emerald-600 dark:text-[#19D3A2]'
                : 'text-stone-400 dark:text-slate-400 group-active:scale-95'
            )}>
              <LayoutDashboard className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname === `/${locale}/dashboard` ? 'text-emerald-700 dark:text-[#19D3A2]' : 'text-stone-500')}>
              Hoje
            </span>
          </Link>

          {/* 2. Atividades */}
          <Link
            href={`/${locale}/dashboard/activities`}
            className="flex flex-col items-center gap-0.5 min-w-[54px] group"
          >
            <div className={cn(
              'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
              pathname.includes('/activities')
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'text-stone-400 dark:text-slate-400 group-active:scale-95'
            )}>
              <Activity className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname.includes('/activities') ? 'text-amber-600' : 'text-stone-500')}>
              Atividades
            </span>
          </Link>

          {/* 3. Medicamentos */}
          <Link
            href={`/${locale}/dashboard/medications`}
            className="flex flex-col items-center gap-0.5 min-w-[54px] group"
          >
            <div className={cn(
              'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
              pathname.includes('/medications')
                ? 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                : 'text-stone-400 dark:text-slate-400 group-active:scale-95'
            )}>
              <Pill className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname.includes('/medications') ? 'text-sky-600' : 'text-stone-500')}>
              Remédios
            </span>
          </Link>

          {/* 4. Compras & Estoque */}
          <Link
            href={`/${locale}/dashboard/shopping`}
            className="flex flex-col items-center gap-0.5 min-w-[54px] group"
          >
            <div className={cn(
              'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
              pathname.includes('/shopping')
                ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                : 'text-stone-400 dark:text-slate-400 group-active:scale-95'
            )}>
              <ShoppingCart className="h-5 w-5" />
            </div>
            <span className={cn('text-[10px] font-bold', pathname.includes('/shopping') ? 'text-purple-600' : 'text-stone-500')}>
              Compras
            </span>
          </Link>

          {/* 5. Menu Drawer */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 min-w-[54px] group"
          >
            <div className="w-10 h-8 flex items-center justify-center rounded-xl text-stone-400 dark:text-slate-400 group-active:scale-95">
              <Menu className="h-5 w-5" />
            </div>
            <span className="text-[10px] font-bold text-stone-500">
              Menu
            </span>
          </button>
        </nav>

        {/* Global Floating Action Button */}
        <QuickActionFAB />

      </main>
    </div>
  );
}
