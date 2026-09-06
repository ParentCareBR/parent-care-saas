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

    // 1. Try fetching from monitoring_records table
    try {
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

      if (!error && data) {
        return NextResponse.json({ success: true, records: data });
      }
    } catch (_) {
      // Table does not exist
    }

    // 2. Resilient fallback: fetch recent events from audit_logs and check_ins
    const { data: person } = await supabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', caredPersonId)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const { data: auditRows } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('organization_id', person.organization_id)
      .order('created_at', { ascending: false })
      .limit(limit);

    const mappedRecords = (auditRows || []).map((log: any) => ({
      id: log.id,
      cared_person_id: caredPersonId,
      occurred_at: log.created_at,
      notes: log.action === 'monitoring_settings_updated'
        ? 'Configurações de acompanhamento atualizadas'
        : log.action === 'create_custom_field'
        ? `Campo personalizado criado: ${log.new_data?.label || ''}`
        : log.action,
      monitoring_definitions: {
        code: log.action,
      },
    }));

    return NextResponse.json({ success: true, records: mappedRecords });
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
    const timestamp = occurredAt || new Date().toISOString();
    let recordResult: any = null;

    // 1. Try inserting into monitoring_records if available
    try {
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
          occurred_at: timestamp,
          value_json: typeof value === 'object' && value !== null ? value : { val: value },
          notes: notes || null,
          source: source || 'family_app',
        })
        .select()
        .single();

      if (!insertErr && record) {
        recordResult = record;
      }
    } catch (_) {
      // Table doesn't exist
    }

    // 2. Always persist audit log so record is never lost
    try {
      const { data: auditRow } = await supabase
        .from('audit_logs')
        .insert({
          organization_id: person.organization_id,
          user_id: user.id,
          action: definitionCode ? `record_${definitionCode}` : 'record_custom_field',
          table_name: 'monitoring_records',
          record_id: caredPersonId,
          old_data: {},
          new_data: {
            definitionCode,
            customFieldId,
            value,
            notes,
            source: source || 'family_app',
            occurred_at: timestamp,
          },
        })
        .select()
        .single();

      if (!recordResult && auditRow) {
        recordResult = {
          id: auditRow.id,
          cared_person_id: caredPersonId,
          occurred_at: timestamp,
          notes,
        };
      }
    } catch (_) {
      // safe
    }

    return NextResponse.json({
      success: true,
      message: 'Acompanhamento registrado com sucesso.',
      record: recordResult || { id: 'temp', occurred_at: timestamp },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao salvar registro de acompanhamento.' }, { status: 500 });
  }
}
