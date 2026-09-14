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

    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let orgSettings = (org?.settings as any) || {};
    if (!orgSettings.financial_profiles && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = createAdminClient();
        const { data: adminOrg } = await adminSupabase
          .from('organizations')
          .select('settings')
          .eq('id', person.organization_id)
          .maybeSingle();
        if (adminOrg?.settings) orgSettings = adminOrg.settings as any;
      } catch (_) {}
    }

    const profile = orgSettings.financial_profiles?.[caredPersonId] || {
      monthly_income: 0,
      income_source: 'Aposentadoria INSS',
      income_day: 5,
      currency: 'BRL',
      notes: '',
    };

    return NextResponse.json({ success: true, profile });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error?.message || 'Erro ao buscar perfil financeiro.' }, { status: 500 });
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
    const { caredPersonId, monthly_income, income_source, income_day, currency, notes } = body;

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

    // 1. Fetch current settings using authenticated client
    const { data: org } = await supabase
      .from('organizations')
      .select('settings')
      .eq('id', person.organization_id)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentSettings = (org?.settings as any) || {};

    if (!org?.settings && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = createAdminClient();
        const { data: adminOrg } = await adminSupabase
          .from('organizations')
          .select('settings')
          .eq('id', person.organization_id)
          .maybeSingle();
        if (adminOrg?.settings) currentSettings = adminOrg.settings;
      } catch (_) {}
    }

    const currentProfiles = { ...(currentSettings.financial_profiles || {}) };

    const parsedIncome = typeof monthly_income === 'string'
      ? parseFloat(monthly_income.replace(/\./g, '').replace(',', '.')) || 0
      : Number(monthly_income) || 0;

    const newProfile = {
      monthly_income: Math.max(0, parsedIncome),
      income_source: (income_source || 'Aposentadoria INSS').trim(),
      income_day: Math.min(31, Math.max(1, Number(income_day) || 5)),
      currency: currency || 'BRL',
      notes: (notes || '').trim(),
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    };

    currentProfiles[caredPersonId] = newProfile;

    const updatedSettings = {
      ...currentSettings,
      financial_profiles: currentProfiles,
    };

    // 2. Persist in organizations.settings using authenticated client
    let { error: updateErr } = await supabase
      .from('organizations')
      .update({
        settings: updatedSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', person.organization_id);

    // Fallback: If service role key is configured and user update failed, try admin client
    if (updateErr && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const adminSupabase = createAdminClient();
        const { error: adminErr } = await adminSupabase
          .from('organizations')
          .update({
            settings: updatedSettings,
            updated_at: new Date().toISOString(),
          })
          .eq('id', person.organization_id);
        if (!adminErr) {
          updateErr = null;
        }
      } catch (_) {}
    }

    if (updateErr) {
      console.error('[Finances Profile] Update error:', updateErr);
      return NextResponse.json({ error: updateErr.message || 'Erro ao salvar renda no banco de dados.' }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile: newProfile });
  } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
    return NextResponse.json({ error: error?.message || 'Erro ao salvar perfil financeiro.' }, { status: 500 });
  }
}
