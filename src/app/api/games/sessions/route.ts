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

// GET /api/games/sessions?cared_person_id=xxx&game_id=xxx&limit=20
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const caredPersonId = searchParams.get('cared_person_id');
    const gameId = searchParams.get('game_id');
    const limit = parseInt(searchParams.get('limit') || '30', 10);

    if (!caredPersonId) {
      return NextResponse.json({ error: 'cared_person_id é obrigatório' }, { status: 400 });
    }

    let query = (supabase as any)
      .from('game_sessions')
      .select('*')
      .eq('cared_person_id', caredPersonId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (gameId && gameId !== 'all') {
      query = query.eq('game_id', gameId);
    }

    const { data: sessions, error } = await query;
    if (error) {
      return NextResponse.json({ sessions: [] });
    }

    return NextResponse.json({ sessions: sessions || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, sessions: [] }, { status: 500 });
  }
}

// POST /api/games/sessions
// Body: { id?, game_id, cared_person_id, organization_id, level_number, difficulty, status, stars, score, moves, hints_used, errors, duration_seconds, game_state, is_daily_challenge }
export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const body = await req.json();

    const {
      id,
      game_id,
      cared_person_id,
      organization_id,
      level_number = 1,
      difficulty = 'iniciante',
      status = 'started',
      stars = 0,
      score = 0,
      moves = 0,
      hints_used = 0,
      errors = 0,
      duration_seconds = 0,
      game_state = null,
      is_daily_challenge = false,
      is_multiplayer = false,
      partner_user_id = null,
    } = body;

    if (!game_id || !cared_person_id) {
      return NextResponse.json({ error: 'game_id e cared_person_id são obrigatórios' }, { status: 400 });
    }

    // Resolve organization_id if missing
    let orgId = organization_id;
    if (!orgId) {
      const { data: person } = await (supabase as any)
        .from('cared_people')
        .select('organization_id')
        .eq('id', cared_person_id)
        .maybeSingle();
      orgId = person?.organization_id;
    }

    const nowIso = new Date().toISOString();

    if (id) {
      // Update session
      const updatePayload: any = {
        status,
        stars,
        score,
        moves,
        hints_used,
        errors,
        duration_seconds,
        game_state,
        updated_at: nowIso,
      };

      if (status === 'completed') {
        updatePayload.completed_at = nowIso;
      }

      const { data: updatedSession, error: updateErr } = await (supabase as any)
        .from('game_sessions')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();

      if (updateErr) {
        console.warn('[game_sessions update error]', updateErr);
      }

      // If finished, record progress
      if (status === 'completed' && orgId) {
        await recordGameCompletion(supabase, {
          game_id,
          cared_person_id,
          organization_id: orgId,
          level_number,
          stars,
          score,
          duration_seconds,
          hints_used,
        });
      }

      return NextResponse.json({ session: updatedSession || body });
    } else {
      // Insert new session
      const insertPayload: any = {
        game_id,
        cared_person_id,
        organization_id: orgId || '00000000-0000-0000-0000-000000000000',
        level_number,
        difficulty,
        status,
        stars,
        score,
        moves,
        hints_used,
        errors,
        duration_seconds,
        is_daily_challenge,
        is_multiplayer,
        partner_user_id,
        game_state,
        started_at: nowIso,
      };

      if (status === 'completed') {
        insertPayload.completed_at = nowIso;
      }

      const { data: newSession, error: insertErr } = await (supabase as any)
        .from('game_sessions')
        .insert(insertPayload)
        .select()
        .single();

      if (insertErr) {
        console.warn('[game_sessions insert error]', insertErr);
      }

      if (status === 'completed' && orgId) {
        await recordGameCompletion(supabase, {
          game_id,
          cared_person_id,
          organization_id: orgId,
          level_number,
          stars,
          score,
          duration_seconds,
          hints_used,
        });
      }

      return NextResponse.json({ session: newSession || { ...insertPayload, id: 'temp-' + Date.now() } });
    }
  } catch (err: any) {
    console.error('[POST /api/games/sessions]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

async function recordGameCompletion(
  supabase: any,
  params: {
    game_id: string;
    cared_person_id: string;
    organization_id: string;
    level_number: number;
    stars: number;
    score: number;
    duration_seconds?: number;
    hints_used?: number;
  }
) {
  const { game_id, cared_person_id, organization_id, level_number, stars, score, duration_seconds = 0, hints_used = 0 } = params;
  const nowIso = new Date().toISOString();

  try {
    // 1. Level progress upsert
    await supabase.from('game_level_progress').upsert(
      {
        game_id,
        cared_person_id,
        organization_id,
        level_number,
        stars,
        best_score: score,
        best_time_seconds: duration_seconds,
        completed_at: nowIso,
      },
      { onConflict: 'game_id,cared_person_id,level_number' }
    );

    // 2. Cumulative progress per game
    const { data: existingProgress } = await supabase
      .from('game_progress')
      .select('*')
      .eq('game_id', game_id)
      .eq('cared_person_id', cared_person_id)
      .maybeSingle();

    if (existingProgress) {
      await supabase
        .from('game_progress')
        .update({
          current_level: Math.max(existingProgress.current_level, level_number + 1),
          max_level_reached: Math.max(existingProgress.max_level_reached, level_number),
          total_stars: (existingProgress.total_stars || 0) + stars,
          total_sessions: (existingProgress.total_sessions || 0) + 1,
          total_completed: (existingProgress.total_completed || 0) + 1,
          total_time_seconds: (existingProgress.total_time_seconds || 0) + duration_seconds,
          best_score: Math.max(existingProgress.best_score || 0, score),
          last_played_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', existingProgress.id);
    } else {
      await supabase.from('game_progress').insert({
        game_id,
        cared_person_id,
        organization_id,
        current_level: level_number + 1,
        max_level_reached: level_number,
        total_stars: stars,
        total_sessions: 1,
        total_completed: 1,
        total_time_seconds: duration_seconds,
        best_score: score,
        best_time_seconds: duration_seconds,
        is_favorite: false,
        last_played_at: nowIso,
      });
    }

    // 3. Check for achievements to unlock
    const { data: allUserSessions } = await supabase
      .from('game_sessions')
      .select('id, game_id, stars, hints_used, status, started_at')
      .eq('cared_person_id', cared_person_id)
      .eq('status', 'completed');

    const completedCount = allUserSessions?.length || 1;
    const uniqueGames = new Set(allUserSessions?.map((s: any) => s.game_id) || []).size;
    const noHintsCount = allUserSessions?.filter((s: any) => s.hints_used === 0).length || 0;
    const threeStarsCount = allUserSessions?.filter((s: any) => s.stars === 3).length || 0;

    const achievementsToUnlock: string[] = [];

    achievementsToUnlock.push('first_session');
    if (completedCount >= 1) achievementsToUnlock.push('first_complete');
    if (completedCount >= 5) achievementsToUnlock.push('five_complete');
    if (completedCount >= 20) achievementsToUnlock.push('twenty_complete');
    if (completedCount >= 50) achievementsToUnlock.push('fifty_complete');
    if (uniqueGames >= 5) achievementsToUnlock.push('five_games');
    if (noHintsCount >= 1 && hints_used === 0) achievementsToUnlock.push('no_hints');
    if (threeStarsCount >= 1 && stars === 3) achievementsToUnlock.push('perfect_score');

    if (game_id === 'sudoku') achievementsToUnlock.push('sudoku_master');
    if (game_id === 'caca_palavras') achievementsToUnlock.push('word_hunter');
    if (game_id === 'memoria') achievementsToUnlock.push('memory_champ');
    if (game_id === 'descubra_palavra') achievementsToUnlock.push('word_master');

    for (const achId of achievementsToUnlock) {
      await supabase
        .from('user_game_achievements')
        .insert({
          achievement_id: achId,
          cared_person_id,
          organization_id,
          unlocked_at: nowIso,
        })
        .catch(() => {});
    }
  } catch (err) {
    console.warn('[recordGameCompletion error]', err);
  }
}
