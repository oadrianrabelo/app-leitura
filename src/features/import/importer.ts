import { create } from "zustand";
import { db, uuid } from "../../db/db";
import { addBook, setInitialStatus } from "../../db/books";
import type { Book, BookFormat, BookStatus } from "../../db/types";
import { emptyBook, parseEpub, parseMobi, sha256, titleFromFilename, type ParsedBook } from "./metadata";
import { processCover } from "./image";

export const ACCEPTED = ".epub,.mobi,.azw3,.azw,.pdf,application/epub+zip,application/pdf";

function formatOf(name: string): BookFormat | null {
  const ext = name.split(".").pop()?.toLowerCase();
  if (ext === "epub") return "epub";
  if (ext === "pdf") return "pdf";
  if (ext === "mobi" || ext === "azw3" || ext === "azw") return "mobi";
  return null;
}

export type ImportOutcome =
  | { kind: "added"; name: string; book: Book }
  | { kind: "duplicate"; name: string; title: string }
  | { kind: "skipped"; name: string }
  | { kind: "error"; name: string; message: string };

export interface ReviewChoice {
  status: BookStatus;
  year: number | null;
}

interface ImportState {
  phase: "idle" | "importing" | "review";
  done: number;
  total: number;
  current: string;
  outcomes: ImportOutcome[];
  choices: Record<string, ReviewChoice>;
  start: (files: File[]) => Promise<void>;
  choose: (bookId: string, choice: Partial<ReviewChoice>) => void;
  chooseAll: (status: BookStatus) => void;
  finish: () => Promise<void>;
  cancel: () => void;
}

const nextFrame = () => new Promise((r) => setTimeout(r, 0));

async function importOne(file: File): Promise<ImportOutcome> {
  const format = formatOf(file.name);
  if (!format) return { kind: "skipped", name: file.name };

  const buffer = await file.arrayBuffer();
  const hash = await sha256(buffer);
  const existing = await db.books.where("fileHash").equals(hash).filter((b) => b.deletedAt === null).first();
  if (existing) return { kind: "duplicate", name: file.name, title: existing.title };

  let parsed: ParsedBook;
  if (format === "epub") parsed = await parseEpub(new Uint8Array(buffer), file.name);
  else if (format === "mobi") parsed = parseMobi(buffer, file.name);
  else parsed = emptyBook(titleFromFilename(file.name)); // PDF: metadados e capa chegam com o leitor

  const cover = parsed.cover ? await processCover(parsed.cover) : null;
  const fileId = uuid();
  const book = await addBook(
    {
      title: parsed.title,
      authors: parsed.authors,
      format,
      status: "quero-ler",
      pageCount: parsed.pageCount,
      pageCountEstimated: parsed.pageCountEstimated,
      isbn: parsed.isbn,
      publisher: parsed.publisher,
      year: parsed.year,
      language: parsed.language,
      description: parsed.description,
      subjects: parsed.subjects,
      tint: cover?.tint ?? null,
      fileId,
      fileHash: hash,
    },
    cover?.blob ?? null,
  );
  await db.files.add({
    id: fileId,
    bookId: book.id,
    name: file.name,
    size: file.size,
    type: file.type || format,
    blob: new Blob([buffer], { type: file.type || "application/octet-stream" }),
  });
  return { kind: "added", name: file.name, book };
}

export const useImport = create<ImportState>()((set, get) => ({
  phase: "idle",
  done: 0,
  total: 0,
  current: "",
  outcomes: [],
  choices: {},

  async start(files) {
    if (get().phase === "importing" || files.length === 0) return;
    set({ phase: "importing", done: 0, total: files.length, current: "", outcomes: [], choices: {} });
    const outcomes: ImportOutcome[] = [];
    for (const file of files) {
      set({ current: file.name });
      await nextFrame();
      try {
        outcomes.push(await importOne(file));
      } catch (e) {
        outcomes.push({ kind: "error", name: file.name, message: e instanceof Error ? e.message : String(e) });
      }
      set({ done: outcomes.length });
    }
    const choices: Record<string, ReviewChoice> = {};
    for (const o of outcomes) if (o.kind === "added") choices[o.book.id] = { status: "quero-ler", year: null };
    set({ phase: "review", outcomes, choices });
  },

  choose(bookId, choice) {
    set((s) => ({ choices: { ...s.choices, [bookId]: { ...s.choices[bookId], ...choice } } }));
  },

  chooseAll(status) {
    set((s) => ({
      choices: Object.fromEntries(Object.entries(s.choices).map(([id, c]) => [id, { ...c, status }])),
    }));
  },

  async finish() {
    const { choices } = get();
    for (const [bookId, choice] of Object.entries(choices)) {
      if (choice.status !== "quero-ler") await setInitialStatus(bookId, choice.status, choice.year);
    }
    set({ phase: "idle", outcomes: [], choices: {} });
  },

  cancel() {
    set({ phase: "idle", outcomes: [], choices: {} });
  },
}));

/** Abre o seletor de arquivos do sistema (ou de pasta, no desktop) e importa o que vier. */
export function pickAndImport(folder = false) {
  const input = document.createElement("input");
  input.type = "file";
  input.multiple = true;
  if (folder) input.setAttribute("webkitdirectory", "");
  else input.accept = ACCEPTED;
  input.style.display = "none";
  input.addEventListener("change", () => {
    const files = Array.from(input.files ?? []);
    input.remove();
    useImport.getState().start(files);
  });
  document.body.appendChild(input);
  input.click();
}
