import { db, now, uuid } from "./db";
import { invalidateCover } from "./hooks";
import type { Book, BookStatus, Reading, ReadingState } from "./types";

export type NewBook = Omit<Book, "id" | "createdAt" | "updatedAt" | "deletedAt" | "hasCover" | "favorite" | "tint"> &
  Partial<Pick<Book, "favorite" | "tint">>;

export async function addBook(data: NewBook, cover?: Blob | null): Promise<Book> {
  const t = now();
  const book: Book = {
    favorite: false,
    tint: null,
    ...data,
    id: uuid(),
    createdAt: t,
    updatedAt: t,
    deletedAt: null,
    hasCover: !!cover,
  };
  await db.transaction("rw", db.books, db.covers, async () => {
    await db.books.add(book);
    if (cover) await db.covers.put({ bookId: book.id, blob: cover, updatedAt: t });
  });
  return book;
}

export async function updateBook(id: string, changes: Partial<Book>) {
  await db.books.update(id, { ...changes, updatedAt: now() });
}

export async function setCover(bookId: string, blob: Blob, tint: string | null) {
  const t = now();
  invalidateCover(bookId);
  await db.transaction("rw", db.books, db.covers, async () => {
    await db.covers.put({ bookId, blob, updatedAt: t });
    await db.books.update(bookId, { hasCover: true, tint, updatedAt: t });
  });
}

export async function deleteBook(id: string) {
  const t = now();
  await db.transaction("rw", [db.books, db.readings, db.files, db.covers], async () => {
    await db.books.update(id, { deletedAt: t, updatedAt: t });
    await db.readings.where("bookId").equals(id).modify({ deletedAt: t, updatedAt: t });
    await db.files.where("bookId").equals(id).delete();
    await db.covers.delete(id);
  });
  invalidateCover(id);
}

/** Livros visíveis (não excluídos). */
export function liveBooks() {
  return db.books.filter((b) => b.deletedAt === null);
}

export function liveReadings(bookId?: string) {
  const base = bookId ? db.readings.where("bookId").equals(bookId) : db.readings.toCollection();
  return base.filter((r) => r.deletedAt === null);
}

/** Status do livro derivado das leituras: a leitura mais recente manda. */
function statusFrom(readings: Reading[], fallback: BookStatus): BookStatus {
  const active = readings.find((r) => r.state === "lendo");
  if (active) return "lendo";
  if (readings.some((r) => r.state === "concluida")) return "lido";
  if (readings.some((r) => r.state === "abandonada")) return "abandonado";
  return fallback === "lido" || fallback === "lendo" ? "quero-ler" : fallback;
}

async function refreshStatus(bookId: string) {
  const book = await db.books.get(bookId);
  if (!book) return;
  const readings = await liveReadings(bookId).toArray();
  const status = statusFrom(readings, book.status);
  if (status !== book.status) await updateBook(bookId, { status });
}

export interface ReadingInput {
  state: ReadingState;
  startedAt?: number | null;
  finishedAt?: number | null;
  approximate?: boolean;
  rating?: number | null;
  notes?: string;
  medium?: Reading["medium"];
}

export async function addReading(bookId: string, input: ReadingInput): Promise<Reading> {
  const t = now();
  const book = await db.books.get(bookId);
  const reading: Reading = {
    id: uuid(),
    createdAt: t,
    updatedAt: t,
    deletedAt: null,
    bookId,
    state: input.state,
    startedAt: input.startedAt ?? (input.state === "lendo" ? t : null),
    finishedAt: input.finishedAt ?? null,
    approximate: input.approximate ?? false,
    rating: input.rating ?? null,
    notes: input.notes ?? "",
    medium: input.medium ?? (book?.format === "fisico" ? "fisico" : "digital"),
    progress: input.state === "concluida" ? 1 : 0,
  };
  await db.readings.add(reading);
  await refreshStatus(bookId);
  return reading;
}

export async function updateReading(id: string, changes: Partial<Reading>) {
  const reading = await db.readings.get(id);
  if (!reading) return;
  const next = { ...changes, updatedAt: now() };
  if (changes.state === "concluida") next.progress = 1;
  await db.readings.update(id, next);
  await refreshStatus(reading.bookId);
}

export async function deleteReading(id: string) {
  const reading = await db.readings.get(id);
  if (!reading) return;
  const t = now();
  await db.readings.update(id, { deletedAt: t, updatedAt: t });
  await refreshStatus(reading.bookId);
}

/** Marca como "quero ler" sem leituras, ou muda o status inicial na importação. */
export async function setInitialStatus(bookId: string, status: BookStatus, finishedYear?: number | null) {
  if (status === "lido") {
    const finishedAt = finishedYear ? new Date(finishedYear, 6, 1).getTime() : null;
    await addReading(bookId, { state: "concluida", finishedAt, approximate: true });
  } else if (status === "lendo") {
    await addReading(bookId, { state: "lendo" });
  } else {
    await updateBook(bookId, { status });
  }
}

/**
 * Muda um livro de lugar na "Minha ordem". `order` é a ordem completa desejada (todos os
 * livros); só o livro movido é regravado, com um número entre os vizinhos. Se ainda não
 * existe ordem própria (ou os números ficaram apertados), grava a ordem inteira uma vez.
 */
