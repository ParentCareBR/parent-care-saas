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

    if (!caredPersonId) {
      return NextResponse.json({ error: 'caredPersonId é obrigatório.' }, { status: 400 });
    }

    const adminSupabase = createAdminClient();
    const { data, error } = await adminSupabase
      .from('custom_monitoring_fields')
      .select('*')
      .eq('cared_person_id', caredPersonId)
      .is('archived_at', null)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, fields: data || [] });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao buscar campos personalizados.' }, { status: 500 });
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
      categoryId,
      label,
      description,
      fieldType,
      options,
      required,
      includeDailySummary,
      includeWeeklyReport,
    } = body;

    if (!caredPersonId || !label || !fieldType) {
      return NextResponse.json({ error: 'caredPersonId, label e fieldType são obrigatórios.' }, { status: 400 });
    }

    // Safety check: block clinical diagnosis terms in custom fields
    const lowerLabel = label.toLowerCase();
    const prohibitedTerms = ['diagnóstico', 'diagnostico', 'prescrição', 'prescricao', 'dosagem', 'receita médica', 'tratamento médico'];
    for (const term of prohibitedTerms) {
      if (lowerLabel.includes(term)) {
        return NextResponse.json({
          error: `O termo "${term}" não é permitido em campos de acompanhamento familiar. O Parent Care não realiza diagnósticos ou prescrições médicas.`,
        }, { status: 422 });
      }
    }

    const { data: person } = await supabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', caredPersonId)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', person.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member || !['owner', 'admin', 'collaborator'].includes(member.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente para criar campos personalizados.' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();
    const { data: newField, error: insertErr } = await adminSupabase
      .from('custom_monitoring_fields')
      .insert({
        organization_id: person.organization_id,
        cared_person_id: caredPersonId,
        category_id: categoryId || null,
        label: label.trim(),
        description: description?.trim() || null,
        field_type: fieldType,
        options_json: Array.isArray(options) ? options : [],
        required: !!required,
        include_daily_summary: includeDailySummary !== false,
        include_weekly_report: includeWeeklyReport !== false,
        enabled: true,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Audit log
    await adminSupabase.from('monitoring_configuration_audit').insert({
      organization_id: person.organization_id,
      cared_person_id: caredPersonId,
      action: 'create_custom_field',
      custom_field_id: newField.id,
      new_value: { label, fieldType },
      performed_by: user.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Campo personalizado criado com sucesso!',
      field: newField,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar campo personalizado.' }, { status: 500 });
  }
}
