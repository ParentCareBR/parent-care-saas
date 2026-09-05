import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Missing organizationId' }, { status: 400 });
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

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: 'No active customer found' }, { status: 400 });
    }

    const gateway = getBillingGateway('stripe');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    const session = await gateway.createPortalSession(
      sub.stripe_customer_id,
      `${appUrl}/pt-BR/dashboard/settings/subscription`
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
