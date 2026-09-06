import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { calculateDeterministicComparison, PATTERN_DISCLAIMER } from '@/lib/monitoring/pattern-detector';
import { PatternChangeInsight } from '@/types/monitoring';

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

    // 1. Get enabled modules for this person
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

    const orgSettings = (org?.settings as any) || {};
    const personConfig = orgSettings.monitoring?.[caredPersonId];
    let enabledCodeList: string[] = [];

    if (personConfig && Array.isArray(personConfig.enabled_codes)) {
      enabledCodeList = personConfig.enabled_codes;
    } else {
      try {
        const adminSupabase = createAdminClient();
        const { data: activeSettings } = await adminSupabase
          .from('cared_person_monitoring_settings')
          .select(`
            enabled,
            monitoring_definitions (
              code
            )
          `)
          .eq('cared_person_id', caredPersonId)
          .eq('enabled', true);

        if (activeSettings && activeSettings.length > 0) {
          enabledCodeList = activeSettings.map((s: any) => s.monitoring_definitions?.code).filter(Boolean);
        }
      } catch (_) {
        // Table not present
      }

      if (enabledCodeList.length === 0) {
        enabledCodeList = [
          'routine_hydration',
          'routine_meals',
          'safety_help_requests',
          'meds_scheduled',
          'meds_taken_confirmation',
        ];
      }
    }

    const enabledCodes = new Set(enabledCodeList);

    // Timestamps for two 7-day windows:
    // Window 1: 0 to 7 days ago
    // Window 2: 7 to 14 days ago
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const insights: PatternChangeInsight[] = [];

    // Check Hydration if enabled
    if (enabledCodes.has('routine_hydration')) {
      const { data: recentWater } = await adminSupabase
        .from('hydration_logs')
        .select('amount_ml, logged_at')
        .eq('cared_person_id', caredPersonId)
        .gte('logged_at', fourteenDaysAgo.toISOString());

      const currentWaterVals: number[] = [];
      const previousWaterVals: number[] = [];

      (recentWater || []).forEach((w: any) => {
        const d = new Date(w.logged_at);
        const glasses = Math.round((w.amount_ml || 250) / 250);
        if (d >= sevenDaysAgo) {
          currentWaterVals.push(glasses);
        } else {
          previousWaterVals.push(glasses);
        }
      });

      insights.push(
        calculateDeterministicComparison({
          moduleCode: 'routine_hydration',
          categoryCode: 'daily_routine',
          metricLabel: 'Copos de água registrados',
          unit: 'copos de água',
          currentWindowValues: currentWaterVals,
          previousWindowValues: previousWaterVals,
          minimumThreshold: 3,
        })
      );
    }

    // Check Meals if enabled
    if (enabledCodes.has('routine_meals')) {
      const { data: recentMeals } = await adminSupabase
        .from('meals')
        .select('consumed_at')
        .eq('cared_person_id', caredPersonId)
        .gte('consumed_at', fourteenDaysAgo.toISOString());

      const currentMeals: number[] = [];
      const previousMeals: number[] = [];

      (recentMeals || []).forEach((m: any) => {
        const d = new Date(m.consumed_at);
        if (d >= sevenDaysAgo) {
          currentMeals.push(1);
        } else {
          previousMeals.push(1);
        }
      });

      insights.push(
        calculateDeterministicComparison({
          moduleCode: 'routine_meals',
          categoryCode: 'daily_routine',
          metricLabel: 'Refeições registradas',
          unit: 'refeições',
          currentWindowValues: currentMeals,
          previousWindowValues: previousMeals,
          minimumThreshold: 3,
        })
      );
    }

    // Check Help Requests if enabled
    if (enabledCodes.has('safety_help_requests')) {
      const { data: recentHelp } = await adminSupabase
        .from('help_requests')
        .select('created_at')
        .eq('cared_person_id', caredPersonId)
        .gte('created_at', fourteenDaysAgo.toISOString());

      const currentHelp: number[] = [];
      const previousHelp: number[] = [];

      (recentHelp || []).forEach((h: any) => {
        const d = new Date(h.created_at);
        if (d >= sevenDaysAgo) {
          currentHelp.push(1);
        } else {
          previousHelp.push(1);
        }
      });

      insights.push(
        calculateDeterministicComparison({
          moduleCode: 'safety_help_requests',
          categoryCode: 'safety_incidents',
          metricLabel: 'Pedidos de ajuda',
          unit: 'pedidos de ajuda',
          currentWindowValues: currentHelp,
          previousWindowValues: previousHelp,
          minimumThreshold: 2,
        })
      );
    }

    // Check Medication Confirmations if enabled
    if (enabledCodes.has('meds_scheduled') || enabledCodes.has('meds_taken_confirmation')) {
      const { data: recentMeds } = await adminSupabase
        .from('medication_confirmations')
        .select('confirmed_at, status')
        .eq('cared_person_id', caredPersonId)
        .gte('confirmed_at', fourteenDaysAgo.toISOString());

      const currentTaken: number[] = [];
      const previousTaken: number[] = [];

      (recentMeds || []).forEach((mc: any) => {
        const d = new Date(mc.confirmed_at);
        if (mc.status === 'taken') {
          if (d >= sevenDaysAgo) {
            currentTaken.push(1);
          } else {
            previousTaken.push(1);
          }
        }
      });

      insights.push(
        calculateDeterministicComparison({
          moduleCode: 'meds_taken_confirmation',
          categoryCode: 'medications',
          metricLabel: 'Doses de medicação confirmadas',
          unit: 'doses tomadas',
          currentWindowValues: currentTaken,
          previousWindowValues: previousTaken,
          minimumThreshold: 3,
        })
      );
    }

    return NextResponse.json({
      success: true,
      caredPersonId,
      insights,
      disclaimer: PATTERN_DISCLAIMER,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Erro ao calcular mudanças de padrão.' }, { status: 500 });
  }
}
