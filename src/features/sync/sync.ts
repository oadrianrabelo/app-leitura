import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { db, uuid } from "../../db/db";
import type { Book } from "../../db/types";
import { invalidateCover } from "../../db/hooks";
import { safeStorage } from "../../lib/storage";
import { AuthError, getAccessToken, signOut } from "./google";
import * as drive from "./drive";
import { byBook, byDay, byId, emptySnapshot, hasNewerLocal, newerRemote, SNAPSHOT_VERSION, type Snapshot } from "./merge";

const SNAPSHOT_NAME = "sepia-biblioteca.json";
const coverName = (bookId: string) => `capa-${bookId}.jpg`;
const fileName = (hash: string) => `livro-${hash}`;

export type SyncStatus = "off" | "idle" | "syncing" | "error";

interface SyncState {
  connected: boolean;
  email: string | null;
  lastSyncedAt: number | null;
  syncFiles: boolean;
  device: string;
  status: SyncStatus;
  detail: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  syncNow: (opts?: { quiet?: boolean }) => Promise<void>;
  setSyncFiles: (v: boolean) => void;
}

// Enquanto a sincronização grava no banco, as mudanças não marcam "pendente"
let applyingRemote = false;
let dirty = false;
let dirtyTimer: number | undefined;

export const useSync = create<SyncState>()(
  persist(
    (set, get) => ({
      connected: false,
      email: null,
      lastSyncedAt: null,
      syncFiles: true,
      device: uuid(),
      status: "off",
      detail: null,
      error: null,

      async connect() {
        set({ status: "syncing", detail: "Conectando…", error: null });
        try {
          await getAccessToken(true);
          const me = await drive.whoAmI();
          set({ connected: true, email: me.email, status: "idle", detail: null });
          await get().syncNow();
        } catch (e) {
          set({ status: get().connected ? "error" : "off", detail: null, error: e instanceof Error ? e.message : String(e) });
        }
      },

      async disconnect() {
        await signOut();
        set({ connected: false, email: null, lastSyncedAt: null, status: "off", error: null, detail: null });
      },

      async syncNow({ quiet = false } = {}) {
        const s = get();
        if (!s.connected || s.status === "syncing") return;
        set({ status: "syncing", detail: "Sincronizando…", error: null });
        try {
          await runSync(s.device, s.syncFiles, (detail) => set({ detail }));
          dirty = false;
          set({ status: "idle", detail: null, lastSyncedAt: Date.now() });
        } catch (e) {
          const message = e instanceof Error ? e.message : String(e);
          // Sem internet: tenta de novo depois, sem alarde
          const offline = /fetch|network|rede|failed|offline|timed out/i.test(message) && !(e instanceof AuthError);
          set({ status: offline && quiet ? "idle" : "error", detail: null, error: offline ? "Sem conexão. Tento de novo mais tarde." : message });
        }
      },

      setSyncFiles: (syncFiles) => set({ syncFiles }),
    }),
    {
      name: "sepia.sync",
      storage: createJSONStorage(() => ({ getItem: safeStorage.get, setItem: safeStorage.set, removeItem: () => {} })),
      partialize: (s) => ({ connected: s.connected, email: s.email, lastSyncedAt: s.lastSyncedAt, syncFiles: s.syncFiles, device: s.device }),
      onRehydrateStorage: () => (state) => {
        if (state) state.status = state.connected ? "idle" : "off";
      },
    },
  ),
);

