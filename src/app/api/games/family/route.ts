import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

function getSupabase() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
}

// GET /api/games/family?cared_person_id=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const caredPersonId = searchParams.get('cared_person_id');

    if (!caredPersonId) {
      return NextResponse.json({ error: 'cared_person_id é obrigatório' }, { status: 400 });
    }

    const { data: memories, error } = await (supabase as any)
      .from('family_game_content')
      .select('*')
      .eq('cared_person_id', caredPersonId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ items: memories || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, items: [] }, { status: 500 });
  }
}

// POST /api/games/family — add a new family memory/photo
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const {
      cared_person_id,
      organization_id,
      content_type = 'photo',
      title,
      description,
      person_names,
      relationship,
      year,
      place,
      media_url,
    } = body;

    if (!title || !cared_person_id) {
      return NextResponse.json({ error: 'title e cared_person_id são obrigatórios' }, { status: 400 });
    }

    let orgId = organization_id;
    if (!orgId) {
      const { data: person } = await (supabase as any)
        .from('cared_people')
        .select('organization_id')
        .eq('id', cared_person_id)
        .maybeSingle();
      orgId = person?.organization_id;
    }

    const { data: inserted, error } = await (supabase as any)
      .from('family_game_content')
      .insert({
        organization_id: orgId,
        cared_person_id,
        content_type,
        title,
        description,
        person_names: Array.isArray(person_names) ? person_names : [person_names].filter(Boolean),
        relationship,
        year: year ? parseInt(year, 10) : null,
        place,
        media_url,
        is_approved: true,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item: inserted });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
