import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/admin';
import { cookies } from 'next/headers';
import { recordAudit } from '@/lib/audit';

/**
 * GET /api/users/language
 * Returns the preferred language for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();
    const { data: profile } = await adminSupabase
      .from('users')
      .select('preferred_language, timezone')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      preferred_language: profile?.preferred_language ?? 'pt-BR',
      timezone: profile?.timezone ?? 'America/Sao_Paulo',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao buscar idioma.' }, { status: 500 });
  }
}

/**
 * PUT /api/users/language
 * Updates the preferred language for the authenticated user.
 * Also updates cared_people.preferred_language if the user is a cared_person.
 */
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { language, timezone, cared_person_id } = body;

    const VALID_LANGUAGES = ['pt-BR', 'en', 'en-GB', 'es', 'fr', 'de'];
    if (!language || !VALID_LANGUAGES.includes(language)) {
      return NextResponse.json(
        { error: `Idioma inválido. Idiomas suportados: ${VALID_LANGUAGES.join(', ')}` },
        { status: 400 }
      );
    }

    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // Get old language for audit
    const { data: oldProfile } = await adminSupabase
      .from('users')
      .select('preferred_language, timezone')
      .eq('id', user.id)
      .single();

    // Update users.preferred_language
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        preferred_language: language,
        ...(timezone ? { timezone } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // If user is a cared_person, also update their cared_people record
    if (cared_person_id) {
      // Verify this cared person belongs to the user
      const { data: cp } = await adminSupabase
        .from('cared_people')
        .select('id, organization_id')
        .eq('id', cared_person_id)
        .eq('user_id', user.id)
        .single();

      if (cp) {
        await adminSupabase
          .from('cared_people')
          .update({ preferred_language: language })
          .eq('id', cared_person_id);

        // Record audit
        if (cp.organization_id) {
          await recordAudit({
            organizationId: cp.organization_id,
            userId: user.id,
            caredPersonId: cared_person_id,
            moduleCode: 'rotina',
            action: 'update_language',
            tableName: 'users',
            recordId: user.id,
            oldData: { preferred_language: oldProfile?.preferred_language },
            newData: { preferred_language: language },
            description: `Idioma alterado para ${language}`,
            languageUsed: language,
          });
        }
      }
    }

    return NextResponse.json({ success: true, preferred_language: language });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'Erro ao salvar idioma.' }, { status: 500 });
  }
}
