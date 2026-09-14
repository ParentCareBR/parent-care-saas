'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, Sparkles, Check, ArrowRight, Lock, Heart, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { PADDLE_TIERS, getTierPricing } from '@/lib/billing/paddle-catalog';
import { useAuth } from '@/contexts/AuthContext';

interface PaywallOverlayProps {
  locale: string;
  organizationId: string;
  onCheckout: (seats: number, interval: 'month' | 'year') => void;
  loadingSeats: number | null;
}

export function PaywallOverlay({ locale, organizationId, onCheckout, loadingSeats }: PaywallOverlayProps) {
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  const standardTiers = [1, 2, 3];

  return (
    <div className="fixed inset-0 z-50 bg-stone-950/80 backdrop-blur-md overflow-y-auto p-4 sm:p-8 flex items-center justify-center animate-in fade-in duration-300">
      <div className="max-w-4xl w-full bg-white dark:bg-stone-900 rounded-3xl border-2 border-stone-200 dark:border-stone-800 shadow-2xl overflow-hidden my-auto">
        {/* Top Announcement Bar */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center shrink-0">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg leading-tight">
                Seu período de teste de 30 dias terminou
              </h2>
              <p className="text-xs text-amber-100">
                Seus dados, rotinas e histórico continuam salvos e protegidos.
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs px-3 py-1 font-bold">
            Ativação Imediata
          </Badge>
        </div>

        {/* Content Area */}
        <div className="p-6 sm:p-10 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-stone-100">
              Escolha seu plano para continuar cuidando com tranquilidade
            </h3>
            <p className="text-stone-600 dark:text-stone-400 text-sm">
              Cadastre seu cartão com segurança via Paddle. Cancele quando quiser, sem taxas ou multas de fidelidade.
            </p>

            {/* Monthly / Annual Toggle */}
            <div className="pt-4 flex justify-center">
              <div className="inline-flex items-center bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl border border-stone-200 dark:border-stone-700 gap-1.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setInterval('month')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    interval === 'month'
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/30'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-700/60'
                  }`}
                >
                  Cobrança Mensal
                </button>
                <button
                  type="button"
                  onClick={() => setInterval('year')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    interval === 'year'
                      ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-500/30'
                      : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-700/60'
                  }`}
                >
                  <span>Cobrança Anual</span>
                  <span className="bg-amber-400 text-stone-900 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                    2 MESES GRÁTIS
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {standardTiers.map((seats) => {
              const pricing = getTierPricing(seats, locale, interval);
              const isPopular = seats === 2;

              return (
                <div
                  key={seats}
                  className={`rounded-3xl p-6 border-2 transition-all flex flex-col justify-between relative bg-white dark:bg-stone-900 ${
                    isPopular
                      ? 'border-emerald-500 shadow-lg ring-2 ring-emerald-500/20'
                      : 'border-stone-200 dark:border-stone-800 hover:border-stone-300'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full tracking-wider shadow-sm">
                      Mais Escolhido
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-stone-900 dark:text-stone-100">
                        {seats === 1 ? 'Individual / Idoso' : seats === 2 ? 'Idoso + Cuidador' : 'Família Completa'}
                      </h4>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                        {seats} {seats === 1 ? 'acesso familiar' : 'acessos sincronizados'} • até {pricing.caredPeopleLimit} idosos
                      </p>
                    </div>

                    <div className="pt-2 pb-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-stone-900 dark:text-stone-100">
                          {interval === 'year' ? pricing.monthlyEquivalentFormatted : pricing.totalFormatted}
                        </span>
                        {interval === 'year' && (
                          <span className="text-xs text-stone-400 font-semibold">/mês</span>
                        )}
                      </div>

                      {interval === 'year' && (
                        <div className="mt-1 space-y-0.5">
                          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                            {pricing.totalFormatted} cobrado anualmente
                          </p>
                          <span className="inline-block text-[10px] font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                            🎉 Economia de 2 meses grátis
                          </span>
                        </div>
                      )}
                    </div>

                    <ul className="space-y-2 text-xs text-stone-600 dark:text-stone-300 pt-2 border-t border-stone-100 dark:border-stone-800">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Controle de remédios e alarmes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Agenda médica e consultas</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Gestão financeira e aposentadoria</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>Acesso liberado na hora</span>
                      </li>
                    </ul>
                  </div>

                  <div className="pt-6 mt-4 border-t border-stone-100 dark:border-stone-800">
                    <Button
                      onClick={() => onCheckout(seats, interval)}
                      disabled={loadingSeats === seats}
                      className={`w-full font-bold text-xs rounded-xl h-11 shadow-sm ${
                        isPopular
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          : 'bg-stone-900 hover:bg-stone-800 text-white dark:bg-stone-100 dark:text-stone-900'
                      }`}
                    >
                      {loadingSeats === seats ? (
                        'Abrindo pagamento...'
                      ) : (
                        <>
                          <span>Assinar com Cartão</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
                        </>
                      )}
                    </Button>

                    {locale === 'pt-BR' && (
                      <p className="text-[11px] text-stone-500 dark:text-stone-400 text-center mt-2">
                        <span className="font-semibold text-emerald-700 dark:text-emerald-400">Pix:</span>{' '}
                        <span className="font-bold text-stone-800 dark:text-stone-200">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pricing.rawTotal + Math.round(pricing.rawTotal * 0.035 * 100) / 100)}
                        </span>
                        <span className="text-[10px] text-stone-400 dark:text-stone-500"> (c/ 3,5% IOF)</span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-stone-400">
              Pagamento processado com criptografia de ponta a ponta pelo Paddle. Dúvidas?{' '}
              <a
                href="https://wa.me/5511999999999"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-stone-600 font-semibold"
              >
                Fale com nosso suporte
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
