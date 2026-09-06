'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

export default function PricingPage() {
  const supabase = createClient();
  const t = useTranslations('PricingPage');
  const n = useTranslations('Navigation');
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';

  const [plans, setPlans] = useState<any[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPlans() {
      // Fetch available plans and their prices
      const { data: plansData } = await supabase
        .from('plans')
        .select(`
          *,
          plan_prices (*)
        `)
        .eq('is_active', true)
        .order('max_cared_people', { ascending: true });
        
      if (plansData) setPlans(plansData);
      setLoading(false);
    }
    fetchPlans();
  }, [supabase]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center font-medium text-stone-600">{t('loading')}</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-brand-green fill-brand-green" />
            <span className="text-xl font-bold text-brand-green">Parent Care</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href={`/${locale}/auth/login`} className="text-sm font-medium text-stone-600 hover:text-brand-green transition-colors">
              {n('login')}
            </Link>
          </div>
        </div>
      </header>

      <main className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-extrabold text-stone-900 mb-4">{t('title')}</h1>
            <p className="text-xl text-stone-600">
              {t('subtitle')}
            </p>
            <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full shadow-2xs">
              <span>{t('badge_security')}</span>
              <span>•</span>
              <span>{t('badge_trial')}</span>
              <span>•</span>
              <span>{t('badge_automatic')}</span>
              <span>•</span>
              <span>{t('badge_cancel')}</span>
            </div>
            
            <div className="mt-8 flex justify-center items-center gap-4">
              <div className="bg-white p-1 rounded-lg border border-stone-200 inline-flex">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${billingCycle === 'monthly' ? 'bg-brand-green text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  {t('monthly')}
                </button>
                <button 
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-brand-green text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  {t('yearly')}
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-white text-brand-green' : 'bg-brand-soft text-brand-green'}`}>
                    {t('save_discount')}
                  </span>
                </button>
              </div>

              <select 
                value={currency} 
                onChange={e => setCurrency(e.target.value)}
                className="p-2.5 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green bg-white shadow-sm"
              >
                <option value="BRL">BRL (R$)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map(plan => {
              const priceConfig = plan.plan_prices.find((p: any) => p.currency === currency) || plan.plan_prices[0];
              if (!priceConfig) return null;
              
              const price = billingCycle === 'monthly' ? priceConfig.monthly_price : priceConfig.yearly_price;
              
              return (
                <Card key={plan.id} className="flex flex-col border-stone-200 shadow-lg hover:shadow-xl transition-shadow bg-white relative">
                  {plan.slug === 'familia' && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-warm text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      {t('popular_badge')}
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription className="min-h-[40px]">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex-1">
                    <div className="mb-6">
                      <span className="text-4xl font-bold text-stone-900">
                        {priceConfig.currency === 'BRL' ? 'R$' : priceConfig.currency === 'USD' ? '$' : '€'} {price}
                      </span>
                      <span className="text-stone-500">{billingCycle === 'monthly' ? t('per_month') : t('per_year')}</span>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">
                          {locale === 'pt-BR' ? `Até ${plan.max_cared_people} idosos cuidados` : locale === 'es' ? `Hasta ${plan.max_cared_people} personas mayores cuidadas` : locale === 'fr' ? `Jusqu'à ${plan.max_cared_people} personnes âgées` : locale === 'de' ? `Bis zu ${plan.max_cared_people} betreute Senioren` : `Up to ${plan.max_cared_people} cared seniors`}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">
                          {locale === 'pt-BR' ? `Até ${plan.max_members} familiares/cuidadores no painel` : locale === 'es' ? `Hasta ${plan.max_members} familiares/cuidadores` : locale === 'fr' ? `Jusqu'à ${plan.max_members} membres de la famille/aidants` : locale === 'de' ? `Bis zu ${plan.max_members} Familienmitglieder/Pflegekräfte` : `Up to ${plan.max_members} family members/caregivers`}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">
                          {locale === 'pt-BR' ? 'Tela simplificada no celular para o idoso' : locale === 'es' ? 'Pantalla simplificada en el móvil para el adulto mayor' : locale === 'fr' ? 'Écran mobile simplifié pour la personne âgée' : locale === 'de' ? 'Vereinfachter mobiler Bildschirm für Senioren' : 'Simplified mobile screen for the senior'}
                        </span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">
                          {locale === 'pt-BR' ? 'Alertas de medicamentos e compromissos' : locale === 'es' ? 'Alertas de medicamentos y citas' : locale === 'fr' ? 'Alertes de médicaments et rendez-vous' : locale === 'de' ? 'Medikamenten- und Terminerinnerungen' : 'Medication and appointment alerts'}
                        </span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    <Button asChild className={`w-full h-12 text-base font-bold rounded-xl ${plan.slug === 'familia' ? 'bg-brand-green hover:bg-emerald-800 shadow-md' : 'bg-stone-800 hover:bg-stone-900'}`}>
                      <Link href={`/${locale}/auth/signup?plan=${plan.slug}`}>
                        {t('cta_start')}
                      </Link>
                    </Button>
                    <span className="text-[11px] text-stone-400 text-center font-medium">
                      {t('badge_trial')} • {t('badge_automatic')}
                    </span>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
