import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateDependencies, getDefinitionByCode } from '@/lib/monitoring/catalog';

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

    // Verify membership
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

    if (!member) {
      return NextResponse.json({ error: 'Acesso negado para esta organização.' }, { status: 403 });
    }

    // Fetch settings
    const adminSupabase = createAdminClient();
    const { data: settings, error: sErr } = await adminSupabase
      .from('cared_person_monitoring_settings')
      .select(`
        *,
        monitoring_definitions (
          id,
          code,
          translation_key,
          description_translation_key,
          field_type,
          dependency_code,
          allows_reminder,
          allows_attachment,
          category_id
        )
      `)
      .eq('cared_person_id', caredPersonId)
      .order('display_order', { ascending: true });

    if (sErr) {
      return NextResponse.json({ error: sErr.message }, { status: 500 });
    }

    const enabledCodes = (settings || [])
      .filter((s: any) => s.enabled && s.monitoring_definitions?.code)
      .map((s: any) => s.monitoring_definitions.code);

    return NextResponse.json({
      success: true,
      settings: settings || [],
      enabledCodes,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao carregar configurações.' }, { status: 500 });
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
    const { caredPersonId, enabledCodes, settingsPayload } = body;

    if (!caredPersonId || !Array.isArray(enabledCodes)) {
      return NextResponse.json({ error: 'caredPersonId e enabledCodes são obrigatórios.' }, { status: 400 });
    }

    // Verify permission (owner, admin, or collaborator)
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
      return NextResponse.json({ error: 'Permissão insuficiente para alterar configurações de acompanhamento.' }, { status: 403 });
    }

    // Validate dependencies
    const depCheck = validateDependencies(enabledCodes);
    if (!depCheck.valid) {
      return NextResponse.json({
        error: 'Existem dependências não atendidas para os itens selecionados.',
        missingDependencies: depCheck.missingDependencies,
      }, { status: 422 });
    }

    const adminSupabase = createAdminClient();

    // Fetch existing monitoring definitions from database to get IDs
    const { data: dbDefinitions } = await adminSupabase
      .from('monitoring_definitions')
      .select('id, code');

    const defMap = new Map<string, string>();
    dbDefinitions?.forEach((d: any) => defMap.set(d.code, d.id));

    // Fetch current settings to prepare audit log
    const { data: existingSettings } = await adminSupabase
      .from('cared_person_monitoring_settings')
      .select('*')
      .eq('cared_person_id', caredPersonId);

    const existingMap = new Map<string, any>();
    existingSettings?.forEach((es: any) => existingMap.set(es.monitoring_definition_id, es));

    const enabledSet = new Set(enabledCodes);
    const now = new Date().toISOString();

    // Batch upsert settings for each definition in database
    const upsertRows: any[] = [];
    const auditRows: any[] = [];

    defMap.forEach((defId, code) => {
      const isEnabled = enabledSet.has(code);
      const prevSetting = existingMap.get(defId);
      const prevEnabled = prevSetting?.enabled ?? false;

      // Only prepare update if status changed or setting is enabled
      if (isEnabled !== prevEnabled || isEnabled) {
        const itemSettings = settingsPayload?.[code] || {};
        upsertRows.push({
          organization_id: person.organization_id,
          cared_person_id: caredPersonId,
          monitoring_definition_id: defId,
          enabled: isEnabled,
          enabled_at: isEnabled ? (prevSetting?.enabled_at || now) : prevSetting?.enabled_at || now,
          disabled_at: !isEnabled ? now : null,
          configured_by: user.id,
          settings_json: itemSettings,
          updated_at: now,
        });

        // Audit log on change
        if (isEnabled !== prevEnabled) {
          auditRows.push({
            organization_id: person.organization_id,
            cared_person_id: caredPersonId,
            action: isEnabled ? 'enable' : 'disable',
            target_type: 'definition',
            target_id: defId,
            details: { code, previous: prevEnabled, current: isEnabled },
            performed_by: user.id,
            created_at: now,
          });
        }
      }
    });

    if (upsertRows.length > 0) {
      const { error: upsertErr } = await adminSupabase
        .from('cared_person_monitoring_settings')
        .upsert(upsertRows, { onConflict: 'cared_person_id, monitoring_definition_id' });

      if (upsertErr) {
        return NextResponse.json({ error: upsertErr.message }, { status: 500 });
      }
    }

    if (auditRows.length > 0) {
      await adminSupabase.from('monitoring_configuration_audit').insert(auditRows);
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração de acompanhamento atualizada com sucesso!',
      totalConfigured: upsertRows.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao salvar configurações.' }, { status: 500 });
  }
}
