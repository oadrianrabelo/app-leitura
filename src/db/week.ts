import { useLiveQuery } from "dexie-react-hooks";
import { db, now } from "./db";
import { dayKey } from "./streak";

/** Marca o dia de hoje como visitado (uma vez por dia). */
export async function recordVisit() {
  const day = dayKey(Date.now());
  if (!(await db.visits.get(day))) await db.visits.put({ day, updatedAt: now() });
}

export type DayState = "read" | "visited" | "missed" | "future";

export interface WeekDay {
  day: string;
  letter: string;
  isToday: boolean;
  state: DayState;
}

const LETTERS = ["D", "S", "T", "Q", "Q", "S", "S"];

export interface WeekInfo {
  days: WeekDay[];
  /** Dias seguidos abrindo o app, até hoje */
  visitStreak: number;
}

/** A semana atual (domingo a sábado): leu, só abriu, faltou ou ainda não chegou. */
export function useWeek(): WeekInfo | undefined {
  return useLiveQuery(async () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - today.getDay());
    const visits = new Set((await db.visits.toArray()).map((v) => v.day));
    const readDays = new Set(
      (await db.sessions.filter((s) => s.deletedAt === null && s.pages > 0).toArray()).map((s) => s.day),
    );
    const todayKey = dayKey(today.getTime());

    const days: WeekDay[] = LETTERS.map((letter, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      const key = dayKey(d.getTime());
      const state: DayState = key > todayKey ? "future" : readDays.has(key) ? "read" : visits.has(key) ? "visited" : "missed";
      return { day: key, letter, isToday: key === todayKey, state };
    });

    let visitStreak = 0;
    const cursor = new Date(today);
    while (visits.has(dayKey(cursor.getTime())) || readDays.has(dayKey(cursor.getTime()))) {
      visitStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return { days, visitStreak };
  }, []);
}
