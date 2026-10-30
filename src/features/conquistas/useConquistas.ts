import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { evaluate, type Summary } from "./achievements";

/** Conquistas, recordes e livros terminados, sempre atualizados com o banco */
export function useConquistas(): Summary | undefined {
  return useLiveQuery(async () => {
    const [books, readings, sessions, bookmarks, visits] = await Promise.all([
      db.books.toArray(),
      db.readings.toArray(),
      db.sessions.toArray(),
      db.bookmarks.toArray(),
      db.visits.toArray(),
    ]);
    return evaluate({ books, readings, sessions, bookmarks, visits });
  });
}
