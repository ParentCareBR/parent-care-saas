'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Pill,
  Utensils,
  Stethoscope,
  Activity,
  HeartPulse,
  Droplet,
  Gamepad2,
  ClipboardList,
  Sparkles,
  DollarSign,
  ShoppingCart,
  ArrowLeftRight,
  Footprints,
  Users,
  UserCheck,
  FileText,
  Clock,
  ShieldCheck,
  Heart,
  Sliders,
  MessageSquare,
  AlertTriangle,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getDashboardTexts } from '@/lib/i18n/dashboard-translations';

export interface MobileMacroMicroCardsProps {
  locale: string;
  selectedPerson?: any;
  caredPeople?: any[];
  medsData?: { taken: number; total: number; list: any[] };
  hydration?: { cups: number; goal: number };
  userName?: string;
  onQuickLogWater?: () => void;
  onOpenVitalsModal?: () => void;
  isCareMode?: boolean;
  onNavigateTab?: (tab: 'home' | 'routine' | 'games' | 'actions' | 'finances') => void;
  onOpenNina?: () => void;
  onOpenEmergency?: () => void;
  onRequestCall?: () => void;
  onLogMeal?: () => void;
}

export interface GridCardItem {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  bgColor: string;
  badge?: string;
  isExternal?: boolean;
  onClick?: () => void;
}

