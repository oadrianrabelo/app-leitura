import Dexie, { type EntityTable } from "dexie";
import type { Book, BookFile, Cover, Reading } from "./types";

export class SepiaDB extends Dexie {
  books!: EntityTable<Book, "id">;
  readings!: EntityTable<Reading, "id">;
  files!: EntityTable<BookFile, "id">;
  covers!: EntityTable<Cover, "bookId">;

  constructor() {
    super("sepia");
    this.version(1).stores({
      books: "id, status, updatedAt, deletedAt, fileHash, isbn, *authors",
      readings: "id, bookId, state, finishedAt, updatedAt, deletedAt",
      files: "id, bookId",
      covers: "bookId",
    });
  }
}

export const db = new SepiaDB();

// Pede ao navegador para não apagar os dados sob pressão de espaço.
navigator.storage?.persist?.().catch(() => {});

export const now = () => Date.now();
export const uuid = () => crypto.randomUUID();
