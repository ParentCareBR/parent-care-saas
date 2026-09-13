import { NextRequest, NextResponse } from 'next/server';
import { getOrganizationEntitlements } from '@/lib/billing/entitlements';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('organizationId');

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

    let targetOrgId = orgId;
    if (!targetOrgId) {
      const { data: membership } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      targetOrgId = membership?.organization_id;
    }

    if (!targetOrgId) {
      return NextResponse.json({ error: 'Organização não encontrada.' }, { status: 404 });
    }

    const entitlements = await getOrganizationEntitlements(targetOrgId);
    return NextResponse.json({ entitlements });
  } catch (error: any) {
    console.error('[API/Entitlements] Error:', error);
    return NextResponse.json({ error: error.message || 'Erro ao carregar permissões.' }, { status: 500 });
  }
}
