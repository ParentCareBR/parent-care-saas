import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { getAuthorizedPriceId, validateSeatQuantity, PADDLE_TIERS } from '@/lib/billing/paddle-catalog';
import { getPaddleClient } from '@/lib/billing/paddle-client';
import { getOrganizationEntitlements, syncOrganizationEntitlementCounts } from '@/lib/billing/entitlements';

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
      return NextResponse.json({ error: 'Nenhuma assinatura encontrada para esta família.' }, { status: 404 });
    }

    if (newSeats >= currentSub.seat_limit) {
      return NextResponse.json({ error: `O plano atual já possui ${currentSub.seat_limit} assento(s). Para aumentar, utilize o upgrade.` }, { status: 400 });
    }

    // CRITICAL VALIDATION: Verify if active members + pending reserved invites fit in new seats
    const entitlements = await getOrganizationEntitlements(organizationId);
    if (entitlements.totalUsedSeats > newSeats) {
      return NextResponse.json({
        error: `Não é possível reduzir para ${newSeats} assento(s). A família possui atualmente ${entitlements.totalUsedSeats} assento(s) em uso (${entitlements.activeMembersCount} membro(s) ativo(s) e ${entitlements.reservedInvitesCount} convite(s) pendente(s)). Remova membros ou cancele convites pendentes antes de rebaixar o plano.`,
        currentUsedSeats: entitlements.totalUsedSeats,
        targetSeats: newSeats,
      }, { status: 400 });
    }

    const isProduction = (process.env.PADDLE_ENVIRONMENT || process.env.NEXT_PUBLIC_PADDLE_ENV) === 'production';
    const paddleEnv = isProduction ? 'production' : 'sandbox';
    const newPriceId = getAuthorizedPriceId(newSeats, paddleEnv);
    const targetTier = PADDLE_TIERS[newSeats];

    // Call Paddle API to update subscription items for the next billing period
    const paddle = getPaddleClient();
    try {
      await paddle.subscriptions.update(currentSub.paddle_subscription_id, {
        items: [
          {
            priceId: newPriceId,
            quantity: 1,
          },
        ],
        prorationBillingMode: 'prorated_next_billing_period',
        customData: {
          organization_id: organizationId,
          seat_quantity: String(newSeats),
        },
      });
    } catch (paddleErr: any) {
      console.error('[Paddle Downgrade Error]:', paddleErr);
      return NextResponse.json({ error: `Falha ao processar downgrade na Paddle: ${paddleErr?.message}` }, { status: 502 });
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
      message: `Plano reduzido para ${newSeats} assento(s). A alteração já está em vigor.`,
      newSeatLimit: newSeats,
      unitPriceBrl: targetTier.unitPriceBrl,
      totalMonthlyBrl: targetTier.totalMonthlyBrl,
    });
  } catch (error: any) {
    console.error('[Downgrade Route Error]:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao processar downgrade.' }, { status: 500 });
  }
}
