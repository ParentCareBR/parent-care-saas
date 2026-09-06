import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { organizationId, locale = 'pt-BR' } = await req.json();

    if (!organizationId) {
      return NextResponse.json({ error: 'Identificador da organização é obrigatório.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    // Check membership
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Permissão negada. Apenas administradores podem acessar o portal financeiro.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Look up customer from billing_customers, billing_subscriptions, or organizations
    const { data: billingCust } = await adminSupabase
      .from('billing_customers')
      .select('paddle_customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const { data: billingSub } = await adminSupabase
      .from('billing_subscriptions')
      .select('paddle_customer_id, paddle_subscription_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const { data: org } = await adminSupabase
      .from('organizations')
      .select('paddle_customer_id')
      .eq('id', organizationId)
      .maybeSingle();

    const customerId = billingCust?.paddle_customer_id || billingSub?.paddle_customer_id || org?.paddle_customer_id;

    if (!customerId) {
      return NextResponse.json({ error: 'Nenhum cliente Paddle vinculado a esta organização.' }, { status: 404 });
    }

    const gateway = getBillingGateway();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://parentcare-pink.vercel.app';
    const returnUrl = `${appUrl}/${locale}/dashboard/settings/subscription`;

    const subscriptionIds = billingSub?.paddle_subscription_id ? [billingSub.paddle_subscription_id] : [];
    const session = await (gateway as any).createPortalSession(customerId, returnUrl, subscriptionIds);

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    console.error('[Paddle Portal Error]:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao gerar sessão do portal.' }, { status: 500 });
  }
}
