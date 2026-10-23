import { GameSession, OverallStats, GameProgress } from '@/types/games';

const OFFLINE_SESSIONS_QUEUE = 'parentcare_offline_game_sessions_v1';
const LOCAL_PROGRESS_CACHE = 'parentcare_game_progress_cache_v1';
const LOCAL_FAVORITES_KEY = 'parentcare_game_favorites_v1';

export function saveOfflineSession(session: Partial<GameSession>) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(OFFLINE_SESSIONS_QUEUE);
    const queue: Partial<GameSession>[] = raw ? JSON.parse(raw) : [];
    queue.push({
      ...session,
      id: session.id || 'offline-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
    });
    localStorage.setItem(OFFLINE_SESSIONS_QUEUE, JSON.stringify(queue.slice(-50)));
  } catch {}
}

export function getOfflineSessionsQueue(): Partial<GameSession>[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(OFFLINE_SESSIONS_QUEUE);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function clearOfflineSession(id: string) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(OFFLINE_SESSIONS_QUEUE);
    if (!raw) return;
    const queue: Partial<GameSession>[] = JSON.parse(raw);
    const filtered = queue.filter(s => s.id !== id);
    localStorage.setItem(OFFLINE_SESSIONS_QUEUE, JSON.stringify(filtered));
  } catch {}
}

export async function flushOfflineSessionsQueue() {
  if (typeof window === 'undefined' || !navigator.onLine) return;
  const queue = getOfflineSessionsQueue();
  if (queue.length === 0) return;

  for (const session of queue) {
    try {
      const res = await fetch('/api/games/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      });
      if (res.ok && session.id) {
        clearOfflineSession(session.id);
      }
    } catch {
      break;
    }
  }
}

export function getLocalProgressCache(caredPersonId: string): { progress: GameProgress[]; stats: OverallStats } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${LOCAL_PROGRESS_CACHE}_${caredPersonId}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setLocalProgressCache(caredPersonId: string, data: { progress: GameProgress[]; stats: OverallStats }) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${LOCAL_PROGRESS_CACHE}_${caredPersonId}`, JSON.stringify(data));
  } catch {}
}

export function getLocalFavorites(caredPersonId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_FAVORITES_KEY}_${caredPersonId}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function toggleLocalFavorite(caredPersonId: string, gameId: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const favs = getLocalFavorites(caredPersonId);
    let next: string[];
    let isFav = false;
    if (favs.includes(gameId)) {
      next = favs.filter(g => g !== gameId);
      isFav = false;
    } else {
      next = [...favs, gameId];
      isFav = true;
    }
    localStorage.setItem(`${LOCAL_FAVORITES_KEY}_${caredPersonId}`, JSON.stringify(next));
    return isFav;
  } catch {
    return false;
  }
}
