import { useLiveQuery } from "dexie-react-hooks";
import { liveReadings } from "./books";

export interface LibraryStats {
  /** Quantas vezes cada livro foi lido até o fim */
  timesRead: Map<string, number>;
  /** Último momento em que cada livro foi lido (para ordenar) */
  lastRead: Map<string, number>;
  booksRead: number;
  finishedThisYear: number;
  readingNow: string[];
}

export function useLibraryStats(): LibraryStats | undefined {
  return useLiveQuery(async () => {
    const readings = await liveReadings().toArray();
    const timesRead = new Map<string, number>();
    const lastRead = new Map<string, number>();
    const readingNow: string[] = [];
    const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
    let finishedThisYear = 0;
    for (const r of readings) {
      const when = r.finishedAt ?? r.startedAt ?? r.createdAt;
      lastRead.set(r.bookId, Math.max(lastRead.get(r.bookId) ?? 0, when));
      if (r.state === "concluida") {
        timesRead.set(r.bookId, (timesRead.get(r.bookId) ?? 0) + 1);
        if (r.finishedAt && r.finishedAt >= yearStart && !r.approximate) finishedThisYear++;
      }
      if (r.state === "lendo") readingNow.push(r.bookId);
    }
    return { timesRead, lastRead, booksRead: timesRead.size, finishedThisYear, readingNow };
  }, []);
}
