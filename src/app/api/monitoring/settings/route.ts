import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateDependencies, autoResolveDependencies, MONITORING_CATALOG } from '@/lib/monitoring/catalog';

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

    // 1. Fetch organization settings from Supabase
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .maybeSingle();

    const orgSettings = (org?.settings as any) || {};
    const monitoringMap = orgSettings.monitoring || {};
    const personConfig = monitoringMap[caredPersonId];

    let enabledCodes: string[] = [];
    let settingsPayload: Record<string, any> = {};

    if (personConfig && Array.isArray(personConfig.enabled_codes)) {
      enabledCodes = personConfig.enabled_codes;
      settingsPayload = personConfig.settings_payload || {};
    } else {
      // Check if dedicated table exists and has data
      try {
        const adminSupabase = createAdminClient();
        const { data: dbSettings, error: dbErr } = await adminSupabase
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

        if (!dbErr && dbSettings && dbSettings.length > 0) {
          const codes = dbSettings
            .filter((s: any) => s.enabled && s.monitoring_definitions?.code)
            .map((s: any) => s.monitoring_definitions.code);

          return NextResponse.json({
            success: true,
            settings: dbSettings,
            enabledCodes: codes,
          });
        }
      } catch (_) {
        // Table not present, fallback
      }

      // Default baseline essentials if never saved yet
      enabledCodes = [
        'routine_meals',
        'routine_hydration',
        'meds_scheduled',
        'schedule_appointments',
        'safety_help_requests',
        'safety_emergency_button',
        'checkin_btn_im_well',
        'checkin_btn_need_help',
        'checkin_btn_took_med',
        'checkin_btn_ate',
        'checkin_btn_drank_water',
        'checkin_btn_emergency',
      ];
    }

    // Build synthesized settings list from catalog
    const enabledSet = new Set(enabledCodes);
    const synthesizedSettings: any[] = [];

    for (const cat of MONITORING_CATALOG) {
      for (const def of cat.definitions) {
        synthesizedSettings.push({
          id: def.id,
          cared_person_id: caredPersonId,
          organization_id: person.organization_id,
          enabled: enabledSet.has(def.code),
          display_order: def.displayOrder,
          settings_json: settingsPayload[def.code] || {},
          monitoring_definitions: {
            id: def.id,
            code: def.code,
            translation_key: def.translationKey,
            description_translation_key: def.descriptionTranslationKey,
            field_type: def.fieldType,
            dependency_code: def.dependencyCode || null,
            allows_reminder: !!def.allowsReminder,
            allows_attachment: !!def.allowsAttachment,
            category_id: cat.id,
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      settings: synthesizedSettings,
      enabledCodes,
    });
  } catch (error: any) {
    console.error('Error in GET /api/monitoring/settings:', error);
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
      .select('organization_id, full_name')
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

    // Auto-resolve any missing prerequisite dependencies seamlessly
    const finalEnabledCodes = autoResolveDependencies(enabledCodes);

    const now = new Date().toISOString();

    // 1. Fetch current organization settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .single();

    const currentOrgSettings = (org?.settings as any) || {};
    const monitoringMap = { ...(currentOrgSettings.monitoring || {}) };
    const prevPersonSettings = monitoringMap[caredPersonId] || null;

    monitoringMap[caredPersonId] = {
      enabled_codes: finalEnabledCodes,
      settings_payload: settingsPayload || {},
      updated_at: now,
      configured_by: user.id,
    };

    const updatedOrgSettings = {
      ...currentOrgSettings,
      monitoring: monitoringMap,
    };

    // 2. Persist in organizations.settings in Supabase
    const { error: updateErr } = await supabase
      .from('organizations')
      .update({
        settings: updatedOrgSettings,
        updated_at: now,
      })
      .eq('id', person.organization_id);

    if (updateErr) {
      console.error('Error updating organization settings in Supabase:', updateErr);
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 3. Log to audit_logs in Supabase (safe insert)
    try {
      await supabase.from('audit_logs').insert({
        organization_id: person.organization_id,
        user_id: user.id,
        action: 'monitoring_settings_updated',
        table_name: 'organizations',
        record_id: person.organization_id,
        old_data: prevPersonSettings || {},
        new_data: { cared_person_id: caredPersonId, enabled_codes: finalEnabledCodes },
      });
    } catch (auditErr) {
      console.warn('Audit log note:', auditErr);
    }

    // 4. Try updating dedicated table cared_person_monitoring_settings if available
    try {
      const adminSupabase = createAdminClient();
      const { data: dbDefinitions } = await adminSupabase
        .from('monitoring_definitions')
        .select('id, code');

      if (dbDefinitions && dbDefinitions.length > 0) {
        const defMap = new Map<string, string>();
        dbDefinitions.forEach((d: any) => defMap.set(d.code, d.id));

        const enabledSet = new Set(finalEnabledCodes);
        const upsertRows: any[] = [];

        defMap.forEach((defId, code) => {
          const isEnabled = enabledSet.has(code);
          upsertRows.push({
            organization_id: person.organization_id,
            cared_person_id: caredPersonId,
            monitoring_definition_id: defId,
            enabled: isEnabled,
            enabled_at: isEnabled ? now : null,
            disabled_at: !isEnabled ? now : null,
            configured_by: user.id,
            settings_json: settingsPayload?.[code] || {},
            updated_at: now,
          });
        });

        if (upsertRows.length > 0) {
          await adminSupabase
            .from('cared_person_monitoring_settings')
            .upsert(upsertRows, { onConflict: 'cared_person_id,monitoring_definition_id' });
        }
      }
    } catch (_) {
      // Ignored if table doesn't exist
    }

    return NextResponse.json({
      success: true,
      message: 'Configuração de acompanhamento atualizada com sucesso!',
      totalConfigured: enabledCodes.length,
    });
  } catch (error: any) {
    console.error('Error in POST /api/monitoring/settings:', error);
    return NextResponse.json({ error: error?.message || 'Erro ao salvar configurações.' }, { status: 500 });
  }
}
