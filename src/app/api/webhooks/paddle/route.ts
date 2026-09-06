import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('paddle-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing paddle-signature header' }, { status: 400 });
  }

  const gateway = getBillingGateway('paddle');
  let event: any;

  try {
    event = await gateway.constructWebhookEvent(payload, signature);
  } catch (err: any) {
    console.error(`Paddle webhook signature verification failed: ${err?.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const eventId = event.eventId || event.id;

  // 1. Idempotency Check
  if (eventId) {
    const { data: existingEvent } = await supabase
      .from('gateway_events')
      .select('id')
      .eq('event_id', eventId)
      .single();

    if (existingEvent) {
      console.log(`Paddle event ${eventId} already processed.`);
      return NextResponse.json({ received: true });
    }
  }

  // 2. Process Event
  try {
    const eventType = event.eventType || event.event_type;
    const data = event.data;

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.trialing': {
        const sub = data;
        const orgId = sub.customData?.organization_id;
        const planId = sub.customData?.plan_id;
        const trialDays = Number(sub.customData?.trial_days || 30);
        const trialEndsAt = sub.currentBillingPeriod?.endsAt || new Date(Date.now() + trialDays * 86400000).toISOString();

        if (orgId) {
          await supabase.from('subscriptions').upsert({
            organization_id: orgId,
            plan_id: planId,
            status: 'trial',
            gateway: 'paddle',
            paddle_subscription_id: sub.id,
            paddle_customer_id: sub.customerId,
            trial_ends_at: trialEndsAt,
            current_period_start: sub.currentBillingPeriod?.startsAt || new Date().toISOString(),
            current_period_end: trialEndsAt,
          }, { onConflict: 'organization_id' });

          await supabase.from('organizations').update({
            subscription_status: 'trial',
            plan_id: planId,
            trial_ends_at: trialEndsAt,
            paddle_customer_id: sub.customerId,
          }).eq('id', orgId);
        }
        break;
      }

      case 'subscription.activated': {
        const sub = data;
        if (sub.id) {
          const { data: currentSub } = await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              paddle_customer_id: sub.customerId,
              current_period_start: sub.currentBillingPeriod?.startsAt,
              current_period_end: sub.currentBillingPeriod?.endsAt,
            })
            .eq('paddle_subscription_id', sub.id)
            .select('organization_id')
            .single();

          if (currentSub?.organization_id) {
            await supabase.from('organizations').update({
              subscription_status: 'active',
            }).eq('id', currentSub.organization_id);
          }
        }
        break;
      }

      case 'subscription.updated': {
        const sub = data;
        const rawStatus = sub.status; // trialing, active, past_due, paused, canceled
        const dbStatus = rawStatus === 'trialing' ? 'trial' : rawStatus;

        if (sub.id) {
          const { data: currentSub } = await supabase
            .from('subscriptions')
            .update({
              status: dbStatus,
              paddle_customer_id: sub.customerId,
              current_period_start: sub.currentBillingPeriod?.startsAt,
              current_period_end: sub.currentBillingPeriod?.endsAt,
            })
            .eq('paddle_subscription_id', sub.id)
            .select('organization_id')
            .single();

          if (currentSub?.organization_id) {
            await supabase.from('organizations').update({
              subscription_status: dbStatus,
            }).eq('id', currentSub.organization_id);
          }
        }
        break;
      }

      case 'subscription.canceled': {
        const sub = data;
        if (sub.id) {
          const { data: currentSub } = await supabase
            .from('subscriptions')
            .update({
              status: 'canceled',
              cancel_reason: 'Cancelado pelo assinante via Paddle',
            })
            .eq('paddle_subscription_id', sub.id)
            .select('organization_id')
            .single();

          if (currentSub?.organization_id) {
            await supabase.from('organizations').update({
              subscription_status: 'canceled',
            }).eq('id', currentSub.organization_id);
          }
        }
        break;
      }

      case 'transaction.completed': {
        const tx = data;
        const orgId = tx.customData?.organization_id;
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

    // 3. Record event in gateway_events table
    if (eventId) {
      await supabase.from('gateway_events').insert({
        gateway: 'paddle',
        event_id: eventId,
        event_type: eventType || 'unknown',
        payload: event,
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Paddle webhook processing error: ${error?.message}`);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
