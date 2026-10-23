import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { GameCatalogItem } from '@/types/games';
import { STATIC_CATALOG } from '@/lib/games/catalog-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: dbCatalog } = await (supabase as any)
      .from('game_catalog')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (dbCatalog && dbCatalog.length > 0) {
      return NextResponse.json({ catalog: dbCatalog });
    }
  } catch {}

  // Fallback to static catalog if DB is offline or migrating
  return NextResponse.json({ catalog: STATIC_CATALOG });
}
