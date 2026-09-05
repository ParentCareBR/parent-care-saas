'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, CreditCard, AlertTriangle, FileText } from 'lucide-react';

export default function SubscriptionSettingsPage() {
  const { currentOrganizationId } = useAuth();
  const supabase = createClient();
  const [plans, setPlans] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

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
        .eq('is_active', true);
        
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
          organizationId: currentOrganizationId
        })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
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
        body: JSON.stringify({ organizationId: currentOrganizationId })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      alert('Erro ao acessar portal do cliente');
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Assinatura e Cobrança</h1>
        <p className="text-stone-500">Gerencie seu plano, pagamentos e faturas.</p>
      </div>

      {subscription?.status === 'past_due' && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold">Pagamento Recusado</h3>
            <p className="text-sm mt-1">
              Seu último pagamento falhou. O plano atual está em período de tolerância até {new Date(subscription.grace_period_ends_at).toLocaleDateString()}. 
              Atualize seu método de pagamento para evitar o bloqueio dos serviços.
            </p>
            <Button onClick={handlePortal} variant="outline" className="mt-3 bg-white text-red-700 border-red-300 hover:bg-red-100">
              Atualizar Cartão
            </Button>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle>Plano Atual</CardTitle>
        </CardHeader>
        <CardContent>
          {subscription ? (
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h3 className="text-xl font-bold text-brand-green">{subscription.plans?.name}</h3>
                <p className="text-stone-600 mt-1">Status: <span className="font-semibold capitalize">{subscription.status}</span></p>
                {subscription.cancel_at_period_end && (
                  <p className="text-sm text-red-600 mt-1">Cancelado. Acesso até o fim do período de faturamento.</p>
                )}
              </div>
              <Button onClick={handlePortal} variant="outline" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Gerenciar no Portal
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-stone-600">Você está no período de Trial (teste gratuito).</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-bold text-stone-900">Alterar Plano</h2>
          <select 
            value={currency} 
            onChange={e => setCurrency(e.target.value)}
            className="p-2 rounded-md border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="BRL">BRL (R$)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
          </select>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map(plan => {
            const priceConfig = plan.plan_prices.find((p: any) => p.currency === currency) || plan.plan_prices[0];
            const isCurrent = subscription?.plan_id === plan.id;
            
            return (
              <Card key={plan.id} className={`flex flex-col ${isCurrent ? 'border-brand-green ring-1 ring-brand-green' : ''}`}>
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="text-3xl font-bold mb-6">
                    {priceConfig.currency} {priceConfig.monthly_price}
                    <span className="text-sm font-normal text-stone-500">/mês</span>
                  </div>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-brand-green" />
                      Até {plan.max_cared_people} idosos
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-brand-green" />
                      Até {plan.max_members} familiares
                    </li>
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isCurrent ? "outline" : "default"}
                    disabled={isCurrent || checkoutLoading === plan.id}
                    onClick={() => handleCheckout(plan.id, priceConfig.stripe_price_monthly_id)}
                  >
                    {isCurrent ? 'Plano Atual' : (checkoutLoading === plan.id ? 'Processando...' : 'Assinar')}
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Faturas</CardTitle>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <p className="text-stone-500 text-sm">Nenhuma fatura encontrada.</p>
          ) : (
            <div className="space-y-4">
              {billingHistory.map((invoice) => (
                <div key={invoice.id} className="flex justify-between items-center p-3 hover:bg-stone-50 rounded-lg transition-colors border border-transparent hover:border-stone-100">
                  <div>
                    <p className="font-semibold text-stone-900">
                      {new Date(invoice.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-stone-500">
                      {invoice.currency} {invoice.amount_paid.toFixed(2)} - {invoice.status === 'paid' ? 'Pago' : invoice.status}
                    </p>
                  </div>
                  {invoice.invoice_pdf_url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={invoice.invoice_pdf_url} target="_blank" rel="noreferrer" className="text-brand-green">
                        <FileText className="h-4 w-4 mr-2" /> Recibo
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
