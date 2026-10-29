import { unzip, type Unzipped } from "fflate";

/** Caracteres de texto que equivalem a uma página impressa (média de um livro em português). */
export const CHARS_PER_PAGE = 1500;

export interface ParsedBook {
  title: string;
  authors: string[];
  language: string | null;
  publisher: string | null;
  year: number | null;
  description: string | null;
  subjects: string[];
  isbn: string | null;
  pageCount: number | null;
  pageCountEstimated: boolean;
  cover: Blob | null;
}

export const emptyBook = (title: string): ParsedBook => ({
  title,
  authors: [],
  language: null,
  publisher: null,
  year: null,
  description: null,
  subjects: [],
  isbn: null,
  pageCount: null,
  pageCountEstimated: false,
  cover: null,
});

/** "o_nome_do_vento-patrick.epub" → "O nome do vento patrick" */
export function titleFromFilename(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").replace(/[_]+/g, " ").replace(/\s+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function unzipAsync(data: Uint8Array): Promise<Unzipped> {
  return new Promise((resolve, reject) => unzip(data, (err, files) => (err ? reject(err) : resolve(files))));
}

const decoder = new TextDecoder("utf-8");

function resolvePath(base: string, href: string): string {
  const parts = (base.includes("/") ? base.slice(0, base.lastIndexOf("/") + 1) : "").concat(decodeURIComponent(href.split("#")[0])).split("/");
  const out: string[] = [];
  for (const p of parts) {
    if (p === "..") out.pop();
    else if (p !== "." && p !== "") out.push(p);
  }
  return out.join("/");
}

function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}

/** Busca elementos ignorando o prefixo de namespace (dc:title, opf:meta...). */
function all(doc: Document | Element, localName: string): Element[] {
  return Array.from(doc.getElementsByTagNameNS("*", localName));
}

function text(el: Element | undefined | null): string | null {
  const t = el?.textContent?.replace(/\s+/g, " ").trim();
  return t ? t : null;
}

function stripHtml(html: string): string {
  return new DOMParser().parseFromString(html, "text/html").body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

export function normalizeIsbn(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/^urn:isbn:/i, "").replace(/[^0-9Xx]/g, "").toUpperCase();
  return digits.length === 13 || digits.length === 10 ? digits : null;
}

function yearFrom(raw: string | null): number | null {
  const m = raw?.match(/(1[5-9]\d\d|20\d\d)/);
  return m ? parseInt(m[1], 10) : null;
}

const IMAGE_TYPES: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", svg: "image/svg+xml" };

export async function parseEpub(data: Uint8Array, filename: string): Promise<ParsedBook> {
  const files = await unzipAsync(data);
  const read = (path: string) => (files[path] ? decoder.decode(files[path]) : null);

  const container = read("META-INF/container.xml");
  const opfPath = container ? parseXml(container).querySelector("rootfile")?.getAttribute("full-path") : null;
  const opfText = opfPath ? read(opfPath) : null;
  if (!opfPath || !opfText) return emptyBook(titleFromFilename(filename));

  const opf = parseXml(opfText);
  const metadata = all(opf, "metadata")[0] ?? opf.documentElement;
  const result = emptyBook(text(all(metadata, "title")[0]) ?? titleFromFilename(filename));

  result.authors = all(metadata, "creator")
    .filter((el) => {
      const role = el.getAttribute("opf:role") ?? el.getAttribute("role");
      return !role || role === "aut";
    })
    .map((el) => text(el))
    .filter((a): a is string => !!a);
  result.language = text(all(metadata, "language")[0]);
  result.publisher = text(all(metadata, "publisher")[0]);
  result.year = yearFrom(text(all(metadata, "date")[0]));
  const description = text(all(metadata, "description")[0]);
  result.description = description ? stripHtml(description) : null;
  result.subjects = all(metadata, "subject").map((el) => text(el)).filter((s): s is string => !!s);
  result.isbn =
    all(metadata, "identifier")
      .map((el) => normalizeIsbn(el.textContent))
      .find((v) => v) ?? null;

  // Manifesto: id → { caminho, tipo, propriedades }
  const manifest = new Map<string, { path: string; type: string; props: string }>();
  for (const item of all(opf, "item")) {
    const id = item.getAttribute("id");
    const href = item.getAttribute("href");
    if (!id || !href) continue;
    manifest.set(id, {
      path: resolvePath(opfPath, href),
      type: item.getAttribute("media-type") ?? "",
      props: item.getAttribute("properties") ?? "",
    });
  }

  // Capa: EPUB 3 (cover-image), EPUB 2 (<meta name="cover">) ou um palpite pelo nome
  const items = Array.from(manifest.values());
  const coverId = all(metadata, "meta").find((m) => m.getAttribute("name") === "cover")?.getAttribute("content");
  const coverItem =
    items.find((i) => i.props.split(/\s+/).includes("cover-image")) ??
    (coverId ? manifest.get(coverId) : undefined) ??
    items.find((i) => i.type.startsWith("image/") && /cover|capa/i.test(i.path));
  if (coverItem && files[coverItem.path]) {
    const ext = coverItem.path.split(".").pop()?.toLowerCase() ?? "";
    const bytes = files[coverItem.path];
    result.cover = new Blob([bytes.slice()], { type: coverItem.type || IMAGE_TYPES[ext] || "image/jpeg" });
  }

  // Páginas: lista de páginas da edição impressa (page-list), se o EPUB tiver
  const nav = items.find((i) => i.props.split(/\s+/).includes("nav"));
  const navText = nav ? read(nav.path) : null;
  if (navText) {
    const doc = new DOMParser().parseFromString(navText, "application/xhtml+xml");
    const pageList = Array.from(doc.getElementsByTagName("nav")).find((n) =>
      (n.getAttributeNS("http://www.idpf.org/2007/ops", "type") ?? n.getAttribute("epub:type") ?? "").includes("page-list"),
    );
    const count = pageList?.getElementsByTagName("a").length ?? 0;
    if (count > 10) result.pageCount = count;
  }
  if (!result.pageCount) {
    const ncxItem = items.find((i) => i.type === "application/x-dtbncx+xml");
    const ncx = ncxItem ? read(ncxItem.path) : null;
    const targets = ncx ? all(parseXml(ncx), "pageTarget").length : 0;
    if (targets > 10) result.pageCount = targets;
  }

  // Sem numeração impressa: estima pelo tamanho do texto
  if (!result.pageCount) {
    let chars = 0;
    for (const ref of all(opf, "itemref")) {
      const item = manifest.get(ref.getAttribute("idref") ?? "");
      const html = item ? read(item.path) : null;
      if (html) chars += stripHtml(html).length;
    }
    if (chars > 0) {
      result.pageCount = Math.max(1, Math.round(chars / CHARS_PER_PAGE));
      result.pageCountEstimated = true;
    }
  }

  return result;
}

