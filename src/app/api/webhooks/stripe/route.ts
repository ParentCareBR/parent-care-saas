import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  const gateway = getBillingGateway('stripe');
  let event: any;

  try {
    event = gateway.constructWebhookEvent(payload, signature);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // 1. Idempotency Check
  const { data: existingEvent } = await supabase
    .from('gateway_events')
    .select('id')
    .eq('event_id', event.id)
    .single();

  if (existingEvent) {
    console.log(`Event ${event.id} already processed`);
    return NextResponse.json({ received: true }); // Already processed
  }

  // 2. Process Event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const orgId = session.metadata?.organization_id;
        const planId = session.metadata?.plan_id;
        
        if (orgId && planId) {
          // Update organization status and subscription
          await supabase.from('subscriptions').upsert({
            organization_id: orgId,
            plan_id: planId,
            status: 'active',
            stripe_subscription_id: session.subscription,
            stripe_customer_id: session.customer,
            gateway: 'stripe',
          }, { onConflict: 'organization_id' });
          
          await supabase.from('organizations').update({
            subscription_status: 'active',
            plan_id: planId
          }).eq('id', orgId);
        }
        break;
      }
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          // Find the org by stripe_subscription_id
          const { data: sub } = await supabase
            .from('subscriptions')
            .select('organization_id')
            .eq('stripe_subscription_id', invoice.subscription)
            .single();
            
          if (sub) {
            await supabase.from('subscriptions').update({
              status: 'active',
              grace_period_ends_at: null
            }).eq('stripe_subscription_id', invoice.subscription);
            
            await supabase.from('organizations').update({
              subscription_status: 'active'
            }).eq('id', sub.organization_id);

            // Create billing history record
            await supabase.from('billing_history').insert({
              organization_id: sub.organization_id,
              gateway: 'stripe',
              gateway_invoice_id: invoice.id,
              amount_due: invoice.amount_due / 100,
              amount_paid: invoice.amount_paid / 100,
              currency: invoice.currency.toUpperCase(),
              status: 'paid',
              invoice_pdf_url: invoice.hosted_invoice_url,
              paid_at: new Date().toISOString()
            });
          }
        }
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        if (invoice.subscription) {
          // Add 3 days grace period before hard fail
          const gracePeriod = new Date();
          gracePeriod.setDate(gracePeriod.getDate() + 3);

          const { data: sub } = await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              grace_period_ends_at: gracePeriod.toISOString()
            })
            .eq('stripe_subscription_id', invoice.subscription)
            .select('organization_id')
            .single();
            
          if (sub) {
            await supabase.from('organizations').update({
              subscription_status: 'past_due'
            }).eq('id', sub.organization_id);
          }
        }
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const { data: sub } = await supabase
          .from('subscriptions')
          .update({
            status: 'canceled',
            cancel_reason: 'Canceled at gateway'
          })
          .eq('stripe_subscription_id', subscription.id)
          .select('organization_id')
          .single();
          
        if (sub) {
          await supabase.from('organizations').update({
            subscription_status: 'canceled'
          }).eq('id', sub.organization_id);
        }
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const status = subscription.status; // active, past_due, canceled, etc.
        const cancelAtPeriodEnd = subscription.cancel_at_period_end;
        
        await supabase
          .from('subscriptions')
          .update({
            status: status === 'trialing' ? 'trial' : status,
            cancel_at_period_end: cancelAtPeriodEnd
          })
          .eq('stripe_subscription_id', subscription.id);
        break;
      }
    }

    // 3. Mark event as processed
    await supabase.from('gateway_events').insert({
      gateway: 'stripe',
      event_id: event.id,
      event_type: event.type,
      payload: event
    });

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error(`Error processing webhook: ${error.message}`);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
