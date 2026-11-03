/**
 * Reconhece exportações de outros apps (Goodreads, StoryGraph) ou uma planilha qualquer
 * e transforma cada linha num livro com suas leituras.
 */
import type { BookStatus } from "../../db/types";
import { normalizeIsbn } from "../import/metadata";
import { parseCsv, toRecords } from "./csv";

export interface ImportedReading {
  state: "concluida" | "lendo" | "abandonada";
  startedAt: number | null;
  finishedAt: number | null;
  /** Só se sabe o ano (ou nem isso) */
  approximate: boolean;
  rating: number | null;
  notes: string;
}

export interface ImportedBook {
  title: string;
  authors: string[];
  isbn: string | null;
  pageCount: number | null;
  publisher: string | null;
  year: number | null;
  status: BookStatus;
  readings: ImportedReading[];
}

export type SourceName = "goodreads" | "storygraph" | "planilha";

export interface ParsedImport {
  source: SourceName;
  books: ImportedBook[];
  /** Linhas ignoradas (sem título) */
  skipped: number;
}

const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

/** Datas como 2023/05/14, 2023-05-14, 14/05/2023 ou só o ano */
export function parseDate(raw: string | undefined): { at: number | null; approximate: boolean } {
  const s = (raw ?? "").trim();
  if (!s) return { at: null, approximate: true };
  let m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (m) return { at: new Date(+m[1], +m[2] - 1, +m[3], 12).getTime(), approximate: false };
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) return { at: new Date(+m[3], +m[2] - 1, +m[1], 12).getTime(), approximate: false };
  m = s.match(/^(\d{4})[/-](\d{1,2})$/);
  if (m) return { at: new Date(+m[1], +m[2] - 1, 15, 12).getTime(), approximate: true };
  m = s.match(/^(\d{4})$/);
  if (m) return { at: new Date(+m[1], 6, 1, 12).getTime(), approximate: true };
  const t = Date.parse(s);
  return Number.isNaN(t) ? { at: null, approximate: true } : { at: t, approximate: false };
}

