'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, X, Stethoscope, Pill, CheckSquare, Receipt, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export function QuickActionFAB() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0] || 'pt-BR';

  const actions = [
    {
      label: 'Agendar Consulta / Exame',
      href: `/${locale}/dashboard/appointments`,
      icon: Stethoscope,
      color: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      badge: 'Agenda',
    },
    {
      label: 'Adicionar Medicamento',
      href: `/${locale}/dashboard/medications/new`,
      icon: Pill,
      color: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      badge: 'Medicamentos',
    },
    {
      label: 'Nova Tarefa Familiar',
      href: `/${locale}/dashboard/tasks`,
      icon: CheckSquare,
      color: 'bg-amber-600 hover:bg-amber-700 text-white',
      badge: 'Tarefas',
    },
    {
      label: 'Registrar Despesa Médica',
      href: `/${locale}/dashboard/expenses`,
      icon: Receipt,
      color: 'bg-sky-600 hover:bg-sky-700 text-white',
      badge: 'Finanças',
    },
  ];

  return (
    <>
      {/* Backdrop when menu is open */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs z-40 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Floating Action Menu Container */}
      <div className="fixed bottom-20 md:bottom-8 right-6 z-50 flex flex-col items-end gap-3 pointer-events-auto">
        {/* Action items (slide up when open) */}
        {open && (
          <div className="flex flex-col items-end gap-2.5 mb-1 animate-in slide-in-from-bottom-5 duration-200">
            {actions.map((act, i) => (
              <Link
                key={i}
                href={act.href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 group"
              >
                <span className="bg-white dark:bg-[#101D2B] text-stone-800 dark:text-stone-100 text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg border border-stone-200 dark:border-[#172433] group-hover:scale-105 transition-transform">
                  {act.label}
                </span>
                <div
                  className={cn(
                    'w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 active:scale-95',
                    act.color
                  )}
                >
                  <act.icon className="h-5 w-5" />
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Main Trigger Button */}
        <button
          onClick={() => setOpen(!open)}
          className={cn(
            'w-13 h-13 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 active:scale-95 border-2',
            open
              ? 'bg-stone-900 border-stone-700 text-white rotate-45'
              : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-400 text-white hover:scale-105 shadow-emerald-600/30'
          )}
          aria-label={open ? 'Fechar ações rápidas' : 'Ações rápidas'}
        >
          <Plus className="h-6 w-6 transition-transform" />
        </button>
      </div>
    </>
  );
}
