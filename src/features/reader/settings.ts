import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "../../lib/storage";

export type PaperId = "papel" | "sepia" | "salvia" | "cinza" | "noite" | "breu";
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
 * brilho máximo. Sálvia é levemente esverdeado, o tom que menos ofusca.
 */
export const PAPERS: Paper[] = [
  { id: "papel", label: "Papel", bg: "#f6efe3", ink: "#2b251e", muted: "#8a7d6b", link: "#9a4e27", dark: false },
  { id: "sepia", label: "Sépia", bg: "#ebdcbf", ink: "#3d2f1f", muted: "#8e7653", link: "#8a3f1c", dark: false },
  { id: "salvia", label: "Sálvia", bg: "#e2e6d5", ink: "#2b3127", muted: "#7a8270", link: "#46613c", dark: false },
  { id: "cinza", label: "Cinza", bg: "#d9d6cf", ink: "#26241f", muted: "#77736a", link: "#6d4a2f", dark: false },
  { id: "noite", label: "Noite", bg: "#1e1b18", ink: "#d8cbb3", muted: "#857a68", link: "#d99a6c", dark: true },
  { id: "breu", label: "Breu", bg: "#0e0d0c", ink: "#a99d89", muted: "#625a4e", link: "#b98560", dark: true },
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
  const appTheme = document.documentElement.dataset.theme;
  if (appTheme === "noite") return PAPERS.find((p) => p.id === "noite")!;
  if (appTheme === "sepia") return PAPERS.find((p) => p.id === "sepia")!;
  return PAPERS[0];
}

/** Luz quente ligada agora? No automático, das 19h às 6h. */
export function warmActive(mode: ReaderSettings["warmLight"], date = new Date()): boolean {
  if (mode === "sempre") return true;
  if (mode === "nunca") return false;
  const h = date.getHours();
  return h >= 19 || h < 6;
}
