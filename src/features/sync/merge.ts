import type { Book, Bookmark, Position, Reading, Session, Visit } from "../../db/types";

export const SNAPSHOT_VERSION = 1;

/** O que vai para o Drive. Arquivos e capas viajam separados; `fileId` é local de cada aparelho. */
export interface Snapshot {
  version: number;
  exportedAt: number;
  device: string;
  books: Omit<Book, "fileId">[];
  readings: Reading[];
  bookmarks: Bookmark[];
  sessions: Session[];
  positions: Position[];
  /** Opcional: snapshots de versões antigas não têm */
  visits?: Visit[];
}

interface Stamped {
  updatedAt: number;
}

/**
 * Último a escrever vence, registro a registro. Devolve só o que precisa ser
 * gravado localmente (vindo do remoto e mais novo que o local).
 */
export function newerRemote<T extends Stamped>(local: T[], remote: T[], key: (r: T) => string): T[] {
  const byKey = new Map(local.map((r) => [key(r), r]));
  return remote.filter((r) => {
    const mine = byKey.get(key(r));
    return !mine || r.updatedAt > mine.updatedAt;
  });
}

/** Precisa enviar? Algum registro local é mais novo (ou não existe) no remoto. */
export function hasNewerLocal<T extends Stamped>(local: T[], remote: T[], key: (r: T) => string): boolean {
  const byKey = new Map(remote.map((r) => [key(r), r]));
  return local.some((r) => {
    const theirs = byKey.get(key(r));
    return !theirs || r.updatedAt > theirs.updatedAt;
  });
}

export const byId = (r: { id: string }) => r.id;
export const byBook = (r: { bookId: string }) => r.bookId;
export const byDay = (r: { day: string }) => r.day;

export function emptySnapshot(device: string): Snapshot {
  return { version: SNAPSHOT_VERSION, exportedAt: 0, device, books: [], readings: [], bookmarks: [], sessions: [], positions: [], visits: [] };
}

