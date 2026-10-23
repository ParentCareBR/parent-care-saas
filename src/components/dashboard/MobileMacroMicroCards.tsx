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
  CheckCircle2,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileMacroMicroCardsProps {
  locale: string;
  selectedPerson?: any;
  caredPeople?: any[];
  medsData?: { taken: number; total: number; list: any[] };
  hydration?: { cups: number; goal: number };
  userName?: string;
  onQuickLogWater?: () => void;
  onOpenVitalsModal?: () => void;
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
}: MobileMacroMicroCardsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const personId = selectedPerson?.id || '';
  const firstName = selectedPerson?.full_name ? selectedPerson.full_name.split(' ')[0] : 'Idoso';
  const personPhone = selectedPerson?.whatsapp_phone || selectedPerson?.phone || '';

  // ── Grid of 24 Cards strictly matching the 3-column layout in the user's reference image ──
  const allCards: GridCardItem[] = useMemo(() => [
    // 1. Aluguel/Início -> Agenda (Verde Vibrante - like row 1 col 1)
    {
      id: 'agenda',
      title: 'Agenda',
      icon: Calendar,
      href: `/${locale}/dashboard/appointments`,
      bgColor: 'bg-[#22C55E] hover:bg-[#16A34A]',
    },
    // 2. Salário -> Medicamentos (Turquesa/Ciano - like row 1 col 2)
    {
      id: 'medicamentos',
      title: 'Medicamentos',
      icon: Pill,
      href: `/${locale}/dashboard/medications`,
      bgColor: 'bg-[#06B6D4] hover:bg-[#0891B2]',
      badge: medsData.total > 0 ? `${medsData.taken}/${medsData.total}` : undefined,
    },
    // 3. Supermercado -> Alimentação (Laranja Coral - like row 1 col 3)
    {
      id: 'alimentacao',
      title: 'Alimentação',
      icon: Utensils,
      href: `/${locale}/dashboard/meals`,
      bgColor: 'bg-[#F97316] hover:bg-[#EA580C]',
    },

    // 4. Viagem -> Consultas (Azul Céu - like row 2 col 1)
    {
      id: 'consultas',
      title: 'Consultas',
      icon: Stethoscope,
      href: `/${locale}/dashboard/appointments`,
      bgColor: 'bg-[#0284C7] hover:bg-[#0369A1]',
    },
    // 5. Ginásio -> Atividades (Roxo Vibrante - like row 2 col 2)
    {
      id: 'atividades',
      title: 'Atividades',
      icon: Activity,
      href: `/${locale}/dashboard/activities`,
      bgColor: 'bg-[#A855F7] hover:bg-[#9333EA]',
    },
    // 6. Táxi -> Sinais Vitais (Amarelo Dourado - like row 2 col 3)
    {
      id: 'sinais-vitais',
      title: 'Sinais Vitais',
      icon: HeartPulse,
      href: `/${locale}/dashboard/history`,
      bgColor: 'bg-[#EAB308] hover:bg-[#CA8A04]',
      onClick: onOpenVitalsModal,
    },

    // 7. Gasolina -> Hidratação (Verde Petróleo Escuro - like row 3 col 1)
    {
      id: 'hidratacao',
      title: 'Hidratação',
      icon: Droplet,
      href: `/${locale}/dashboard/meals`,
      bgColor: 'bg-[#0D9488] hover:bg-[#0F766E]',
      badge: `${hydration.cups}/8 copos`,
    },
    // 8. Restaurante -> Jogos Cognitivos (Magenta/Pink - like row 3 col 2)
    {
      id: 'jogos',
      title: 'Jogos & Cérebro',
      icon: Gamepad2,
      href: `/${locale}/dashboard/games`,
      bgColor: 'bg-[#EC4899] hover:bg-[#DB2777]',
      badge: '7 Jogos',
    },
    // 9. Presentes -> Tarefas (Azul Céu Claro - like row 3 col 3)
    {
      id: 'tarefas',
      title: 'Tarefas',
      icon: ClipboardList,
      href: `/${locale}/dashboard/tasks`,
      bgColor: 'bg-[#38BDF8] hover:bg-[#0284C7]',
    },

    // 10. Internet -> Nina IA (Índigo/Violeta Profundo - like row 4 col 1)
    {
      id: 'nina-ia',
      title: 'Nina IA',
      icon: Sparkles,
      href: `/${locale}/dashboard/nina`,
      bgColor: 'bg-[#6366F1] hover:bg-[#4F46E5]',
      badge: 'IA 24h',
    },
    // 11. Poupanças -> Despesas (Verde Menta - like row 4 col 2)
    {
      id: 'despesas',
      title: 'Despesas',
      icon: DollarSign,
      href: `/${locale}/dashboard/expenses`,
      bgColor: 'bg-[#10B981] hover:bg-[#059669]',
    },
    // 12. Café -> Compras & Estoque (Marrom Âmbar/Café - like row 4 col 3)
    {
      id: 'compras',
      title: 'Compras',
      icon: ShoppingCart,
      href: `/${locale}/dashboard/shopping`,
      bgColor: 'bg-[#D97706] hover:bg-[#B45309]',
    },

    // 13. Investimento -> Plantão (Gradiente Violeta - like row 5 col 1)
    {
      id: 'plantao',
      title: 'Plantão',
      icon: ArrowLeftRight,
      href: `/${locale}/dashboard/handovers`,
      bgColor: 'bg-gradient-to-br from-indigo-500 to-purple-600',
    },
    // 14. Saúde -> Modo Idoso (Gradiente Ciano - like row 5 col 2)
    {
      id: 'modo-idoso',
      title: 'Modo Idoso',
      icon: Footprints,
      href: personId ? `/${locale}/care/${personId}` : `/${locale}/dashboard`,
      bgColor: 'bg-gradient-to-br from-cyan-400 to-teal-500',
      isExternal: true,
      badge: 'Acessível',
    },
    // 15. Beleza -> Família & Equipe (Gradiente Rosa - like row 5 col 3)
    {
      id: 'familia',
      title: 'Família',
      icon: Users,
      href: `/${locale}/dashboard/family`,
      bgColor: 'bg-gradient-to-br from-pink-400 to-rose-500',
    },

    // 16. Idosos Cadastrados (Verde Floresta)
    {
      id: 'idosos',
      title: 'Idosos',
      icon: UserCheck,
      href: `/${locale}/dashboard/cared-people`,
      bgColor: 'bg-[#15803D] hover:bg-[#166534]',
    },
    // 17. Relatórios Clínicos (Roxo Real)
    {
      id: 'relatorios',
      title: 'Relatórios',
      icon: FileText,
      href: `/${locale}/dashboard/reports`,
      bgColor: 'bg-[#7C3AED] hover:bg-[#6D28D9]',
    },
    // 18. Histórico Clínico (Rosa Escuro)
    {
      id: 'historico',
      title: 'Histórico',
      icon: Clock,
      href: `/${locale}/dashboard/history`,
      bgColor: 'bg-[#BE185D] hover:bg-[#9D174D]',
    },

    // 19. Segurança do Lar (Teal Escuro)
    {
      id: 'seguranca',
      title: 'Segurança',
      icon: ShieldCheck,
      href: `/${locale}/dashboard/home-safety`,
      bgColor: 'bg-[#0F766E] hover:bg-[#115E59]',
    },
    // 20. Memórias & Fotos (Gradiente Amor / Rosa)
    {
      id: 'memorias',
      title: 'Memórias',
      icon: Heart,
      href: `/${locale}/dashboard/memories`,
      bgColor: 'bg-gradient-to-br from-rose-500 to-pink-600',
    },
    // 21. Configurações (Aço / Slate)
    {
      id: 'configuracoes',
      title: 'Ajustes',
      icon: Sliders,
      href: `/${locale}/dashboard/settings`,
      bgColor: 'bg-[#475569] hover:bg-[#334155]',
    },

    // 22. WhatsApp (Verde WhatsApp)
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      icon: MessageSquare,
      href: personPhone
        ? `https://wa.me/${personPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá ${firstName}, tudo bem? Como você está hoje?`)}`
        : `/${locale}/dashboard/cared-people/${personId}`,
      bgColor: 'bg-[#25D366] hover:bg-[#20BA5C]',
      isExternal: Boolean(personPhone),
    },
    // 23. SOS Emergência (Vermelho Urgência)
    {
      id: 'sos',
      title: 'SOS / Ajuda',
      icon: AlertTriangle,
      href: `/${locale}/dashboard/emergency`,
      bgColor: 'bg-[#DC2626] hover:bg-[#B91C1C]',
      badge: 'Urgente',
    },
    // 24. Prescrições & Doses
    {
      id: 'prescricoes',
      title: 'Prescrições',
      icon: Pill,
      href: `/${locale}/dashboard/medications`,
      bgColor: 'bg-[#4338CA] hover:bg-[#3730A3]',
    },
  ], [locale, medsData, hydration, onOpenVitalsModal, personId, firstName, personPhone]);

  // Filtered cards based on optional search
  const visibleCards = useMemo(() => {
    if (!searchQuery.trim()) return allCards;
    const q = searchQuery.toLowerCase();
    return allCards.filter(card => card.title.toLowerCase().includes(q));
  }, [allCards, searchQuery]);

  return (
    <div className="space-y-4">
      {/* ─── TÍTULO "CATEGORIA" STRICTLY IDENTICAL TO THE USER SCREENSHOT ───────── */}
      <div className="flex items-center justify-between px-1 pt-1">
        <div>
          <h2 className="text-2xl font-black text-stone-900 dark:text-white tracking-tight leading-none">
            Categoria
          </h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 font-semibold mt-1">
            Todos os recursos e opções do Parent Care em cards diretos
          </p>
        </div>
        <span className="text-xs font-black text-[#1D4ED8] dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-500/30">
          {visibleCards.length} Cards
        </span>
      </div>

      {/* ─── BUSCADOR RÁPIDO (OPCIONAL, MANTÉM TUDO VISÍVEL POR PADRÃO) ─────────── */}
      <div className="relative">
        <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar recurso (ex: remédios, pressão, plantão...)"
          className="w-full bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-900 dark:text-white placeholder:text-stone-400 shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-[#1D4ED8]"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400 hover:text-stone-700 dark:hover:text-white"
          >
            Limpar
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
