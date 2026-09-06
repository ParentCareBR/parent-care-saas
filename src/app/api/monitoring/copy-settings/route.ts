import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const { sourceCaredPersonId, targetCaredPersonId } = await req.json();

    if (!sourceCaredPersonId || !targetCaredPersonId) {
      return NextResponse.json({ error: 'sourceCaredPersonId e targetCaredPersonId são obrigatórios.' }, { status: 400 });
    }

    if (sourceCaredPersonId === targetCaredPersonId) {
      return NextResponse.json({ error: 'Origem e destino não podem ser a mesma pessoa.' }, { status: 400 });
    }

    // Verify ownership/membership of both
    const { data: sourcePerson } = await supabase
      .from('cared_people')
      .select('organization_id, full_name')
      .eq('id', sourceCaredPersonId)
      .maybeSingle();

    const { data: targetPerson } = await supabase
      .from('cared_people')
      .select('organization_id, full_name')
      .eq('id', targetCaredPersonId)
      .maybeSingle();

    if (!sourcePerson || !targetPerson) {
      return NextResponse.json({ error: 'Pessoa cuidada não encontrada.' }, { status: 404 });
    }

    if (sourcePerson.organization_id !== targetPerson.organization_id) {
      return NextResponse.json({ error: 'Ambos os familiares devem pertencer à mesma família.' }, { status: 403 });
    }

    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', targetPerson.organization_id)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();

    if (!member || !['owner', 'admin', 'collaborator'].includes(member.role)) {
      return NextResponse.json({ error: 'Permissão insuficiente para alterar configurações.' }, { status: 403 });
    }

    const now = new Date().toISOString();

    // 1. Fetch organization settings
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', targetPerson.organization_id)
      .single();

    const currentOrgSettings = (org?.settings as any) || {};
    const monitoringMap = { ...(currentOrgSettings.monitoring || {}) };
    const sourceConfig = monitoringMap[sourceCaredPersonId];

    let enabledCodes: string[] = [];
    let settingsPayload: Record<string, any> = {};

    if (sourceConfig && Array.isArray(sourceConfig.enabled_codes)) {
      enabledCodes = sourceConfig.enabled_codes;
      settingsPayload = sourceConfig.settings_payload || {};
    } else {
      // Fallback baseline essentials
      enabledCodes = [
        'routine_meals',
        'routine_hydration',
        'meds_scheduled',
        'schedule_appointments',
        'safety_help_requests',
        'checkin_btn_im_well',
        'checkin_btn_need_help',
        'checkin_btn_took_med',
        'checkin_btn_ate',
        'checkin_btn_drank_water',
        'checkin_btn_emergency',
      ];
    }

    monitoringMap[targetCaredPersonId] = {
      enabled_codes: enabledCodes,
      settings_payload: settingsPayload,
      updated_at: now,
      configured_by: user.id,
      copied_from: sourceCaredPersonId,
    };

    const updatedOrgSettings = {
      ...currentOrgSettings,
      monitoring: monitoringMap,
    };

    const { error: updateErr } = await supabase
      .from('organizations')
      .update({
        settings: updatedOrgSettings,
        updated_at: now,
      })
      .eq('id', targetPerson.organization_id);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    // 2. Audit log
    try {
      await supabase.from('audit_logs').insert({
        organization_id: targetPerson.organization_id,
        user_id: user.id,
        action: 'monitoring_settings_copied',
        table_name: 'organizations',
        record_id: targetPerson.organization_id,
        old_data: { source: sourceCaredPersonId },
        new_data: { target: targetCaredPersonId, count: enabledCodes.length },
      });
    } catch (_) {}

    return NextResponse.json({
      success: true,
      message: `Configurações de ${sourcePerson.full_name} copiadas para ${targetPerson.full_name} com sucesso!`,
      copiedCount: enabledCodes.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao copiar configurações.' }, { status: 500 });
  }
}
