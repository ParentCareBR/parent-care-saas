'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Heart, ShieldCheck, Star, Zap, CreditCard, ArrowLeft, AlertTriangle } from 'lucide-react';
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

  const tiersArray = Object.values(PADDLE_TIERS).sort((a, b) => a.seats - b.seats);

  const handleAction = async (seats: number) => {
    if (!user || !currentOrganizationId) {
      router.push(`/${locale}/auth/signup?seats=${seats}`);
      return;
    }

    setCheckoutLoadingSeats(seats);
    setCheckoutError(null);

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId, seatQuantity: seats, locale }),
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
              'pt-BR': 'pt', 'en': 'en', 'es': 'es', 'fr': 'fr', 'de': 'de',
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
        </div>

        {/* Checkout Error Banner */}
        {checkoutError && (
          <div className="max-w-2xl mx-auto flex items-start gap-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="flex-1">{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} className="ml-2 text-red-500 hover:text-red-700 font-bold text-base leading-none">&times;</button>
          </div>
        )}

        {/* Plan Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tiersArray.map((tier) => {
            const isPopular = tier.seats === 3;
            const pricing = getTierPricing(tier.seats, locale);

            return (
              <Card
                key={tier.seats}
                className={`relative flex flex-col transition-all duration-200 ${
                  isPopular
                    ? 'border-brand-green/80 shadow-lg ring-2 ring-brand-green/20 bg-white dark:bg-stone-900'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 hover:shadow-md'
                }`}
              >
                {/* Popular badge */}
                {isPopular && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-green text-white px-3 py-0.5 text-xs font-bold shadow-md">
                      <Star className="h-3 w-3 mr-1 fill-white" />
                      {tPlan('popular_badge')}
                    </Badge>
                  </div>
                )}

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
                      <span className="text-stone-500 text-sm mb-1">{tPlan('total_month')}</span>
                    </div>
                    {tier.seats > 1 && (
                      <p className="text-xs text-stone-500 mt-0.5">
                        {pricing.unitFormatted} {tPlan('per_seat')}
                      </p>
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

          {/* Custom / Enterprise Card */}
          <Card className="border-dashed border-2 border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 flex flex-col justify-between">
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-stone-500" />
                <CardTitle className="text-lg font-bold">{tPlan('custom_plan_title')}</CardTitle>
              </div>
              <CardDescription className="text-xs text-stone-500 leading-relaxed">
                {tPlan('custom_plan_desc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-stone-500">
              <p>• {tPlan('custom_feature_1')}</p>
              <p>• {tPlan('custom_feature_2')}</p>
              <p>• {tPlan('custom_feature_3')}</p>
            </CardContent>
            <CardFooter className="pt-0 pb-6">
              <Button
                asChild
                variant="outline"
                className="w-full h-11 rounded-xl border-stone-300 dark:border-stone-700 font-semibold"
              >
                <a
                  href="https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20conhecer%20o%20Plano%20Personalizado%20do%20Parent%20Care"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tPlan('btn_custom')}
                </a>
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
