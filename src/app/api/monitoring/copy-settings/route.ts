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

    const adminSupabase = createAdminClient();

    // Fetch source settings
    const { data: sourceSettings } = await adminSupabase
      .from('cared_person_monitoring_settings')
      .select('*')
      .eq('cared_person_id', sourceCaredPersonId);

    if (!sourceSettings || sourceSettings.length === 0) {
      return NextResponse.json({ error: 'O familiar de origem ainda não possui configurações salvas.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const rowsToUpsert = sourceSettings.map((s: any) => ({
      organization_id: targetPerson.organization_id,
      cared_person_id: targetCaredPersonId,
      monitoring_definition_id: s.monitoring_definition_id,
      enabled: s.enabled,
      enabled_at: s.enabled ? now : s.enabled_at,
      disabled_at: s.enabled ? null : now,
      configured_by: user.id,
      settings_json: s.settings_json,
      display_order: s.display_order,
      updated_at: now,
    }));

    const { error: upsertErr } = await adminSupabase
      .from('cared_person_monitoring_settings')
      .upsert(rowsToUpsert, { onConflict: 'cared_person_id, monitoring_definition_id' });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    // Audit log
    await adminSupabase.from('monitoring_configuration_audit').insert({
      organization_id: targetPerson.organization_id,
      cared_person_id: targetCaredPersonId,
      action: 'copy_configuration',
      previous_value: { copiedFrom: sourceCaredPersonId },
      new_value: { totalModulesCopied: rowsToUpsert.length },
      performed_by: user.id,
      created_at: now,
    });

    return NextResponse.json({
      success: true,
      message: `Configurações de ${sourcePerson.full_name} copiadas para ${targetPerson.full_name} com sucesso!`,
      copiedCount: rowsToUpsert.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao copiar configurações.' }, { status: 500 });
  }
}
