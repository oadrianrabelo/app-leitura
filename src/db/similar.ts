import type { Book } from "./types";
import { normalizeIsbn } from "../features/import/metadata";

/**
 * "É o mesmo livro?" — usado para não duplicar na importação e para sugerir juntar
 * dois registros (ex.: um da busca, outro do arquivo EPUB).
 */
const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Título sem subtítulo nem série: "Duna (Duna, #1)" e "Duna: edição especial" viram "duna" */
export const titleKey = (t: string) => norm(t.replace(/\(.*?\)/g, "").split(/[:–—]/)[0]);
export const surname = (authors: string[]) => norm(authors[0] ?? "").split(" ").pop() ?? "";
export const keyOf = (title: string, authors: string[]) => `${titleKey(title)}|${surname(authors)}`;

/** "Memórias Póstumas" e "Memórias Póstumas de Brás Cubas", do mesmo autor, são o mesmo livro */
export function looseMatch(books: Book[], title: string, authors: string[]): Book | undefined {
  const t = titleKey(title);
  const who = surname(authors);
  if (t.length < 6) return undefined;
  const hits = books.filter((b) => {
    if (who && surname(b.authors) && surname(b.authors) !== who) return false;
    const o = titleKey(b.title);
    return o.length >= 6 && (o.startsWith(t) || t.startsWith(o));
  });
  // só aceita quando não há dúvida
  return hits.length === 1 ? hits[0] : undefined;
}

/** Outro livro da estante que parece ser o mesmo (ISBN igual, ou título e autor) */
export function findSimilar(book: Book, books: Book[]): Book | undefined {
  const others = books.filter((b) => b.id !== book.id && !b.deletedAt);
  const isbn = normalizeIsbn(book.isbn);
  if (isbn) {
    const same = others.find((b) => normalizeIsbn(b.isbn) === isbn);
    if (same) return same;
  }
  const key = keyOf(book.title, book.authors);
  return others.find((b) => keyOf(b.title, b.authors) === key) ?? looseMatch(others, book.title, book.authors);
}
