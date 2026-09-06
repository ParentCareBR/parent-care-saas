import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const caredPersonId = searchParams.get('caredPersonId');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!caredPersonId) {
      return NextResponse.json({ error: 'caredPersonId é obrigatório.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('monitoring_records')
      .select(`
        *,
        monitoring_definitions (
          id,
          code,
          translation_key,
          category_id
        ),
        custom_monitoring_fields (
          id,
          label,
          field_type
        )
      `)
      .eq('cared_person_id', caredPersonId)
      .is('archived_at', null)
      .order('occurred_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, records: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao buscar registros.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const body = await req.json();
    const {
      caredPersonId,
      definitionCode,
      customFieldId,
      value,
      notes,
      source,
      occurredAt,
    } = body;

    if (!caredPersonId || (!definitionCode && !customFieldId)) {
      return NextResponse.json({ error: 'caredPersonId e definitionCode ou customFieldId são obrigatórios.' }, { status: 400 });
    }

    const { data: person } = await supabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', caredPersonId)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const adminSupabase = createAdminClient();
    let defId: string | null = null;

    if (definitionCode) {
      const { data: def } = await adminSupabase
        .from('monitoring_definitions')
        .select('id')
        .eq('code', definitionCode)
        .maybeSingle();
      defId = def?.id || null;
    }

    const { data: record, error: insertErr } = await adminSupabase
      .from('monitoring_records')
      .insert({
        organization_id: person.organization_id,
        cared_person_id: caredPersonId,
        monitoring_definition_id: defId,
        custom_field_id: customFieldId || null,
        recorded_by: user.id,
        occurred_at: occurredAt || new Date().toISOString(),
        value_json: typeof value === 'object' && value !== null ? value : { val: value },
        notes: notes || null,
        source: source || 'family_app',
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Acompanhamento registrado com sucesso.',
      record,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao salvar registro de acompanhamento.' }, { status: 500 });
  }
}
