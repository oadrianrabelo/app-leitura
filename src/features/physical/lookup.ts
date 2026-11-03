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
    const res = await httpFetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    // Capas "vazias" de 1x1 que alguns catálogos devolvem
    return blob.size > 1500 ? blob : null;
  } catch {
    return null;
  }
}

/** ISBN-13 (978…) → ISBN-10, que é o código que a Amazon usa nas imagens de livros físicos */
export function isbn10(isbn: string): string | null {
  if (isbn.length === 10) return isbn;
  if (isbn.length !== 13 || !isbn.startsWith("978")) return null;
  const core = isbn.slice(3, 12);
  const sum = core.split("").reduce((acc, d, i) => acc + (10 - i) * Number(d), 0);
  const check = (11 - (sum % 11)) % 11;
  return core + (check === 10 ? "X" : String(check));
}

/** Endereços de capa que dependem só do ISBN (alguns devolvem imagem vazia quando não têm) */
function directCovers(isbn: string): string[] {
  const out: string[] = [];
  const ten = isbn10(isbn);
  if (ten) {
    out.push(`https://images-na.ssl-images-amazon.com/images/P/${ten}.01.LZZZZZZZ.jpg`);
    out.push(`https://m.media-amazon.com/images/P/${ten}.01._SCLZZZZZZZ_.jpg`);
  }
  out.push(`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`);
  if (ten) out.push(`https://covers.openlibrary.org/b/isbn/${ten}-L.jpg?default=false`);
  out.push(`https://books.google.com/books/content?vid=ISBN${isbn}&printsec=frontcover&img=1&zoom=1`);
  return out;
}

export interface FoundCover {
  url: string;
  blob: Blob;
}

/**
 * Procura capas em todos os catálogos (pelo ISBN e pelo título e autor) e devolve só as
 * que de fato baixaram como imagem, sem repetir. `onFound` avisa cada uma assim que chega.
 */
export async function findCovers(
  book: { isbn: string | null; title: string; authors: string[] },
  onFound?: (c: FoundCover) => void,
): Promise<FoundCover[]> {
  const urls = new Set<string>();
  const isbn = normalizeIsbn(book.isbn);
  if (isbn) directCovers(isbn).forEach((u) => urls.add(u));
  const queries = [isbn, [book.title, book.authors[0]].filter(Boolean).join(" ")].filter(Boolean) as string[];
  const results = await Promise.allSettled(queries.map((q) => searchBooks(q)));
  for (const r of results) if (r.status === "fulfilled") r.value.slice(0, 8).forEach((c) => c.coverUrl && urls.add(c.coverUrl));

  const found: FoundCover[] = [];
  const sizes = new Set<number>();
  await Promise.all(
    [...urls].map(async (url) => {
      const blob = await downloadCover(url);
      // mesma imagem por dois caminhos: mostra uma vez só
      if (!blob || !blob.type.startsWith("image/") || sizes.has(blob.size)) return;
      sizes.add(blob.size);
      const c = { url, blob };
      found.push(c);
      onFound?.(c);
    }),
  );
  // na ordem de confiança: Amazon e Open Library primeiro; a do Google (que às vezes é um aviso
  // de "sem imagem") por último
  const rank = [...urls];
  const score = (u: string) => (u.includes("books.google.com/books/content") ? 1e6 : rank.indexOf(u));
  return found.sort((a, b) => score(a.url) - score(b.url));
}

const BROWSER_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";

const decodeHtml = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

/**
 * Lê um livro a partir do link da página dele (Amazon, Skoob, site da editora…):
 * título, autor, capa, ISBN e páginas, pelas etiquetas que esses sites publicam.
 */
