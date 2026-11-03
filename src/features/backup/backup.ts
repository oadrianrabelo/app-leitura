import { invoke } from "@tauri-apps/api/core";
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from "fflate";
import { db, uuid } from "../../db/db";
import { invalidateCover } from "../../db/hooks";
import type { Book } from "../../db/types";
import { platform } from "../../lib/platform";
import { newerRemote, SNAPSHOT_VERSION, type Snapshot } from "../sync/merge";

/**
 * Backup manual: um .zip com tudo o que importa (dados.json + capas, e opcionalmente
 * os arquivos dos livros). Restaurar mescla registro a registro, como a sincronização:
 * nada que exista aqui e seja mais novo é sobrescrito.
 */

const byId = (r: { id: string }) => r.id;
const byBook = (r: { bookId: string }) => r.bookId;
const byDay = (r: { day: string }) => r.day;

const stamp = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const EXT: Record<string, string> = { "application/epub+zip": "epub", "application/pdf": "pdf", "application/x-mobipocket-ebook": "mobi" };

export async function buildBackup(withFiles: boolean): Promise<{ name: string; bytes: Uint8Array; books: number }> {
  const books = await db.books.toArray();
  const snapshot: Snapshot = {
    version: SNAPSHOT_VERSION,
    exportedAt: Date.now(),
    device: "backup",
    books: books.map(({ fileId: _f, ...b }) => b),
    readings: await db.readings.toArray(),
    bookmarks: await db.bookmarks.toArray(),
    sessions: await db.sessions.toArray(),
    positions: await db.positions.toArray(),
    visits: await db.visits.toArray(),
  };
  const zip: Zippable = { "dados.json": strToU8(JSON.stringify(snapshot)) };
  for (const cover of await db.covers.toArray()) {
    // jpg já é comprimido: guarda sem comprimir de novo (mais rápido)
    zip[`capas/${cover.bookId}.jpg`] = [new Uint8Array(await cover.blob.arrayBuffer()), { level: 0 }];
  }
  if (withFiles) {
    for (const book of books) {
      if (book.deletedAt || !book.fileId || !book.fileHash) continue;
      const file = await db.files.get(book.fileId);
      if (!file) continue;
      const ext = file.name.split(".").pop() || EXT[file.type] || "bin";
      zip[`livros/${book.fileHash}.${ext}`] = [new Uint8Array(await file.blob.arrayBuffer()), { level: 0 }];
    }
  }
  return { name: `sepia-backup-${stamp()}.zip`, bytes: zipSync(zip, { level: 6 }), books: books.filter((b) => !b.deletedAt).length };
}

/** Grava o backup onde a leitora escolher (Android) ou na pasta Downloads (computador) */
export async function saveBackup(name: string, bytes: Uint8Array): Promise<string | null> {
  if (platform === "android" || platform === "desktop") {
    const staged = await invoke<string>("backup_stage", bytes, { headers: { "x-name": name } });
    return invoke<string | null>("backup_save", { path: staged, name });
  }
  // pré-visualização no navegador: download comum
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/zip" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return name;
}

export interface RestoreResult {
  books: number;
  readings: number;
  covers: number;
  files: number;
}

/** Restaura um backup (.zip do Sépia ou só o dados.json), mesclando com o que já existe */
export async function restoreBackup(data: Uint8Array): Promise<RestoreResult> {
  let entries: Record<string, Uint8Array>;
  const isZip = data[0] === 0x50 && data[1] === 0x4b;
  if (isZip) entries = unzipSync(data);
  else entries = { "dados.json": data };
  const raw = entries["dados.json"];
  if (!raw) throw new Error("Esse arquivo não parece um backup do Sépia.");
  const snap = JSON.parse(strFromU8(raw)) as Snapshot;
  if (!Array.isArray(snap.books)) throw new Error("Esse arquivo não parece um backup do Sépia.");
  if (snap.version > SNAPSHOT_VERSION) throw new Error("Esse backup é de uma versão mais nova do Sépia. Atualize o app e tente de novo.");

  const local = {
    books: await db.books.toArray(),
    readings: await db.readings.toArray(),
    bookmarks: await db.bookmarks.toArray(),
    sessions: await db.sessions.toArray(),
    positions: await db.positions.toArray(),
    visits: await db.visits.toArray(),
  };
  const mine = new Map(local.books.map((b) => [b.id, b]));
  const books = newerRemote(local.books as Omit<Book, "fileId">[], snap.books, byId).map(
    (b) => ({ ...b, fileId: mine.get(b.id)?.fileId ?? null, hasCover: mine.get(b.id)?.hasCover ?? false }) as Book,
  );
  const readings = newerRemote(local.readings, snap.readings, byId);
  await db.transaction("rw", [db.books, db.readings, db.bookmarks, db.sessions, db.positions, db.visits], async () => {
    await db.books.bulkPut(books);
    await db.readings.bulkPut(readings);
    await db.bookmarks.bulkPut(newerRemote(local.bookmarks, snap.bookmarks ?? [], byId));
    await db.sessions.bulkPut(newerRemote(local.sessions, snap.sessions ?? [], byId));
    await db.positions.bulkPut(newerRemote(local.positions, snap.positions ?? [], byBook));
    await db.visits.bulkPut(newerRemote(local.visits, snap.visits ?? [], byDay));
  });

  // Capas e arquivos que faltam aqui
  let covers = 0;
  let files = 0;
  const all = await db.books.toArray();
  for (const book of all) {
    if (book.deletedAt) continue;
    const cover = entries[`capas/${book.id}.jpg`];
    if (cover && !(await db.covers.get(book.id))) {
      await db.covers.put({ bookId: book.id, blob: new Blob([cover as BlobPart], { type: "image/jpeg" }), updatedAt: Date.now() });
      invalidateCover(book.id);
      await db.books.update(book.id, { hasCover: true });
      covers++;
    }
    if (book.fileHash && !book.fileId) {
      const key = Object.keys(entries).find((k) => k.startsWith(`livros/${book.fileHash}.`));
      if (key) {
        const ext = key.split(".").pop()!;
        const type = Object.entries(EXT).find(([, e]) => e === ext)?.[0] ?? "application/octet-stream";
        const id = uuid();
        const blob = new Blob([entries[key] as BlobPart], { type });
        await db.files.add({ id, bookId: book.id, name: `${book.title}.${ext}`, size: blob.size, type, blob });
        await db.books.update(book.id, { fileId: id });
        files++;
      }
    }
  }
  return { books: books.length, readings: readings.length, covers, files };
}
