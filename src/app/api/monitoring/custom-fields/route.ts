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

    const { data: person } = await supabase
      .from('cared_people')
      .select('organization_id')
      .eq('id', caredPersonId)
      .maybeSingle();

    if (!person) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    // Try reading from dedicated table if available
    try {
      const adminSupabase = createAdminClient();
      const { data: dbFields, error: dbErr } = await adminSupabase
        .from('custom_monitoring_fields')
        .select('*')
        .eq('cared_person_id', caredPersonId)
        .is('archived_at', null)
        .order('created_at', { ascending: true });

      if (!dbErr && dbFields && dbFields.length > 0) {
        return NextResponse.json({ success: true, fields: dbFields });
      }
    } catch (_) {
      // Table doesn't exist
    }

    // Fallback to organizations.settings.custom_fields
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .maybeSingle();

    const orgSettings = (org?.settings as any) || {};
    const personFields = orgSettings.custom_fields?.[caredPersonId] || [];
    const activeFields = personFields.filter((f: any) => !f.archived_at);

    return NextResponse.json({ success: true, fields: activeFields });
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

    const now = new Date().toISOString();
    const newFieldId = `cf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const newField = {
      id: newFieldId,
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
      created_at: now,
      archived_at: null,
    };

    // 1. Update organizations.settings.custom_fields
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .single();

    const currentOrgSettings = (org?.settings as any) || {};
    const customFieldsMap = { ...(currentOrgSettings.custom_fields || {}) };
    const personCustomFields = [...(customFieldsMap[caredPersonId] || []), newField];
    customFieldsMap[caredPersonId] = personCustomFields;

    const { error: orgErr } = await supabase
      .from('organizations')
      .update({
        settings: {
          ...currentOrgSettings,
          custom_fields: customFieldsMap,
        },
        updated_at: now,
      })
      .eq('id', person.organization_id);

    if (orgErr) {
      console.error('Error saving custom field to organization settings:', orgErr);
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }

    // 2. Audit log
    try {
      await supabase.from('audit_logs').insert({
        organization_id: person.organization_id,
        user_id: user.id,
        action: 'create_custom_field',
        table_name: 'organizations',
        record_id: person.organization_id,
        old_data: {},
        new_data: newField,
      });
    } catch (_) {
      // safe
    }

    // 3. Try inserting into custom_monitoring_fields table if available
    try {
      const adminSupabase = createAdminClient();
      await adminSupabase.from('custom_monitoring_fields').insert({
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
      });
    } catch (_) {
      // Ignored if table doesn't exist
    }

    return NextResponse.json({
      success: true,
      message: 'Campo personalizado criado com sucesso!',
      field: newField,
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao criar campo personalizado.' }, { status: 500 });
  }
}
