'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Users,
  Heart,
  Pill,
  Fingerprint,
  Activity,
  Droplet,
  FileText,
  Boxes,
  Bell,
  Footprints,
  UserCheck,
  Gamepad2,
  AlertTriangle,
  ShoppingCart,
  DollarSign,
  Camera,
  ClipboardList,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Search,
  SlidersHorizontal,
  ExternalLink,
  Phone,
  CheckCircle2,
  Clock,
  LayoutGrid,
  ListFilter,
  Layers,
  HeartPulse,
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

export interface MicroCardItem {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  bgColor: string;
  hoverColor?: string;
  isExternal?: boolean;
  badge?: string;
  highlight?: boolean;
}

export interface MacroCategory {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderLight: string;
  badgeText: string;
  badgeColor: string;
  micros: MicroCardItem[];
}

export function MobileMacroMicroCards({
  locale,
  selectedPerson,
  caredPeople,
  medsData = { taken: 0, total: 0, list: [] },
  hydration = { cups: 0, goal: 8 },
  userName = 'Cuidador',
  onQuickLogWater,
  onOpenVitalsModal,
}: MobileMacroMicroCardsProps) {
  // Mode: 'macros' (categories with sub-cards) vs 'all' (all micro cards stacked)
  const [viewMode, setViewMode] = useState<'macros' | 'all'>('macros');
  const [expandedMacroId, setExpandedMacroId] = useState<string | null>('rotina');
  const [searchQuery, setSearchQuery] = useState('');

  const personId = selectedPerson?.id || '';
  const firstName = selectedPerson?.full_name ? selectedPerson.full_name.split(' ')[0] : 'Idoso';

  // Define all Macro Categories & their respective Micro Cards matching the 4 screenshots
  const categories: MacroCategory[] = useMemo(() => [
    // ─── 1. AGENDA & ROTINA (Laranja / Âmbar vibrante) ──────────────────────────
    {
      id: 'rotina',
      title: 'Agenda & Rotina',
      subtitle: 'Doses programadas, consultas e atividades do dia',
      icon: Calendar,
      gradient: 'from-amber-500 via-orange-500 to-orange-600',
      borderLight: 'border-orange-300 dark:border-orange-800',
      badgeText: '3 Micro Funções',
      badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950/70 dark:text-orange-200',
      micros: [
        {
          id: 'agenda-doses',
          title: 'Agenda de Doses',
          subtitle: 'Visualizar doses programadas.',
          icon: Calendar,
          href: `/${locale}/dashboard/medications`,
          bgColor: 'bg-[#EA580C]',
          hoverColor: 'hover:bg-[#C2410C]',
          badge: `${medsData.taken}/${medsData.total || 0}`,
        },
        {
          id: 'agendamentos',
          title: 'Agendamentos',
          subtitle: 'Criar novos agendamentos e consultas.',
          icon: Clock,
          href: `/${locale}/dashboard/appointments`,
          bgColor: 'bg-[#EAB308]',
          hoverColor: 'hover:bg-[#CA8A04]',
        },
        {
          id: 'atividades-tarefas',
          title: 'Atividades & Hábitos',
          subtitle: 'Acompanhar rotinas diárias e tarefas programadas.',
          icon: ClipboardList,
          href: `/${locale}/dashboard/tasks`,
          bgColor: 'bg-[#F97316]',
          hoverColor: 'hover:bg-[#EA580C]',
        },
      ],
    },

    // ─── 2. SAÚDE & CLÍNICA (Rosa / Púrpura / Teal) ───────────────────────────
    {
      id: 'saude',
      title: 'Saúde & Clínica',
      subtitle: 'Medicamentos, biometrias, sinais vitais e hidratação',
      icon: HeartPulse,
      gradient: 'from-rose-500 via-pink-600 to-purple-600',
      borderLight: 'border-pink-300 dark:border-pink-800',
      badgeText: '5 Micro Funções',
      badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-950/70 dark:text-pink-200',
      micros: [
        {
          id: 'medicamentos',
          title: 'Medicamentos',
          subtitle: 'Organizar a lista de medicamentos.',
          icon: Pill,
          href: `/${locale}/dashboard/medications`,
          bgColor: 'bg-[#7C3AED]',
          hoverColor: 'hover:bg-[#6D28D9]',
        },
        {
          id: 'sinais-vitais',
          title: 'Sinais Vitais',
          subtitle: 'Centralizar e registrar informações clínicas básicas dos idosos.',
          icon: Heart,
          href: `/${locale}/dashboard/history`,
          bgColor: 'bg-[#E11D48]',
          hoverColor: 'hover:bg-[#BE123C]',
        },
        {
          id: 'biometrias',
          title: 'Biometrias',
          subtitle: 'Controle de Aferições Biométricas.',
          icon: Fingerprint,
          href: `/${locale}/dashboard/history`,
          bgColor: 'bg-[#059669]',
          hoverColor: 'hover:bg-[#047857]',
        },
        {
          id: 'hidratacao',
          title: 'Hidratação',
          subtitle: 'Controle de hidratação diária.',
          icon: Droplet,
          href: `/${locale}/dashboard/meals`,
          bgColor: 'bg-[#0284C7]',
          hoverColor: 'hover:bg-[#0369A1]',
          badge: `${hydration.cups}/8 copos`,
        },
        {
          id: 'saude-mental',
          title: 'Saúde Mental',
          subtitle: 'Registrar e acompanhar emoções diárias.',
          icon: Heart,
          href: `/${locale}/dashboard/history`,
          bgColor: 'bg-[#F43F5E]',
          hoverColor: 'hover:bg-[#E11D48]',
        },
      ],
    },

    // ─── 3. PESSOAS & CUIDADO (Verde / Azul Real) ────────────────────────────
    {
      id: 'pessoas',
      title: 'Pessoas & Cuidado',
      subtitle: 'Administrar perfis de idosos, cuidadores e acessibilidade',
      icon: Users,
      gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
      borderLight: 'border-emerald-300 dark:border-emerald-800',
      badgeText: '4 Micro Funções',
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200',
      micros: [
        {
          id: 'idosos',
          title: 'Idosos',
          subtitle: 'Administrar idosos e dispositivos.',
          icon: Users,
          href: `/${locale}/dashboard/cared-people`,
          bgColor: 'bg-[#16A34A]',
          hoverColor: 'hover:bg-[#15803D]',
        },
        {
          id: 'cuidadores',
          title: 'Cuidadores',
          subtitle: 'Gerenciar perfis de cuidadores.',
          icon: UserCheck,
          href: `/${locale}/dashboard/family`,
          bgColor: 'bg-[#1D4ED8]',
          hoverColor: 'hover:bg-[#1E40AF]',
        },
        {
          id: 'modo-idoso',
          title: 'Modo Idoso',
          subtitle: 'Tela simplificada de alta acessibilidade com letras grandes.',
          icon: Footprints,
          href: personId ? `/${locale}/care/${personId}` : `/${locale}/dashboard`,
          bgColor: 'bg-[#0D9488]',
          hoverColor: 'hover:bg-[#0F766E]',
          isExternal: true,
          badge: 'Acessível',
        },
        {
          id: 'passagem-plantao',
          title: 'Passagem de Plantão',
          subtitle: 'Anotações e troca de turno com a equipe.',
          icon: ClipboardList,
          href: `/${locale}/dashboard/handovers`,
          bgColor: 'bg-[#2563EB]',
          hoverColor: 'hover:bg-[#1D4ED8]',
        },
      ],
    },

    // ─── 4. O LAR & GESTÃO (Vermelho / Ardósia) ──────────────────────────────
    {
      id: 'gestao',
      title: 'O Lar & Gestão',
      subtitle: 'Estoque de suprimentos, compras, gastos e SOS de urgência',
      icon: Boxes,
      gradient: 'from-red-600 via-rose-600 to-amber-700',
      borderLight: 'border-red-300 dark:border-red-800',
      badgeText: '4 Micro Funções',
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-200',
      micros: [
        {
          id: 'estoque',
          title: 'Estoque',
          subtitle: 'Controle de estoque de medicamentos.',
          icon: Boxes,
          href: `/${locale}/dashboard/medications`,
          bgColor: 'bg-[#DC2626]',
          hoverColor: 'hover:bg-[#B91C1C]',
        },
        {
          id: 'compras',
          title: 'Compras & Farmácia',
          subtitle: 'Lista de compras e reposição de itens essenciais.',
          icon: ShoppingCart,
          href: `/${locale}/dashboard/shopping`,
          bgColor: 'bg-[#EA580C]',
          hoverColor: 'hover:bg-[#C2410C]',
        },
        {
          id: 'financas',
          title: 'Gastos & Finanças',
          subtitle: 'Gerenciar despesas, recibos e custos de saúde.',
          icon: DollarSign,
          href: `/${locale}/dashboard/expenses`,
          bgColor: 'bg-[#059669]',
          hoverColor: 'hover:bg-[#047857]',
        },
        {
          id: 'sos-emergencia',
          title: 'SOS / Emergência',
          subtitle: 'Botão de pânico e contatos urgentes.',
          icon: AlertTriangle,
          href: `/${locale}/dashboard/emergency`,
          bgColor: 'bg-[#B91C1C]',
          hoverColor: 'hover:bg-[#991B1B]',
          badge: 'Crítico',
          highlight: true,
        },
      ],
    },

    // ─── 5. ESTÍMULO & MEMÓRIA (Púrpura / Violeta) ───────────────────────────
    {
      id: 'estimulo',
      title: 'Estímulo & Memória',
      subtitle: '7 jogos cognitivos adaptativos e álbum de recordações',
      icon: Gamepad2,
      gradient: 'from-purple-600 via-violet-600 to-fuchsia-600',
      borderLight: 'border-purple-300 dark:border-purple-800',
      badgeText: '2 Micro Funções',
      badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-200',
      micros: [
        {
          id: 'jogos-cognitivos',
          title: 'Jogos Cognitivos',
          subtitle: '7 jogos interativos: Forca, Memória, Palavras, Trivia, Genius, Sudoku...',
          icon: Gamepad2,
          href: `/${locale}/dashboard/games`,
          bgColor: 'bg-[#9333EA]',
          hoverColor: 'hover:bg-[#7E22CE]',
          badge: '7 Jogos',
        },
        {
          id: 'recordacoes',
          title: 'Recordações & Memórias',
          subtitle: 'Álbum de memórias afetivas da família.',
          icon: Camera,
          href: `/${locale}/dashboard/memories`,
          bgColor: 'bg-[#C026D3]',
          hoverColor: 'hover:bg-[#A21CAF]',
        },
      ],
    },

    // ─── 6. SUPORTE & AJUSTES (Índigo / Cinza Escuro) ─────────────────────────
    {
      id: 'suporte',
      title: 'Suporte & Ajustes',
      subtitle: 'Notificações, relatórios médicos, tutorial e perfil',
      icon: SlidersHorizontal,
      gradient: 'from-indigo-600 via-blue-600 to-slate-700',
      borderLight: 'border-indigo-300 dark:border-indigo-800',
      badgeText: '4 Micro Funções',
      badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/70 dark:text-indigo-200',
      micros: [
        {
          id: 'notificacoes',
          title: 'Notificações',
          subtitle: 'Gerenciar notificações do sistema.',
          icon: Bell,
          href: `/${locale}/dashboard/settings`,
          bgColor: 'bg-[#4F46E5]',
          hoverColor: 'hover:bg-[#4338CA]',
        },
        {
          id: 'relatorios',
          title: 'Relatórios',
          subtitle: 'Relatórios completos relacionados ao seu usuário.',
          icon: FileText,
          href: `/${locale}/dashboard/reports`,
          bgColor: 'bg-[#1E293B]',
          hoverColor: 'hover:bg-[#0F172A]',
        },
        {
          id: 'tutorial-uso',
          title: 'Tutorial de Uso',
          subtitle: 'Guia passo a passo para começar a usar o sistema.',
          icon: Footprints,
          href: `/${locale}/dashboard/settings`,
          bgColor: 'bg-[#0D9488]',
          hoverColor: 'hover:bg-[#0F766E]',
        },
        {
          id: 'perfil',
          title: 'Perfil',
          subtitle: 'Alterar seus dados e idioma.',
          icon: Users,
          href: `/${locale}/dashboard/settings`,
          bgColor: 'bg-[#6D28D9]',
          hoverColor: 'hover:bg-[#5B21B6]',
        },
      ],
    },
  ], [locale, personId, medsData, hydration]);

  // All micro cards flattened for search or full feed view
  const allMicroCards = useMemo(() => {
    return categories.flatMap(cat => cat.micros);
  }, [categories]);

  // Filtered micros based on search
  const filteredMicroCards = useMemo(() => {
    if (!searchQuery.trim()) return allMicroCards;
    const q = searchQuery.toLowerCase();
    return allMicroCards.filter(
      item => item.title.toLowerCase().includes(q) || item.subtitle.toLowerCase().includes(q)
    );
  }, [allMicroCards, searchQuery]);

  const toggleMacro = (macroId: string) => {
    setExpandedMacroId(prev => (prev === macroId ? null : macroId));
  };

  return (
    <div className="space-y-4">
      {/* ─── 1. BANNER DE BOAS-VINDAS (ESTILO IMAGEM 1) ─────────────────────────── */}
      <div className="bg-gradient-to-r from-[#1D4ED8] to-[#2563EB] text-white rounded-3xl p-5 shadow-md flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-blue-200 font-bold">Painel Mobile</p>
          <h2 className="text-xl sm:text-2xl font-black leading-tight mt-0.5">
            Bem-vindo ao seu Painel, {userName}!
          </h2>
          <p className="text-xs text-blue-100 mt-1">
            Acompanhando <span className="font-extrabold text-white underline">{firstName}</span> hoje.
          </p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center font-black text-xl shrink-0 ml-3">
          {firstName.charAt(0).toUpperCase()}
        </div>
      </div>

      {/* ─── 2. BARRA DE CONTROLE: BUSCA & ALTERNADOR DE MODO ───────────────────── */}
      <div className="flex flex-col gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <Search className="h-4 w-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar função (ex: remédios, pressão, cuidadores...)"
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

        {/* View Switcher: Categorias Macro vs Todas as Micro Funções */}
        <div className="flex items-center justify-between bg-stone-100 dark:bg-[#0C1728] p-1 rounded-2xl border border-stone-200 dark:border-[#1E293B]">
          <button
            onClick={() => { setViewMode('macros'); setSearchQuery(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all',
              viewMode === 'macros'
                ? 'bg-white dark:bg-[#16253C] text-[#1D4ED8] dark:text-blue-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            )}
          >
            <Layers className="h-3.5 w-3.5" />
            Cards Macros ({categories.length})
          </button>
          <button
            onClick={() => { setViewMode('all'); setSearchQuery(''); }}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-black transition-all',
              viewMode === 'all'
                ? 'bg-white dark:bg-[#16253C] text-[#1D4ED8] dark:text-blue-400 shadow-xs'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Todas as Micro ({allMicroCards.length})
          </button>
        </div>
      </div>

      {/* ─── 3. SE O USUÁRIO ESTÁ PESQUISANDO: MOSTRA AS MICROS FILTRADAS ────────── */}
      {searchQuery.trim() !== '' && (
        <div className="space-y-3">
          <p className="text-xs font-extrabold text-stone-500 uppercase tracking-wide px-1">
            Resultados da busca ({filteredMicroCards.length})
          </p>
          {filteredMicroCards.length === 0 ? (
            <div className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-2xl p-6 text-center text-xs text-stone-400">
              Nenhuma função encontrada com &quot;{searchQuery}&quot;.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredMicroCards.map((card) => (
                <MicroCardItemComponent key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── 4. MODO A: VISUALIZAÇÃO POR CARDS MACROS (EXPANSÍVEIS) ──────────────── */}
      {searchQuery.trim() === '' && viewMode === 'macros' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-stone-500 uppercase tracking-wider">
              Funções Principais (Macros)
            </span>
            <span className="text-[11px] text-stone-400">Toque para ver micro cards</span>
          </div>

          {categories.map((cat) => {
            const isExpanded = expandedMacroId === cat.id;
            const Icon = cat.icon;

            return (
              <div
                key={cat.id}
                className="bg-white dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl overflow-hidden shadow-2xs transition-all"
              >
                {/* ─── HEADER DO CARD MACRO ─── */}
                <button
                  type="button"
                  onClick={() => toggleMacro(cat.id)}
                  className="w-full p-4 flex items-center justify-between text-left gap-3.5 transition-all hover:bg-stone-50/50 dark:hover:bg-[#16253C]/40"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={cn(
                        'w-13 h-13 rounded-2xl bg-gradient-to-br text-white flex items-center justify-center shrink-0 shadow-md',
                        cat.gradient
                      )}
                    >
                      <Icon className="h-6 w-6 stroke-[2.2]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-black text-stone-900 dark:text-white leading-tight truncate">
                          {cat.title}
                        </h3>
                        <span
                          className={cn(
                            'text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 uppercase tracking-wide',
                            cat.badgeColor
                          )}
                        >
                          {cat.badgeText}
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
                        {cat.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="w-8 h-8 rounded-full bg-stone-100 dark:bg-[#16253C] flex items-center justify-center shrink-0 text-stone-500">
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 transition-transform duration-200',
                        isExpanded ? 'rotate-180 text-stone-900 dark:text-white' : ''
                      )}
                    />
                  </div>
                </button>

                {/* ─── CONTEÚDO EXPANDIDO: AS MICRO FUNÇÕES (EXATOS CARDS COLORIDOS) ─── */}
                {isExpanded && (
                  <div className="p-3.5 pt-0 space-y-3 border-t border-stone-100 dark:border-[#1E293B]/60 bg-stone-50/40 dark:bg-[#070F1E]/50 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="pt-2 pb-1 flex items-center justify-between px-1">
                      <span className="text-[11px] font-black text-stone-400 uppercase tracking-widest">
                        Micro Funções em {cat.title}
                      </span>
                    </div>

                    {cat.micros.map((micro) => (
                      <MicroCardItemComponent key={micro.id} card={micro} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── 5. MODO B: VISUALIZAÇÃO DE TODAS AS MICRO FUNÇÕES EM LISTA CONTÍNUA ─── */}
      {searchQuery.trim() === '' && viewMode === 'all' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-extrabold text-stone-500 uppercase tracking-wider">
              Acesso Rápido a Todas as Funções
            </span>
            <span className="text-[11px] text-stone-400">{allMicroCards.length} funções</span>
          </div>

          {categories.map((cat) => (
            <div key={cat.id} className="space-y-3">
              <div className="flex items-center gap-2 pt-2 px-1">
                <span className="w-2.5 h-2.5 rounded-full bg-stone-400" />
                <h4 className="text-xs font-black text-stone-600 dark:text-stone-300 uppercase tracking-wider">
                  {cat.title}
                </h4>
              </div>

              {cat.micros.map((micro) => (
                <MicroCardItemComponent key={micro.id} card={micro} />
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── COMPONENTE DO CARD DE MICRO FUNÇÃO (EXATO ESTILO DAS 4 IMAGENS) ─────────
function MicroCardItemComponent({ card }: { card: MicroCardItem }) {
  const Icon = card.icon;

  const content = (
    <div
      className={cn(
        'w-full text-white rounded-3xl p-5 sm:p-6 flex flex-col items-center justify-center text-center shadow-md active:scale-[0.98] transition-all gap-2 relative overflow-hidden',
        card.bgColor,
        card.hoverColor,
        card.highlight ? 'border-2 border-red-300 shadow-red-500/20 shadow-lg animate-pulse' : ''
      )}
    >
      {/* Badge opcional no topo direito */}
      {card.badge && (
        <span className="absolute top-3.5 right-4 bg-black/25 backdrop-blur-xs text-white text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
          {card.badge}
        </span>
      )}

      {/* Ícone branco centralizado no topo */}
      <div className="w-13 h-13 rounded-2xl bg-white/20 flex items-center justify-center shadow-xs">
        <Icon className="h-7 w-7 text-white stroke-[2.2]" />
      </div>

      {/* Título principal em negrito branco */}
      <h4 className="text-lg sm:text-xl font-black text-white leading-tight tracking-wide">
        {card.title}
      </h4>

      {/* Subtítulo descritivo em branco/semi-transparente */}
      <p className="text-xs sm:text-sm text-white/90 font-medium max-w-[280px] leading-snug">
        {card.subtitle}
      </p>
    </div>
  );

  if (card.isExternal) {
    return (
      <Link href={card.href} target="_blank" className="block focus:outline-hidden">
        {content}
      </Link>
    );
  }

  return (
    <Link href={card.href} className="block focus:outline-hidden">
      {content}
    </Link>
  );
}
