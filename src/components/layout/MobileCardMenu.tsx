'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  X, 
  Search, 
  Heart, 
  Pill, 
  Utensils, 
  Calendar, 
  Activity, 
  ShoppingCart, 
  ShieldCheck, 
  Sparkles, 
  Receipt, 
  ArrowLeftRight, 
  Users, 
  BarChart3, 
  Settings, 
  Sliders, 
  ExternalLink, 
  MessageSquare, 
  AlertTriangle, 
  LogOut, 
  CreditCard,
  ChevronRight,
  LayoutDashboard,
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export interface MobileCardMenuProps {
  isOpen: boolean;
  onClose: () => void;
  locale: string;
  selectedPerson?: any;
  signOut: () => void;
}

type CategoryFilter = 'all' | 'health' | 'home' | 'team';

interface MenuItemCard {
  id: string;
  name: string;
  subtitle: string;
  href: string;
  icon: any;
  category: 'health' | 'home' | 'team' | 'general';
  categoryLabel: string;
  accentColor: string;
  bgColor: string;
  borderColor: string;
  badge?: string;
  isExternal?: boolean;
}

export function MobileCardMenu({
  isOpen,
  onClose,
  locale,
  selectedPerson,
  signOut,
}: MobileCardMenuProps) {
  const pathname = usePathname();
  const tNav = useTranslations('DashboardNav');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');

  const menuItems: MenuItemCard[] = useMemo(() => [
    // ─── ROTINA & SAÚDE ───
    {
      id: 'overview',
      name: tNav('overview') || 'Visão Geral',
      subtitle: 'Resumo e métricas do dia',
      href: `/${locale}/dashboard`,
      icon: LayoutDashboard,
      category: 'health',
      categoryLabel: 'Rotina',
      accentColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500',
      badge: 'Hoje',
    },
    {
      id: 'medications',
      name: tNav('medications') || 'Medicamentos',
      subtitle: 'Prescrições, doses e horários',
      href: `/${locale}/dashboard/medications`,
      icon: Pill,
      category: 'health',
      categoryLabel: 'Saúde',
      accentColor: 'text-sky-500',
      bgColor: 'bg-sky-500/10 dark:bg-sky-500/15',
      borderColor: 'border-sky-500/30 hover:border-sky-500',
      badge: 'Doses',
    },
    {
      id: 'meals',
      name: tNav('meals') || 'Alimentação',
      subtitle: 'Refeições, apetite e hidratação',
      href: `/${locale}/dashboard/meals`,
      icon: Utensils,
      category: 'health',
      categoryLabel: 'Rotina',
      accentColor: 'text-amber-500',
      bgColor: 'bg-amber-500/10 dark:bg-amber-500/15',
      borderColor: 'border-amber-500/30 hover:border-amber-500',
      badge: 'Dieta',
    },
    {
      id: 'appointments',
      name: tNav('appointments') || 'Agenda & Consultas',
      subtitle: 'Médicos, exames e retornos',
      href: `/${locale}/dashboard/appointments`,
      icon: Calendar,
      category: 'health',
      categoryLabel: 'Saúde',
      accentColor: 'text-indigo-500',
      bgColor: 'bg-indigo-500/10 dark:bg-indigo-500/15',
      borderColor: 'border-indigo-500/30 hover:border-indigo-500',
      badge: 'Médicos',
    },
    {
      id: 'activities',
      name: tNav('activities') || 'Atividades & Físico',
      subtitle: 'Fisioterapia, caminhada e lazer',
      href: `/${locale}/dashboard/activities`,
      icon: Activity,
      category: 'health',
      categoryLabel: 'Saúde',
      accentColor: 'text-teal-500',
      bgColor: 'bg-teal-500/10 dark:bg-teal-500/15',
      borderColor: 'border-teal-500/30 hover:border-teal-500',
      badge: 'Corpo',
    },

    // ─── O LAR & FAMÍLIA ───
    {
      id: 'shopping',
      name: tNav('shopping') || 'Compras & Estoque',
      subtitle: 'Fraldas, remédios e despensa',
      href: `/${locale}/dashboard/shopping`,
      icon: ShoppingCart,
      category: 'home',
      categoryLabel: 'O Lar',
      accentColor: 'text-purple-500',
      bgColor: 'bg-purple-500/10 dark:bg-purple-500/15',
      borderColor: 'border-purple-500/30 hover:border-purple-500',
      badge: 'Estoque',
    },
    {
      id: 'homeSafety',
      name: tNav('homeSafety') || 'Segurança do Lar',
      subtitle: 'Checklist contra quedas e riscos',
      href: `/${locale}/dashboard/home-safety`,
      icon: ShieldCheck,
      category: 'home',
      categoryLabel: 'O Lar',
      accentColor: 'text-emerald-600',
      bgColor: 'bg-emerald-600/10 dark:bg-emerald-600/15',
      borderColor: 'border-emerald-600/30 hover:border-emerald-600',
      badge: 'Prevenção',
    },
    {
      id: 'memories',
      name: tNav('memories') || 'Memórias & Histórias',
      subtitle: 'Álbum de fotos e recordações',
      href: `/${locale}/dashboard/memories`,
      icon: Sparkles,
      category: 'home',
      categoryLabel: 'Família',
      accentColor: 'text-pink-500',
      bgColor: 'bg-pink-500/10 dark:bg-pink-500/15',
      borderColor: 'border-pink-500/30 hover:border-pink-500',
      badge: 'Álbum',
    },
    {
      id: 'expenses',
      name: tNav('expenses') || 'Controle Financeiro',
      subtitle: 'Receitas, despesas e farmácia',
      href: `/${locale}/dashboard/expenses`,
      icon: Receipt,
      category: 'home',
      categoryLabel: 'Finanças',
      accentColor: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10 dark:bg-emerald-500/15',
      borderColor: 'border-emerald-500/30 hover:border-emerald-500',
      badge: 'R$',
    },

    // ─── EQUIPE & GESTÃO ───
    {
      id: 'handovers',
      name: tNav('handovers') || 'Passagem de Turno',
      subtitle: 'Comunicação entre cuidadores',
      href: `/${locale}/dashboard/handovers`,
      icon: ArrowLeftRight,
      category: 'team',
      categoryLabel: 'Equipe',
      accentColor: 'text-blue-500',
      bgColor: 'bg-blue-500/10 dark:bg-blue-500/15',
      borderColor: 'border-blue-500/30 hover:border-blue-500',
      badge: 'Turno',
    },
    {
      id: 'family',
      name: tNav('family') || 'Família & Rede',
      subtitle: 'Contatos e cuidadores cadastrados',
      href: `/${locale}/dashboard/family`,
      icon: Users,
      category: 'team',
      categoryLabel: 'Equipe',
      accentColor: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10 dark:bg-cyan-500/15',
      borderColor: 'border-cyan-500/30 hover:border-cyan-500',
      badge: 'Apoio',
    },
    {
      id: 'reports',
      name: tNav('reports') || 'Relatórios & Padrões',
      subtitle: 'Evolução clínica e estatísticas',
      href: `/${locale}/dashboard/reports`,
      icon: BarChart3,
      category: 'team',
      categoryLabel: 'Gestão',
      accentColor: 'text-violet-500',
      bgColor: 'bg-violet-500/10 dark:bg-violet-500/15',
      borderColor: 'border-violet-500/30 hover:border-violet-500',
      badge: 'Análise',
    },
    {
      id: 'monitoring',
      name: tNav('monitoring') || 'Módulos & Ajustes',
      subtitle: 'Ativar ou desativar funções',
      href: `/${locale}/dashboard/settings/monitoring`,
      icon: Sliders,
      category: 'team',
      categoryLabel: 'Ajustes',
      accentColor: 'text-zinc-500',
      bgColor: 'bg-zinc-500/10 dark:bg-zinc-500/15',
      borderColor: 'border-zinc-500/30 hover:border-zinc-500',
      badge: 'Config',
    },
    {
      id: 'settings',
      name: tNav('settings') || 'Configurações',
      subtitle: 'Preferências gerais e perfil',
      href: `/${locale}/dashboard/settings`,
      icon: Settings,
      category: 'team',
      categoryLabel: 'Geral',
      accentColor: 'text-slate-500',
      bgColor: 'bg-slate-500/10 dark:bg-slate-500/15',
      borderColor: 'border-slate-500/30 hover:border-slate-500',
      badge: 'Preferências',
    },
  ], [locale, tNav]);

  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
      const matchesSearch = 
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.categoryLabel.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/70 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* ─── MODAL CONTAINER ─── */}
      <div className="relative w-full h-full max-w-2xl mx-auto bg-stone-50 dark:bg-[#07111F] text-stone-900 dark:text-[#F8FAFC] flex flex-col shadow-2xl overflow-hidden sm:my-6 sm:h-[92vh] sm:rounded-3xl border border-stone-200 dark:border-[#172433]">
        
        {/* ─── HEADER ─── */}
        <header className="px-5 pt-4 pb-3 border-b border-stone-200/80 dark:border-[#172433] bg-white dark:bg-[#08162A] shrink-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 dark:bg-[#19D3A2]/20 border border-emerald-500/30 dark:border-[#19D3A2]/40 flex items-center justify-center text-emerald-600 dark:text-[#19D3A2] shadow-xs">
                <Heart className="h-5 w-5 fill-emerald-500 dark:fill-[#19D3A2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-base font-black tracking-tight text-stone-900 dark:text-white">
                    Central de Módulos
                  </h2>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-[#5DE5BE]">
                    Cards Interativos
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 dark:text-slate-400">
                  {selectedPerson ? `Navegação para ${selectedPerson.full_name}` : 'Acesse qualquer área com um toque'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-stone-100 hover:bg-stone-200 dark:bg-[#101D2B] dark:hover:bg-[#172433] text-stone-600 dark:text-slate-300 flex items-center justify-center transition-all active:scale-95"
              aria-label="Fechar Menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* ─── SEARCH INPUT ─── */}
          <div className="relative mb-2.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Buscar remédio, agenda, compras, finanças..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-200 dark:border-[#172433] bg-stone-50 dark:bg-[#101D2B] text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-stone-400 hover:text-stone-600"
              >
                Limpar
              </button>
            )}
          </div>

          {/* ─── CATEGORY FILTER CHIPS (INSPIRADO NOS LAYOUTS MODELO) ─── */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1">
            {[
              { id: 'all', label: `• Todos (${menuItems.length})` },
              { id: 'health', label: 'Rotina & Saúde' },
              { id: 'home', label: 'O Lar & Família' },
              { id: 'team', label: 'Equipe & Gestão' },
            ].map((chip) => {
              const isSelected = activeCategory === chip.id;
              return (
                <button
                  key={chip.id}
                  onClick={() => setActiveCategory(chip.id as CategoryFilter)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0',
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-stone-100 dark:bg-[#101D2B] text-stone-600 dark:text-slate-400 hover:bg-stone-200 dark:hover:bg-[#172433]'
                  )}
                >
                  {chip.label}
                </button>
              );
            })}
          </div>
        </header>

        {/* ─── QUICK SHORTCUT BANNER: MODO IDOSO + WHATSAPP IA ─── */}
        {selectedPerson && (
          <div className="px-5 pt-3 pb-1 shrink-0 grid grid-cols-2 gap-2">
            <Link
              href={`/${locale}/care/${selectedPerson.id}`}
              target="_blank"
              onClick={onClose}
              className="flex items-center gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/80 dark:border-amber-900/50 hover:border-amber-400 transition-all group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Heart className="h-4 w-4 fill-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-amber-900 dark:text-amber-200 truncate">Modo Idoso</p>
                <p className="text-[10px] text-amber-700 dark:text-amber-400 flex items-center gap-0.5">
                  Botões Grandes <ExternalLink className="h-2.5 w-2.5" />
                </p>
              </div>
            </Link>

            <Link
              href={`/${locale}/dashboard/cared-people/${selectedPerson.id}?tab=whatsapp`}
              onClick={onClose}
              className="flex items-center gap-2 p-2.5 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-400 transition-all group shadow-2xs"
            >
              <div className="w-8 h-8 rounded-xl bg-[#25D366]/20 text-[#128C7E] dark:text-[#25D366] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <MessageSquare className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-emerald-900 dark:text-emerald-200 truncate">WhatsApp IA</p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400 truncate">Assistente 24h</p>
              </div>
            </Link>
          </div>
        )}

        {/* ─── SCROLLABLE CARDS GRID ─── */}
        <div className="flex-1 overflow-y-auto px-5 py-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {filteredItems.map((item) => {
              const isActive = item.href === `/${locale}/dashboard`
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'relative flex flex-col justify-between p-3.5 rounded-2xl border transition-all active:scale-[0.98] group shadow-2xs',
                    isActive
                      ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-[#0d1c32] border-stone-200/80 dark:border-[#172433] hover:border-stone-300 dark:hover:border-slate-700'
                  )}
                >
                  {/* Top Bar inside Card: Category Badge + Active status */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-stone-100 dark:bg-[#172433] text-stone-500 dark:text-slate-400">
                      {item.categoryLabel}
                    </span>
                    {isActive ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-[#19D3A2]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Ativo
                      </span>
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-stone-300 dark:text-slate-600 group-hover:text-stone-500 dark:group-hover:text-slate-400 transition-colors" />
                    )}
                  </div>

                  {/* Centered / Prominent Icon Box (Inspirado no layout de Categorias) */}
                  <div className="my-1.5 flex items-center gap-2.5">
                    <div className={cn(
                      'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 shadow-xs',
                      item.bgColor
                    )}>
                      <Icon className={cn('h-5 w-5', item.accentColor)} />
                    </div>
                  </div>

                  {/* Title & Subtitle */}
                  <div className="mt-1">
                    <h3 className={cn(
                      'text-xs font-black leading-tight line-clamp-1',
                      isActive ? 'text-emerald-900 dark:text-[#5DE5BE]' : 'text-stone-900 dark:text-white'
                    )}>
                      {item.name}
                    </h3>
                    <p className="text-[10px] text-stone-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {item.subtitle}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {filteredItems.length === 0 && (
            <div className="py-12 text-center text-stone-400 dark:text-slate-500">
              <p className="text-sm font-semibold">Nenhum módulo encontrado para &quot;{searchQuery}&quot;</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="mt-2 text-xs font-bold text-emerald-600 dark:text-[#19D3A2] hover:underline"
              >
                Limpar busca
              </button>
            </div>
          )}
        </div>

        {/* ─── FOOTER WITH SOS & LOGOUT ─── */}
        <footer className="px-5 py-3 border-t border-stone-200/80 dark:border-[#172433] bg-white dark:bg-[#08162A] shrink-0 flex items-center justify-between gap-3">
          <Link
            href={`/${locale}/dashboard/emergency`}
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-md active:scale-95 transition-all"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>SOS Emergência</span>
          </Link>

          <Link
            href={`/${locale}/dashboard/settings/subscription`}
            onClick={onClose}
            className="flex items-center gap-1.5 py-2.5 px-3 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-300/40 text-xs font-bold transition-all"
          >
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Assinatura</span>
          </Link>

          <button
            onClick={() => { onClose(); signOut(); }}
            className="flex items-center gap-1.5 py-2.5 px-3 rounded-2xl bg-stone-100 hover:bg-stone-200 dark:bg-[#101D2B] dark:hover:bg-[#172433] text-stone-700 dark:text-slate-300 text-xs font-bold transition-all"
          >
            <LogOut className="h-4 w-4 text-rose-500" />
            <span>Sair</span>
          </button>
        </footer>

      </div>
    </div>
  );
}
