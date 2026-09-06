'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Heart, Shield, Users, Sparkles, MessageCircle, AlertCircle } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { PADDLE_TIERS, MAX_STANDARD_SEATS } from '@/lib/billing/paddle-catalog';
import { useAuth } from '@/contexts/AuthContext';

export default function PricingPage() {
  const t = useTranslations('PricingPage');
  const n = useTranslations('Navigation');
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || 'pt-BR';
  const { user, currentOrganizationId } = useAuth();

  const [selectedSeats, setSelectedSeats] = useState<number>(3);
  const [isCustomRequested, setIsCustomRequested] = useState<boolean>(false);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const currentTier = PADDLE_TIERS[selectedSeats] || PADDLE_TIERS[1];

  const handleSelectSeats = (seats: number) => {
    if (seats > MAX_STANDARD_SEATS) {
      setIsCustomRequested(true);
    } else {
      setIsCustomRequested(false);
      setSelectedSeats(seats);
    }
  };

  const handleStartCheckout = async () => {
    setCheckoutError(null);

    // If user is not logged in or has no organization yet, redirect to signup with seats parameter
    if (!user || !currentOrganizationId) {
      router.push(`/${locale}/auth/signup?seats=${selectedSeats}`);
      return;
    }

    setCheckoutLoading(true);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganizationId,
          seatQuantity: selectedSeats,
          locale,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Erro ao inicializar checkout seguro da Paddle.');
      }

      window.location.href = data.url;
    } catch (err: any) {
      setCheckoutError(err.message || 'Falha na conexão com a plataforma de pagamentos.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Navigation Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href={`/${locale}`} className="flex items-center gap-2">
            <Heart className="h-6 w-6 text-brand-green fill-brand-green" />
            <span className="text-xl font-bold text-brand-green">Parent Care</span>
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {user ? (
              <Link
                href={`/${locale}/dashboard`}
                className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                {n('dashboard')}
              </Link>
            ) : (
              <Link
                href={`/${locale}/auth/login`}
                className="text-sm font-medium text-stone-600 hover:text-brand-green transition-colors"
              >
                {n('login')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header Title & Badges */}
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold mb-4">
              <Shield className="h-3.5 w-3.5" />
              {t('badge_security')}
            </div>
            <h1 className="text-4xl font-extrabold text-stone-900 mb-4 tracking-tight">
              {t('title')}
            </h1>
            <p className="text-lg text-stone-600">
              {t('subtitle')}
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-full">
              <span>{t('badge_trial')}</span>
              <span>•</span>
              <span>{t('badge_automatic')}</span>
              <span>•</span>
              <span>{t('badge_cancel')}</span>
            </div>
          </div>

          {/* Seat Selector (Interactive Pills: 1 to 6 seats + Custom) */}
          <div className="bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-sm mb-12">
            <div className="text-center mb-6">
              <h2 className="text-lg font-bold text-stone-900">
                Quantas pessoas da sua família ou cuidadores precisarão de acesso?
              </h2>
              <p className="text-sm text-stone-500 mt-1">
                O titular da conta e os familiares/cuidadores com acesso ativo contam como assentos.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {[1, 2, 3, 4, 5, 6].map((seats) => {
                const tier = PADDLE_TIERS[seats];
                const isSelected = !isCustomRequested && selectedSeats === seats;
                return (
                  <button
                    key={seats}
                    type="button"
                    onClick={() => handleSelectSeats(seats)}
                    className={`relative p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-between ${
                      isSelected
                        ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    {tier.savingsPercentage > 0 && (
                      <span className="absolute -top-2.5 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow-2xs">
                        -{tier.savingsPercentage}%
                      </span>
                    )}
                    <span className="text-lg font-bold text-stone-900 mt-1">
                      {seats} {seats === 1 ? 'acesso' : 'acessos'}
                    </span>
                    <span className="text-xs font-medium text-emerald-700 mt-1">
                      R$ {tier.unitPriceBrl.toFixed(2).replace('.', ',')}/mês
                    </span>
                    <span className="text-[10px] text-stone-400">por assento</span>
                  </button>
                );
              })}

              {/* 7+ Seats Custom Option */}
              <button
                type="button"
                onClick={() => handleSelectSeats(7)}
                className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center justify-between ${
                  isCustomRequested
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-stone-200 hover:border-stone-300 hover:bg-stone-50'
                }`}
              >
                <span className="text-lg font-bold text-stone-900 mt-1">&gt; 6 acessos</span>
                <span className="text-xs font-semibold text-emerald-800 mt-1">Sob medida</span>
                <span className="text-[10px] text-stone-400">Fale conosco</span>
              </button>
            </div>
          </div>

          {/* Pricing Highlight Card */}
          {!isCustomRequested ? (
            <div className="max-w-2xl mx-auto">
              <Card className="border-emerald-200 bg-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-emerald-600 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  {selectedSeats === 3 ? 'Opção mais escolhida' : `Plano para ${selectedSeats} familiares`}
                </div>

                <CardHeader className="pt-8 pb-4">
                  <CardTitle className="text-2xl font-bold text-stone-900 flex items-center gap-2">
                    <Users className="h-6 w-6 text-emerald-600" />
                    Plano Família — {selectedSeats} {selectedSeats === 1 ? 'Assento' : 'Assentos'}
                  </CardTitle>
                  <CardDescription className="text-stone-600 text-sm mt-1">
                    Cuidado coordenado com histórico centralizado e total transparência familiar.
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Price Box */}
                  <div className="bg-stone-50 border border-stone-200/80 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
                    <div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-extrabold text-stone-900">
                          R$ {currentTier.totalMonthlyBrl.toFixed(2).replace('.', ',')}
                        </span>
                        <span className="text-stone-500 font-medium">/mês total</span>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        Equivalente a <strong>R$ {currentTier.unitPriceBrl.toFixed(2).replace('.', ',')}</strong> por assento ao mês.
                      </p>
                    </div>

                    {currentTier.savingsPercentage > 0 && (
                      <div className="inline-flex items-center px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold self-start sm:self-center">
                        Economia de {currentTier.savingsPercentage}% por assento
                      </div>
                    )}
                  </div>

                  {/* Cared Persons Special Rule Highlight */}
                  <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                    <Heart className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-900 leading-relaxed">
                      <strong className="block font-bold mb-0.5">Até 2 pessoas cuidadas incluídas (ex: Pai e Mãe)</strong>
                      Os idosos utilizam a tela simplificada sem consumir vagas de assentos de gestão. Medicamentos, rotinas e consultas de cada um permanecem 100% individualizados.
                    </div>
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-3 pt-2">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Tudo o que está incluído:
                    </p>
                    <ul className="space-y-2.5 text-sm text-stone-700">
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>{selectedSeats} {selectedSeats === 1 ? 'acesso administrativo' : 'acessos administrativos'}</strong> para filhos e cuidadores com permissões configuráveis.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Até 2 idosos cadastrados</strong> com visão simplificada de alto contraste no celular.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Controle de medicamentos</strong> com alarmes, doses registradas e alertas de reposição.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Rateio e gestão de despesas</strong> da farmácia e cuidados compartilhados entre a família.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Agenda unificada</strong> para consultas médicas, fisioterapia e exames.</span>
                      </li>
                      <li className="flex items-start gap-2.5">
                        <Check className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span><strong>Cobrança recorrente oficial Paddle</strong> com faturamento claro e cancelamento a 1 clique.</span>
                      </li>
                    </ul>
                  </div>

                  {checkoutError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-500" />
                      <span>{checkoutError}</span>
                    </div>
                  )}
                </CardContent>

                <CardFooter className="flex flex-col gap-3 pb-8">
                  <Button
                    onClick={handleStartCheckout}
                    disabled={checkoutLoading}
                    className="w-full h-13 text-base font-bold bg-brand-green hover:bg-emerald-800 text-white rounded-xl shadow-md transition-all"
                  >
                    {checkoutLoading ? 'Processando com Paddle...' : 'Começar 14 Dias Grátis com Paddle'}
                  </Button>
                  <p className="text-center text-xs text-stone-400">
                    Cobrança processada de forma segura pelo Paddle Billing. R$ 0,00 cobrado durante o período de teste.
                  </p>
                </CardFooter>
              </Card>
            </div>
          ) : (
            /* Custom Tier (> 6 seats) Banner */
            <div className="max-w-2xl mx-auto">
              <Card className="border-stone-200 bg-white shadow-lg p-6 sm:p-8 text-center">
                <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200">
                  <MessageCircle className="h-7 w-7 text-emerald-600" />
                </div>
                <h3 className="text-2xl font-bold text-stone-900 mb-2">
                  Precisa de mais de 6 acessos para sua família ou equipe?
                </h3>
                <p className="text-stone-600 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                  Para redes familiares expandidas, cuidadores profissionais contratados ou clínicas de apoio, oferecemos condições especiais com suporte prioritário e limites ampliados.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button asChild className="h-12 px-6 bg-brand-green hover:bg-emerald-800 text-white rounded-xl font-bold">
                    <a
                      href="https://wa.me/5511999999999?text=Ol%C3%A1!%20Gostaria%20de%20saber%20mais%20sobre%20o%20plano%20personalizado%20do%20Parent%20Care%20com%20mais%20de%206%20acessos."
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Falar com Consultor no WhatsApp
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsCustomRequested(false)}
                    className="h-12 px-6 rounded-xl border-stone-300"
                  >
                    Voltar aos planos de 1 a 6 acessos
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {/* Full Commercial Tiers Table (Section 20 requirement: transparent breakdown) */}
          <div className="mt-16 bg-white rounded-2xl border border-stone-200 p-6 sm:p-8 shadow-xs">
            <h3 className="text-xl font-bold text-stone-900 mb-2 text-center">
              Tabela Completa de Planos e Valores (Recorrência Mensal Paddle)
            </h3>
            <p className="text-sm text-stone-500 text-center mb-6">
              Todos os valores são em Reais (BRL) e processados pela plataforma financeira Paddle.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-stone-600">
                <thead className="text-xs text-stone-700 uppercase bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-bold">Faixa</th>
                    <th scope="col" className="px-4 py-3 font-bold">Assentos Inclusos</th>
                    <th scope="col" className="px-4 py-3 font-bold">Valor / Assento</th>
                    <th scope="col" className="px-4 py-3 font-bold">Total Mensal</th>
                    <th scope="col" className="px-4 py-3 font-bold">Desconto</th>
                    <th scope="col" className="px-4 py-3 font-bold">Pessoas Cuidadas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {Object.values(PADDLE_TIERS).map((tier) => (
                    <tr
                      key={tier.seats}
                      className={`hover:bg-stone-50/80 transition-colors ${
                        selectedSeats === tier.seats && !isCustomRequested ? 'bg-emerald-50/50 font-medium' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-bold text-stone-900">
                        Tier {tier.seats}
                      </td>
                      <td className="px-4 py-3">
                        {tier.seats} {tier.seats === 1 ? 'acesso' : 'acessos'}
                      </td>
                      <td className="px-4 py-3 text-stone-900">
                        R$ {tier.unitPriceBrl.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3 font-bold text-emerald-700">
                        R$ {tier.totalMonthlyBrl.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-4 py-3">
                        {tier.savingsPercentage > 0 ? (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            -{tier.savingsPercentage}%
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">Preço padrão</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500">
                        Até 2 idosos inclusos
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-stone-50/70">
                    <td className="px-4 py-3 font-bold text-stone-900">&gt; 6 assentos</td>
                    <td className="px-4 py-3 text-stone-500">Personalizado</td>
                    <td className="px-4 py-3 text-stone-500">Sob consulta</td>
                    <td className="px-4 py-3 font-bold text-stone-900">Sob medida</td>
                    <td className="px-4 py-3 text-stone-500">Volume corporativo</td>
                    <td className="px-4 py-3 text-xs text-stone-500">Sob consulta</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
