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

// Capas já carregadas ficam em memória: voltar à estante não as busca de novo
// (e não pisca a capa genérica antes da real).
const coverCache = new Map<string, string>();
const coverLoads = new Map<string, Promise<string | null>>();

function loadCover(bookId: string): Promise<string | null> {
  let pending = coverLoads.get(bookId);
  if (!pending) {
    pending = db.covers.get(bookId).then((c) => {
      if (!c) return null;
      const url = URL.createObjectURL(c.blob);
      coverCache.set(bookId, url);
      return url;
    });
    coverLoads.set(bookId, pending);
  }
  return pending;
}

/** Esquece a capa em memória (trocada pela leitora ou vinda da sincronização). */
export function invalidateCover(bookId: string) {
  const url = coverCache.get(bookId);
  if (url) URL.revokeObjectURL(url);
  coverCache.delete(bookId);
  coverLoads.delete(bookId);
}

/**
 * URL da capa. `undefined` enquanto carrega (mostrar um fundo neutro),
 * `null` quando o livro não tem capa (mostrar a capa gerada).
 */
export function useCoverUrl(bookId: string, hasCover: boolean): string | null | undefined {
  const [url, setUrl] = useState<string | null | undefined>(() => (hasCover ? coverCache.get(bookId) : null));
  useEffect(() => {
    if (!hasCover) {
      setUrl(null);
      return;
    }
    const cached = coverCache.get(bookId);
    if (cached) {
      setUrl(cached);
      return;
    }
    let alive = true;
    loadCover(bookId).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [bookId, hasCover]);
  return url;
}