export async function bookFromLink(url: string): Promise<BookCandidate> {
  const res = await httpFetch(url, { headers: { "User-Agent": BROWSER_UA, "Accept-Language": "pt-BR,pt;q=0.9" }, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`A página respondeu ${res.status}. Confira o link.`);
  const html = await res.text();
  if (/captcha|validateCaptcha|Robot Check/i.test(html) && !/productTitle/.test(html)) {
    throw new Error("A Amazon pediu uma verificação. Tente de novo daqui a pouco, ou use o link do Skoob.");
  }
  return parseBookPage(html, url);
}

/** Extrai o livro do HTML de uma página (separado para poder testar sem internet) */
export function parseBookPage(html: string, url: string): BookCandidate {
  const meta = (name: string) => {
    const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, "i");
    const m = html.match(re);
    return m ? decodeHtml(m[1] ?? m[2]) : null;
  };
  const pick = (...re: RegExp[]) => {
    for (const r of re) {
      const m = html.match(r);
      if (m?.[1]) return decodeHtml(m[1]);
    }
    return null;
  };

  let title =
    pick(/id=["']productTitle["'][^>]*>([^<]+)</i, /id=["']ebooksProductTitle["'][^>]*>([^<]+)</i) ??
    meta("og:title") ??
    pick(/<title[^>]*>([^<]+)</i) ??
    "";
  // "Amazon.com.br: Livro X | eBooks Kindle" e afins
  title = title.replace(/^Amazon\.com(\.br)?\s*:\s*/i, "").split(/\s+[|–-]\s+(Amazon|Skoob|eBooks|Livros)/i)[0].split(" : ")[0].trim();
  if (!title) throw new Error("Não encontrei um livro nessa página.");

  const authorRaw =
    meta("book:author") ??
    meta("author") ??
    pick(/class=["'][^"']*\bauthor\b[^"']*["'][^>]*>\s*<a[^>]*>([^<]+)</i, /"author"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i, /"author"\s*:\s*"([^"]+)"/i);
  const cover =
    pick(/data-old-hires=["']([^"']+)["']/i, /"hiRes"\s*:\s*"(https:[^"]+)"/i, /id=["'](?:imgBlkFront|ebooksImgBlkFront|landingImage)["'][^>]*src=["']([^"']+)["']/i) ??
    meta("og:image") ??
    meta("twitter:image");
  const text = html.replace(/<[^>]+>/g, " ");
  // a Amazon põe caracteres invisíveis entre o rótulo e o valor
  const isbns = [...text.matchAll(/ISBN(?:[-‑]1[03])?[^0-9A-Za-z]{0,12}(\d[\d\-‑ ]{8,16}[\dXx])/g)].map((m) => normalizeIsbn(m[1].replace(/[^\dXx]/g, "")));
  const isbn = isbns.find((i) => i?.length === 13) ?? isbns.find(Boolean) ?? null;
  const pages = Number(text.match(/(\d{2,4})\s*p[áa]ginas/i)?.[1] ?? text.match(/p[áa]ginas[^0-9]{0,6}(\d{2,4})/i)?.[1]) || null;
  const publisher =
    pick(/Editora[^<]{0,12}<\/span>\s*<span[^>]*>([^<;(]+)/i, /"publisher"\s*:\s*\{[^}]*"name"\s*:\s*"([^"]+)"/i) ??
    text.match(/Editora\s*[:：]\s*([A-ZÀ-Ú][\wÀ-ú.&' -]{1,40}?)(?=\s{2,}|\s+(?:ISBN|Ano|P[áa]ginas|Edi[çc][ãa]o|Idioma)|$)/)?.[1]?.trim() ??
    null;

  const authors = authorRaw ? authorRaw.split(/\s*[,;&]\s*|\s+e\s+/).map((a) => a.replace(/\(.*?\)/g, "").trim()).filter(Boolean) : [];
  // "Título - Autora" (Skoob e outros): tira o nome repetido
  for (const a of authors) title = title.replace(new RegExp(`\\s+[-–]\\s+${a.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"), "");
  return {
    key: `link:${url}`,
    source: "google",
    title,
    authors,
    publisher: publisher?.trim() || null,
    year: Number(text.match(/(?:Edição|Publicação|publicado)[^0-9]{0,40}((?:19|20)\d{2})/i)?.[1]) || null,
    pageCount: pages,
    isbn,
    description: meta("og:description"),
    subjects: [],
    language: null,
    coverUrl: cover?.startsWith("//") ? `https:${cover}` : cover,
  };
}

/** Link da busca de imagens do Google para a capa deste livro */
export function imageSearchUrl(book: { title: string; authors: string[]; publisher?: string | null }) {
  const q = [book.title, book.authors[0], book.publisher, "capa livro"].filter(Boolean).join(" ");
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
}

/** Imagem a partir do que ela colou: endereço da imagem (http) ou a própria imagem (data:) */
export async function coverFromPasted(text: string): Promise<Blob | null> {
  const s = text.trim();
  if (s.startsWith("data:image/")) {
    const res = await fetch(s);
    return res.blob();
  }
  if (!/^https?:\/\//i.test(s)) return null;
  try {
    const res = await httpFetch(s, { headers: { "User-Agent": BROWSER_UA }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return null;
    const blob = await res.blob();
    if (blob.size < 1500) return null;
    if (blob.type.startsWith("image/")) return blob;
    // link de uma página (não da imagem): tenta a imagem principal dela
    const html = await blob.text();
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]*content=["']([^"']+)["']/i)?.[1];
    return og ? downloadCover(decodeHtml(og)) : null;
  } catch {
    return null;
  }
}
