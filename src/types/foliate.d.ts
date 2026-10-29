// foliate-js não publica tipos; descrevemos só o que o Sépia usa.
declare module "foliate-js/view.js" {
  export interface TocItem {
    label: string;
    href: string;
    subitems?: TocItem[];
  }
  export interface FoliateBook {
    metadata?: { title?: string | Record<string, string>; language?: string | string[] };
    toc?: TocItem[];
    pageList?: TocItem[];
    sections: unknown[];
  }
  export interface RelocateDetail {
    fraction: number;
    section?: { current: number; total: number };
    location?: { current: number; next: number; total: number };
    time?: { section: number; total: number };
    tocItem?: TocItem | null;
    pageItem?: TocItem | null;
    cfi: string;
    range?: Range;
  }
  export interface Paginator extends HTMLElement {
    setStyles(css: string | [string, string]): void;
    next(): Promise<void>;
    prev(): Promise<void>;
    readonly scrolled: boolean;
  }
  export interface FoliateView extends HTMLElement {
    book: FoliateBook;
    renderer: Paginator;
    lastLocation?: RelocateDetail;
    open(file: Blob | File | string): Promise<void>;
    close(): void;
    init(opts: { lastLocation?: string | null; showTextStart?: boolean }): Promise<void>;
    goTo(target: string | number): Promise<void>;
    goToFraction(fraction: number): Promise<void>;
    next(): Promise<void>;
    prev(): Promise<void>;
    goLeft(): Promise<void>;
    goRight(): Promise<void>;
  }
}

declare module "foliate-js/epubcfi.js" {
  export function compare(a: string, b: string): number;
  export function collapse(cfi: string, toEnd?: boolean): string;
}