/** MOBI / AZW3: lê o cabeçalho EXTH (título, autor, editora, ISBN, capa). */
export function parseMobi(buffer: ArrayBuffer, filename: string): ParsedBook {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const result = emptyBook(titleFromFilename(filename));
  try {
    const recordCount = view.getUint16(76);
    const recordOffset = (i: number) => view.getUint32(78 + i * 8);
    const r0 = recordOffset(0);
    if (String.fromCharCode(...bytes.slice(r0 + 16, r0 + 20)) !== "MOBI") return result;

    const headerLength = view.getUint32(r0 + 20);
    const encoding = view.getUint32(r0 + 28) === 1252 ? "windows-1252" : "utf-8";
    const dec = new TextDecoder(encoding);
    const nameOffset = view.getUint32(r0 + 84);
    const nameLength = view.getUint32(r0 + 88);
    const fullName = dec.decode(bytes.slice(r0 + nameOffset, r0 + nameOffset + nameLength)).trim();
    if (fullName) result.title = fullName;
    const firstImage = view.getUint32(r0 + 108);
    const hasExth = (view.getUint32(r0 + 128) & 0x40) !== 0;

    let coverIndex: number | null = null;
    if (hasExth) {
      let p = r0 + 16 + headerLength;
      if (String.fromCharCode(...bytes.slice(p, p + 4)) === "EXTH") {
        const count = view.getUint32(p + 8);
        p += 12;
        for (let i = 0; i < count; i++) {
          const type = view.getUint32(p);
          const len = view.getUint32(p + 4);
          const data = bytes.slice(p + 8, p + len);
          const value = () => dec.decode(data).trim();
          if (type === 100) result.authors.push(value());
          else if (type === 101) result.publisher = value();
          else if (type === 103) result.description = stripHtml(value());
          else if (type === 104) result.isbn = normalizeIsbn(value());
          else if (type === 105) result.subjects.push(value());
          else if (type === 106) result.year = yearFrom(value());
          else if (type === 503) result.title = value();
          else if (type === 524) result.language = value();
          else if (type === 201 && data.length >= 4) coverIndex = new DataView(data.buffer).getUint32(0);
          p += len;
        }
      }
    }

    if (coverIndex !== null && firstImage !== 0xffffffff) {
      const idx = firstImage + coverIndex;
      if (idx < recordCount) {
        const start = recordOffset(idx);
        const end = idx + 1 < recordCount ? recordOffset(idx + 1) : buffer.byteLength;
        result.cover = new Blob([bytes.slice(start, end)], { type: "image/jpeg" });
      }
    }
  } catch {
    // Arquivo fora do padrão: fica só com o nome do arquivo.
  }
  return result;
}

export async function sha256(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
