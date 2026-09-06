'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  CreditCard, AlertTriangle, Sparkles, Clock, ShieldCheck, Users, TrendingUp, TrendingDown,
  ExternalLink, RefreshCw, Heart, BarChart3, CheckCircle, XCircle, AlertCircle
} from 'lucide-react';
import { useSearchParams, useParams } from 'next/navigation';
import { PADDLE_TIERS, MAX_STANDARD_SEATS } from '@/lib/billing/paddle-catalog';

type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'paused' | 'canceled' | null;

interface BillingSubscription {
  id: string;
  paddle_subscription_id: string;
  paddle_customer_id: string;
  paddle_price_id: string;
  status: SubscriptionStatus;
  seat_limit: number;
  cared_people_limit: number;
  currency_code: string;
  unit_price: number;
  recurring_total: number;
  billing_interval: string;
  current_period_start: string;
  current_period_end: string;
  next_billed_at: string | null;
  canceled_at: string | null;
  scheduled_change: any;
}

interface EntitlementInfo {
  seatLimit: number;
  caredPeopleLimit: number;
  activeMembersCount: number;
  reservedInvitesCount: number;
  totalUsedSeats: number;
  availableSeats: number;
  canInvite: boolean;
  subscriptionStatus: string;
  accessValidUntil: string | null;
}

