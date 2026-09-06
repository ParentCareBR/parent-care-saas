'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/contexts/AuthContext';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  CreditCard, AlertTriangle, Sparkles, Clock, ShieldCheck, Users, TrendingUp, TrendingDown,
  ExternalLink, RefreshCw, Heart, BarChart3, CheckCircle, XCircle, AlertCircle, Star, Zap
} from 'lucide-react';
import { useSearchParams, useParams } from 'next/navigation';
import { PADDLE_TIERS, MAX_STANDARD_SEATS, getTierPricing } from '@/lib/billing/paddle-catalog';

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
  const tBilling = useTranslations('Billing');
  const tPlan = useTranslations('PlanCards');
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
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
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

    const { data: subData } = await supabase
      .from('billing_subscriptions')
      .select('*')
      .eq('organization_id', currentOrganizationId)
      .maybeSingle();

    if (subData) setSubscription(subData);

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

  const handleCheckout = async (seats: number) => {
    setCheckoutLoading(seats);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId: currentOrganizationId, seatQuantity: seats, locale }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
    }
    setCheckoutLoading(null);
  };

  const handleChangePlan = async (targetSeats: number) => {
    if (!subscription) return;
    if (targetSeats > subscription.seat_limit) {
      setUpgradeTargetSeats(targetSeats);
      setShowUpgradeDialog(true);
    } else {
      setDowngradeTargetSeats(targetSeats);
      setShowDowngradeDialog(true);
    }
  };

  const formatDate = (date?: string | null) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount == null) return '—';
    const isEn = locale.startsWith('en') || locale.startsWith('es');
    const isEur = locale.startsWith('fr') || locale.startsWith('de');
    const currency = isEn ? 'USD' : isEur ? 'EUR' : 'BRL';
    return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active': return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle className="h-3 w-3 mr-1" />{tBilling('status_active')}</Badge>;
      case 'trial': return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="h-3 w-3 mr-1" />{tBilling('status_trial')}</Badge>;
      case 'past_due': return <Badge className="bg-red-100 text-red-800 border-red-200"><AlertCircle className="h-3 w-3 mr-1" />{tBilling('status_past_due')}</Badge>;
      case 'paused': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><AlertTriangle className="h-3 w-3 mr-1" />{tBilling('status_paused')}</Badge>;
      case 'canceled': return <Badge className="bg-stone-100 text-stone-600 border-stone-200"><XCircle className="h-3 w-3 mr-1" />{tBilling('status_canceled')}</Badge>;
      default: return <Badge className="bg-stone-100 text-stone-600">—</Badge>;
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

  // All tiers as an ordered array
  const tiersArray = Object.values(PADDLE_TIERS).sort((a, b) => a.seats - b.seats);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">

      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900">{tBilling('subscription_title')}</h1>
        <p className="text-stone-500 text-sm mt-1">{tBilling('subscription_desc')}</p>
      </div>

      {/* Success Banner */}
      {successParam && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-start gap-3 shadow-2xs">
          <Sparkles className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">🎉 Assinatura ativada com sucesso!</h3>
            <p className="text-xs text-emerald-700 mt-1">
              Seu pagamento foi confirmado. Acesso total habilitado para todos os acessos do plano escolhido.
            </p>
          </div>
        </div>
      )}

      {/* Canceled Redirect Banner */}
      {canceledParam && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold text-sm">Pagamento não concluído</h3>
            <p className="text-xs text-amber-700 mt-1">
              Você saiu antes de concluir o pagamento. Nenhuma cobrança foi realizada. Escolha um plano abaixo para tentar novamente.
            </p>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* ACTIVE SUBSCRIPTION CARD (shown when subscription exists)   */}
      {/* ============================================================ */}
      {subscription && (
        <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-600" />
                  {tPlan(`tier_${subscription.seat_limit}` as any)}
                  {' — '}
                  {subscription.seat_limit === 1
                    ? tPlan('seat_single')
                    : tPlan('seat_plural', { count: subscription.seat_limit })}
                </CardTitle>
                <CardDescription className="text-xs mt-1 text-stone-500">
                  {tBilling('sub_code')} <code className="text-stone-700 font-mono text-[11px]">{subscription.paddle_subscription_id?.substring(0, 14)}…</code>
                </CardDescription>
              </div>
              {getStatusBadge(subscription.status)}
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Billing Info Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-xl border border-stone-100 shadow-xs">
                <p className="text-xs text-stone-500 mb-1">{tBilling('monthly_value')}</p>
                <p className="font-bold text-stone-900 text-lg">{formatCurrency(subscription.recurring_total)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-xl border border-stone-100 shadow-xs">
                <p className="text-xs text-stone-500 mb-1">{tBilling('per_seat_label')}</p>
                <p className="font-bold text-stone-900 text-lg">{formatCurrency(subscription.unit_price)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-xl border border-stone-100 shadow-xs">
                <p className="text-xs text-stone-500 mb-1">{tBilling('next_charge')}</p>
                <p className="font-bold text-stone-900 text-sm">{formatDate(subscription.next_billed_at || subscription.current_period_end)}</p>
              </div>
              <div className="text-center p-3 bg-white rounded-xl border border-stone-100 shadow-xs">
                <p className="text-xs text-stone-500 mb-1">{tBilling('current_period')}</p>
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
                    {tBilling('seat_limit_title')}
                  </span>
                  <span className="text-sm font-bold text-emerald-700">
                    {tBilling('seats_used', { used: entitlements.totalUsedSeats, total: entitlements.seatLimit })}
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
                    <p>{tBilling('active_members')}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-stone-900 text-base">{entitlements.reservedInvitesCount}</p>
                    <p>{tBilling('reserved_invites')}</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-bold text-base ${entitlements.availableSeats === 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                      {entitlements.availableSeats}
                    </p>
                    <p>{tBilling('available_seats')}</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-2 p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <Heart className="h-4 w-4 text-amber-600 shrink-0" />
                  <p className="text-xs text-amber-800">
                    {tPlan('cared_included', { count: entitlements.caredPeopleLimit || 3 })} — {tBilling('cared_people_note')}
                  </p>
                </div>
              </div>
            )}

            {/* Pending Cancel Warning */}
            {hasPendingCancel && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-amber-900">{tBilling('cancel_scheduled')}</p>
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
                    {tBilling('add_seats')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{tBilling('upgrade_title')}</DialogTitle>
                    <DialogDescription>{tBilling('upgrade_desc')}</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-4">
                    <p className="text-sm text-stone-600">Plano atual: <strong>{subscription.seat_limit} acesso(s)</strong></p>
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: MAX_STANDARD_SEATS }, (_, i) => i + 1)
                        .filter(s => s > subscription.seat_limit)
                        .map(seats => {
                          const p = getTierPricing(seats, locale);
                          return (
                            <button
                              key={seats}
                              onClick={() => setUpgradeTargetSeats(seats)}
                              className={`p-3 rounded-xl border text-center text-sm transition-all ${upgradeTargetSeats === seats ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-400/30' : 'border-stone-200 hover:border-stone-300'}`}
                            >
                              <span className="font-bold block">{seats} acessos</span>
                              <span className="text-xs text-emerald-700">{p.totalFormatted}/mês</span>
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
                    <Button variant="outline" onClick={() => setShowUpgradeDialog(false)} className="rounded-xl">{tBilling('keep_subscription')}</Button>
                    <Button
                      onClick={handleUpgrade}
                      disabled={upgradeLoading || upgradeTargetSeats <= subscription.seat_limit}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                    >
                      {upgradeLoading ? 'Processando...' : `${tBilling('confirm_upgrade')} — ${upgradeTargetSeats} Acessos`}
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
                      {tBilling('downgrade_title')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{tBilling('downgrade_title')}</DialogTitle>
                      <DialogDescription>{tBilling('downgrade_desc')}</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      <p className="text-sm text-stone-600">
                        Plano atual: <strong>{subscription.seat_limit} acesso(s)</strong>
                        {entitlements && (
                          <span className="text-xs text-stone-500 ml-2">(em uso: {entitlements.totalUsedSeats})</span>
                        )}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {Array.from({ length: MAX_STANDARD_SEATS }, (_, i) => i + 1)
                          .filter(s => s < subscription.seat_limit)
                          .map(seats => {
                            const p = getTierPricing(seats, locale);
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
                                <span className="font-bold block">{seats} acessos</span>
                                <span className="text-xs text-emerald-700">{p.totalFormatted}/mês</span>
                                {wouldViolate && <span className="text-[10px] text-red-600 block mt-0.5">Acessos cheios</span>}
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
                      <Button variant="outline" onClick={() => setShowDowngradeDialog(false)} className="rounded-xl">{tBilling('keep_subscription')}</Button>
                      <Button
                        onClick={handleDowngrade}
                        disabled={downgradeLoading || !entitlements || entitlements.totalUsedSeats > downgradeTargetSeats}
                        className="bg-stone-800 hover:bg-stone-900 text-white rounded-xl"
                      >
                        {downgradeLoading ? 'Processando...' : `${tBilling('confirm_downgrade')} — ${downgradeTargetSeats} Acessos`}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* Manage Card & Invoices */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenPortal}
                disabled={portalLoading}
                className="h-9 rounded-lg border-stone-300 gap-1.5"
              >
                <ExternalLink className="h-4 w-4" />
                {portalLoading ? 'Abrindo...' : tBilling('paddle_portal')}
              </Button>

              {/* Cancel Dialog */}
              <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-9 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 gap-1.5">
                    <XCircle className="h-4 w-4" />
                    {tBilling('cancel_title')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{tBilling('cancel_title')}</DialogTitle>
                    <DialogDescription>{tBilling('cancel_desc')}</DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                      <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
                      <div className="text-sm space-y-1">
                        <p className="font-bold text-amber-900">O que acontece ao cancelar?</p>
                        <ul className="text-amber-800 text-xs space-y-1 list-disc list-inside">
                          <li>Seu acesso permanece ativo até <strong>{formatDate(subscription.current_period_end)}</strong>.</li>
                          <li>Após essa data, membros perdem o acesso (exceto você, em modo somente leitura).</li>
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
                    <Button variant="outline" onClick={() => setShowCancelDialog(false)} className="rounded-xl">{tBilling('keep_subscription')}</Button>
                    <Button
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                    >
                      {cancelLoading ? 'Cancelando...' : tBilling('confirm_cancel')}
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
                  {resumeLoading ? 'Reativando...' : tBilling('resume_subscription')}
                </Button>
              </div>
            </CardFooter>
          )}
        </Card>
      )}

      {/* ============================================================ */}
      {/* PLAN CARDS GRID                                             */}
      {/* ============================================================ */}
      <div>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-stone-900">
            {subscription ? 'Alterar Plano' : tPlan('title')}
          </h2>
          <p className="text-stone-500 text-sm mt-1">{tPlan('subtitle')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {tiersArray.map((tier) => {
            const isCurrent = subscription?.seat_limit === tier.seats && isTrialOrActive;
            const isPopular = tier.seats === 3;
            const pricing = getTierPricing(tier.seats, locale);

            return (
              <Card
                key={tier.seats}
                className={`relative flex flex-col transition-all ${
                  isCurrent
                    ? 'border-emerald-500 ring-2 ring-emerald-400/30 shadow-md bg-emerald-50/30'
                    : isPopular
                    ? 'border-brand-green/60 shadow-md bg-white'
                    : 'border-stone-200 bg-white hover:border-stone-300 hover:shadow-sm'
                }`}
              >
                {/* Popular badge */}
                {isPopular && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-green text-white px-3 py-0.5 text-xs font-bold shadow-sm">
                      <Star className="h-3 w-3 mr-1 fill-white" />
                      {tPlan('popular_badge')}
                    </Badge>
                  </div>
                )}

                {/* Current plan badge */}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-emerald-600 text-white px-3 py-0.5 text-xs font-bold shadow-sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      {tPlan('current_badge')}
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-3 pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-1">
                        {tier.seats === 1 ? tPlan('seat_single') : tPlan('seat_plural', { count: tier.seats })}
                      </p>
                      <CardTitle className="text-base font-bold text-stone-900">
                        {tPlan(`tier_${tier.seats}` as any)}
                      </CardTitle>
                    </div>
                    {tier.savingsPercentage > 0 && (
                      <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px] font-bold shrink-0">
                        {tPlan('save_discount', { percent: tier.savingsPercentage })}
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="flex-1 space-y-4">
                  {/* Pricing */}
                  <div>
                    <div className="flex items-end gap-1">
                      <span className="text-3xl font-extrabold text-stone-900">
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
                  <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <Heart className="h-3.5 w-3.5 shrink-0 fill-emerald-200 text-emerald-600" />
                    <span className="font-medium">{tPlan('cared_included', { count: pricing.caredPeopleLimit })}</span>
                  </div>

                  {/* Localized Features */}
                  <ul className="space-y-1.5">
                    <li className="flex items-center gap-2 text-xs text-stone-600">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {tPlan('feat_routine_meds')}
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-600">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {tPlan('feat_schedule')}
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-600">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {tPlan('feat_history')}
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-600">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {tPlan('feat_alerts')}
                    </li>
                    <li className="flex items-center gap-2 text-xs text-stone-600 font-semibold text-emerald-800">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      {tPlan('feat_seniors', { count: pricing.caredPeopleLimit })}
                    </li>
                  </ul>

                  {/* Free trial note */}
                  <p className="text-xs text-stone-400 flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-stone-400 shrink-0" />
                    {tPlan('free_trial')}
                  </p>
                </CardContent>

                <CardFooter className="pt-0">
                  {isCurrent ? (
                    <Button
                      className="w-full h-10 rounded-xl bg-stone-100 text-stone-500 hover:bg-stone-200 cursor-default"
                      disabled
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {tPlan('current_badge')}
                    </Button>
                  ) : subscription && isTrialOrActive ? (
                    <Button
                      onClick={() => handleChangePlan(tier.seats)}
                      className="w-full h-10 rounded-xl bg-stone-800 hover:bg-stone-900 text-white font-semibold"
                    >
                      {tier.seats > (subscription?.seat_limit || 0)
                        ? <TrendingUp className="h-4 w-4 mr-2" />
                        : <TrendingDown className="h-4 w-4 mr-2" />
                      }
                      {tPlan('btn_change')}
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handleCheckout(tier.seats)}
                      disabled={checkoutLoading === tier.seats}
                      className={`w-full h-10 rounded-xl font-semibold ${
                        isPopular
                          ? 'bg-brand-green hover:bg-emerald-800 text-white'
                          : 'bg-stone-900 hover:bg-stone-800 text-white'
                      }`}
                    >
                      {checkoutLoading === tier.seats ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>Processando...</span>
                        </div>
                      ) : (
                        <>
                          <CreditCard className="h-4 w-4 mr-2" />
                          {tPlan('btn_subscribe')}
                        </>
                      )}
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}

          {/* Custom / Enterprise Card */}
          <Card className="border-dashed border-2 border-stone-200 bg-stone-50/50 flex flex-col">
            <CardHeader className="pb-3 pt-6">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-stone-500" />
                <CardTitle className="text-base font-bold text-stone-700">{tPlan('custom_plan_title')}</CardTitle>
              </div>
              <CardDescription className="text-xs text-stone-500">{tPlan('custom_plan_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end">
              <Button
                asChild
                variant="outline"
                className="w-full h-10 rounded-xl border-stone-300 text-stone-700"
              >
                <a
                  href="https://wa.me/5511999999999?text=Olá,%20gostaria%20de%20conhecer%20o%20Plano%20Personalizado%20do%20Parent%20Care"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {tPlan('btn_custom')}
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-stone-400 mt-6">{tPlan('security_note')}</p>
      </div>

      {/* ============================================================ */}
      {/* BILLING HISTORY                                              */}
      {/* ============================================================ */}
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-stone-600" />
            {tBilling('billing_history')}
          </CardTitle>
          <CardDescription className="text-xs">{tBilling('billing_history_desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {billingHistory.length === 0 ? (
            <div className="py-8 text-center">
              <ShieldCheck className="h-10 w-10 text-stone-300 mx-auto mb-3" />
              <p className="text-sm text-stone-400">{tBilling('no_history')}</p>
              <p className="text-xs text-stone-400 mt-1">
                {tBilling('no_history_desc')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-stone-600">
                <thead className="text-xs text-stone-500 uppercase border-b border-stone-100">
                  <tr>
                    <th className="pb-2 pr-4 font-semibold">{tBilling('th_date')}</th>
                    <th className="pb-2 pr-4 font-semibold">{tBilling('th_amount')}</th>
                    <th className="pb-2 pr-4 font-semibold">{tBilling('th_status')}</th>
                    <th className="pb-2 font-semibold">{tBilling('th_ref')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-50">
                  {billingHistory.map((item) => (
                    <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                      <td className="py-3 pr-4">{formatDate(item.paid_at || item.created_at)}</td>
                      <td className="py-3 pr-4 font-bold text-stone-900">{formatCurrency(item.amount_paid)}</td>
                      <td className="py-3 pr-4">
                        <Badge className={item.status === 'paid' ? 'bg-emerald-100 text-emerald-700 text-[11px]' : 'bg-stone-100 text-stone-600 text-[11px]'}>
                          {item.status === 'paid' ? tBilling('paid_badge') : item.status}
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
