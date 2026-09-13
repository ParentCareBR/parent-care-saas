'use client';

import React from 'react';
import Link from 'next/link';
import { Clock, Sparkles, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TrialBannerProps {
  daysRemaining: number;
  locale: string;
}

export function TrialBanner({ daysRemaining, locale }: TrialBannerProps) {
  const isUrgent = daysRemaining <= 5;

  return (
    <div
      className={`w-full px-4 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-b transition-colors ${
        isUrgent
          ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-950 dark:text-emerald-200'
      }`}
    >
      <div className="flex items-center gap-2.5 text-center sm:text-left">
        <div
          className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
            isUrgent ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
          }`}
        >
          {isUrgent ? <Clock className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
        </div>
        <p className="font-medium leading-tight">
          <strong className="font-extrabold">
            {isUrgent ? 'Atenção ao prazo:' : 'Período de Teste Grátis:'}
          </strong>{' '}
          Você tem{' '}
          <span className="font-black underline decoration-2">
            {daysRemaining === 1 ? '1 dia restante' : `${daysRemaining} dias restantes`}
          </span>{' '}
          com acesso completo a todos os recursos sem cobrança.
        </p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <Button
          asChild
          size="sm"
          className={`h-7 px-3 text-xs font-bold rounded-lg shadow-2xs ${
            isUrgent
              ? 'bg-amber-600 hover:bg-amber-700 text-white'
              : 'bg-emerald-600 hover:bg-emerald-700 text-white'
          }`}
        >
          <Link href={`/${locale}/dashboard/settings/subscription`}>
            <span>Ver Planos &amp; Assinar</span>
            <ArrowRight className="h-3 w-3 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
