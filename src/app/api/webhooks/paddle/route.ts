import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { createAdminClient } from '@/lib/supabase/admin';
import { getSeatsFromPriceId, PADDLE_TIERS } from '@/lib/billing/paddle-catalog';
import { syncOrganizationEntitlementCounts } from '@/lib/billing/entitlements';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('paddle-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 400 });
  }

  const gateway = getBillingGateway();
  let event: any;

  try {
    event = await gateway.constructWebhookEvent(payload, signature);
  } catch (err: any) {
    console.error(`[Paddle Webhook] Signature verification failed: ${err?.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const eventId = event.eventId || event.id || `evt_${Date.now()}`;
  const eventType = event.eventType || event.event_type || 'unknown';

  // 1. Idempotency Check via billing_events
  const { data: existingEvent } = await supabase
    .from('billing_events')
    .select('id, status')
    .eq('paddle_event_id', eventId)
    .maybeSingle();

  if (existingEvent && existingEvent.status === 'processed') {
    console.log(`[Paddle Webhook] Event ${eventId} already processed (idempotent).`);
    return NextResponse.json({ received: true, idempotent: true });
  }

  // 2. Event Processing
  try {
    const data = event.data;

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.trialing':
      case 'subscription.activated':
      case 'subscription.updated': {
        const sub = data;
        const subId = sub.id;
        const custId = sub.customerId;
        const rawStatus = sub.status; // trialing, active, past_due, paused, canceled
        const dbStatus = rawStatus === 'trialing' ? 'trial' : rawStatus;

        // Custom data passed during checkout
        let orgId = sub.customData?.organization_id;

        // If orgId is not in customData, look up via billing_customers or existing subscription
        if (!orgId && custId) {
          const { data: cust } = await supabase
            .from('billing_customers')
            .select('organization_id')
            .eq('paddle_customer_id', custId)
            .maybeSingle();
          orgId = cust?.organization_id;
        }

        if (!orgId && subId) {
          const { data: existSub } = await supabase
            .from('billing_subscriptions')
            .select('organization_id')
            .eq('paddle_subscription_id', subId)
            .maybeSingle();
          orgId = existSub?.organization_id;
        }

        const priceId = sub.items?.[0]?.price?.id || sub.items?.[0]?.priceId || '';
        let seatLimit = Number(sub.customData?.seat_quantity);
        if (!seatLimit || isNaN(seatLimit)) {
          seatLimit = getSeatsFromPriceId(priceId) || 1;
        }

        const tier = PADDLE_TIERS[seatLimit] || PADDLE_TIERS[1];
        const currentPeriodStart = sub.currentBillingPeriod?.startsAt || new Date().toISOString();
        const currentPeriodEnd = sub.currentBillingPeriod?.endsAt || new Date(Date.now() + 30 * 86400000).toISOString();
        const nextBilledAt = sub.nextBilledAt || sub.currentBillingPeriod?.endsAt || null;

        if (orgId) {
          // Upsert into dedicated billing_subscriptions table
          const { data: insertedSub } = await supabase
            .from('billing_subscriptions')
            .upsert({
              organization_id: orgId,
              paddle_subscription_id: subId,
              paddle_customer_id: custId,
              paddle_price_id: priceId,
              status: dbStatus,
              seat_limit: seatLimit,
              cared_people_limit: 2,
              currency_code: sub.currencyCode || 'BRL',
              unit_price: tier.unitPriceBrl,
              recurring_total: tier.totalMonthlyBrl,
              billing_interval: 'month',
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              next_billed_at: nextBilledAt,
              scheduled_change: sub.scheduledChange || null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'organization_id' })
            .select('id')
            .single();

          // Upsert organization_entitlements
          await supabase
            .from('organization_entitlements')
            .upsert({
              organization_id: orgId,
              subscription_id: insertedSub?.id || null,
              seat_limit: seatLimit,
              cared_people_limit: 2,
              subscription_status: dbStatus,
              access_valid_until: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'organization_id' });

          // Sync real member & pending invite counts into entitlements
          await syncOrganizationEntitlementCounts(orgId);

          // Update organization root record
          await supabase
            .from('organizations')
            .update({
              subscription_status: dbStatus,
              paddle_customer_id: custId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orgId);

          // Maintain backward compatibility with legacy subscriptions table
          await supabase
            .from('subscriptions')
            .upsert({
              organization_id: orgId,
              status: dbStatus,
              paddle_subscription_id: subId,
              paddle_customer_id: custId,
              current_period_start: currentPeriodStart,
              current_period_end: currentPeriodEnd,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'organization_id' });
        }
        break;
      }

      case 'subscription.canceled': {
        const sub = data;
        const subId = sub.id;

        const { data: currentSub } = await supabase
          .from('billing_subscriptions')
          .update({
            status: 'canceled',
            canceled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('paddle_subscription_id', subId)
          .select('organization_id, current_period_end')
          .maybeSingle();

        if (currentSub?.organization_id) {
          const orgId = currentSub.organization_id;

          await supabase
            .from('organization_entitlements')
            .update({
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('organization_id', orgId);

          await supabase
            .from('organizations')
            .update({
              subscription_status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('id', orgId);

          await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              updated_at: new Date().toISOString(),
            })
            .eq('paddle_subscription_id', subId);
        }
        break;
      }

      case 'subscription.past_due':
      case 'subscription.paused': {
        const sub = data;
        const subId = sub.id;
        const newStatus = eventType === 'subscription.past_due' ? 'past_due' : 'paused';

        const { data: currentSub } = await supabase
          .from('billing_subscriptions')
          .update({
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('paddle_subscription_id', subId)
          .select('organization_id')
          .maybeSingle();

        if (currentSub?.organization_id) {
          const orgId = currentSub.organization_id;

          await supabase
            .from('organization_entitlements')
            .update({
              subscription_status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('organization_id', orgId);

          await supabase
            .from('organizations')
            .update({
              subscription_status: newStatus,
              updated_at: new Date().toISOString(),
            })
            .eq('id', orgId);
        }
        break;
      }

      case 'transaction.completed':
      case 'transaction.paid': {
        const tx = data;
        let orgId = tx.customData?.organization_id;

        if (!orgId && tx.customerId) {
          const { data: cust } = await supabase
            .from('billing_customers')
            .select('organization_id')
            .eq('paddle_customer_id', tx.customerId)
            .maybeSingle();
          orgId = cust?.organization_id;
        }

        const total = tx.details?.totals?.grandTotal ? Number(tx.details.totals.grandTotal) / 100 : 0;

        if (orgId && total > 0) {
          await supabase.from('billing_history').insert({
            organization_id: orgId,
            gateway: 'paddle',
            gateway_invoice_id: tx.id,
            amount_due: total,
            amount_paid: total,
            currency: tx.currencyCode || 'BRL',
            status: 'paid',
            invoice_pdf_url: tx.checkout?.url || null,
            paid_at: tx.billedAt || new Date().toISOString(),
          });
        }
        break;
      }
    }

    // 3. Record processed event in billing_events table (Idempotency Record)
    await supabase.from('billing_events').upsert({
      paddle_event_id: eventId,
      event_type: eventType,
      occurred_at: event.occurredAt || new Date().toISOString(),
      processed_at: new Date().toISOString(),
      status: 'processed',
      attempts: 1,
      payload: event,
    }, { onConflict: 'paddle_event_id' });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`[Paddle Webhook] Processing error for ${eventId}:`, error);

    await supabase.from('billing_events').upsert({
      paddle_event_id: eventId,
      event_type: eventType,
      occurred_at: event.occurredAt || new Date().toISOString(),
      processed_at: new Date().toISOString(),
      status: 'failed',
      error_message: error?.message || 'Unknown processing error',
      payload: event,
    }, { onConflict: 'paddle_event_id' });

    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
