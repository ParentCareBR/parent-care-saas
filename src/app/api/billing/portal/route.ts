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
      .select('paddle_customer_id, paddle_subscription_id')
      .eq('organization_id', organizationId)
      .single();

    const { data: org } = await supabase
      .from('organizations')
      .select('paddle_customer_id')
      .eq('id', organizationId)
      .single();

    const customerId = sub?.paddle_customer_id || org?.paddle_customer_id;

    if (!customerId) {
      return NextResponse.json({ error: 'Nenhum cliente registrado encontrado no Paddle' }, { status: 400 });
    }

    const gateway = getBillingGateway('paddle');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://parentcare-pink.vercel.app';
    const returnUrl = `${appUrl}/pt-BR/dashboard/settings/subscription`;
    
    const subscriptionIds = sub?.paddle_subscription_id ? [sub.paddle_subscription_id] : [];
    const session = await (gateway as any).createPortalSession(
      customerId,
      returnUrl,
      subscriptionIds
    );

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('Portal error:', error);
    return NextResponse.json({ error: error?.message || 'Internal Server Error' }, { status: 500 });
  }
}
