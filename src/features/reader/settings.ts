import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "../../lib/storage";

export type PaperId = "papel" | "lavanda" | "rose" | "sepia" | "salvia" | "nevoa" | "cinza" | "noite" | "ameixa" | "oliva" | "breu";
export type FontId = "original" | "literata" | "source-serif" | "garamond" | "charis" | "atkinson" | "opendyslexic";
export type Animation = "deslizar" | "folhear" | "esmaecer" | "nenhuma";

export interface Paper {
  id: PaperId;
  label: string;
  bg: string;
  ink: string;
  muted: string;
  link: string;
  dark: boolean;
}

/**
 * Papéis do leitor. Contraste confortável: suficiente para ler bem, sem o
 * brilho máximo. Sálvia (esverdeado) e Névoa (azulado) são os que menos ofuscam.
 */
export const PAPERS: Paper[] = [
  { id: "papel", label: "Papel", bg: "#f6efe3", ink: "#2b251e", muted: "#8a7d6b", link: "#6c51a8", dark: false },
  { id: "lavanda", label: "Lavanda", bg: "#efeaf6", ink: "#2b2436", muted: "#867d94", link: "#6c51a8", dark: false },
  { id: "rose", label: "Rosé", bg: "#f4e8e7", ink: "#33272a", muted: "#907d80", link: "#7a4f8e", dark: false },
  { id: "sepia", label: "Sépia", bg: "#ebdcbf", ink: "#3d2f1f", muted: "#8e7653", link: "#634a9a", dark: false },
  { id: "salvia", label: "Sálvia", bg: "#e2e6d5", ink: "#2b3127", muted: "#7a8270", link: "#46613c", dark: false },
  { id: "nevoa", label: "Névoa", bg: "#e3e8ed", ink: "#232a31", muted: "#76808a", link: "#4b5f8a", dark: false },
  { id: "cinza", label: "Cinza", bg: "#d9d6cf", ink: "#26241f", muted: "#77736a", link: "#5e4a8a", dark: false },
  { id: "noite", label: "Noite", bg: "#1e1b18", ink: "#d8cbb3", muted: "#857a68", link: "#c3b0ee", dark: true },
  { id: "ameixa", label: "Ameixa", bg: "#1d1923", ink: "#ddd3e8", muted: "#857a94", link: "#c8b6f4", dark: true },
  { id: "oliva", label: "Oliva", bg: "#1b1e19", ink: "#cfd5c3", muted: "#7c8372", link: "#b5c79d", dark: true },
  { id: "breu", label: "Breu", bg: "#0e0d0c", ink: "#a99d89", muted: "#625a4e", link: "#a690d6", dark: true },
];

export const FONTS: { id: FontId; label: string; family: string | null; note?: string }[] = [
  { id: "original", label: "Original do livro", family: null, note: "a fonte escolhida pela editora" },
  { id: "literata", label: "Literata", family: '"Sepia Literata", serif', note: "feita para leitura longa em tela" },
  { id: "source-serif", label: "Source Serif", family: '"Sepia Source Serif", serif' },
  { id: "garamond", label: "Garamond", family: '"Sepia Garamond", serif', note: "clássica, de livro impresso" },
  { id: "charis", label: "Charis", family: '"Sepia Charis", serif' },
  { id: "atkinson", label: "Atkinson", family: '"Sepia Atkinson", sans-serif', note: "máxima legibilidade" },
  { id: "opendyslexic", label: "OpenDyslexic", family: '"Sepia OpenDyslexic", sans-serif', note: "para dislexia" },
];

export interface ReaderSettings {
  paper: PaperId | "auto";
  font: FontId;
  /** Porcentagem do tamanho original */
  fontSize: number;
  /** null = espaçamento do livro */
  lineHeight: number | null;
  margin: "estreita" | "normal" | "larga";
  justify: boolean;
  hyphenate: boolean;
  flow: "paginado" | "rolagem";
  animation: Animation;
  warmLight: "auto" | "sempre" | "nunca";
  warmth: number;
  dim: number;
  breakReminder: boolean;
  showProgress: boolean;
}

interface ReaderSettingsState extends ReaderSettings {
  set: (changes: Partial<ReaderSettings>) => void;
  reset: () => void;
}

const DEFAULTS: ReaderSettings = {
  paper: "auto",
  font: "original",
  fontSize: 100,
  lineHeight: null,
  margin: "normal",
  justify: true,
  hyphenate: true,
  flow: "paginado",
  animation: "deslizar",
  warmLight: "auto",
  warmth: 0.22,
  dim: 0,
  breakReminder: false,
  showProgress: true,
};

export const useReaderSettings = create<ReaderSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULTS,
      set: (changes) => set(changes),
      reset: () => set(DEFAULTS),
    }),
    {
      name: "sepia.reader",
      storage: createJSONStorage(() => ({ getItem: safeStorage.get, setItem: safeStorage.set, removeItem: () => {} })),
    },
  ),
);

/** "auto" segue o tema do app: Noite à noite (ou com o sistema escuro), Papel de dia. */
export function resolvePaper(paper: ReaderSettings["paper"]): Paper {
  if (paper !== "auto") return PAPERS.find((p) => p.id === paper) ?? PAPERS[0];
  // Segue o tema do app; Lavanda pede um papel creme, mais descansado para ler
  const map: Record<string, PaperId> = { noite: "noite", ameixa: "ameixa", sepia: "sepia", rose: "rose", papel: "papel", lavanda: "papel" };
  const id = map[document.documentElement.dataset.theme ?? ""] ?? "papel";
  return PAPERS.find((p) => p.id === id)!;
}

/** Luz quente ligada agora? No automático, das 19h às 6h. */
export function warmActive(mode: ReaderSettings["warmLight"], date = new Date()): boolean {
  if (mode === "sempre") return true;
  if (mode === "nunca") return false;
  const h = date.getHours();
  return h >= 19 || h < 6;
}
