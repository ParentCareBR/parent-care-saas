import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { getBillingGateway } from '@/lib/billing';

export async function POST(req: NextRequest) {
  try {
    const { organizationId, immediate = false } = await req.json();

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

    // Role check: Only owner or admin can cancel subscription
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (!member || !['owner', 'admin'].includes(member.role)) {
      return NextResponse.json({ error: 'Permissão negada. Apenas proprietários podem cancelar a assinatura.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { data: sub } = await adminSupabase
      .from('billing_subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (!sub || !sub.paddle_subscription_id) {
      return NextResponse.json({ error: 'Nenhuma assinatura ativa encontrada.' }, { status: 404 });
    }

    const gateway = getBillingGateway();
    await gateway.cancelSubscription(sub.paddle_subscription_id, immediate);

    // Update database status
    const status = immediate ? 'canceled' : sub.status;
    const canceledAt = new Date().toISOString();

    await adminSupabase
      .from('billing_subscriptions')
      .update({
        status,
        canceled_at: canceledAt,
        scheduled_change: immediate ? null : { action: 'cancel', effective_at: sub.current_period_end },
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id);

    if (immediate) {
      await adminSupabase
        .from('organization_entitlements')
        .update({
          subscription_status: 'canceled',
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId);

      await adminSupabase
        .from('organizations')
        .update({
          subscription_status: 'canceled',
        })
        .eq('id', organizationId);
    }

    return NextResponse.json({
      success: true,
      message: immediate
        ? 'Assinatura cancelada com sucesso.'
        : `Cancelamento agendado para o fim do período em ${new Date(sub.current_period_end).toLocaleDateString('pt-BR')}.`,
      effectiveAt: immediate ? 'immediately' : sub.current_period_end,
    });
  } catch (error: any) {
    console.error('[Subscription Cancel Error]:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao cancelar assinatura.' }, { status: 500 });
  }
}
