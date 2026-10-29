/**
 * Modelo de dados do Sépia.
 * Todo registro tem id (UUID), updatedAt e deletedAt: a sincronização da fase 3
 * mescla por registro, e exclusões viram marcações em vez de sumir.
 */

export type BookFormat = "epub" | "pdf" | "mobi" | "fisico";
export type BookStatus = "quero-ler" | "lendo" | "lido" | "abandonado";

export interface Synced {
  id: string;
  createdAt: number;
  updatedAt: number;
  deletedAt: number | null;
}

export interface Book extends Synced {
  title: string;
  authors: string[];
  format: BookFormat;
  status: BookStatus;
  /** Páginas da edição (livro físico ou dado do EPUB) ou estimativa pelo texto */
  pageCount: number | null;
  pageCountEstimated: boolean;
  isbn: string | null;
  publisher: string | null;
  year: number | null;
  language: string | null;
  description: string | null;
  subjects: string[];
  favorite: boolean;
  /** Cor dominante da capa, usada em fundos e na capa gerada */
  tint: string | null;
  hasCover: boolean;
  fileId: string | null;
  /** SHA-256 do arquivo, para não importar o mesmo livro duas vezes */
  fileHash: string | null;
}

export type ReadingState = "lendo" | "concluida" | "abandonada";

export interface Reading extends Synced {
  bookId: string;
  state: ReadingState;
  startedAt: number | null;
  finishedAt: number | null;
  /** Só o ano/mês são conhecidos (leituras antigas registradas de memória) */
  approximate: boolean;
  /** 1 a 5, meias estrelas permitidas */
  rating: number | null;
  notes: string;
  medium: "digital" | "fisico";
  /** 0 a 1; vem do leitor na fase 2 */
  progress: number;
}

/** Arquivo do livro (EPUB, PDF, MOBI). Não sincroniza por padrão. */
export interface BookFile {
  id: string;
  bookId: string;
  name: string;
  size: number;
  type: string;
  blob: Blob;
}

export interface Cover {
  bookId: string;
  blob: Blob;
  updatedAt: number;
}

/** Onde a leitura parou em cada livro (um registro por livro). */
export interface Position {
  bookId: string;
  /** EPUB CFI (EPUB/MOBI) ou "page:N" (PDF) */
  location: string;
  fraction: number;
  updatedAt: number;
}

export interface Bookmark extends Synced {
  bookId: string;
  location: string;
  fraction: number;
  /** Começo do texto da página marcada */
  excerpt: string;
  chapter: string | null;
  /** Estilo do marcador (os colecionáveis da fase 4) */
  style: string;
}

/** Um período contínuo de leitura. Alimenta páginas por dia, sequência e conquistas. */
export interface Session extends Synced {
  bookId: string;
  readingId: string | null;
  startedAt: number;
  endedAt: number;
  /** Dia local "AAAA-MM-DD" em que a sessão começou */
  day: string;
  /** Páginas avançadas (unidades de ~1.500 caracteres no EPUB, páginas no PDF) */
  pages: number;
  /** Tempo ativo em segundos (pausas longas não contam) */
  seconds: number;
  startFraction: number;
  endFraction: number;
}
