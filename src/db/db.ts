import Dexie, { type EntityTable } from "dexie";
import type { Book, BookFile, Bookmark, Cover, Position, Reading, Session, Visit } from "./types";

export class SepiaDB extends Dexie {
  books!: EntityTable<Book, "id">;
  readings!: EntityTable<Reading, "id">;
  files!: EntityTable<BookFile, "id">;
  covers!: EntityTable<Cover, "bookId">;
  positions!: EntityTable<Position, "bookId">;
  bookmarks!: EntityTable<Bookmark, "id">;
  sessions!: EntityTable<Session, "id">;
  visits!: EntityTable<Visit, "day">;

  constructor() {
    super("sepia");
    this.version(1).stores({
      books: "id, status, updatedAt, deletedAt, fileHash, isbn, *authors",
      readings: "id, bookId, state, finishedAt, updatedAt, deletedAt",
      files: "id, bookId",
      covers: "bookId",
    });
    this.version(2).stores({
      positions: "bookId, updatedAt",
      bookmarks: "id, bookId, updatedAt, deletedAt",
      sessions: "id, bookId, day, updatedAt, deletedAt",
    });
    this.version(3).stores({
      visits: "day, updatedAt",
    });
  }
}

export const db = new SepiaDB();

// Pede ao navegador para não apagar os dados sob pressão de espaço.
navigator.storage?.persist?.().catch(() => {});

export const now = () => Date.now();
export const uuid = () => crypto.randomUUID();
