'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Heart } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function PricingPage() {
  const supabase = createClient();
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
    return <div className="min-h-screen flex items-center justify-center">Carregando planos...</div>;
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-brand-green fill-brand-green" />
            <span className="text-xl font-bold text-brand-green">Parent Care</span>
          </Link>
          <div className="flex gap-4">
            <Link href="/auth/login" className="text-sm font-medium text-stone-600 hover:text-brand-green transition-colors mt-2">
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <main className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-4xl font-extrabold text-stone-900 mb-4">Preços simples para o cuidado da sua família</h1>
            <p className="text-xl text-stone-600">
              Escolha o plano ideal e teste gratuitamente por 14 dias. Cancele quando quiser.
            </p>
            
            <div className="mt-8 flex justify-center items-center gap-4">
              <div className="bg-white p-1 rounded-lg border border-stone-200 inline-flex">
                <button 
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md ${billingCycle === 'monthly' ? 'bg-brand-green text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  Mensal
                </button>
                <button 
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-4 py-2 text-sm font-medium rounded-md flex items-center gap-2 ${billingCycle === 'yearly' ? 'bg-brand-green text-white shadow-sm' : 'text-stone-600 hover:text-stone-900'}`}
                >
                  Anual
                  <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-full ${billingCycle === 'yearly' ? 'bg-white text-brand-green' : 'bg-brand-soft text-brand-green'}`}>
                    -20%
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
                      Mais Popular
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
                      <span className="text-stone-500">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                    </div>
                    <ul className="space-y-4">
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">Até <strong>{plan.max_cared_people}</strong> idosos cuidados</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">Até <strong>{plan.max_members}</strong> familiares/cuidadores no painel</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">Tela simplificada no celular para o idoso</span>
                      </li>
                      <li className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-brand-green shrink-0 mt-0.5" />
                        <span className="text-stone-600">Alertas de medicamentos e compromissos</span>
                      </li>
                    </ul>
                  </CardContent>
                  <CardFooter>
                    <Button asChild className={`w-full h-12 text-lg ${plan.slug === 'familia' ? 'bg-brand-green hover:bg-emerald-800' : 'bg-stone-800 hover:bg-stone-900'}`}>
                      <Link href={`/auth/signup?plan=${plan.slug}`}>
                        Começar 14 dias grátis
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
