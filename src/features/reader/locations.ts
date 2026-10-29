import { compare } from "foliate-js/epubcfi.js";

const pageOf = (loc: string) => (loc.startsWith("page:") ? Number(loc.slice(5)) : null);

/** O marcador `mark` está na página que vai de `start` a `end`? */
export function compareLocations(mark: string, start: string, end?: string): boolean {
  const pm = pageOf(mark);
  const ps = pageOf(start);
  if (pm !== null || ps !== null) return pm === ps;
  try {
    if (compare(mark, start) < 0) return false;
    return end ? compare(mark, end) <= 0 : compare(mark, start) === 0;
  } catch {
    return mark === start;
  }
}