export async function moveOnShelf(order: string[], movedId: string, prevId: string | null, nextId: string | null, reset = false) {
  await db.transaction("rw", db.books, async () => {
    const books = await db.books.bulkGet(order);
    const byId = new Map(books.filter(Boolean).map((b) => [b!.id, b!]));
    const val = (id: string | null) => (id ? (byId.get(id)?.shelfOrder ?? null) : null);
    const step = 1024;
    let prev = val(prevId);
    let next = val(nextId);
    const needsReset =
      reset ||
      order.some((id) => typeof byId.get(id)?.shelfOrder !== "number") ||
      (prev !== null && next !== null && Math.abs(next - prev) < 1e-6);
    const t = now();
    if (needsReset) {
      // a ordem desejada já tem o livro no lugar novo: basta numerar todos
      await Promise.all(order.map((id, i) => db.books.update(id, { shelfOrder: (i + 1) * step, updatedAt: t })));
      return;
    }
    if (prev === null && next === null) return;
    const value = prev === null ? next! - step : next === null ? prev + step : (prev + next) / 2;
    await db.books.update(movedId, { shelfOrder: value, updatedAt: t });
  });
}

/**
 * Junta dois registros do mesmo livro num só (`keepId` fica, `dropId` sai). Vêm junto:
 * arquivo, leituras (sem repetir a mesma data), sessões, marcadores, ponto de leitura e
 * as informações que faltavam. A capa fica a de `coverFrom`.
 */
export async function mergeBooks(keepId: string, dropId: string, coverFrom: string) {
  const t = now();
  await db.transaction("rw", [db.books, db.readings, db.sessions, db.bookmarks, db.positions, db.files, db.covers], async () => {
    const keep = await db.books.get(keepId);
    const drop = await db.books.get(dropId);
    if (!keep || !drop) return;

    // Informações: completa o que falta, sem trocar o que já existe
    const pick = <K extends keyof Book>(k: K) => (keep[k] === null || keep[k] === undefined || keep[k] === "" ? drop[k] : keep[k]);
    const changes: Partial<Book> = {
      isbn: pick("isbn"),
      publisher: pick("publisher"),
      year: pick("year"),
      language: pick("language"),
      description: pick("description"),
      subjects: [...new Set([...keep.subjects, ...drop.subjects])],
      favorite: keep.favorite || drop.favorite,
      // número de páginas da edição vale mais que a estimativa pelo texto
      pageCount: keep.pageCount && !keep.pageCountEstimated ? keep.pageCount : drop.pageCount && !drop.pageCountEstimated ? drop.pageCount : (keep.pageCount ?? drop.pageCount),
      pageCountEstimated: keep.pageCount && !keep.pageCountEstimated ? false : drop.pageCount && !drop.pageCountEstimated ? false : keep.pageCountEstimated,
      updatedAt: t,
    };
    // Arquivo do livro: se só o outro tem, passa para cá
    if (!keep.fileHash && drop.fileHash) {
      changes.fileHash = drop.fileHash;
      changes.fileId = drop.fileId;
      changes.format = drop.format;
      if (drop.fileId) await db.files.update(drop.fileId, { bookId: keepId });
    }
    // Capa escolhida
    if (coverFrom === dropId) {
      const cover = await db.covers.get(dropId);
      if (cover) {
        await db.covers.put({ bookId: keepId, blob: cover.blob, updatedAt: t });
        changes.hasCover = true;
        changes.tint = drop.tint;
      }
    }
    await db.books.update(keepId, changes);

    // Leituras: a do outro entra, a não ser que já exista uma terminada no mesmo dia
    const mine = (await db.readings.where("bookId").equals(keepId).toArray()).filter((r) => !r.deletedAt);
    const sameDay = (a: number | null, b: number | null) => !!a && !!b && Math.abs(a - b) < 36 * 3600 * 1000;
    for (const r of await db.readings.where("bookId").equals(dropId).toArray()) {
      if (r.deletedAt) continue;
      const dup =
        (r.finishedAt && mine.some((m) => sameDay(m.finishedAt, r.finishedAt))) ||
        (r.state === "lendo" && mine.some((m) => m.state === "lendo"));
      if (dup) await db.readings.update(r.id, { deletedAt: t, updatedAt: t });
      else await db.readings.update(r.id, { bookId: keepId, updatedAt: t });
    }
    await db.sessions.where("bookId").equals(dropId).modify({ bookId: keepId, updatedAt: t });
    await db.bookmarks.where("bookId").equals(dropId).modify({ bookId: keepId, updatedAt: t });
    const pos = await db.positions.get(dropId);
    if (pos) {
      if (!(await db.positions.get(keepId))) await db.positions.put({ ...pos, bookId: keepId, updatedAt: t });
      await db.positions.delete(dropId);
    }

    // O registro que sai: marcado como excluído (sincroniza) e sem capa/arquivo próprios
    await db.books.update(dropId, { deletedAt: t, updatedAt: t, fileId: null });
    await db.covers.delete(dropId);
  });
  invalidateCover(keepId);
  invalidateCover(dropId);
  await refreshStatus(keepId);
}
