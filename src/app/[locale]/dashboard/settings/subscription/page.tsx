'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, CreditCard, AlertTriangle, FileText, Sparkles, Clock, ShieldCheck } from 'lucide-react';
import { useSearchParams, useParams } from 'next/navigation';

export default function SubscriptionSettingsPage() {
  const { currentOrganizationId } = useAuth();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = createClient() as any;

  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const trialStartedParam = searchParams.get('trial_started') === 'true';
  const successParam = searchParams.get('success') === 'true';
  const canceledParam = searchParams.get('canceled') === 'true';

  useEffect(() => {
    async function fetchData() {
      if (!currentOrganizationId) return;

      setLoading(true);

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

      // Fetch current subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*, plans(*)')
        .eq('organization_id', currentOrganizationId)
        .single();

      if (subData) setSubscription(subData);

      // Fetch billing history
      const { data: historyData } = await supabase
        .from('billing_history')
        .select('*')
        .eq('organization_id', currentOrganizationId)
        .order('created_at', { ascending: false });

      if (historyData) setBillingHistory(historyData);

      setLoading(false);
    }

    fetchData();
  }, [currentOrganizationId, supabase]);

  const handleCheckout = async (planId: string, priceId: string) => {
    setCheckoutLoading(planId);
    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId,
          priceId,
          organizationId: currentOrganizationId,
          locale,
          trialPeriodDays: 30, // 30 days trial with card
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Erro ao iniciar checkout');
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar checkout');
    }
    setCheckoutLoading(null);
  };

  const handlePortal = async () => {
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert('Erro ao acessar portal do cliente');
    }
  };

  const calculateDaysLeft = (targetDate?: string | null) => {
    if (!targetDate) return 30;
    const diff = new Date(targetDate).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const isTrial = subscription?.status === 'trial' || (!subscription && true);
  const trialEndsAt = subscription?.trial_ends_at || subscription?.current_period_end;
  const daysLeft = calculateDaysLeft(trialEndsAt);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Assinatura e Cobrança</h1>
        <p className="text-stone-500 dark:text-stone-400">
          Gerencie seu plano, método de pagamento cadastrado e faturas.
        </p>
      </div>

      {/* Trial Started Notification Banner */}
      {(trialStartedParam || successParam) && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 p-4 rounded-2xl flex items-start gap-3 shadow-2xs">
          <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-bold text-sm">🎉 Teste de 30 Dias Ativado com Sucesso!</h3>
            <p className="text-xs text-emerald-700 dark:text-emerald-300">
              Seu cartão foi validado pelo Stripe com <strong>R$ 0,00 cobrado hoje</strong>. Sua família tem acesso total por 30 dias.
              A cobrança só acontecerá automaticamente no 31º dia se você optar por continuar.
            </p>
          </div>
        </div>
      )}

      {canceledParam && (
        <div className="bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 p-4 rounded-2xl text-xs font-medium">
          O processo de checkout foi cancelado. Seu plano atual permanece inalterado.
        </div>
      )}

      {subscription?.status === 'past_due' && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-rose-600" />
          <div>
            <h3 className="font-bold text-sm">Pagamento Pendente</h3>
            <p className="text-xs mt-1">
              O débito da renovação falhou. Atualize seu método de pagamento para evitar o bloqueio dos serviços.
            </p>
            <Button onClick={handlePortal} variant="outline" size="sm" className="mt-3 bg-white text-rose-700 border-rose-300 hover:bg-rose-100">
              Atualizar Cartão no Stripe
            </Button>
          </div>
        </div>
      )}

      {/* Current Plan / Trial Status Card */}
      <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 shadow-2xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Status da Assinatura</CardTitle>
            {subscription?.status === 'active' ? (
              <Badge className="bg-emerald-600 text-white font-bold">Assinatura Ativa</Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 font-bold">
                Período de Teste (30 dias)
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {subscription?.status === 'trial' ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-emerald-950 dark:text-emerald-100">
                      {subscription.plans?.name || 'Plano Familiar'}
                    </h3>
                    <span className="text-xs bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full">
                      30 Dias Grátis
                    </span>
                  </div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    Cartão cadastrado com segurança no Stripe. <strong>R$ 0,00 cobrado hoje.</strong>
                  </p>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Primeira cobrança automática programada para:{' '}
                    <strong>{trialEndsAt ? new Date(trialEndsAt).toLocaleDateString('pt-BR') : 'Daqui a 30 dias'}</strong>.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs font-semibold text-stone-700 dark:text-stone-300">
                    <Clock className="h-4 w-4 text-emerald-600" />
                    {daysLeft} {daysLeft === 1 ? 'dia restante' : 'dias restantes'}
                  </div>
                  <Button onClick={handlePortal} variant="outline" size="sm" className="gap-2 rounded-xl text-xs">
                    <CreditCard className="h-4 w-4" />
                    Gerenciar Cartão / Cancelar
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/40 p-3 rounded-xl border border-stone-200/60 dark:border-stone-800">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Sem surpresas:</strong> você pode cancelar com 1 clique a qualquer momento antes do término diretamente pelo Portal do Stripe sem pagar nada.
                </span>
              </div>
            </div>
          ) : subscription?.status === 'active' ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-brand-green">{subscription.plans?.name}</h3>
                <p className="text-stone-600 dark:text-stone-300 text-sm mt-1">
                  Status: <span className="font-semibold capitalize text-emerald-600">Ativa e Regular</span>
                </p>
                {subscription.cancel_at_period_end ? (
                  <p className="text-xs text-rose-600 mt-1">Cancelada. Acesso liberado até o fim do ciclo de faturamento.</p>
                ) : (
                  <p className="text-xs text-stone-500 mt-1">
                    Próxima renovação automática em:{' '}
                    {subscription.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR') : ''}
                  </p>
                )}
              </div>
              <Button onClick={handlePortal} variant="outline" className="gap-2 rounded-xl text-xs">
                <CreditCard className="h-4 w-4" />
                Gerenciar no Portal Stripe
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    Ative seus 30 Dias de Teste Grátis com Cartão
                  </h3>
                  <p className="text-xs text-stone-600 dark:text-stone-300">
                    Cadastre seu cartão para liberar o acesso total ao Parent Care por 30 dias. <strong>R$ 0,00 cobrado hoje.</strong>
                  </p>
                  <p className="text-xs text-stone-500">
                    A primeira mensalidade só é cobrada no 31º dia. Você pode cancelar a qualquer momento antes do término.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">Planos Disponíveis</h2>
            <p className="text-stone-500 text-xs mt-0.5">
              Todos os planos incluem <strong>30 dias de teste grátis</strong> com cartão de crédito (R$ 0 hoje).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-500 font-medium">Moeda:</span>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="p-1.5 rounded-lg border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-brand-green"
            >
              <option value="BRL">BRL (R$)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const priceConfig = plan.plan_prices?.find((p: any) => p.currency === currency) || plan.plan_prices?.[0] || {
              currency,
              monthly_price: plan.price_monthly || 49.9,
            };
            const isCurrent = subscription?.plan_id === plan.id && subscription?.status === 'active';

            return (
              <Card
                key={plan.id}
                className={`flex flex-col rounded-2xl border transition-all ${
                  plan.slug === 'familia'
                    ? 'border-brand-green shadow-md ring-1 ring-brand-green bg-white dark:bg-stone-900'
                    : 'border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900'
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    {plan.slug === 'familia' && (
                      <Badge className="bg-brand-green text-white text-[10px] uppercase font-bold">Mais Escolhido</Badge>
                    )}
                  </div>
                  <CardDescription className="text-xs min-h-[32px]">{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div>
                    <div className="text-3xl font-extrabold text-stone-900 dark:text-stone-100">
                      {priceConfig.currency === 'BRL' ? 'R$' : priceConfig.currency === 'USD' ? '$' : '€'}{' '}
                      {priceConfig.monthly_price}
                      <span className="text-xs font-normal text-stone-500">/mês</span>
                    </div>
                    <p className="text-[11px] font-bold text-emerald-600 mt-1">
                      ✨ 30 dias grátis (R$ 0,00 cobrado hoje)
                    </p>
                  </div>

                  <ul className="space-y-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
                    <li className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                      <Check className="h-4 w-4 text-brand-green shrink-0" />
                      Até <strong>{plan.max_cared_people}</strong> idosos cadastrados
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                      <Check className="h-4 w-4 text-brand-green shrink-0" />
                      Até <strong>{plan.max_members}</strong> membros da família
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                      <Check className="h-4 w-4 text-brand-green shrink-0" />
                      Controle total de remédios e alimentação
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-700 dark:text-stone-300">
                      <Check className="h-4 w-4 text-brand-green shrink-0" />
                      Divisão de tarefas e linha de emergência SOS
                    </li>
                  </ul>
                </CardContent>
                <CardFooter className="flex flex-col gap-2 pt-2">
                  <Button
                    className={`w-full rounded-xl text-xs font-bold h-10 ${
                      plan.slug === 'familia' ? 'bg-brand-green hover:bg-emerald-800 shadow-xs' : 'bg-stone-900 hover:bg-stone-800'
                    }`}
                    variant={isCurrent ? 'outline' : 'default'}
                    disabled={isCurrent || checkoutLoading === plan.id}
                    onClick={() => handleCheckout(plan.id, priceConfig.stripe_price_monthly_id || priceConfig.id)}
                  >
                    {isCurrent
                      ? 'Plano Atual'
                      : checkoutLoading === plan.id
                      ? 'Iniciando teste...'
                      : 'Testar 30 dias grátis com cartão'}
                  </Button>
                  <span className="text-[10px] text-stone-400 text-center">
                    Cobrança automática somente após 30 dias
                  </span>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Billing History */}
      <Card className="rounded-2xl border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900">
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Faturas</CardTitle>
          <CardDescription>Comprovantes e recibos emitidos pelo Stripe.</CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <div className="py-6 text-center text-xs text-stone-400">
              Nenhuma cobrança realizada ainda. O período de teste é gratuito por 30 dias.
            </div>
          ) : (
            <div className="space-y-3">
              {billingHistory.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex justify-between items-center p-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 rounded-xl transition-colors border border-stone-100 dark:border-stone-800"
                >
                  <div>
                    <p className="font-semibold text-stone-900 dark:text-stone-100 text-xs">
                      {new Date(invoice.created_at).toLocaleDateString('pt-BR')}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {invoice.currency} {Number(invoice.amount_paid).toFixed(2)} -{' '}
                      {invoice.status === 'paid' ? 'Pago' : invoice.status}
                    </p>
                  </div>
                  {invoice.invoice_pdf_url && (
                    <Button variant="ghost" size="sm" asChild className="text-xs text-brand-green">
                      <a href={invoice.invoice_pdf_url} target="_blank" rel="noreferrer">
                        <FileText className="h-4 w-4 mr-1.5" /> Recibo PDF
                      </a>
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