export default function SubscriptionSettingsPage() {
  const { currentOrganizationId } = useAuth();
  const searchParams = useSearchParams();
  const params = useParams();
  const locale = (params?.locale as string) || 'pt-BR';
  const supabase = createClient() as any;

  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementInfo | null>(null);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [upgradeTargetSeats, setUpgradeTargetSeats] = useState<number>(2);
  const [downgradeTargetSeats, setDowngradeTargetSeats] = useState<number>(1);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [downgradeLoading, setDowngradeLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [downgradeError, setDowngradeError] = useState<string | null>(null);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);

  const successParam = searchParams.get('success') === 'true';
  const canceledParam = searchParams.get('canceled') === 'true';

  const fetchData = useCallback(async () => {
    if (!currentOrganizationId) return;
    setLoading(true);

    // Fetch billing_subscriptions
    const { data: subData } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('organization_id', currentOrganizationId)
      .maybeSingle();

    if (subData) setSubscription(subData);

    // Fetch entitlements
    const { data: entData } = await supabase
      .from('organization_entitlements')
      .select('*')
      .eq('organization_id', currentOrganizationId)
      .maybeSingle();

    if (entData) {
      setEntitlements({
        seatLimit: entData.seat_limit,
        caredPeopleLimit: entData.cared_people_limit,
        activeMembersCount: entData.active_members_count,
        reservedInvitesCount: entData.reserved_invites_count,
        totalUsedSeats: entData.active_members_count + entData.reserved_invites_count,
        availableSeats: Math.max(0, entData.seat_limit - (entData.active_members_count + entData.reserved_invites_count)),
        canInvite: entData.seat_limit > (entData.active_members_count + entData.reserved_invites_count),
        subscriptionStatus: entData.subscription_status,
        accessValidUntil: entData.access_valid_until,
      });
    }

    // Fetch billing history
    const { data: historyData } = await supabase
      .from('billing_history')
      .select('*')
      .eq('organization_id', currentOrganizationId)
      .order('paid_at', { ascending: false })
      .limit(12);

    if (historyData) setBillingHistory(historyData);

    setLoading(false);
  }, [currentOrganizationId, supabase]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId, locale }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
    }
    setPortalLoading(false);
  };

  const handleUpgrade = async () => {
    setUpgradeError(null);
    setUpgradeLoading(true);
    try {
      const res = await fetch('/api/billing/subscription/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId, targetSeats: upgradeTargetSeats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no upgrade');
      setShowUpgradeDialog(false);
      await fetchData();
    } catch (err: any) {
      setUpgradeError(err.message);
    }
    setUpgradeLoading(false);
  };

  const handleDowngrade = async () => {
    setDowngradeError(null);
    setDowngradeLoading(true);
    try {
      const res = await fetch('/api/billing/subscription/downgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId, targetSeats: downgradeTargetSeats }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro no downgrade');
      setShowDowngradeDialog(false);
      await fetchData();
    } catch (err: any) {
      setDowngradeError(err.message);
    }
    setDowngradeLoading(false);
  };

  const handleCancel = async () => {
    setCancelError(null);
    setCancelLoading(true);
    try {
      const res = await fetch('/api/billing/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId, immediate: false }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cancelar');
      setShowCancelDialog(false);
      await fetchData();
    } catch (err: any) {
      setCancelError(err.message);
    }
    setCancelLoading(false);
  };

  const handleResume = async () => {
    setResumeLoading(true);
    try {
      const res = await fetch('/api/billing/subscription/resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao reativar');
      await fetchData();
    } catch (err: any) {
      console.error(err);
    }
    setResumeLoading(false);
  };

  const handleCheckout = async () => {
    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ organizationId: currentOrganizationId, seatQuantity: 1, locale }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount);
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />Ativa</Badge>;
      case 'trial': return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="h-3 w-3 mr-1" />Período de Teste</Badge>;
      case 'past_due': return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />Pagamento Pendente</Badge>;
      case 'paused': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />Pausada</Badge>;
      case 'canceled': return <Badge className="bg-stone-100 text-stone-600 border-stone-200"><XCircle className="h-3 w-3 mr-1" />Cancelada</Badge>;
      default: return <Badge className="bg-stone-100 text-stone-600">Sem Assinatura</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-brand-green border-t-transparent rounded-full" />
      </div>
    );
  }

  const noSubscription = !subscription;
  const isTrialOrActive = subscription && ['trial', 'active'].includes(subscription.status || '');
  const isCanceled = subscription?.status === 'canceled';
  const hasPendingCancel = subscription?.scheduled_change?.action === 'cancel';

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">Assinatura Paddle & Cobrança</h1>
        <p className="text-stone-500 text-sm mt-1">
          Gerencie seus assentos, método de pagamento cadastrado no Paddle e faturas do plano.
        </p>
      </div>

      {/* Success Banner */}
      {successParam && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-start gap-3 shadow-2xs">
          <Sparkles className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">🎉 Assinatura Paddle Ativada!</h3>
            <p className="text-xs text-emerald-700 mt-1">
              Sua assinatura foi confirmada diretamente pela Paddle Billing. Acesso total habilitado para todos os assentos do plano.
            </p>
          </div>
        </div>
      )}

      {/* Canceled Redirect Banner */}
      {canceledParam && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Checkout cancelado</h3>
            <p className="text-xs text-amber-700 mt-1">
              Você saiu antes de concluir o pagamento. Nenhuma cobrança foi realizada. Clique no botão abaixo para tentar novamente.
            </p>
          </div>
        </div>
      )}

      {/* No Subscription CTA */}
      {noSubscription && (
        <Card className="border-dashed border-2 border-stone-200 bg-stone-50/50 text-center p-10">
          <Heart className="h-12 w-12 text-stone-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-stone-700 mb-2">Nenhuma assinatura ativa</h2>
          <p className="text-stone-500 text-sm mb-6 max-w-sm mx-auto">
            Inicie um plano Paddle para desbloquear todos os recursos do Parent Care e convidar seus familiares.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button onClick={handleCheckout} className="bg-brand-green hover:bg-emerald-800 h-11 px-6 font-bold rounded-xl shadow-md">
              Assinar via Paddle — 14 Dias Grátis
            </Button>
            <Button variant="outline" asChild className="h-11 rounded-xl border-stone-300">
              <a href={`/${locale}/pricing`}>Ver Todos os Planos</a>
            </Button>
          </div>
        </Card>
      )}

      {/* Current Subscription Card */}
      {subscription && (
        <Card className="border-stone-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  Plano Família — {subscription.seat_limit} {subscription.seat_limit === 1 ? 'Assento' : 'Assentos'}
                </CardTitle>
                <CardDescription className="text-xs mt-1 text-stone-500">
                  ID da Assinatura Paddle: <code className="text-stone-700 font-mono text-[11px]">{subscription.paddle_subscription_id}</code>
                </CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Billing Info Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-xs text-stone-500 mb-1">Valor Mensal (Paddle)</p>
                <p className="font-bold text-stone-900 text-lg">{formatCurrency(subscription.recurring_total)}</p>
              </div>
              <div className="text-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-xs text-stone-500 mb-1">Por Assento</p>
                <p className="font-bold text-stone-900 text-lg">{formatCurrency(subscription.unit_price)}</p>
              </div>
              <div className="text-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-xs text-stone-500 mb-1">Próxima Cobrança</p>
                <p className="font-bold text-stone-900 text-sm">{formatDate(subscription.next_billed_at || subscription.current_period_end)}</p>
              </div>
              <div className="text-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                <p className="text-xs text-stone-500 mb-1">Período Atual</p>
                <p className="font-bold text-stone-900 text-xs">
                  {formatDate(subscription.current_period_start)} → {formatDate(subscription.current_period_end)}
                </p>
              </div>
            </div>

            {/* Seat Usage Tracker */}
            {entitlements && (
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-stone-900 flex items-center gap-2">
                    <Users className="h-4 w-4 text-emerald-600" />
                    Uso de Assentos
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {entitlements.totalUsedSeats} / {entitlements.seatLimit} ocupados
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (entitlements.totalUsedSeats / entitlements.seatLimit) * 100)}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3 text-xs text-stone-600">
                  <div className="text-center">
                    <p className="font-bold text-stone-900 text-base">{entitlements.activeMembersCount}</p>
                    <p>Membros Ativos</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-stone-900 text-base">{entitlements.reservedInvitesCount}</p>
                    <p>Convites Reservados</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-base ${entitlements.availableSeats === 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {entitlements.availableSeats}
                    </p>
                    <p>Disponíveis</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <Heart className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">
                    Até <strong>2 pessoas cuidadas</strong> (ex: pai e mãe) utilizam a tela simplificada <strong>sem consumir assentos</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Pending Cancel Warning */}
            {hasPendingCancel && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-amber-900">Cancelamento Agendado</p>
                  <p className="text-amber-700 text-xs mt-1">
                    O acesso permanece ativo até <strong>{formatDate(subscription.current_period_end)}</strong>, após essa data o plano será encerrado.
                  </p>
                  <Button
                    onClick={handleResume}
                    disabled={resumeLoading}
                    size="sm"
                    className="mt-3 h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg"
                  >
                    <RefreshCw className="h-3 w-3 mr-1.5" />
                    {resumeLoading ? 'Reativando...' : 'Manter Assinatura Ativa'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          {isTrialOrActive && !hasPendingCancel && (
            <CardFooter className="flex flex-wrap gap-3 pt-4 border-t border-stone-100">
              {/* Upgrade Dialog */}
              <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 rounded-lg gap-1.5">
                    <TrendingUp className="h-4 w-4" />
                    Adicionar Assentos
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Upgrade: Adicionar Assentos</DialogTitle>
                    <DialogDescription>
                      Selecione o novo total de assentos. A diferença será cobrada imediatamente de forma proporcional via Paddle.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <p className="text-sm text-stone-600">Plano atual: <strong>{subscription.seat_limit} assento(s)</strong></p>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: MAX_STANDARD_SEATS }, (_, i) => i + 1)
                        .filter(s => s > subscription.seat_limit)
                        .map(seats => {
                          const tier = PADDLE_TIERS[seats];
                          return (
                            <button
                              key={seats}
                              onClick={() => setUpgradeTargetSeats(seats)}
                              className={`p-3 rounded-xl border text-center text-sm transition-all ${upgradeTargetSeats === seats ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400/30' : 'border-stone-200 hover:border-stone-300'}`}
                            >
                              <span className="font-bold block">{seats} assentos</span>
                              <span className="text-xs text-emerald-700">{formatCurrency(tier?.totalMonthlyBrl)}/mês</span>
                            </button>
                          );
                        })}
                    </div>
                    {upgradeError && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {upgradeError}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="rounded-xl">Cancelar</Button>
                    <Button
                      onClick={handleUpgrade}
                      disabled={upgradeLoading || upgradeTargetSeats <= subscription.seat_limit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    >
                      {upgradeLoading ? 'Processando...' : `Confirmar Upgrade para ${upgradeTargetSeats} Assentos`}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {/* Downgrade Dialog */}
              {subscription.seat_limit > 1 && (
                <Dialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="h-9 rounded-lg border-stone-300 gap-1.5">
                      <TrendingDown className="h-4 w-4" />
                      Reduzir Assentos
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Downgrade: Reduzir Assentos</DialogTitle>
                      <DialogDescription>
                        A mudança é processada no próximo ciclo de cobrança Paddle. Certifique-se de que os assentos ocupados cabem no novo limite.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <p className="text-sm text-stone-600">
                        Plano atual: <strong>{subscription.seat_limit} assento(s)</strong>
                        {entitlements && (
                          <span className="text-xs text-stone-500 ml-2">(em uso: {entitlements.totalUsedSeats})</span>
                        )}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: MAX_STANDARD_SEATS }, (_, i) => i + 1)
                          .filter(s => s < subscription.seat_limit)
                          .map(seats => {
                            const tier = PADDLE_TIERS[seats];
                            const wouldViolate = entitlements && entitlements.totalUsedSeats > seats;
                            return (
                              <button
                                key={seats}
                                onClick={() => !wouldViolate && setDowngradeTargetSeats(seats)}
                                disabled={!!wouldViolate}
                                className={`p-3 rounded-xl border text-center text-sm transition-all ${
                                  wouldViolate
                                    ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-60'
                                    : downgradeTargetSeats === seats
                                    ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400/30'
                                    : 'border-stone-200 hover:border-stone-300'
                                }`}
                              >
                                <span className="font-bold block">{seats} assentos</span>
                                <span className="text-xs text-emerald-700">{formatCurrency(tier?.totalMonthlyBrl)}/mês</span>
                                {wouldViolate && <span className="text-[10px] text-red-600 block mt-0.5">Assentos cheios</span>}
                              </button>
                            );
                          })}
                      </div>
                      {downgradeError && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                          {downgradeError}
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setShowDowngradeDialog(false)} className="rounded-xl">Cancelar</Button>
                      <Button
                        onClick={handleDowngrade}
                        disabled={downgradeLoading || !entitlements || entitlements.totalUsedSeats > downgradeTargetSeats}
                        className="bg-stone-800 hover:bg-stone-900 text-white rounded-xl"
                      >
                        {downgradeLoading ? 'Processando...' : `Confirmar para ${downgradeTargetSeats} Assentos`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Paddle Portal */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="h-9 rounded-lg border-stone-300 gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                {portalLoading ? 'Abrindo Portal...' : 'Portal Paddle (Dados de Pagamento)'}
              </Button>

              {/* Cancel Dialog */}
              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-9 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5">
                    <XCircle className="h-4 w-4" />
                    Cancelar Assinatura
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancelar Assinatura Paddle</DialogTitle>
                    <DialogDescription>
                      O cancelamento não é imediato. Você mantém o acesso até o final do período de cobrança atual.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div className="text-sm space-y-1">
                        <p className="font-bold text-amber-900">O que acontece ao cancelar?</p>
                        <ul className="text-amber-800 text-xs space-y-1 list-disc list-inside">
                          <li>Seu acesso permanece ativo até <strong>{formatDate(subscription.current_period_end)}</strong>.</li>
                          <li>Após essa data, membros perdem o acesso (exceto você, o proprietário, em modo somente leitura).</li>
                          <li>Todos os dados são preservados por 90 dias após o cancelamento.</li>
                          <li>Você pode reativar a qualquer momento antes do vencimento.</li>
                        </ul>
                      </div>
                    </div>
                    {cancelError && (
                      <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                        {cancelError}
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="rounded-xl">Manter Assinatura</Button>
                    <Button
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                    >
                      {cancelLoading ? 'Cancelando...' : 'Confirmar Cancelamento'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardFooter>
          )}

          {/* Resume from canceled */}
          {isCanceled && !hasPendingCancel && (
            <CardFooter className="border-t border-stone-100 pt-4">
              <div className="w-full text-center space-y-3">
                <p className="text-sm text-stone-500">Sua assinatura está cancelada. Reative para voltar a ter acesso completo.</p>
                <Button onClick={handleResume} disabled={resumeLoading} className="bg-brand-green hover:bg-emerald-800 text-white rounded-xl h-10 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  {resumeLoading ? 'Reativando...' : 'Reativar Assinatura Paddle'}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {/* Billing History */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-stone-600" />
            Histórico de Cobranças Paddle
          </CardTitle>
          <CardDescription className="text-xs">Transações processadas pela Paddle Billing.</CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-400">Nenhuma cobrança realizada ainda.</p>
              <p className="text-xs text-stone-400 mt-1">
                As faturas aparecerão aqui após o fim do período de teste.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-stone-600">
                <thead className="text-xs text-stone-500 uppercase border-b border-stone-100">
                  <tr>
                    <th className="pb-2 pr-4 font-semibold">Data</th>
                    <th className="pb-2 pr-4 font-semibold">Valor</th>
                    <th className="pb-2 pr-4 font-semibold">Status</th>
                    <th className="pb-2 font-semibold">ID Paddle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {billingHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 pr-4">{formatDate(item.paid_at || item.created_at)}</td>
                      <td className="py-3 pr-4 font-bold text-stone-900">{formatCurrency(item.amount_paid)}</td>
                      <td className="py-3 pr-4">
                        <Badge className={item.status === 'paid' ? 'bg-emerald-100 text-emerald-700 text-[11px]' : 'bg-stone-100 text-stone-600 text-[11px]'}>
                          {item.status === 'paid' ? 'Pago' : item.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-xs font-mono text-stone-500">{item.gateway_invoice_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
