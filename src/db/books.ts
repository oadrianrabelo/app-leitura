import { db, now, uuid } from "./db";
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