const int = (s: string | undefined) => {
  const n = parseInt((s ?? "").replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Goodreads guarda ISBN como ="9788535914849" para o Excel não estragar */
const isbnOf = (...values: (string | undefined)[]) => {
  for (const v of values) {
    const n = normalizeIsbn((v ?? "").replace(/[="]/g, ""));
    if (n) return n;
  }
  return null;
};

const rating = (s: string | undefined) => {
  const n = parseFloat((s ?? "").replace(",", "."));
  return n > 0 ? Math.min(5, Math.round(n * 2) / 2) : null;
};

const splitAuthors = (...values: (string | undefined)[]) =>
  values
    .flatMap((v) => (v ?? "").split(/\s*[,;&]\s*|\s+e\s+/))
    .map((a) => a.trim())
    .filter(Boolean)
    .filter((a, i, all) => all.indexOf(a) === i);

const cleanReview = (s: string | undefined) => (s ?? "").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").trim();

/** Palavras de status em inglês e português */
function statusFrom(raw: string, hasDate: boolean): BookStatus {
  const s = strip(raw);
  if (/(currently|reading|lendo|leitura atual)/.test(s)) return "lendo";
  if (/(to-read|to read|want|quero|desejo|lista|para ler)/.test(s)) return "quero-ler";
  if (/(did-not-finish|dnf|abandon|parei|desist)/.test(s)) return "abandonado";
  if (/(^read$|^lido|^lida|conclu|termin|read)/.test(s)) return "lido";
  return hasDate ? "lido" : "quero-ler";
}

function readingsFor(status: BookStatus, done: { at: number | null; approximate: boolean }[], extra: Partial<ImportedReading>, count = 1): ImportedReading[] {
  const base = { startedAt: null, rating: null, notes: "", ...extra };
  // nota e resenha ficam só na leitura mais recente
  const plain = { ...base, rating: null, notes: "" };
  if (status === "lido") {
    const dates = done.length ? done : [{ at: null, approximate: true }];
    const list: ImportedReading[] = dates.map((d, i) => ({
      ...(i === dates.length - 1 ? base : plain),
      state: "concluida" as const,
      finishedAt: d.at,
      approximate: d.approximate,
    }));
    // releituras sem data (o Goodreads só guarda a última)
    for (let i = list.length; i < count; i++) list.unshift({ ...plain, state: "concluida", finishedAt: null, approximate: true });
    return list;
  }
  if (status === "lendo") return [{ ...base, state: "lendo", finishedAt: null, approximate: false }];
  if (status === "abandonado") return [{ ...base, state: "abandonada", finishedAt: done[0]?.at ?? null, approximate: true }];
  return [];
}

function fromGoodreads(r: Record<string, string>): ImportedBook | null {
  const title = r["Title"];
  if (!title) return null;
  const done = parseDate(r["Date Read"]);
  const status = statusFrom(r["Exclusive Shelf"] || "", !!done.at);
  return {
    title,
    authors: splitAuthors(r["Author"], r["Additional Authors"]),
    isbn: isbnOf(r["ISBN13"], r["ISBN"]),
    pageCount: int(r["Number of Pages"]),
    publisher: r["Publisher"] || null,
    year: int(r["Original Publication Year"]) ?? int(r["Year Published"]),
    status,
    readings: readingsFor(status, done.at ? [done] : [], { rating: rating(r["My Rating"]), notes: cleanReview(r["My Review"]) }, int(r["Read Count"]) ?? 1),
  };
}

function fromStoryGraph(r: Record<string, string>): ImportedBook | null {
  const title = r["Title"];
  if (!title) return null;
  // "2023/01/05-2023/01/20, 2024/02/01-2024/02/10": cada intervalo é uma leitura
  const ranges = (r["Dates Read"] || "")
    .split(/,\s*/)
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => {
      const [a, b] = x.split(/\s*-\s*(?=\d{4})/);
      return { start: parseDate(b ? a : undefined), end: parseDate(b ?? a) };
    });
  const last = parseDate(r["Last Date Read"]);
  const status = statusFrom(r["Read Status"] || "", ranges.length > 0 || !!last.at);
  const extra = { rating: rating(r["Star Rating"]), notes: cleanReview(r["Review"]) };
  let readings = readingsFor(status, ranges.length ? ranges.map((x) => x.end) : last.at ? [last] : [], extra, int(r["Read Count"]) ?? 1);
  if (status === "lido" && ranges.length) {
    readings = readings.map((rd, i) => ({ ...rd, startedAt: ranges[i]?.start.at ?? null }));
  }
  return {
    title,
    authors: splitAuthors(r["Authors"]),
    isbn: isbnOf(r["ISBN/UID"]),
    pageCount: null,
    publisher: null,
    year: null,
    status,
    readings,
  };
}

/** Planilha qualquer: acha as colunas pelo nome, em português ou inglês */
const COLUMNS: Record<string, RegExp> = {
  title: /^(titulo|title|livro|nome|obra)/,
  authors: /^(autor|autora|autores|author|escritor)/,
  isbn: /isbn/,
  pages: /(pagina|pages|paginas)/,
  status: /^(status|estado|situacao|shelf|estante|lista)/,
  date: /(data|date|terminei|lido em|concluido|fim|quando)/,
  rating: /(nota|rating|avaliacao|estrela|stars)/,
  publisher: /(editora|publisher)/,
  year: /^(ano|year)/,
  notes: /(resenha|review|comentario|observ|anotac)/,
};

function fromSpreadsheet(headers: string[]) {
  const find = (key: string) => headers.find((h) => COLUMNS[key].test(strip(h)) && !(key === "date" && /adicion|added/.test(strip(h))));
  const col = Object.fromEntries(Object.keys(COLUMNS).map((k) => [k, find(k)]));
  return (r: Record<string, string>): ImportedBook | null => {
    const title = col.title && r[col.title];
    if (!title) return null;
    const done = parseDate(col.date && r[col.date]);
    const status = statusFrom((col.status && r[col.status]) || "", !!done.at);
    return {
      title,
      authors: splitAuthors(col.authors && r[col.authors]),
      isbn: isbnOf(col.isbn && r[col.isbn]),
      pageCount: int(col.pages && r[col.pages]),
      publisher: (col.publisher && r[col.publisher]) || null,
      year: int(col.year && r[col.year]),
      status,
      readings: readingsFor(status, done.at ? [done] : [], {
        rating: rating(col.rating && r[col.rating]),
        notes: (col.notes && r[col.notes]) || "",
      }),
    };
  };
}

export function parseImport(text: string): ParsedImport {
  const { headers, records } = toRecords(parseCsv(text));
  const has = (...names: string[]) => names.every((n) => headers.includes(n));
  let source: SourceName;
  let map: (r: Record<string, string>) => ImportedBook | null;
  if (has("Title", "Exclusive Shelf")) {
    source = "goodreads";
    map = fromGoodreads;
  } else if (has("Title", "Read Status")) {
    source = "storygraph";
    map = fromStoryGraph;
  } else {
    source = "planilha";
    map = fromSpreadsheet(headers);
  }
  const books: ImportedBook[] = [];
  let skipped = 0;
  for (const r of records) {
    const b = map(r);
    if (b) books.push(b);
    else skipped++;
  }
  return { source, books, skipped };
}
