import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll() { return cookieStore.getAll(); }, setAll() {} } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

    const adminSupabase = createAdminClient();

    let query = adminSupabase
      .from('user_notification_preferences')
      .select('*')
      .eq('user_id', user.id);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data: prefs } = await query.maybeSingle();

    return NextResponse.json({
      preferences: prefs || {
        user_id: user.id,
        new_appointment: true,
        appointment_changed: true,
        appointment_canceled: true,
        approval_requested: true,
        approval_decided: true,
        medication_confirmed: true,
        medication_missed: true,
        emergency_event: true,
        help_requested: true,
        shift_started: false,
        shift_ended: false,
        handover_submitted: true,
        in_app: true,
        email: true,
        push_web: true,
        notification_language: 'pt-BR',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao buscar preferências.' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { organizationId, preferences } = body;

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

    const adminSupabase = createAdminClient();

    const { data: updated, error } = await adminSupabase
      .from('user_notification_preferences')
      .upsert({
        user_id: user.id,
        organization_id: organizationId,
        ...preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,organization_id' })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, preferences: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao salvar preferências.' }, { status: 500 });
  }
}
