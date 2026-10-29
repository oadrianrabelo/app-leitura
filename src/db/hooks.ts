import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { liveBooks, liveReadings } from "./books";
import type { Book, Reading } from "./types";

export function useBooks(): Book[] | undefined {
  return useLiveQuery(() => liveBooks().toArray(), []);
}

export function useBook(id: string | null): Book | undefined {
  return useLiveQuery(async () => {
    if (!id) return undefined;
    const book = await db.books.get(id);
    return book && book.deletedAt === null ? book : undefined;
  }, [id]);
}

export function useReadings(bookId?: string | null): Reading[] | undefined {
  return useLiveQuery(async () => {
    if (bookId === null) return [];
    const list = await liveReadings(bookId ?? undefined).toArray();
    return list.sort((a, b) => (b.finishedAt ?? b.startedAt ?? b.createdAt) - (a.finishedAt ?? a.startedAt ?? a.createdAt));
  }, [bookId]);
}

/** URL de objeto para a capa, liberada quando o componente sai da tela. */
export function useCoverUrl(bookId: string, hasCover: boolean, version?: number): string | null {
  const blob = useLiveQuery(
    async () => (hasCover ? ((await db.covers.get(bookId))?.blob ?? null) : null),
    [bookId, hasCover, version],
  );
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}
