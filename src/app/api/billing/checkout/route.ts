import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { planId, priceId, organizationId } = await req.json();

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

    // Get or create customer ID in gateway
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single();

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    const gateway = getBillingGateway('stripe');
    let customerId = sub?.stripe_customer_id;

    if (!customerId) {
      customerId = await gateway.createCustomer({
        email: user.email!,
        name: org?.name,
        metadata: { organization_id: organizationId }
      });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const session = await gateway.createCheckoutSession({
      customerId,
      priceId,
      successUrl: `${appUrl}/pt-BR/dashboard/settings/subscription?success=true`,
      cancelUrl: `${appUrl}/pt-BR/dashboard/settings/subscription?canceled=true`,
      metadata: {
        organization_id: organizationId,
        plan_id: planId
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Checkout error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