async function runSync(device: string, syncFiles: boolean, progress: (d: string) => void) {
  progress("Lendo o Drive…");
  const files = await drive.listFiles();
  const snapshotFile = files.find((f) => f.name === SNAPSHOT_NAME);

  let remote: Snapshot = emptySnapshot(device);
  if (snapshotFile) {
    const parsed = JSON.parse(new TextDecoder().decode(await drive.download(snapshotFile.id))) as Snapshot;
    if (parsed.version > SNAPSHOT_VERSION) throw new Error("Atualize o Sépia neste aparelho para sincronizar.");
    remote = parsed;
  }

  // 1. Traz o que é mais novo no Drive
  progress("Juntando as bibliotecas…");
  const local = {
    books: await db.books.toArray(),
    readings: await db.readings.toArray(),
    bookmarks: await db.bookmarks.toArray(),
    sessions: await db.sessions.toArray(),
    positions: await db.positions.toArray(),
    visits: await db.visits.toArray(),
  };
  const localBooks = new Map(local.books.map((b) => [b.id, b]));
  applyingRemote = true;
  try {
    await db.transaction("rw", [db.books, db.readings, db.bookmarks, db.sessions, db.positions, db.visits], async () => {
      const books = newerRemote(local.books as Omit<Book, "fileId">[], remote.books, byId).map((b) => {
        const mine = localBooks.get(b.id);
        // Arquivo e capa são locais: só "tem capa" quando a capa já chegou aqui
        return { ...b, fileId: mine?.fileId ?? null, hasCover: mine?.hasCover ?? false } as Book;
      });
      await db.books.bulkPut(books);
      await db.readings.bulkPut(newerRemote(local.readings, remote.readings, byId));
      await db.bookmarks.bulkPut(newerRemote(local.bookmarks, remote.bookmarks, byId));
      await db.sessions.bulkPut(newerRemote(local.sessions, remote.sessions, byId));
      await db.positions.bulkPut(newerRemote(local.positions, remote.positions, byBook));
      await db.visits.bulkPut(newerRemote(local.visits, remote.visits ?? [], byDay));
    });
  } finally {
    applyingRemote = false;
  }

  // 2. Envia a versão juntada, se algo daqui for mais novo que o Drive
  const merged = {
    books: (await db.books.toArray()).map(({ fileId: _fileId, ...b }) => b),
    readings: await db.readings.toArray(),
    bookmarks: await db.bookmarks.toArray(),
    sessions: await db.sessions.toArray(),
    positions: await db.positions.toArray(),
    visits: await db.visits.toArray(),
  };
  const needsUpload =
    !snapshotFile ||
    hasNewerLocal(merged.books, remote.books, byId) ||
    hasNewerLocal(merged.readings, remote.readings, byId) ||
    hasNewerLocal(merged.bookmarks, remote.bookmarks, byId) ||
    hasNewerLocal(merged.sessions, remote.sessions, byId) ||
    hasNewerLocal(merged.positions, remote.positions, byBook) ||
    hasNewerLocal(merged.visits, remote.visits ?? [], byDay);
  if (needsUpload) {
    progress("Salvando no Drive…");
    const snapshot: Snapshot = { version: SNAPSHOT_VERSION, exportedAt: Date.now(), device, ...merged };
    await drive.upload(SNAPSHOT_NAME, new TextEncoder().encode(JSON.stringify(snapshot)), "application/json", { id: snapshotFile?.id });
  }

  // 3. Capas: envia as que faltam no Drive, baixa as que faltam aqui
  const remoteNames = new Map(files.map((f) => [f.name, f]));
  const liveBooks = (await db.books.toArray()).filter((b) => b.deletedAt === null);
  for (const book of liveBooks) {
    const name = coverName(book.id);
    const there = remoteNames.get(name);
    const here = await db.covers.get(book.id);
    if (here && !there) {
      progress(`Enviando capa de ${book.title}…`);
      await drive.upload(name, new Uint8Array(await here.blob.arrayBuffer()), "image/jpeg", { appProperties: { bookId: book.id } });
    } else if (!here && there) {
      progress(`Baixando capa de ${book.title}…`);
      const blob = new Blob([await drive.download(there.id)], { type: "image/jpeg" });
      applyingRemote = true;
      try {
        await db.covers.put({ bookId: book.id, blob, updatedAt: Date.now() });
        invalidateCover(book.id);
        await db.books.update(book.id, { hasCover: true });
      } finally {
        applyingRemote = false;
      }
    }
  }

  // 4. Arquivos dos livros: só envia. Baixar é sob demanda, ao abrir o livro.
  if (syncFiles) {
    for (const book of liveBooks) {
      if (!book.fileId || !book.fileHash || remoteNames.has(fileName(book.fileHash))) continue;
      const record = await db.files.get(book.fileId);
      if (!record) continue;
      progress(`Enviando ${book.title}…`);
      await drive.upload(fileName(book.fileHash), new Uint8Array(await record.blob.arrayBuffer()), record.type || "application/octet-stream", {
        appProperties: { bookId: book.id, name: record.name },
      });
    }
  }

  // 5. Remove do Drive as capas e arquivos de livros excluídos
  const deleted = new Set((await db.books.toArray()).filter((b) => b.deletedAt !== null).map((b) => b.id));
  for (const f of files) {
    const bookId = f.appProperties?.bookId;
    if (bookId && deleted.has(bookId)) await drive.remove(f.id);
  }
}

/** Baixa do Drive o arquivo de um livro que foi importado em outro aparelho. */
export async function downloadBookFile(book: Book): Promise<string | null> {
  if (!book.fileHash || !useSync.getState().connected) return null;
  const files = await drive.listFiles();
  const remote = files.find((f) => f.name === fileName(book.fileHash!));
  if (!remote) return null;
  const buffer = await drive.download(remote.id);
  const id = uuid();
  const name = remote.appProperties?.name ?? `${book.title}.${book.format === "mobi" ? "mobi" : book.format}`;
  await db.files.add({ id, bookId: book.id, name, size: buffer.byteLength, type: "", blob: new Blob([buffer]) });
  applyingRemote = true;
  try {
    await db.books.update(book.id, { fileId: id });
  } finally {
    applyingRemote = false;
  }
  return id;
}

// ——— Quando sincronizar ———

function markDirty() {
  if (applyingRemote) return;
  dirty = true;
  window.clearTimeout(dirtyTimer);
  // Espera a poeira baixar (ex.: várias páginas viradas) antes de enviar
  dirtyTimer = window.setTimeout(() => useSync.getState().syncNow({ quiet: true }), 60_000);
}

for (const table of [db.books, db.readings, db.bookmarks, db.sessions, db.positions, db.covers, db.visits]) {
  table.hook("creating", markDirty);
  table.hook("updating", markDirty);
  table.hook("deleting", markDirty);
}

export function startAutoSync() {
  const sync = () => useSync.getState().syncNow({ quiet: true });
  setTimeout(sync, 4000);
  document.addEventListener("visibilitychange", () => {
    const { lastSyncedAt } = useSync.getState();
    if (document.visibilityState === "visible" && (!lastSyncedAt || Date.now() - lastSyncedAt > 2 * 60_000)) sync();
    // Indo para segundo plano com mudanças pendentes: envia já
    if (document.visibilityState === "hidden" && dirty) sync();
  });
}
