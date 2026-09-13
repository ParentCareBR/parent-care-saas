'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Heart, ShieldCheck, Star, CreditCard, ArrowLeft, AlertTriangle, Sparkles, Plus, Minus } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { PADDLE_TIERS, getTierPricing } from '@/lib/billing/paddle-catalog';
import { useAuth } from '@/contexts/AuthContext';

declare global {
  interface Window { Paddle?: any; }
}

async function loadPaddleScript(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (window.Paddle) return true;
  return new Promise((resolve) => {
    if (document.querySelector('script[src*="paddle.js"]')) {
      const poll = setInterval(() => {
        if (window.Paddle) { clearInterval(poll); resolve(true); }
      }, 100);
      setTimeout(() => { clearInterval(poll); resolve(false); }, 6000);
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export default function PricingPage() {
  const tPlan = useTranslations('PlanCards');
  const tNav = useTranslations('Navigation');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId } = useAuth();

  const [checkoutLoadingSeats, setCheckoutLoadingSeats] = useState<number | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [calculatorSeats, setCalculatorSeats] = useState<number>(3);
  const [billingInterval, setBillingInterval] = useState<'month' | 'year'>('year');

  const tiersArray = Object.values(PADDLE_TIERS).sort((a, b) => a.seats - b.seats);

  const handleAction = async (seats: number) => {
    if (!user || !currentOrganizationId) {
      router.push(`/${locale}/auth/signup?seats=${seats}&interval=${billingInterval}`);
      return;
    }

    setCheckoutLoadingSeats(seats);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          seatQuantity: seats,
          locale,
          billingInterval,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCheckoutError(data?.error || 'Erro ao iniciar o checkout. Tente novamente.');
        setCheckoutLoadingSeats(null);
        return;
      }

      // --- Try Paddle overlay first (best UX) ---
      if (data.transactionId) {
        const loaded = await loadPaddleScript();
        if (loaded && window.Paddle) {
          try {
            const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN || 'live_8b221e28dc09462a981f134d24f';
            const isSandbox = token.startsWith('test_') || process.env.NEXT_PUBLIC_PADDLE_ENV === 'sandbox';
            if (isSandbox) {
              window.Paddle.Environment.set('sandbox');
            }
            if (token) {
              window.Paddle.Setup({ token });
            }

            const paddleLocaleMap: Record<string, string> = {
              'pt-BR': 'pt', 'en': 'en', 'en-GB': 'en', 'es': 'es', 'fr': 'fr', 'de': 'de',
            };
            const paddleLocale = paddleLocaleMap[locale] || locale.split('-')[0] || 'pt';

            window.Paddle.Checkout.open({
              transactionId: data.transactionId,
              settings: {
                displayMode: 'overlay',
                theme: 'light',
                locale: paddleLocale,
                successUrl: `${window.location.origin}/${locale}/dashboard/settings/subscription?success=true`,
              },
            });
            setCheckoutLoadingSeats(null);
            return;
          } catch (overlayErr) {
            console.warn('[Paddle] Overlay failed, redirecting:', overlayErr);
          }
        }
      }

      // --- Fallback: redirect to hosted checkout ---
      if (data.url) {
        window.location.href = data.url;
        return;
      }

      router.push(`/${locale}/dashboard/settings/subscription`);
    } finally {
      setCheckoutLoadingSeats(null);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100">
      {/* Navigation Header */}
      <header className="bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-1.5 text-xs text-stone-500 hover:text-stone-900 dark:hover:text-stone-200 font-medium"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{tPlan('back')}</span>
            </Link>
            <div className="h-4 w-px bg-stone-200 dark:bg-stone-700 mx-1" />
            <Link href={`/${locale}`} className="flex items-center gap-2">
              <Heart className="h-6 w-6 text-brand-green fill-brand-green" />
              <span className="text-xl font-bold text-brand-green">Parent Care</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm" className="bg-brand-green hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold">
                <Link href={`/${locale}/dashboard`}>
                  {tNav('dashboard')}
                </Link>
              </Button>
            ) : (
              <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="text-xs font-semibold">
                  <Link href={`/${locale}/auth/login`}>
                    {tNav('login')}
                  </Link>
                </Button>
                <Button asChild size="sm" className="bg-brand-green hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold">
                  <Link href={`/${locale}/auth/signup`}>
                    {tNav('register')}
                  </Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        {/* Page Title */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>{tPlan('security_note')}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            {tPlan('title')}
          </h1>
          <p className="text-base sm:text-lg text-stone-600 dark:text-stone-400">
            {tPlan('subtitle')}
          </p>

          {/* Monthly / Annual Billing Toggle */}
          <div className="pt-4 flex justify-center">
            <div className="inline-flex items-center bg-stone-200/80 dark:bg-stone-800 p-1.5 rounded-2xl border border-stone-300/80 dark:border-stone-700 gap-1 shadow-inner">
              <button
                type="button"
                onClick={() => setBillingInterval('month')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  billingInterval === 'month'
                    ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-xs'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                {locale === 'pt-BR' ? 'Cobrança Mensal' : 'Monthly Billing'}
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('year')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  billingInterval === 'year'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-500 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <span>{locale === 'pt-BR' ? 'Cobrança Anual' : 'Annual Billing'}</span>
                <span className="bg-amber-400 text-stone-900 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wide">
                  {locale === 'pt-BR' ? '2 Meses Grátis 🎉' : '2 Months Free 🎉'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Checkout Error Banner */}
        {checkoutError && (
          <div className="max-w-2xl mx-auto flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} className="ml-2 text-red-500 hover:text-red-700 font-bold text-base leading-none">&times;</button>
          </div>
        )}

        {/* Custom Plan Selector / Configuration */}
        {(() => {
          const isPt = locale === 'pt-BR';
          const isEs = locale.startsWith('es');
          const isFr = locale.startsWith('fr');
          const isDe = locale.startsWith('de');

          const calcLabels = {
            badge: isPt ? 'Plano Personalizado' : (isEs ? 'Plan Personalizado' : (isFr ? 'Forfait Personnalisé' : (isDe ? 'Individueller Tarif' : 'Custom Plan'))),
            title: isPt ? 'Escolha a Quantidade de Acessos para sua Família' : (isEs ? 'Elige la Cantidad de Accesos para tu Familia' : (isFr ? 'Choisissez le Nombre d\'Accès pour Votre Famille' : (isDe ? 'Wählen Sie die Anzahl der Zugänge für Ihre Familie' : 'Choose the Number of Family Seats'))),
            subtitle: isPt ? 'O valor mensal é calculado automaticamente de acordo com o número de acessos. Selecione o seu plano e assine agora com 30 dias de teste grátis:' : (isEs ? 'El valor mensual se calcula automáticamente según la cantidad de accesos. Selecciona tu plan y suscríbete ahora con 30 días de prueba gratis:' : (isFr ? 'Le tarif mensuel est calculé automatiquement selon le nombre d\'accès. Choisissez votre forfait et abonnez-vous dès maintenant avec 30 jours d\'essai gratuit :' : (isDe ? 'Der Monatsbeitrag wird automatisch nach der Anzahl der Zugänge berechnet. Wählen Sie Ihren Tarif und abonnieren Sie jetzt mit 30 Tagen kostenloser Testphase:' : 'Monthly pricing is calculated automatically based on the number of seats. Select your plan and subscribe now with a 30-day free trial:'))),
            seatsWord: isPt ? (calculatorSeats === 1 ? 'acesso familiar' : 'acessos familiares') : (isEs ? (calculatorSeats === 1 ? 'acceso familiar' : 'accesos familiares') : (isFr ? (calculatorSeats === 1 ? 'accès familial' : 'accès familiaux') : (isDe ? (calculatorSeats === 1 ? 'Familienzugang' : 'Familienzugänge') : (calculatorSeats === 1 ? 'family seat' : 'family seats')))),
            selectedTag: isPt ? 'Plano Selecionado' : (isEs ? 'Plan Seleccionado' : (isFr ? 'Forfait Sélectionné' : (isDe ? 'Ausgewählter Tarif' : 'Selected Plan'))),
            customTag: isPt ? 'Plano Sob Medida' : (isEs ? 'Plan a Medida' : (isFr ? 'Forfait Sur-Mesure' : (isDe ? 'Maßgeschneiderter Tarif' : 'Tailored Plan'))),
            subscribeBtn: isPt ? `Assinar Agora (${calculatorSeats} ${calculatorSeats === 1 ? 'Acesso' : 'Acessos'})` : (isEs ? `Suscribir Ahora (${calculatorSeats} ${calculatorSeats === 1 ? 'Acceso' : 'Accesos'})` : (isFr ? `S'abonner Maintenant (${calculatorSeats} ${calculatorSeats === 1 ? 'Accès' : 'Accès'})` : (isDe ? `Jetzt Abonnieren (${calculatorSeats} ${calculatorSeats === 1 ? 'Zugang' : 'Zugänge'})` : `Subscribe Now (${calculatorSeats} ${calculatorSeats === 1 ? 'Seat' : 'Seats'})`))),
            trialText: isPt ? '30 dias de teste grátis com cartão • Cancele quando quiser' : (isEs ? '30 días de prueba gratis con tarjeta • Cancela cuando quieras' : (isFr ? '30 jours d\'essai gratuit avec carte • Annulez à tout moment' : (isDe ? '30 Tage kostenlos testen mit Karte • Jederzeit kündbar' : '30-day free trial with credit card • Cancel anytime'))),
            shortcuts: isPt ? 'Escolha rápida:' : (isEs ? 'Selección rápida:' : (isFr ? 'Choix rapide :' : (isDe ? 'Schnellauswahl:' : 'Quick select:'))),
            maxDiscountTag: isPt ? 'Desconto Máximo Progressivo' : (isEs ? 'Descuento Máximo Progresivo' : (isFr ? 'Remise Maximale Progressive' : (isDe ? 'Maximaler Staffelrabatt' : 'Maximum Progressive Discount'))),
          };

          const calcPricing = getTierPricing(calculatorSeats, locale, billingInterval);

          return (
            <section id="plan-selector" className="bg-gradient-to-br from-white via-emerald-50/20 to-white dark:from-stone-900 dark:via-emerald-950/20 dark:to-stone-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              <div className="max-w-4xl mx-auto space-y-6 relative">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 pb-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-xs font-bold mb-2">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>{calcLabels.badge}</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                      {calcLabels.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
                      {calcLabels.subtitle}
                    </p>
                  </div>

                  <div className="sm:text-right shrink-0">
                    <span className="text-xs font-semibold text-stone-400 block uppercase tracking-wider">
                      {calcLabels.selectedTag}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-400">
                      {calculatorSeats <= 6 ? tPlan(`tier_${calculatorSeats}` as any) : calcLabels.customTag}
                    </span>
                  </div>
                </div>

                {/* Slider & Stepper Controls */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setCalculatorSeats((prev) => Math.max(1, prev - 1))}
                        disabled={calculatorSeats <= 1}
                        className="h-10 w-10 rounded-xl border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
                        aria-label="Diminuir acessos"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>

                      <div className="flex items-baseline gap-1.5 px-4 py-1.5 bg-stone-100 dark:bg-stone-800/80 rounded-xl min-w-[170px] justify-center shadow-2xs">
                        <span className="text-2xl sm:text-3xl font-black text-stone-900 dark:text-white">
                          {calculatorSeats}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-stone-600 dark:text-stone-400">
                          {calcLabels.seatsWord}
                        </span>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setCalculatorSeats((prev) => Math.min(30, prev + 1))}
                        disabled={calculatorSeats >= 30}
                        className="h-10 w-10 rounded-xl border-stone-300 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 shrink-0"
                        aria-label="Aumentar acessos"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Quick selection pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      <span className="text-xs text-stone-400 mr-1 font-medium">{calcLabels.shortcuts}</span>
                      {[1, 2, 3, 4, 5, 6, 8, 10, 15, 20].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => setCalculatorSeats(num)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                            calculatorSeats === num
                              ? 'bg-emerald-600 text-white shadow-xs scale-105'
                              : 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Range Slider */}
                  <div className="space-y-1.5">
                    <input
                      type="range"
                      min="1"
                      max="20"
                      value={calculatorSeats}
                      onChange={(e) => setCalculatorSeats(Number(e.target.value))}
                      className="w-full h-2.5 bg-stone-200 dark:bg-stone-800 rounded-lg appearance-none cursor-pointer accent-emerald-600 dark:accent-emerald-500"
                    />
                    <div className="flex justify-between text-[11px] text-stone-400 font-medium px-1">
                      <span>1</span>
                      <span>3 (popular)</span>
                      <span>6</span>
                      <span>10</span>
                      <span>15</span>
                      <span>20+</span>
                    </div>
                  </div>
                </div>

                {/* Live Pricing Summary & Action Card */}
                <div className="bg-white dark:bg-stone-900/90 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-6">
                  {/* Price details */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100 tracking-tight">
                        {calcPricing.totalFormatted}
                      </span>
                      <span className="text-stone-500 text-sm font-medium">
                        {billingInterval === 'year'
                          ? (locale === 'pt-BR' ? '/ ano' : '/ year')
                          : tPlan('total_month')}
                      </span>
                      {billingInterval === 'year' && calcPricing.monthlyEquivalentFormatted && (
                        <span className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-400 font-bold ml-1">
                          ({locale === 'pt-BR' ? `equivale a ${calcPricing.monthlyEquivalentFormatted}/mês` : `equiv. ${calcPricing.monthlyEquivalentFormatted}/mo`})
                        </span>
                      )}
                      {calculatorSeats > 1 && billingInterval === 'month' && (
                        <span className="text-xs sm:text-sm text-stone-500 font-medium ml-1">
                          ({calcPricing.unitFormatted} {tPlan('per_seat')})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1 rounded-lg">
                        <Heart className="h-3.5 w-3.5 fill-emerald-200 text-emerald-600" />
                        {tPlan('cared_included', { count: calcPricing.caredPeopleLimit })}
                      </span>

                      {billingInterval === 'year' && calcPricing.annualSavingsFormatted && (
                        <span className="inline-flex items-center text-xs font-bold text-amber-900 dark:text-amber-200 bg-amber-200 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2.5 py-1 rounded-lg">
                          🎉 {locale === 'pt-BR' ? `2 meses grátis (Economia de ${calcPricing.annualSavingsFormatted})` : `2 months free (Save ${calcPricing.annualSavingsFormatted})`}
                        </span>
                      )}

                      {billingInterval === 'month' && calcPricing.savingsPercentage > 0 && (
                        <span className="inline-flex items-center text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded-lg">
                          {tPlan('save_discount', { percent: calcPricing.savingsPercentage })}
                        </span>
                      )}

                      {calculatorSeats > 6 && (
                        <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md">
                          {calcLabels.maxDiscountTag}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action button */}
                  <div className="shrink-0 flex flex-col sm:flex-row md:flex-col gap-2 min-w-[240px]">
                    <Button
                      onClick={() => handleAction(calculatorSeats)}
                      disabled={checkoutLoadingSeats === calculatorSeats}
                      className="w-full h-12 rounded-xl font-bold bg-brand-green hover:bg-emerald-800 text-white shadow-md hover:shadow-lg transition-all text-sm gap-2"
                    >
                      {checkoutLoadingSeats === calculatorSeats ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>{tPlan('loading')}</span>
                        </div>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4" />
                          <span>{calcLabels.subscribeBtn}</span>
                        </>
                      )}
                    </Button>

                    <p className="text-[11px] text-center text-stone-400">
                      {calcLabels.trialText}
                    </p>
                  </div>
                </div>
              </div>
            </section>
          );
        })()}

        {/* Predefined Plan Cards Header */}
        <div className="text-center space-y-2 pt-2">
          <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 dark:text-stone-100">
            {locale === 'pt-BR'
              ? 'Ou escolha diretamente um dos planos fixos abaixo:'
              : (locale.startsWith('es')
              ? 'O elige directamente uno de los planes fijos a continuación:'
              : (locale.startsWith('fr')
              ? 'Ou choisissez directement l\'un des forfaits fixes ci-dessous :'
              : (locale.startsWith('de')
              ? 'Oder wählen Sie direkt einen der festen Tarife unten:'
              : 'Or choose directly from the fixed plans below:')))}
          </h2>
          <p className="text-xs sm:text-sm text-stone-500 max-w-xl mx-auto">
            {locale === 'pt-BR'
              ? 'Todos os planos incluem 30 dias de teste grátis com cartão de crédito e cancelamento sem burocracia.'
              : (locale.startsWith('es')
              ? 'Todos los planes incluyen 30 días de prueba gratis con tarjeta y cancelación sin complicaciones.'
              : (locale.startsWith('fr')
              ? 'Tous les forfaits incluent 30 jours d\'essai gratuit avec carte et annulation sans contrainte.'
              : (locale.startsWith('de')
              ? 'Alle Tarife beinhalten 30 Tage kostenlose Testphase mit Karte und unkomplizierte Kündigung.'
              : 'All plans include a 30-day free trial with credit card and hassle-free cancellation.')))}
          </p>
        </div>

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiersArray.map((tier) => {
            const isPopular = tier.seats === 3;
            const isSelected = tier.seats === calculatorSeats;
            const pricing = getTierPricing(tier.seats, locale, billingInterval);

            return (
              <Card
                key={tier.seats}
                className={`relative flex flex-col transition-all duration-200 ${
                  isSelected
                    ? 'border-emerald-600 shadow-xl ring-2 ring-emerald-500/30 bg-white dark:bg-stone-900 scale-[1.01]'
                    : isPopular
                    ? 'border-brand-green/80 shadow-lg ring-2 ring-brand-green/20 bg-white dark:bg-stone-900'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:shadow-md'
                }`}
              >
                {/* Selected or Popular badge */}
                {isSelected ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-700 text-white px-3 py-0.5 text-xs font-bold shadow-md">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {locale === 'pt-BR' ? 'Plano Selecionado' : 'Selected Plan'}
                    </Badge>
                  </div>
                ) : isPopular ? (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-green text-white px-3 py-0.5 text-xs font-bold shadow-md">
                      <Star className="h-3 w-3 mr-1 fill-white" />
                      {tPlan('popular_badge')}
                    </Badge>
                  </div>
                ) : null}

                <CardHeader className="pb-3 pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                        {tier.seats === 1 ? tPlan('seat_single') : tPlan('seat_plural', { count: tier.seats })}
                      </p>
                      <CardTitle className="text-lg font-bold">
                        {tPlan(`tier_${tier.seats}` as any)}
                      </CardTitle>
                    </div>
                    {tier.savingsPercentage > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200 text-[11px] font-bold shrink-0">
                        {tPlan('save_discount', { percent: tier.savingsPercentage })}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Pricing */}
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl sm:text-4xl font-extrabold text-stone-900 dark:text-stone-100">
                        {pricing.totalFormatted}
                      </span>
                      <span className="text-stone-500 text-sm mb-1">
                        {billingInterval === 'year' ? (locale === 'pt-BR' ? '/ ano' : '/ year') : tPlan('total_month')}
                      </span>
                    </div>
                    {billingInterval === 'year' && pricing.monthlyEquivalentFormatted ? (
                      <p className="text-xs text-emerald-700 dark:text-emerald-400 font-bold mt-0.5">
                        {locale === 'pt-BR' ? `Equivale a ${pricing.monthlyEquivalentFormatted}/mês` : `Equiv. ${pricing.monthlyEquivalentFormatted}/mo`}
                      </p>
                    ) : tier.seats > 1 ? (
                      <p className="text-xs text-stone-500 mt-0.5">
                        {pricing.unitFormatted} {tPlan('per_seat')}
                      </p>
                    ) : null}
                    {billingInterval === 'year' && pricing.annualSavingsFormatted && (
                      <div className="mt-2">
                        <span className="inline-block text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-md">
                          🎉 {locale === 'pt-BR' ? `2 meses grátis (-${pricing.annualSavingsFormatted})` : `2 months free (-${pricing.annualSavingsFormatted})`}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cared people note - PROGRESSIVE SENIORS COUNT */}
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
                    <Heart className="h-3.5 w-3.5 shrink-0 fill-emerald-200 text-emerald-600" />
                    <span className="font-semibold">{tPlan('cared_included', { count: pricing.caredPeopleLimit })}</span>
                  </div>

                  {/* Localized Features Checklist */}
                  <ul className="space-y-2 pt-2">
                    <li className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{tPlan('feat_routine_meds')}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{tPlan('feat_schedule')}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{tPlan('feat_history')}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-600 dark:text-stone-300">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{tPlan('feat_alerts')}</span>
                    </li>
                    <li className="flex items-center gap-2 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <span>{tPlan('feat_seniors', { count: pricing.caredPeopleLimit })}</span>
                    </li>
                  </ul>

                  {/* Free trial guarantee */}
                  <p className="text-xs text-stone-400 flex items-center gap-1 pt-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    <span>{tPlan('free_trial')}</span>
                  </p>
                </CardContent>

                <CardFooter className="pt-0 pb-6">
                  <Button
                    onClick={() => handleAction(tier.seats)}
                    disabled={checkoutLoadingSeats === tier.seats}
                    className={`w-full h-11 rounded-xl font-bold transition-all ${
                      isPopular
                        ? 'bg-brand-green hover:bg-emerald-800 text-white shadow-md'
                        : 'bg-stone-900 hover:bg-stone-800 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white text-white'
                    }`}
                  >
                    {checkoutLoadingSeats === tier.seats ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>{tPlan('loading')}</span>
                      </div>
                    ) : (
                      <>
                        <CreditCard className="h-4 w-4 mr-2" />
                        {tPlan('btn_subscribe')}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}

          {/* Custom Plan Card */}
          <Card className="border-dashed border-2 border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 flex flex-col justify-between">
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-lg font-bold">{tPlan('custom_plan_title')}</CardTitle>
              </div>
              <CardDescription className="text-xs text-stone-500 leading-relaxed">
                {tPlan('custom_plan_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-stone-600 dark:text-stone-300">
              <p className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {tPlan('custom_feature_1')}</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {tPlan('custom_feature_2')}</p>
              <p className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> {tPlan('custom_feature_3')}</p>
            </CardContent>
            <CardFooter className="pt-0 pb-6">
              <Button
                type="button"
                onClick={() => {
                  setCalculatorSeats(10);
                  document.getElementById('plan-selector')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full h-11 rounded-xl font-bold bg-brand-green hover:bg-emerald-800 text-white text-xs gap-1.5 shadow-md"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>{tPlan('btn_custom')}</span>
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Security & Guarantee Note */}
        <div className="text-center text-xs text-stone-400 max-w-xl mx-auto pt-4 space-y-1">
          <p>{tPlan('security_note')}</p>
        </div>
      </main>
    </div>
  );
}
