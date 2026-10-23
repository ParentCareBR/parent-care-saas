'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CaredPersonSelector } from '@/components/shared/CaredPersonSelector';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { GlobalAlarmClock, HostAlarmToggle } from '@/components/shared/GlobalAlarmClock';
import { useAuth } from '@/contexts/AuthContext';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { TrialBanner } from '@/components/billing/TrialBanner';
import { PaywallOverlay } from '@/components/billing/PaywallOverlay';
import {
  LayoutDashboard,
  Calendar,
  Activity,
  Heart,
  Folder,
  Users,
  Settings,
  HelpCircle,
  Sliders,
  LogOut,
  AlertTriangle,
  UserPlus,
  Menu,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Search,
  Bell,
  Sparkles,
  Pill,
  Utensils,
  ClipboardList,
  ShoppingCart,
  ShieldCheck,
  Receipt,
  ArrowLeftRight,
  BarChart3,
  CheckCircle2,
  Phone,
  Home,
  LayoutGrid,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { QuickActionFAB } from '@/components/shared/QuickActionFAB';
import { MobileCardMenu } from '@/components/layout/MobileCardMenu';

interface SubItem {
  name: string;
  href: string;
  icon?: any;
}

interface NavSection {
  title: string;
  href?: string;
  icon: any;
  exact?: boolean;
  subItems?: SubItem[];
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut, currentOrganizationId, user } = useAuth();
  const { selectedPerson, caredPeople, setSelectedPersonId } = useCaredPerson();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [entitlements, setEntitlements] = useState<any>(null);
  const [loadingCheckoutSeats, setLoadingCheckoutSeats] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Expanded sections state for sidebar
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    atividades: true,
    cuidados: false,
    organizacao: false,
    equipe: false,
    agenda: false,
  });

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
    return () => {
      isMounted = false;
    };
  }, [currentOrganizationId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // ── Navigation Sections from "Navegação Parent Care para cuidadores.png" ──
  const navSections: { key: string; section: NavSection }[] = [
    {
      key: 'hoje',
      section: {
        title: 'Hoje',
        href: `/${locale}/dashboard`,
        exact: true,
        icon: LayoutDashboard,
      },
    },
    {
      key: 'agenda',
      section: {
        title: 'Agenda',
        icon: Calendar,
        href: `/${locale}/dashboard/appointments`,
        subItems: [
          { name: 'Consultas médicas', href: `/${locale}/dashboard/appointments` },
          { name: 'Lista de tarefas', href: `/${locale}/dashboard/tasks` },
        ],
      },
    },
    {
      key: 'atividades',
      section: {
        title: 'Atividades',
        icon: Activity,
        href: `/${locale}/dashboard/activities`,
        subItems: [
          { name: 'Exercícios e aulas', href: `/${locale}/dashboard/activities` },
          { name: 'Lazer e encontros', href: `/${locale}/dashboard/activities` },
          { name: 'Projetos e memórias', href: `/${locale}/dashboard/memories` },
        ],
      },
    },
    {
      key: 'cuidados',
      section: {
        title: 'Cuidados',
        icon: Heart,
        href: `/${locale}/dashboard/medications`,
        subItems: [
          { name: 'Nina IA (Enfermeira 24h)', href: `/${locale}/dashboard/nina` },
          { name: 'Medicamentos & Horários', href: `/${locale}/dashboard/medications` },
          { name: 'Alimentação & Refeições', href: `/${locale}/dashboard/meals` },
          { name: 'Sinais vitais & Histórico', href: `/${locale}/dashboard/history` },
        ],
      },
    },
    {
      key: 'organizacao',
      section: {
        title: 'Organização',
        icon: Folder,
        href: `/${locale}/dashboard/shopping`,
        subItems: [
          { name: 'Compras & Suprimentos', href: `/${locale}/dashboard/shopping` },
          { name: 'Segurança do Lar', href: `/${locale}/dashboard/home-safety` },
          { name: 'Despesas & Finanças', href: `/${locale}/dashboard/expenses` },
        ],
      },
    },
    {
      key: 'equipe',
      section: {
        title: 'Equipe',
        icon: Users,
        href: `/${locale}/dashboard/handovers`,
        subItems: [
          { name: 'Passagens de Turno', href: `/${locale}/dashboard/handovers` },
          { name: 'Família & Cuidadores', href: `/${locale}/dashboard/family` },
          { name: 'Relatórios do Cuidado', href: `/${locale}/dashboard/reports` },
        ],
      },
    },
  ];

  // Helper to determine breadcrumb page title
  const getPageTitle = () => {
    if (pathname === `/${locale}/dashboard`) return 'Hoje';
    if (pathname.includes('/nina')) return 'Nina IA — Assistente de Saúde';
    if (pathname.includes('/appointments')) return 'Agenda';
    if (pathname.includes('/activities')) return 'Atividades';
    if (pathname.includes('/medications')) return 'Medicamentos';
    if (pathname.includes('/meals')) return 'Alimentação';
    if (pathname.includes('/tasks')) return 'Tarefas';
    if (pathname.includes('/shopping')) return 'Compras';
    if (pathname.includes('/home-safety')) return 'Segurança';
    if (pathname.includes('/memories')) return 'Memórias';
    if (pathname.includes('/expenses')) return 'Despesas';
    if (pathname.includes('/handovers')) return 'Passagem de Turno';
    if (pathname.includes('/family')) return 'Família & Equipe';
    if (pathname.includes('/reports')) return 'Relatórios';
    if (pathname.includes('/history')) return 'Histórico';
    if (pathname.includes('/settings')) return 'Configurações';
    if (pathname.includes('/cared-people')) return 'Perfil do Cuidado';
    if (pathname.includes('/emergency')) return 'SOS & Emergência';
    return 'Visão Geral';
  };

  const personDisplayName = selectedPerson
    ? selectedPerson.preferred_name || selectedPerson.full_name
    : 'Pessoa Cuidada';

  return (
    <div className="flex h-screen bg-[#F8F9FA] dark:bg-[#081220] overflow-hidden text-stone-900 dark:text-[#F1F5F9] font-sans antialiased">

      {/* ─── DESKTOP LEFT SIDEBAR (INSPIRADO EM LAYOUTS MODELO) ─────────────── */}
      <aside className="w-64 bg-white dark:bg-[#0C1728] border-r border-[#E5E7EB] dark:border-[#1E293B] flex-col hidden md:flex shrink-0 z-20 shadow-2xs">
        
        {/* LOGO & BRAND */}
        <div className="px-5 py-4 border-b border-[#F1F5F9] dark:border-[#1E293B]">
          <Link href={`/${locale}/dashboard`} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-[#0F4C3A]/10 dark:bg-emerald-500/20 border border-[#0F4C3A]/20 dark:border-emerald-500/40 flex items-center justify-center text-[#0F4C3A] dark:text-emerald-400 group-hover:scale-105 transition-transform shadow-2xs">
              <Heart className="h-5 w-5 fill-[#0F4C3A] dark:fill-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-black text-stone-900 dark:text-white tracking-tight leading-none">
                  Parent Care
                </h1>
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10B981] animate-pulse" title="Sistema Online" />
              </div>
              <p className="text-[10px] text-stone-400 dark:text-slate-400 font-medium leading-none mt-1">
                Gestão de Vida & Cuidado
              </p>
            </div>
          </Link>
        </div>

        {/* CARD ACOMPANHANDO (SELETOR DE PESSOA) */}
        <div className="p-3 border-b border-[#F1F5F9] dark:border-[#1E293B] bg-[#FAFBF9] dark:bg-[#0E1A2C] space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-stone-400 dark:text-slate-400 uppercase tracking-wider font-extrabold">
              Acompanhando
            </span>
            <Link
              href={`/${locale}/dashboard/cared-people/new`}
              className="text-[11px] text-[#0F4C3A] dark:text-emerald-400 hover:underline flex items-center gap-0.5 font-bold"
              title="Cadastrar nova pessoa cuidada"
            >
              + Novo
            </Link>
          </div>

          <CaredPersonSelector />

          {selectedPerson && (
            <div className="flex items-center gap-1.5 pt-0.5">
              <Link
                href={`/${locale}/care/${selectedPerson.id}`}
                target="_blank"
                className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 border border-emerald-200 dark:border-emerald-500/30 text-[#0F4C3A] dark:text-emerald-300 text-[11px] font-bold transition shadow-2xs"
                title="Abrir tela simplificada para o idoso"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Modo Idoso</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
              <a
                href={selectedPerson?.phone || selectedPerson?.whatsapp_phone 
                  ? `https://wa.me/${(selectedPerson.whatsapp_phone || selectedPerson.phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${selectedPerson.full_name.split(' ')[0]}, tudo bem? Como você está hoje?`)}`
                  : 'https://web.whatsapp.com'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700/60 text-[#128C7E] dark:text-[#25D366] text-[11px] font-bold transition shadow-2xs"
                title="Conversar direto no WhatsApp"
              >
                <MessageSquare className="h-3 w-3 text-[#25D366]" />
                <span>WhatsApp</span>
              </a>
            </div>
          )}
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
          {navSections.map(({ key, section }) => {
            const Icon = section.icon;
            const isDirectActive = section.exact
              ? pathname === section.href
              : section.href && (pathname === section.href || (section.href !== `/${locale}/dashboard` && pathname.startsWith(section.href)));
            
            const hasSubItems = section.subItems && section.subItems.length > 0;
            const isSubActive = hasSubItems && section.subItems!.some(sub => pathname === sub.href || pathname.startsWith(`${sub.href}/`));
            const isExpanded = expandedSections[key] || isSubActive;

            // Direct link (like "Hoje")
            if (!hasSubItems) {
              return (
                <Link
                  key={key}
                  href={section.href || `/${locale}/dashboard`}
                  className={cn(
                    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-bold transition-all group',
                    isDirectActive
                      ? 'bg-[#0F4C3A] text-white shadow-xs'
                      : 'text-stone-700 dark:text-slate-300 hover:bg-[#F3F4F6] dark:hover:bg-[#16253C] hover:text-stone-900 dark:hover:text-white'
                  )}
                >
                  <Icon className={cn('h-4 w-4 shrink-0', isDirectActive ? 'text-white' : 'text-stone-500 dark:text-slate-400 group-hover:text-stone-900 dark:group-hover:text-white')} />
                  <span>{section.title}</span>
                </Link>
              );
            }

            // Expandable item (like "Atividades", "Cuidados", "Organização", "Equipe")
            return (
              <div key={key} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() => toggleSection(key)}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-sm font-semibold transition-all group',
                    isSubActive
                      ? 'text-[#0F4C3A] dark:text-emerald-400 font-bold bg-[#0F4C3A]/5 dark:bg-emerald-500/10'
                      : 'text-stone-700 dark:text-slate-300 hover:bg-[#F3F4F6] dark:hover:bg-[#16253C] hover:text-stone-900 dark:hover:text-white'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={cn('h-4 w-4 shrink-0', isSubActive ? 'text-[#0F4C3A] dark:text-emerald-400' : 'text-stone-500 dark:text-slate-400')} />
                    <span>{section.title}</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 text-stone-400 transition-transform duration-200',
                      isExpanded ? 'rotate-180' : ''
                    )}
                  />
                </button>

                {/* Sub items */}
                {isExpanded && (
                  <div className="pl-9 pr-1 py-1 space-y-0.5 border-l-2 border-stone-200 dark:border-stone-700 ml-5 my-0.5">
                    {section.subItems!.map((sub) => {
                      const isActive = pathname === sub.href || pathname.startsWith(`${sub.href}/`);
                      return (
                        <Link
                          key={sub.name}
                          href={sub.href}
                          className={cn(
                            'block px-2.5 py-1.5 rounded-lg text-xs transition-all',
                            isActive
                              ? 'bg-[#0F4C3A]/10 dark:bg-emerald-500/20 text-[#0F4C3A] dark:text-emerald-300 font-bold'
                              : 'text-stone-600 dark:text-slate-400 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-white/5 font-medium'
                          )}
                        >
                          {sub.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          <div className="pt-3 pb-1 border-t border-stone-100 dark:border-[#1E293B] my-2" />

          {/* Secondary links */}
          <Link
            href={`/${locale}/dashboard/settings/monitoring`}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-slate-400 hover:bg-[#F3F4F6] dark:hover:bg-[#16253C] hover:text-stone-900 dark:hover:text-white transition-all',
              pathname.includes('/settings/monitoring') ? 'bg-stone-200/70 dark:bg-stone-800 text-stone-900 dark:text-white font-bold' : ''
            )}
          >
            <Sliders className="h-4 w-4 text-stone-400 shrink-0" />
            <span>Personalizar menu</span>
          </Link>

          <Link
            href={`/${locale}/dashboard/settings/subscription`}
            className={cn(
              'flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold transition-all group',
              pathname.includes('/subscription')
                ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold'
                : 'text-stone-600 dark:text-slate-400 hover:bg-[#F3F4F6] dark:hover:bg-[#16253C] hover:text-stone-900 dark:hover:text-white'
            )}
          >
            <div className="flex items-center gap-3">
              <Sparkles className="h-4 w-4 text-amber-500 shrink-0" />
              <span>Plano & Assinatura</span>
            </div>
            <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-900/50">
              SaaS
            </span>
          </Link>

          <Link
            href={`/${locale}/dashboard/settings`}
            className={cn(
              'flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-semibold text-stone-600 dark:text-slate-400 hover:bg-[#F3F4F6] dark:hover:bg-[#16253C] hover:text-stone-900 dark:hover:text-white transition-all',
              pathname === `/${locale}/dashboard/settings` ? 'bg-stone-200/70 dark:bg-stone-800 text-stone-900 dark:text-white font-bold' : ''
            )}
          >
            <Settings className="h-4 w-4 text-stone-400 shrink-0" />
            <span>Configurações</span>
          </Link>
        </nav>

        {/* SIDEBAR FOOTER (USER PROFILE) */}
        <div className="p-3 border-t border-[#F1F5F9] dark:border-[#1E293B] bg-[#FAFBF9] dark:bg-[#0A1424] relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((v) => !v)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-stone-100 dark:hover:bg-white/5 transition-all text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#0F4C3A] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-stone-900 dark:text-white truncate leading-tight">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-[10px] text-stone-400 dark:text-slate-400 leading-tight">
                  Familiar / Cuidador
                </p>
              </div>
            </div>
            <ChevronDown className={cn('h-3.5 w-3.5 text-stone-400 transition-transform', userMenuOpen ? 'rotate-180' : '')} />
          </button>

          {/* User Popover Menu */}
          {userMenuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-[#0E1A2C] border border-stone-200 dark:border-[#1E293B] rounded-2xl shadow-xl p-1.5 space-y-0.5 z-50">
              <Link
                href={`/${locale}/dashboard/settings`}
                onClick={() => setUserMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-white/5"
              >
                <Settings className="h-3.5 w-3.5 text-stone-400" />
                <span>Minha Conta</span>
              </Link>
              <button
                onClick={() => {
                  setUserMenuOpen(false);
                  signOut();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-500" />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ─── MOBILE CARD MENU MODAL (CARD HUB) ────────────────────────────────── */}
      <MobileCardMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        locale={locale}
        selectedPerson={selectedPerson}
        signOut={signOut}
      />

      {/* ─── MAIN CONTENT VIEWPORT ───────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* DESKTOP TOP HEADER (Breadcrumb + Search + Controls) */}
        <header className="hidden md:flex bg-white dark:bg-[#0C1728] border-b border-[#E5E7EB] dark:border-[#1E293B] px-6 py-2.5 items-center justify-between shrink-0 z-10 shadow-2xs">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-slate-400">
            <span className="font-semibold text-stone-700 dark:text-slate-300">{personDisplayName}</span>
            <span>/</span>
            <span className="font-bold text-stone-900 dark:text-white">{getPageTitle()}</span>
          </div>

          {/* Search bar */}
          <div className="flex-1 max-w-md mx-6">
            <div className="relative">
              <Search className="h-4 w-4 text-stone-400 dark:text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar no Parent Care (remédios, consultas, tarefas)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F3F4F6] dark:bg-[#16253C] border border-transparent focus:border-[#0F4C3A] dark:focus:border-emerald-400 rounded-full pl-9 pr-4 py-1.5 text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-slate-400 focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* Controls right */}
          <div className="flex items-center gap-2.5">
            <HostAlarmToggle />
            <LanguageSwitcher />
            <ThemeToggle />

            {/* Notifications Bell */}
            <Link
              href={`/${locale}/dashboard/history`}
              className="p-2 rounded-xl text-stone-600 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors relative"
              title="Notificações & Avisos"
            >
              <Bell className="h-4 w-4" />
              <span className="w-2 h-2 rounded-full bg-emerald-500 absolute top-1.5 right-1.5 ring-2 ring-white dark:ring-[#0C1728]" />
            </Link>

            {/* Quick add person */}
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-stone-200 dark:border-stone-700 text-stone-700 dark:text-slate-300 hover:bg-stone-100 dark:hover:bg-white/10 rounded-xl text-xs font-semibold h-8"
            >
              <Link href={`/${locale}/dashboard/cared-people/new`}>
                <UserPlus className="h-3.5 w-3.5 mr-1.5 text-[#0F4C3A] dark:text-emerald-400" />
                {tHeader('add_person')}
              </Link>
            </Button>

            {/* Emergency SOS button */}
            <Button
              variant="destructive"
              size="sm"
              className="rounded-xl text-xs font-black px-3.5 h-8 bg-rose-600 hover:bg-rose-700 text-white shadow-2xs active:scale-95 transition-all"
              asChild
            >
              <Link href={`/${locale}/dashboard/emergency`}>
                <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />
                {tHeader('emergency')}
              </Link>
            </Button>
          </div>
        </header>

        {/* MOBILE TOP HEADER */}
        <header className="md:hidden bg-white dark:bg-[#0C1728] border-b border-[#E5E7EB] dark:border-[#1E293B] px-4 py-2.5 flex items-center justify-between shrink-0 z-10 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href={`/${locale}/dashboard`} className="flex items-center gap-2 shrink-0">
              <div className="w-8 h-8 rounded-xl bg-[#0F4C3A]/10 dark:bg-emerald-500/20 border border-[#0F4C3A]/20 flex items-center justify-center text-[#0F4C3A] dark:text-emerald-400">
                <Heart className="h-4 w-4 fill-[#0F4C3A] dark:fill-emerald-400" />
              </div>
              <span className="font-black text-stone-900 dark:text-white text-base tracking-tight">Parent Care</span>
            </Link>
            {selectedPerson && (
              <span className="text-xs text-stone-500 dark:text-slate-400 truncate max-w-[110px]">
                • {selectedPerson.full_name.split(' ')[0]}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <ThemeToggle />
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

        {/* PAYWALL / TRIAL BANNERS */}
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

        {/* SCROLLABLE MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-5 pb-24 md:pb-8">
          {children}
        </main>

        {/* ─── MOBILE BOTTOM NAV BAR (ESTILO NAVEGAÇÃO MODELO) ─────────────── */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#0C1728] backdrop-blur-md border-t-2 border-stone-200 dark:border-[#1E3A5F] px-2 pt-1.5 pb-2 flex items-center justify-around z-40 shadow-lg">
          {/* 1. Início */}
          <Link
            href={`/${locale}/dashboard`}
            className="flex flex-col items-center gap-0.5 min-w-[50px] group"
          >
            <div
              className={cn(
                'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
                pathname === `/${locale}/dashboard`
                  ? 'bg-[#0F4C3A] text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-200'
              )}
            >
              <Home className="h-5 w-5" />
            </div>
            <span
              className={cn(
                'text-[11px] font-bold',
                pathname === `/${locale}/dashboard`
                  ? 'text-[#0F4C3A] dark:text-emerald-400'
                  : 'text-stone-700 dark:text-slate-200'
              )}
            >
              Início
            </span>
          </Link>

          {/* 2. Agenda */}
          <Link
            href={`/${locale}/dashboard/appointments`}
            className="flex flex-col items-center gap-0.5 min-w-[50px] group"
          >
            <div
              className={cn(
                'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
                pathname.includes('/appointments')
                  ? 'bg-[#0F4C3A] text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-200'
              )}
            >
              <Calendar className="h-5 w-5" />
            </div>
            <span
              className={cn(
                'text-[11px] font-bold',
                pathname.includes('/appointments')
                  ? 'text-[#0F4C3A] dark:text-emerald-400'
                  : 'text-stone-700 dark:text-slate-200'
              )}
            >
              Agenda
            </span>
          </Link>

          {/* 3. Medicamentos */}
          <Link
            href={`/${locale}/dashboard/medications`}
            className="flex flex-col items-center gap-0.5 min-w-[50px] group"
          >
            <div
              className={cn(
                'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
                pathname.includes('/medications')
                  ? 'bg-[#0F4C3A] text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-200'
              )}
            >
              <Pill className="h-5 w-5" />
            </div>
            <span
              className={cn(
                'text-[11px] font-bold',
                pathname.includes('/medications')
                  ? 'text-[#0F4C3A] dark:text-emerald-400'
                  : 'text-stone-700 dark:text-slate-200'
              )}
            >
              Remédios
            </span>
          </Link>

          {/* 4. Nina IA */}
          <Link
            href={`/${locale}/dashboard/nina`}
            className="flex flex-col items-center gap-0.5 min-w-[50px] group"
          >
            <div
              className={cn(
                'w-10 h-8 flex items-center justify-center rounded-xl transition-all',
                pathname.includes('/nina')
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                  : 'text-stone-600 dark:text-slate-200'
              )}
            >
              <Sparkles className="h-5 w-5" />
            </div>
            <span
              className={cn(
                'text-[11px] font-bold',
                pathname.includes('/nina')
                  ? 'text-sky-600 dark:text-sky-400 font-extrabold'
                  : 'text-stone-700 dark:text-slate-200'
              )}
            >
              Nina IA
            </span>
          </Link>

          {/* 5. Todos os Cards / Início */}
          <Link
            href={`/${locale}/dashboard`}
            className="flex flex-col items-center gap-0.5 min-w-[50px] group"
          >
            <div
              className={cn(
                'w-10 h-8 flex items-center justify-center rounded-xl text-stone-600 dark:text-slate-200 group-active:scale-95 transition-all',
                pathname === `/${locale}/dashboard` ? 'bg-stone-100 dark:bg-stone-800' : ''
              )}
            >
              <LayoutGrid className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-stone-700 dark:text-slate-200">
              Cards
            </span>
          </Link>
        </nav>

        {/* Global Floating Action Button */}
        <QuickActionFAB />

        {/* Global Audible Alarm Clock Engine */}
        <GlobalAlarmClock locale={locale} />
      </div>
    </div>
  );
}
