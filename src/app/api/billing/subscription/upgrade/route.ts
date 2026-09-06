import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { getAuthorizedPriceId, validateSeatQuantity, PADDLE_TIERS } from '@/lib/billing/paddle-catalog';
import { getPaddleClient, getPaddleEnvironment } from '@/lib/billing/paddle-client';
import { syncOrganizationEntitlementCounts } from '@/lib/billing/entitlements';

export async function POST(req: NextRequest) {
  try {
    const { organizationId, targetSeats } = await req.json();

    const val = validateSeatQuantity(Number(targetSeats));
    if (!val.valid) {
      return NextResponse.json({ error: val.error }, { status: 400 });
    }
    const newSeats = Number(targetSeats);

    // Auth check
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

    const { data: membership } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Permissão negada. Apenas proprietário ou admin pode alterar o plano.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Fetch current subscription
    const { data: currentSub } = await adminSupabase
      .from('billing_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!currentSub) {
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada para esta família. Inicie pelo checkout.' }, { status: 404 });
    }

    if (newSeats <= currentSub.seat_limit) {
      return NextResponse.json({ error: `O plano atual já possui ${currentSub.seat_limit} assento(s). Para diminuir, utilize a opção de downgrade.` }, { status: 400 });
    }

    const isProduction = (process.env.PADDLE_ENVIRONMENT || process.env.NEXT_PUBLIC_PADDLE_ENV) === 'production';
    const paddleEnv = isProduction ? 'production' : 'sandbox';
    const newPriceId = getAuthorizedPriceId(newSeats, paddleEnv);
    const targetTier = PADDLE_TIERS[newSeats];

    // Call Paddle API to update subscription items immediately with proration
    const paddle = getPaddleClient();
    try {
      await paddle.subscriptions.update(currentSub.paddle_subscription_id, {
        items: [
          {
            priceId: newPriceId,
            quantity: 1,
          },
        ],
        prorationBillingMode: 'prorated_immediately',
        customData: {
          organization_id: organizationId,
          seat_quantity: String(newSeats),
        },
      });
    } catch (paddleErr: any) {
      console.error('[Paddle Upgrade Error]:', paddleErr);
      return NextResponse.json({ error: `Falha ao processar upgrade na Paddle: ${paddleErr?.message}` }, { status: 502 });
    }

    // Update local subscription & entitlements
    await adminSupabase
      .from('billing_subscriptions')
      .update({
        seat_limit: newSeats,
        paddle_price_id: newPriceId,
        unit_price: targetTier.unitPriceBrl,
        recurring_total: targetTier.totalMonthlyBrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentSub.id);

    await adminSupabase
      .from('organization_entitlements')
      .update({
        seat_limit: newSeats,
        updated_at: new Date().toISOString(),
      })
      .eq('organization_id', organizationId);

    await syncOrganizationEntitlementCounts(organizationId);

    return NextResponse.json({
      success: true,
      message: `Plano atualizado com sucesso para ${newSeats} assentos.`,
      newSeatLimit: newSeats,
      unitPriceBrl: targetTier.unitPriceBrl,
      totalMonthlyBrl: targetTier.totalMonthlyBrl,
    });
  } catch (error: any) {
    console.error('[Upgrade Route Error]:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao processar upgrade.' }, { status: 500 });
  }
}
