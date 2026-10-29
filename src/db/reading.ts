import { useLiveQuery } from "dexie-react-hooks";
import { db, now, uuid } from "./db";
import { addReading, updateReading } from "./books";
import type { Bookmark, Session } from "./types";

import { computeStreak, dayKey } from "./streak";

export { dayKey };

export async function savePosition(bookId: string, location: string, fraction: number) {
  await db.positions.put({ bookId, location, fraction, updatedAt: now() });
}

export function getPosition(bookId: string) {
  return db.positions.get(bookId);
}

export function usePosition(bookId: string | null) {
  return useLiveQuery(() => (bookId ? db.positions.get(bookId) : undefined), [bookId]);
}

/** Leitura em andamento do livro; cria uma se ainda não houver (abrir e ler = começar). */
export async function ensureActiveReading(bookId: string): Promise<string> {
  const active = await db.readings
    .where("bookId")
    .equals(bookId)
    .filter((r) => r.deletedAt === null && r.state === "lendo")
    .first();
  if (active) return active.id;
  return (await addReading(bookId, { state: "lendo", medium: "digital" })).id;
}

export async function setReadingProgress(readingId: string, progress: number) {
  await db.readings.update(readingId, { progress, updatedAt: now() });
}

export async function finishReading(readingId: string, rating: number | null, notes: string) {
  await updateReading(readingId, { state: "concluida", finishedAt: now(), rating, notes, progress: 1 });
}

// ——— Marcadores ———

export function useBookmarks(bookId: string | null) {
  return useLiveQuery(async () => {
    if (!bookId) return [];
    const list = await db.bookmarks.where("bookId").equals(bookId).filter((b) => b.deletedAt === null).toArray();
    return list.sort((a, b) => a.fraction - b.fraction);
  }, [bookId]);
}

export async function addBookmark(data: Pick<Bookmark, "bookId" | "location" | "fraction" | "excerpt" | "chapter">) {
  const t = now();
  await db.bookmarks.add({ ...data, id: uuid(), createdAt: t, updatedAt: t, deletedAt: null, style: "fita" });
}

export async function removeBookmark(id: string) {
  const t = now();
  await db.bookmarks.update(id, { deletedAt: t, updatedAt: t });
}

// ——— Sessões ———

export async function saveSession(session: Session) {
  await db.sessions.put(session);
}

export function newSession(bookId: string, readingId: string | null, fraction: number): Session {
  const t = now();
  return {
    id: uuid(),
    createdAt: t,
    updatedAt: t,
    deletedAt: null,
    bookId,
    readingId,
    startedAt: t,
    endedAt: t,
    day: dayKey(t),
    pages: 0,
    seconds: 0,
    startFraction: fraction,
    endFraction: fraction,
  };
}

export interface RhythmStats {
  pagesToday: number;
  minutesToday: number;
  streak: number;
  readToday: boolean;
}

export function useRhythm(): RhythmStats | undefined {
  return useLiveQuery(async () => {
    const sessions = await db.sessions.filter((s) => s.deletedAt === null && s.pages > 0).toArray();
    const today = dayKey(Date.now());
    const days = new Set(sessions.map((s) => s.day));
    let pagesToday = 0;
    let secondsToday = 0;
    for (const s of sessions) {
      if (s.day === today) {
        pagesToday += s.pages;
        secondsToday += s.seconds;
      }
    }
    return { pagesToday, minutesToday: Math.round(secondsToday / 60), streak: computeStreak(days), readToday: days.has(today) };
  }, []);
}

