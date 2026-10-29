import { httpFetch } from "../../lib/http";
import { normalizeIsbn } from "../import/metadata";

export interface BookCandidate {
  key: string;
  source: "google" | "openlibrary";
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

async function searchGoogle(query: string): Promise<BookCandidate[]> {
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=15&printType=books`;
  const res = await httpFetch(url);
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
  const res = await httpFetch(`https://openlibrary.org/search.json?${q}&limit=10&fields=key,title,author_name,publisher,first_publish_year,number_of_pages_median,isbn,cover_i,subject,language`);
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

/** Busca por ISBN, título ou autor. Google Books primeiro, Open Library como reforço. */
export async function searchBooks(input: string): Promise<BookCandidate[]> {
  const query = input.trim();
  if (!query) return [];
  const isbn = normalizeIsbn(query);
  const googleQuery = isbn ? `isbn:${isbn}` : query;

  const [google, openlib] = await Promise.allSettled([searchGoogle(googleQuery), searchOpenLibrary(query, isbn)]);
  const results = [...(google.status === "fulfilled" ? google.value : []), ...(openlib.status === "fulfilled" ? openlib.value : [])];
  if (results.length === 0 && google.status === "rejected" && openlib.status === "rejected") {
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
