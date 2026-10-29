import { httpFetch } from "../../lib/http";
import { normalizeIsbn } from "../import/metadata";

export interface BookCandidate {
  key: string;
  source: "google" | "openlibrary" | "brasil";
  title: string;
  authors: string[];
  publisher: string | null;
  year: number | null;
  pageCount: number | null;
  isbn: string | null;
  description: string | null;
  subjects: string[];
  language: string | null;
  coverUrl: string | null;
}

const yearOf = (s?: string) => {
  const m = s?.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : null;
};

interface GoogleVolume {
  id: string;
  volumeInfo: {
    title?: string;
    subtitle?: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    pageCount?: number;
    categories?: string[];
    language?: string;
    industryIdentifiers?: { type: string; identifier: string }[];
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
  };
}

function fromGoogle(v: GoogleVolume): BookCandidate {
  const info = v.volumeInfo;
  const ids = info.industryIdentifiers ?? [];
  const isbn = normalizeIsbn(ids.find((i) => i.type === "ISBN_13")?.identifier ?? ids.find((i) => i.type === "ISBN_10")?.identifier);
  const thumb = info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail;
  return {
    key: `g:${v.id}`,
    source: "google",
    title: [info.title, info.subtitle].filter(Boolean).join(": ") || "Sem título",
    authors: info.authors ?? [],
    publisher: info.publisher ?? null,
    year: yearOf(info.publishedDate),
    pageCount: info.pageCount || null,
    isbn,
    description: info.description ?? null,
    subjects: info.categories ?? [],
    language: info.language ?? null,
    // Versão maior da miniatura, sem a "dobra" de página que o Google desenha
    coverUrl: thumb ? thumb.replace("http://", "https://").replace("&edge=curl", "").replace("zoom=1", "zoom=2") : null,
  };
}

// Sem chave, o Google Books divide uma cota diária com o mundo todo e vive esgotado (429)
const BOOKS_KEY = import.meta.env.VITE_GOOGLE_BOOKS_KEY as string | undefined;
const timeout = () => ({ signal: AbortSignal.timeout(12000) });

async function searchGoogle(query: string): Promise<BookCandidate[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=15&printType=books${BOOKS_KEY ? `&key=${BOOKS_KEY}` : ""}`;
  const res = await httpFetch(url, timeout());
  if (!res.ok) throw new Error(`Google Books ${res.status}`);
  const data = (await res.json()) as { items?: GoogleVolume[] };
  return (data.items ?? []).map(fromGoogle);
}

interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  publisher?: string[];
  first_publish_year?: number;
  number_of_pages_median?: number;
  isbn?: string[];
  cover_i?: number;
  subject?: string[];
  language?: string[];
}

async function searchOpenLibrary(query: string, isbn: string | null): Promise<BookCandidate[]> {
  const q = isbn ? `isbn=${isbn}` : `q=${encodeURIComponent(query)}`;
  const res = await httpFetch(
    `https://openlibrary.org/search.json?${q}&limit=10&fields=key,title,author_name,publisher,first_publish_year,number_of_pages_median,isbn,cover_i,subject,language`,
    timeout(),
  );
  if (!res.ok) throw new Error(`Open Library ${res.status}`);
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };
  return (data.docs ?? []).map((d) => ({
    key: `o:${d.key}`,
    source: "openlibrary" as const,
    title: d.title,
    authors: d.author_name ?? [],
    publisher: d.publisher?.[0] ?? null,
    year: d.first_publish_year ?? null,
    pageCount: d.number_of_pages_median ?? null,
    isbn: isbn ?? normalizeIsbn(d.isbn?.find((i) => i.length === 13) ?? d.isbn?.[0]),
    description: null,
    subjects: (d.subject ?? []).slice(0, 5),
    language: d.language?.[0] ?? null,
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg` : null,
  }));
}

interface BrasilApiBook {
  isbn: string;
  title: string;
  subtitle?: string | null;
  authors?: string[];
  publisher?: string | null;
  synopsis?: string | null;
  year?: number | null;
  page_count?: number | null;
  subjects?: string[] | null;
  cover_url?: string | null;
}

/** BrasilAPI: junta a base da CBL, do Mercado Editorial e outras. É a que mais acha livros brasileiros. */
async function searchBrasil(isbn: string): Promise<BookCandidate[]> {
  const res = await httpFetch(`https://brasilapi.com.br/api/isbn/v1/${isbn}`, timeout());
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`BrasilAPI ${res.status}`);
  const b = (await res.json()) as BrasilApiBook;
  return [
    {
      key: `b:${b.isbn}`,
      source: "brasil",
      title: [b.title, b.subtitle].filter(Boolean).join(": ") || "Sem título",
      // A CBL costuma mandar "SOBRENOME, Nome" em maiúsculas
      authors: (b.authors ?? []).map(prettyAuthor),
      publisher: b.publisher ?? null,
      year: b.year ?? null,
      pageCount: b.page_count || null,
      isbn: normalizeIsbn(b.isbn) ?? isbn,
      description: b.synopsis ?? null,
      subjects: b.subjects ?? [],
      language: null,
      coverUrl: b.cover_url ?? null,
    },
  ];
}

function prettyAuthor(name: string) {
  const [last, first] = name.split(",").map((p) => p.trim());
  const full = first ? `${first} ${last}` : name.trim();
  if (full !== full.toUpperCase()) return full;
  return full.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, ch: string) => sep + ch.toUpperCase()).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, (w) => w.toLowerCase());
}

/** Busca por ISBN, título ou autor em vários catálogos ao mesmo tempo. */
export async function searchBooks(input: string): Promise<BookCandidate[]> {
  const query = input.trim();
  if (!query) return [];
  const isbn = normalizeIsbn(query);
  const googleQuery = isbn ? `isbn:${isbn}` : query;

  const sources = [searchGoogle(googleQuery), searchOpenLibrary(query, isbn)];
  if (isbn) sources.unshift(searchBrasil(isbn));
  const settled = await Promise.allSettled(sources);
  const results = settled.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  if (results.length === 0 && settled.every((r) => r.status === "rejected")) {
    throw new Error("Sem conexão com os catálogos de livros");
  }

  // Remove repetidos (mesmo ISBN ou mesmo título+autor) e completa a capa do Google com a da Open Library
  const seen = new Map<string, BookCandidate>();
  for (const r of results) {
    const id = r.isbn ?? `${r.title.toLowerCase()}|${r.authors[0]?.toLowerCase() ?? ""}`;
    const prev = seen.get(id);
    if (!prev) seen.set(id, r);
    else {
      prev.coverUrl ??= r.coverUrl;
      prev.pageCount ??= r.pageCount;
      prev.description ??= r.description;
      prev.year ??= r.year;
    }
  }
  const list = Array.from(seen.values());
  if (isbn) for (const c of list) c.coverUrl ??= `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`;
  return list;
}

export async function downloadCover(url: string): Promise<Blob | null> {
  try {
    const res = await httpFetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    // Capas "vazias" de 1x1 que alguns catálogos devolvem
    return blob.size > 1500 ? blob : null;
  } catch {
    return null;
  }
}
