import { useRef } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { useReaderUi } from "../reader/state";
import { evaluate, type Summary } from "./achievements";

/**
 * Conquistas, recordes e livros terminados, sempre atualizados com o banco.
 * Com um livro aberto fica pausado no último resultado: a sessão é gravada a cada
 * 20 segundos e recalcular tudo por trás do leitor só gastava bateria.
 */
export function useConquistas(): Summary | undefined {
  const reading = useReaderUi((s) => !!s.bookId);
  const last = useRef<Summary | undefined>(undefined);
  const fresh = useLiveQuery(async () => {
    if (reading) return undefined;
    const [books, readings, sessions, bookmarks, visits] = await Promise.all([
      db.books.toArray(),
      db.readings.toArray(),
      db.sessions.toArray(),
      db.bookmarks.toArray(),
      db.visits.toArray(),
    ]);
    return evaluate({ books, readings, sessions, bookmarks, visits });
  }, [reading]);
  if (fresh) last.current = fresh;
  return last.current;
}
