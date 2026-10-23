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

// GET /api/games/progress?cared_person_id=xxx
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const caredPersonId = searchParams.get('cared_person_id');

    if (!caredPersonId) {
      return NextResponse.json({ error: 'cared_person_id é obrigatório' }, { status: 400 });
    }

    // 1. Game progress per game
    const { data: progressRows } = await (supabase as any)
      .from('game_progress')
      .select('*')
      .eq('cared_person_id', caredPersonId);

    // 2. Unlocked achievements
    const { data: userAchievements } = await (supabase as any)
      .from('user_game_achievements')
      .select('achievement_id, unlocked_at, game_achievements(*)')
      .eq('cared_person_id', caredPersonId)
      .order('unlocked_at', { ascending: false });

    // 3. All achievements catalog
    const { data: allAchievements } = await (supabase as any)
      .from('game_achievements')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    // 4. Recent sessions
    const { data: recentSessions } = await (supabase as any)
      .from('game_sessions')
      .select('*')
      .eq('cared_person_id', caredPersonId)
      .order('started_at', { ascending: false })
      .limit(50);

    // Calculate aggregated metrics
    const progressList = progressRows || [];
    const totalStars = progressList.reduce((acc: number, p: any) => acc + (p.total_stars || 0), 0);
    const totalCompleted = progressList.reduce((acc: number, p: any) => acc + (p.total_completed || 0), 0);
    const totalSessions = progressList.reduce((acc: number, p: any) => acc + (p.total_sessions || 0), 0);
    const totalTime = progressList.reduce((acc: number, p: any) => acc + (p.total_time_seconds || 0), 0);
    const gamesTried = progressList.filter((p: any) => p.total_sessions > 0).length;

    // Calculate streak and active days
    const sessionsList = recentSessions || [];
    const playedDateStrings: string[] = Array.from(
      new Set<string>(
        sessionsList
          .filter((s: any) => s.started_at)
          .map((s: any) => s.started_at.slice(0, 10))
      )
    ).sort().reverse();

    const activeDays = playedDateStrings.length;

    let streak = 0;
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

    if (playedDateStrings.length > 0 && (playedDateStrings[0] === today || playedDateStrings[0] === yesterday)) {
      streak = 1;
      for (let i = 1; i < playedDateStrings.length; i++) {
        const prev = new Date(playedDateStrings[i - 1]);
        const curr = new Date(playedDateStrings[i]);
        const diffDays = Math.round((prev.getTime() - curr.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          streak++;
        } else {
          break;
        }
      }
    }

    return NextResponse.json({
      progress: progressList,
      stats: {
        totalStars,
        totalCompleted,
        totalSessions,
        totalTime,
        activeDays,
        streak,
        gamesTried,
      },
      achievements: {
        unlocked: userAchievements || [],
        all: allAchievements || [],
      },
      recentSessions: sessionsList,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/games/progress/favorite — toggle favorite
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();
    const { cared_person_id, game_id, is_favorite } = body;

    if (!cared_person_id || !game_id) {
      return NextResponse.json({ error: 'cared_person_id e game_id são obrigatórios' }, { status: 400 });
    }

    const { data, error } = await (supabase as any)
      .from('game_progress')
      .update({ is_favorite, updated_at: new Date().toISOString() })
      .eq('cared_person_id', cared_person_id)
      .eq('game_id', game_id)
      .select()
      .maybeSingle();

    if (error) {
      // If no progress record exists yet, insert one
      const { data: newRow } = await (supabase as any)
        .from('game_progress')
        .insert({
          cared_person_id,
          game_id,
          is_favorite,
          current_level: 1,
          max_level_reached: 1,
          total_stars: 0,
          total_sessions: 0,
          total_completed: 0,
          total_time_seconds: 0,
          best_score: 0,
        })
        .select()
        .single();
      return NextResponse.json({ success: true, progress: newRow });
    }

    return NextResponse.json({ success: true, progress: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
