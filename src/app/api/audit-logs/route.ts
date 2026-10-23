import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { serverGetUserRole } from '@/lib/permissions';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');
    const caredPersonId = searchParams.get('caredPersonId');
    const userId = searchParams.get('userId');
    const moduleCode = searchParams.get('moduleCode');
    const isCritical = searchParams.get('isCritical');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId é obrigatório.' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const callerRole = await serverGetUserRole(user.id, organizationId);
    if (!callerRole) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

    // Only owners and admins can view full family audit logs
    if (!['owner', 'admin'].includes(callerRole)) {
      return NextResponse.json({ error: 'Apenas administradores podem visualizar o histórico de auditoria.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from('audit_logs')
      .select(`
        id, action, module_code, table_name, record_id,
        user_role, user_display_name, description, is_critical,
        old_data, new_data, ip_address, device_info, language_used,
        created_at, user_id, cared_person_id,
        cared_people (full_name, preferred_name)
      `, { count: 'exact' })
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (caredPersonId) query = query.eq('cared_person_id', caredPersonId);
    if (userId) query = query.eq('user_id', userId);
    if (moduleCode) query = query.eq('module_code', moduleCode);
    if (isCritical === 'true') query = query.eq('is_critical', true);

    const { data: logs, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      logs: logs ?? [],
      total: count ?? 0,
      limit,
      offset,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao consultar auditoria.' }, { status: 500 });
  }
}
