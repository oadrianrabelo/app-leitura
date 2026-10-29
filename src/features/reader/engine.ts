import type { TocItem } from "foliate-js/view.js";

/** O que o leitor sabe sobre a página atual, venha de EPUB, MOBI ou PDF. */
export interface LocationInfo {
  /** CFI do começo da página (EPUB/MOBI) ou "page:N" (PDF) */
  location: string;
  /** Onde reabrir o livro: o intervalo inteiro da página (reabrir pelo começo cai uma página antes) */
  resume: string;
  /** CFI do fim da página, para saber se um marcador cai nela */
  endLocation?: string;
  fraction: number;
  /** Página atual (1…total) */
  page: number;
  total: number;
  /** Número da página impressa, quando o livro traz */
  printedPage?: string | null;
  chapter: string | null;
  minutesLeftInChapter: number | null;
  atEnd: boolean;
  excerpt: string;
}

export interface ReaderEngine {
  next(): Promise<void> | void;
  prev(): Promise<void> | void;
  goTo(location: string): Promise<void> | void;
  goToFraction(fraction: number): Promise<void> | void;
}

export type TapZone = "prev" | "next" | "menu" | "corner";

export interface EngineCallbacks {
  onReady: (toc: TocItem[]) => void;
  onRelocate: (info: LocationInfo) => void;
  onTap: (zone: TapZone) => void;
  onActivity: () => void;
  onError: (message: string) => void;
}

/** Converte um toque (em px da tela) em zona: bordas viram página, meio abre o menu. */
export function zoneFor(x: number, y: number, width: number, _height: number): TapZone {
  if (x > width - 64 && y < 72) return "corner";
  if (x < width * 0.3) return "prev";
  if (x > width * 0.7) return "next";
  return "menu";
}