export function MobileMacroMicroCards({
  locale,
  selectedPerson,
  medsData = { taken: 0, total: 0, list: [] },
  hydration = { cups: 0, goal: 8 },
  userName = 'Cuidador',
  onQuickLogWater,
  onOpenVitalsModal,
  isCareMode = false,
  onNavigateTab,
  onOpenNina,
  onOpenEmergency,
  onRequestCall,
  onLogMeal,
}: MobileMacroMicroCardsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const tDash = getDashboardTexts(locale);

  const personId = selectedPerson?.id || '';
  const firstName = selectedPerson?.full_name ? selectedPerson.full_name.split(' ')[0] : 'Idoso';
  const personPhone = selectedPerson?.whatsapp_phone || selectedPerson?.phone || '';

  // ── Grid of 24 Cards strictly matching the 3-column layout in the user's reference image ──
  const allCards: GridCardItem[] = useMemo(() => [
    // 1. Agenda
    {
      id: 'agenda',
      title: tDash.cards.agenda.title,
      icon: Calendar,
      href: isCareMode ? '' : `/${locale}/dashboard/appointments`,
      onClick: isCareMode ? () => onNavigateTab?.('routine') : undefined,
      bgColor: 'bg-[#22C55E] hover:bg-[#16A34A]',
    },
    // 2. Medicamentos
    {
      id: 'medicamentos',
      title: tDash.cards.medications.title,
      icon: Pill,
      href: isCareMode ? '' : `/${locale}/dashboard/medications`,
      onClick: isCareMode ? () => onNavigateTab?.('routine') : undefined,
      bgColor: 'bg-[#06B6D4] hover:bg-[#0891B2]',
      badge: medsData.total > 0 ? `${medsData.taken}/${medsData.total}` : undefined,
    },
    // 3. Alimentação
    {
      id: 'alimentacao',
      title: tDash.cards.meals.title,
      icon: Utensils,
      href: isCareMode ? '' : `/${locale}/dashboard/meals`,
      onClick: isCareMode ? (onLogMeal || (() => onNavigateTab?.('routine'))) : undefined,
      bgColor: 'bg-[#F97316] hover:bg-[#EA580C]',
    },

    // 4. Consultas
    {
      id: 'consultas',
      title: tDash.cards.appointments.title,
      icon: Stethoscope,
      href: isCareMode ? '' : `/${locale}/dashboard/appointments`,
      onClick: isCareMode ? () => onNavigateTab?.('routine') : undefined,
      bgColor: 'bg-[#0284C7] hover:bg-[#0369A1]',
    },
    // 5. Atividades
    {
      id: 'atividades',
      title: tDash.cards.activities.title,
      icon: Activity,
      href: isCareMode ? '' : `/${locale}/dashboard/activities`,
      onClick: isCareMode ? () => onNavigateTab?.('routine') : undefined,
      bgColor: 'bg-[#A855F7] hover:bg-[#9333EA]',
    },
    // 6. Sinais Vitais
    {
      id: 'sinais-vitais',
      title: tDash.cards.vitals.title,
      icon: HeartPulse,
      href: isCareMode ? '' : `/${locale}/dashboard/history`,
      bgColor: 'bg-[#EAB308] hover:bg-[#CA8A04]',
      onClick: onOpenVitalsModal || (isCareMode ? () => onNavigateTab?.('actions') : undefined),
    },

    // 7. Hidratação
    {
      id: 'hidratacao',
      title: tDash.cards.hydration.title,
      icon: Droplet,
      href: isCareMode ? '' : `/${locale}/dashboard/meals`,
      onClick: onQuickLogWater,
      bgColor: 'bg-[#0D9488] hover:bg-[#0F766E]',
      badge: tDash.cards.hydration.badge(hydration.cups),
    },
    // 8. Jogos Cognitivos
    {
      id: 'jogos',
      title: tDash.cards.games.title,
      icon: Gamepad2,
      href: isCareMode ? '' : `/${locale}/dashboard/games`,
      onClick: isCareMode ? () => onNavigateTab?.('games') : undefined,
      bgColor: 'bg-[#EC4899] hover:bg-[#DB2777]',
      badge: tDash.cards.games.badge,
    },
    // 9. Tarefas
    {
      id: 'tarefas',
      title: tDash.cards.tasks.title,
      icon: ClipboardList,
      href: isCareMode ? '' : `/${locale}/dashboard/tasks`,
      onClick: isCareMode ? () => onNavigateTab?.('routine') : undefined,
      bgColor: 'bg-[#38BDF8] hover:bg-[#0284C7]',
    },

    // 10. Nina IA
    {
      id: 'nina-ia',
      title: tDash.cards.nina.title,
      icon: Sparkles,
      href: isCareMode ? '' : `/${locale}/dashboard/nina`,
      onClick: isCareMode ? onOpenNina : undefined,
      bgColor: 'bg-[#6366F1] hover:bg-[#4F46E5]',
      badge: tDash.cards.nina.badge,
    },
    // 11. Despesas
    {
      id: 'despesas',
      title: tDash.cards.expenses.title,
      icon: DollarSign,
      href: isCareMode ? '' : `/${locale}/dashboard/expenses`,
      onClick: isCareMode ? () => onNavigateTab?.('finances') : undefined,
      bgColor: 'bg-[#10B981] hover:bg-[#059669]',
    },
    // 12. Compras
    {
      id: 'compras',
      title: tDash.cards.shopping.title,
      icon: ShoppingCart,
      href: isCareMode ? '' : `/${locale}/dashboard/shopping`,
      onClick: isCareMode ? () => onNavigateTab?.('actions') : undefined,
      bgColor: 'bg-[#D97706] hover:bg-[#B45309]',
    },

    // 13. Plantão
    {
      id: 'plantao',
      title: tDash.cards.handovers.title,
      icon: ArrowLeftRight,
      href: isCareMode ? '' : `/${locale}/dashboard/handovers`,
      onClick: isCareMode ? () => onNavigateTab?.('actions') : undefined,
      bgColor: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    },
    // 14. Modo Idoso
    {
      id: 'modo-idoso',
      title: tDash.cards.elderlyMode.title,
      icon: Footprints,
      href: isCareMode ? '' : (personId ? `/${locale}/care/${personId}` : `/${locale}/dashboard`),
      bgColor: 'bg-gradient-to-br from-cyan-400 to-teal-500',
      isExternal: !isCareMode,
      badge: isCareMode ? 'Você está aqui' : tDash.cards.elderlyMode.badge,
    },
    // 15. Família
    {
      id: 'familia',
      title: tDash.cards.family.title,
      icon: Users,
      href: isCareMode ? '' : `/${locale}/dashboard/family`,
      onClick: isCareMode ? onRequestCall : undefined,
      bgColor: 'bg-gradient-to-br from-pink-400 to-rose-500',
    },

    // 16. Idosos
    {
      id: 'idosos',
      title: tDash.cards.caredPeople.title,
      icon: UserCheck,
      href: isCareMode ? '' : `/${locale}/dashboard/cared-people`,
      bgColor: 'bg-[#15803D] hover:bg-[#166534]',
      badge: isCareMode ? firstName : undefined,
    },
    // 17. Relatórios
    {
      id: 'relatorios',
      title: tDash.cards.reports.title,
      icon: FileText,
      href: isCareMode ? '' : `/${locale}/dashboard/reports`,
      onClick: isCareMode ? () => onNavigateTab?.('actions') : undefined,
      bgColor: 'bg-[#7C3AED] hover:bg-[#6D28D9]',
    },
    // 18. Histórico
    {
      id: 'historico',
      title: tDash.cards.history.title,
      icon: Clock,
      href: isCareMode ? '' : `/${locale}/dashboard/history`,
      onClick: isCareMode ? () => onNavigateTab?.('routine') : undefined,
      bgColor: 'bg-[#BE185D] hover:bg-[#9D174D]',
    },

    // 19. Segurança
    {
      id: 'seguranca',
      title: tDash.cards.safety.title,
      icon: ShieldCheck,
      href: isCareMode ? '' : `/${locale}/dashboard/home-safety`,
      onClick: isCareMode ? onOpenEmergency : undefined,
      bgColor: 'bg-[#0F766E] hover:bg-[#115E59]',
    },
    // 20. Memórias
    {
      id: 'memorias',
      title: tDash.cards.memories.title,
      icon: Heart,
      href: isCareMode ? '' : `/${locale}/dashboard/memories`,
      onClick: isCareMode ? () => onNavigateTab?.('actions') : undefined,
      bgColor: 'bg-gradient-to-br from-rose-500 to-pink-600',
    },
    // 21. Ajustes
    {
      id: 'configuracoes',
      title: tDash.cards.settings.title,
      icon: Sliders,
      href: isCareMode ? '' : `/${locale}/dashboard/settings`,
      bgColor: 'bg-[#475569] hover:bg-[#334155]',
    },

    // 22. WhatsApp
    {
      id: 'whatsapp',
      title: tDash.cards.whatsapp.title,
      icon: MessageSquare,
      href: personPhone
        ? `https://wa.me/${personPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, tudo bem?`)}`
        : `/${locale}/dashboard/cared-people/${personId}`,
      onClick: isCareMode ? onRequestCall : undefined,
      bgColor: 'bg-[#25D366] hover:bg-[#20BA5C]',
      isExternal: Boolean(personPhone),
    },
    // 23. SOS / Ajuda
    {
      id: 'sos',
      title: tDash.cards.sos.title,
      icon: AlertTriangle,
      href: isCareMode ? '' : `/${locale}/dashboard/emergency`,
      onClick: isCareMode ? onOpenEmergency : undefined,
      bgColor: 'bg-[#DC2626] hover:bg-[#B91C1C]',
      badge: tDash.cards.sos.badge,
    },
    // 24. Prescrições
    {
      id: 'prescricoes',
      title: tDash.cards.prescriptions.title,
      icon: Pill,
      href: isCareMode ? '' : `/${locale}/dashboard/medications`,
      onClick: isCareMode ? () => onNavigateTab?.('routine') : undefined,
      bgColor: 'bg-[#4338CA] hover:bg-[#3730A3]',
    },
  ], [
    locale,
    medsData,
    hydration,
    onOpenVitalsModal,
    personId,
    firstName,
    personPhone,
    tDash,
    isCareMode,
    onNavigateTab,
    onOpenNina,
    onOpenEmergency,
    onRequestCall,
    onLogMeal,
  ]);

  // Filtered cards based on optional search
  const visibleCards = useMemo(() => {
    if (!searchQuery.trim()) return allCards;
    const q = searchQuery.toLowerCase();
    return allCards.filter(card => card.title.toLowerCase().includes(q));
  }, [allCards, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ─── TÍTULO "CATEGORIA" STRICTLY RESPONSIVE TO LOCALE ───────── */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight leading-none">
            {tDash.categoryTitle}
          </h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold mt-1">
            {tDash.categorySubtitle}
          </p>
        </div>
        <span className="text-xs font-black text-[#1D4ED8] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-500/30">
          {tDash.cardsCount(visibleCards.length)}
        </span>
      </div>

      {/* ─── BUSCADOR RÁPIDO COM PLACEHOLDER TRADUZIDO ─────────── */}
      <div className="relative">
        <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={tDash.searchPlaceholder}
          className="w-full bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      {/* ─── GRID DE CARDS COLORIDOS (RESPONSIVO PARA CELULAR E COMPUTADOR) ──── */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 sm:gap-3 md:gap-4">
        {visibleCards.map((card) => {
          const Icon = card.icon;

          if (card.onClick) {
            return (
              <button
                key={card.id}
                type="button"
                onClick={card.onClick}
                className={cn(
                  'aspect-square rounded-3xl p-2.5 sm:p-3 md:p-4 flex flex-col items-center justify-center text-center shadow-md hover:shadow-xl active:scale-95 hover:-translate-y-1 transition-all text-white select-none relative group overflow-hidden border border-white/20',
                  card.bgColor
                )}
              >
                {/* Subtle sheen highlight */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-white/15 pointer-events-none rounded-3xl" />
                
                <Icon className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-white drop-shadow-xs group-hover:scale-110 transition-transform" />
                
                <span className="text-[11px] sm:text-xs md:text-sm font-black text-white leading-tight mt-2 drop-shadow-xs truncate max-w-full px-1">
                  {card.title}
                </span>

                {card.badge && (
                  <span className="mt-1 px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-xs text-[9px] sm:text-[10px] font-extrabold text-white leading-none shadow-2xs">
                    {card.badge}
                  </span>
                )}
              </button>
            );
          }

          return (
            <Link
              key={card.id}
              href={card.href}
              target={card.isExternal ? '_blank' : undefined}
              rel={card.isExternal ? 'noopener noreferrer' : undefined}
              className={cn(
                'aspect-square rounded-3xl p-2.5 sm:p-3 md:p-4 flex flex-col items-center justify-center text-center shadow-md hover:shadow-xl active:scale-95 hover:-translate-y-1 transition-all text-white select-none relative group overflow-hidden border border-white/20',
                card.bgColor
              )}
            >
              {/* Subtle sheen highlight */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/15 to-white/15 pointer-events-none rounded-3xl" />
              
              <Icon className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 text-white drop-shadow-xs group-hover:scale-110 transition-transform" />
              
              <span className="text-[11px] sm:text-xs md:text-sm font-black text-white leading-tight mt-2 drop-shadow-xs truncate max-w-full px-1">
                {card.title}
              </span>

              {card.badge && (
                <span className="mt-1 px-1.5 py-0.5 rounded-full bg-black/30 backdrop-blur-xs text-[9px] sm:text-[10px] font-extrabold text-white leading-none shadow-2xs">
                  {card.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
