import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { dayKey } from "../../db/streak";

export interface Trecho {
  text: string;
  book: string;
  chapter: string | null;
}

/**
 * O começo de uma página marcada vem cortado no meio da frase: pula até a primeira
 * frase inteira e termina no fim de uma frase, para ler como uma citação.
 */
export function cleanExcerpt(raw: string): string | null {
  let s = raw.replace(/\s+/g, " ").trim();
  if (s.length < 40) return null;
  // começa numa frase nova, se a página começou no meio de uma
  if (!/^[A-ZÀ-Ú“"—–-]/.test(s)) {
    const m = s.slice(0, 160).match(/[.!?…]["”»]?\s+(?=[A-ZÀ-Ú“"—–-])/);
    if (m && m.index !== undefined) s = s.slice(m.index + m[0].length);
  }
  if (s.length <= 240) return s;
  const cut = s.slice(0, 260);
  const end = Math.max(...[".", "!", "?", "…"].map((p) => cut.lastIndexOf(p)));
  return end > 80 ? cut.slice(0, end + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

/** Um trecho marcado por dia, sempre o mesmo durante o dia */
export function useTrecho(): Trecho | null | undefined {
  return useLiveQuery(async () => {
    const marks = (await db.bookmarks.toArray()).filter((b) => !b.deletedAt && b.excerpt);
    const usable = marks.flatMap((m) => {
      const text = cleanExcerpt(m.excerpt);
      return text ? [{ m, text }] : [];
    });
    if (!usable.length) return null;
    let h = 0;
    for (const c of dayKey(Date.now())) h = (h * 31 + c.charCodeAt(0)) | 0;
    const pick = usable[Math.abs(h) % usable.length];
    const book = await db.books.get(pick.m.bookId);
    if (!book || book.deletedAt) return null;
    return { text: pick.text, book: book.title, chapter: pick.m.chapter };
  });
}
