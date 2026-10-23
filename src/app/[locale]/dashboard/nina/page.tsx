'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useCaredPerson } from '@/contexts/CaredPersonContext';
import { NinaAIChatbot } from '@/components/nina/NinaAIChatbot';
import Link from 'next/link';
import { ChevronLeft, Sparkles, ShieldCheck, Heart } from 'lucide-react';

export default function NinaPage() {
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const { selectedPerson } = useCaredPerson();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top breadcrumb */}
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}/dashboard`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          Voltar ao Dashboard
        </Link>
        <span className="text-[11px] font-bold text-stone-400">
          Parent Care · Assistência com Inteligência Artificial
        </span>
      </div>

      {/* Nina IA Component */}
      <NinaAIChatbot
        caredPersonId={selectedPerson?.id}
        caredPersonName={selectedPerson?.full_name || 'seu idoso'}
        inline={true}
      />

      {/* Clinical & Safety Note */}
      <div className="bg-stone-50 dark:bg-[#0C1728] border border-stone-200 dark:border-[#1E293B] rounded-3xl p-5 text-xs text-stone-500 dark:text-stone-400 flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-2xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-stone-700 dark:text-stone-200">
            Aviso de Apoio e Responsabilidade Clínica
          </p>
          <p className="leading-relaxed">
            A Nina IA é um assistente virtual complementar para organização de rotina, dúvidas de bem-estar e cuidados cotidianos. Ela não substitui diagnósticos clínicos, exames médicos ou consultas presenciais. Em caso de urgências graves, acione imediatamente o SAMU 192 ou dirija-se a um pronto-socorro.
          </p>
        </div>
      </div>
    </div>
  );
}
