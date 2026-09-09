import { NextRequest, NextResponse } from 'next/server';
import { getBillingGateway } from '@/lib/billing';
import { getAuthorizedPriceId, validateSeatQuantity } from '@/lib/billing/paddle-catalog';
import { getPaddleEnvironment } from '@/lib/billing/paddle-client';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, seatQuantity = 1, locale = 'pt-BR' } = body;

    // 1. Strict Server-Side Validation of Seat Quantity (1 to 6)
    const seatVal = validateSeatQuantity(Number(seatQuantity));
    if (!seatVal.valid) {
      return NextResponse.json({ error: seatVal.error }, { status: 400 });
    }
    const numSeats = Number(seatQuantity);

    if (!organizationId) {
      return NextResponse.json({ error: 'Identificador da organização é obrigatório.' }, { status: 400 });
    }

    // 2. Authentication & Authorization Check
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

    // Check membership and role (only owner or admin can initiate checkout)
    const { data: membership } = await supabase
      .from('organization_members')
      .select('role, status')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Apenas proprietários ou administradores podem gerenciar a assinatura.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // 3. Resolve authorized price ID server-side (prevents client tampering)
    const paddleEnv = getPaddleEnvironment() === 'production' ? 'production' : 'sandbox';
    const priceId = getAuthorizedPriceId(numSeats, paddleEnv);

    // 4. Retrieve or create customer record safely
    const { data: org } = await adminSupabase
      .from('organizations')
      .select('name, settings')
      .eq('id', organizationId)
      .maybeSingle();

    const orgSettings = (org?.settings as any) || {};
    let customerId = orgSettings.paddle_customer_id || null;

    // Optional lookup in billing_customers if table exists
    if (!customerId) {
      try {
        const { data: billingCust } = await adminSupabase
          .from('billing_customers')
          .select('paddle_customer_id')
          .eq('organization_id', organizationId)
          .maybeSingle();
        if (billingCust?.paddle_customer_id) {
          customerId = billingCust.paddle_customer_id;
        }
      } catch {
        // non-fatal if table doesn't exist
      }
    }

    const gateway = getBillingGateway();

    if (!customerId) {
      try {
        customerId = await gateway.createCustomer({
          email: user.email!,
          name: org?.name || 'Cliente Parent Care',
          metadata: { organization_id: organizationId },
        });

        // Save in organizations.settings (guaranteed to exist)
        await adminSupabase.from('organizations').update({
          settings: {
            ...orgSettings,
            paddle_customer_id: customerId,
          },
        }).eq('id', organizationId);

        // Try saving in billing_customers if table exists
        try {
          await adminSupabase.from('billing_customers').upsert({
            organization_id: organizationId,
            owner_user_id: user.id,
            paddle_customer_id: customerId,
            email: user.email!,
            country_code: 'BR',
            preferred_currency: 'BRL',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'organization_id' });
        } catch {
          // ignore if table doesn't exist
        }
      } catch (custErr: any) {
        console.warn('[Paddle Checkout] Customer pre-creation skipped (Paddle checkout will create customer automatically):', custErr?.message || custErr);
        customerId = undefined;
      }
    }

    // 5. Build Redirect URLs
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://parentcare-pink.vercel.app';
    const successUrl = `${appUrl}/${locale}/dashboard/settings/subscription?success=true`;
    const cancelUrl = `${appUrl}/${locale}/dashboard/settings/subscription?canceled=true`;

    // 6. Create Paddle Transaction / Checkout Session
    const session = await gateway.createCheckoutSession({
      customerId,
      priceId,
      trialPeriodDays: 14,
      successUrl,
      cancelUrl,
      metadata: {
        organization_id: organizationId,
        seat_quantity: String(numSeats),
        user_id: user.id,
      },
    });

    return NextResponse.json({
      url: session.url,
      transactionId: (session as any).transactionId,
      seatQuantity: numSeats,
      priceId,
    });
  } catch (error: any) {
    console.error('[Paddle Checkout Error]:', error);
    let message = error?.detail || error?.message || 'Erro ao iniciar checkout.';
    if (error?.code === 'authentication_malformed' || String(message).includes('authentication_malformed')) {
      message = 'Chave de API do Paddle inválida. Certifique-se de usar a Secret Key completa (começa com pdl_live_apikey_ ou pdl_sdbx_apikey_), não apenas o Key ID.';
    } else if (error?.code === 'transaction_checkout_not_enabled' || String(message).includes('transaction_checkout_not_enabled') || String(message).includes("Checkouts aren't enabled")) {
      message = 'Os checkouts ainda não foram liberados para esta conta de produção do Paddle. Acesse o Paddle Dashboard e conclua o onboarding/verificação de identidade da empresa.';
    } else if (error?.code === 'not_found' || String(message).includes('not found') || String(message).includes('price')) {
      message = 'Preço do plano não encontrado no Paddle. Cadastre os preços no Paddle Dashboard e informe os Price IDs no Vercel.';
    }
    return NextResponse.json({ error: message, code: error?.code || 'CHECKOUT_ERROR' }, { status: 500 });
  }
}
