import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { planId, priceId, organizationId, locale = 'pt-BR', trialPeriodDays = 30 } = await req.json();

    if (!planId || !priceId || !organizationId) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create customer ID in Paddle gateway
    const { data: org } = await supabase
      .from('organizations')
      .select('name, paddle_customer_id')
      .eq('id', organizationId)
      .single();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('paddle_customer_id')
      .eq('organization_id', organizationId)
      .single();

    const gateway = getBillingGateway('paddle');
    let customerId = sub?.paddle_customer_id || org?.paddle_customer_id;

    if (!customerId) {
      customerId = await gateway.createCustomer({
        email: user.email!,
        name: org?.name || 'Cliente Parent Care',
        metadata: { organization_id: organizationId }
      });

      await supabase
        .from('organizations')
        .update({ paddle_customer_id: customerId })
        .eq('id', organizationId);
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://parentcare-pink.vercel.app';
    
    const session = await gateway.createCheckoutSession({
      customerId,
      priceId,
      trialPeriodDays,
      successUrl: `${appUrl}/${locale}/dashboard/settings/subscription?trial_started=true`,
      cancelUrl: `${appUrl}/${locale}/dashboard/settings/subscription?canceled=true`,
      metadata: {
        organization_id: organizationId,
        plan_id: planId,
        trial_days: String(trialPeriodDays)
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
