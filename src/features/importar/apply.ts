import { create } from "zustand";
import { db } from "../../db/db";
import { addBook, addReading, setCover } from "../../db/books";
import type { Book } from "../../db/types";
import { processCover } from "../import/image";
import { normalizeIsbn } from "../import/metadata";
import { findCovers } from "../physical/lookup";
import type { ImportedBook, ParsedImport } from "./formats";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
/** Título sem subtítulo nem série: "Duna (Duna, #1)" e "Duna: edição especial" viram "duna" */
const titleKey = (t: string) => norm(t.replace(/\(.*?\)/g, "").split(/[:–—]/)[0]);
const surname = (authors: string[]) => norm(authors[0] ?? "").split(" ").pop() ?? "";
const keyOf = (title: string, authors: string[]) => `${titleKey(title)}|${surname(authors)}`;

/** "Memórias Póstumas" e "Memórias Póstumas de Brás Cubas", do mesmo autor, são o mesmo livro */
function looseMatch(books: Book[], title: string, authors: string[]): Book | undefined {
  const t = titleKey(title);
  const who = surname(authors);
  if (t.length < 6) return undefined;
  const hits = books.filter((b) => {
    if (who && surname(b.authors) !== who) return false;
    const o = titleKey(b.title);
    return o.length >= 6 && (o.startsWith(t) || t.startsWith(o));
  });
  // só aceita quando não há dúvida
  return hits.length === 1 ? hits[0] : undefined;
}
const sameDay = (a: number | null, b: number | null) => !!a && !!b && Math.abs(a - b) < 36 * 3600 * 1000;

export interface ImportPlan {
  fresh: ImportedBook[];
  /** Já estão na estante: só entram leituras que faltam */
  known: { book: Book; imported: ImportedBook }[];
}

/** Separa o que é novo do que já existe (pelo ISBN ou por título + sobrenome do autor) */
export async function planImport(parsed: ParsedImport): Promise<ImportPlan> {
  const books = (await db.books.toArray()).filter((b) => !b.deletedAt);
  const byIsbn = new Map(books.filter((b) => b.isbn).map((b) => [normalizeIsbn(b.isbn)!, b]));
  const byKey = new Map(books.map((b) => [keyOf(b.title, b.authors), b]));
  const plan: ImportPlan = { fresh: [], known: [] };
  const seen = new Set<string>();
  for (const imported of parsed.books) {
    const key = keyOf(imported.title, imported.authors);
    if (seen.has(key)) continue; // repetido dentro do próprio arquivo
    seen.add(key);
    const existing = (imported.isbn && byIsbn.get(imported.isbn)) || byKey.get(key) || looseMatch(books, imported.title, imported.authors);
    if (existing) plan.known.push({ book: existing, imported });
    else plan.fresh.push(imported);
  }
  return plan;
}

interface ImportProgress {
  phase: "idle" | "books" | "covers" | "done";
  done: number;
  total: number;
  added: number;
  readingsAdded: number;
  coversFound: number;
}

export const useImportProgress = create<ImportProgress>()(() => ({
  phase: "idle",
  done: 0,
  total: 0,
  added: 0,
  readingsAdded: 0,
  coversFound: 0,
}));

async function addReadings(bookId: string, imported: ImportedBook, existing: { finishedAt: number | null; state: string }[], onlyFinished = false) {
  let n = 0;
  for (const r of imported.readings) {
    // livro que já estava na estante: o estado de agora vale mais que o do arquivo
    if (onlyFinished && r.state !== "concluida") continue;
    // já registrada (mesmo dia de término, ou uma leitura em andamento que já existe)
    if (r.finishedAt && existing.some((e) => sameDay(e.finishedAt, r.finishedAt))) continue;
    if (r.state === "lendo" && existing.some((e) => e.state === "lendo")) continue;
    if (!r.finishedAt && r.state === "concluida" && existing.filter((e) => e.state === "concluida").length >= imported.readings.filter((x) => x.state === "concluida").length) continue;
    await addReading(bookId, {
      state: r.state,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      approximate: r.approximate,
      rating: r.rating,
      notes: r.notes,
      medium: "fisico",
    });
    existing.push({ finishedAt: r.finishedAt, state: r.state });
    n++;
  }
  return n;
}

/**
 * Grava o plano: livros novos com suas leituras e, nos que já existiam, só as leituras
 * que faltam. Depois procura as capas em segundo plano (pode sair da tela).
 */
export async function runImport(plan: ImportPlan, withCovers: boolean) {
  const set = useImportProgress.setState;
  const total = plan.fresh.length + plan.known.length;
  set({ phase: "books", done: 0, total, added: 0, readingsAdded: 0, coversFound: 0 });
  const created: { id: string; isbn: string | null; title: string; authors: string[] }[] = [];

  for (const imported of plan.fresh) {
    const book = await addBook({
      title: imported.title,
      authors: imported.authors,
      format: "fisico",
      status: imported.status === "abandonado" ? "abandonado" : "quero-ler",
      pageCount: imported.pageCount,
      pageCountEstimated: false,
      isbn: imported.isbn,
      publisher: imported.publisher,
      year: imported.year,
      language: null,
      description: null,
      subjects: [],
      fileId: null,
      fileHash: null,
    });
    const n = await addReadings(book.id, imported, []);
    created.push({ id: book.id, isbn: book.isbn, title: book.title, authors: book.authors });
    set((s) => ({ done: s.done + 1, added: s.added + 1, readingsAdded: s.readingsAdded + n }));
  }

  for (const { book, imported } of plan.known) {
    const existing = (await db.readings.where("bookId").equals(book.id).toArray()).filter((r) => !r.deletedAt);
    const n = await addReadings(book.id, imported, existing, true);
    set((s) => ({ done: s.done + 1, readingsAdded: s.readingsAdded + n }));
  }

  if (!withCovers || !created.length) return set({ phase: "done" });
  set({ phase: "covers", done: 0, total: created.length });
  // poucas por vez, para não sobrecarregar os catálogos
  const queue = [...created];
  const worker = async () => {
    for (let b = queue.shift(); b; b = queue.shift()) {
      try {
        const [best] = await findCovers(b);
        const processed = best && (await processCover(best.blob));
        if (processed) {
          await setCover(b.id, processed.blob, processed.tint);
          set((s) => ({ coversFound: s.coversFound + 1 }));
        }
      } catch {
        // sem capa: fica a capa desenhada
      }
      set((s) => ({ done: s.done + 1 }));
    }
  };
  await Promise.all([worker(), worker(), worker()]);
  set({ phase: "done" });
}
