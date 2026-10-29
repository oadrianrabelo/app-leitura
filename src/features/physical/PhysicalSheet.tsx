import { useEffect, useRef, useState } from "react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { addBook, setInitialStatus } from "../../db/books";
import type { BookStatus } from "../../db/types";
import { platform } from "../../lib/platform";
import { processCover } from "../import/image";
import { normalizeIsbn } from "../import/metadata";
import { useLibraryUi } from "../library/state";
import { downloadCover, searchBooks, type BookCandidate } from "./lookup";
import "./PhysicalSheet.css";

const STATUS: { id: BookStatus; label: string }[] = [
  { id: "quero-ler", label: "Quero ler" },
  { id: "lendo", label: "Lendo" },
  { id: "lido", label: "Já li" },
];
const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 70 }, (_, i) => thisYear - i);

const blank = (): BookCandidate => ({
  key: "manual",
  source: "google",
  title: "",
  authors: [],
  publisher: null,
  year: null,
  pageCount: null,
  isbn: null,
  description: null,
  subjects: [],
  language: null,
  coverUrl: null,
});

async function scanIsbn(): Promise<string | null> {
  const { invoke } = await import("@tauri-apps/api/core");
  const result = await invoke<{ content: string }>("scan_barcode");
  return normalizeIsbn(result.content) ?? (result.content || null);
}

function CandidateCover({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) return <span className="candidate-cover is-empty"><Icon name="book" size={18} /></span>;
  return <img className="candidate-cover" src={url} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export function PhysicalSheet() {
  const { physicalOpen, setPhysicalOpen, openBook } = useLibraryUi();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookCandidate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<BookCandidate | null>(null);
  const [status, setStatus] = useState<BookStatus>("lido");
  const [year, setYear] = useState<number | "">("");
  const [saving, setSaving] = useState(false);
  const searchId = useRef(0);

  useEffect(() => {
    if (physicalOpen) return;
    // Limpa ao fechar, depois da animação
    const t = setTimeout(() => {
      setQuery("");
      setResults(null);
      setError(null);
      setPicked(null);
      setStatus("lido");
      setYear("");
    }, 300);
    return () => clearTimeout(t);
  }, [physicalOpen]);

  const search = async (text: string) => {
    if (!text.trim()) return;
    const id = ++searchId.current;
    setLoading(true);
    setError(null);
    try {
      const list = await searchBooks(text);
      if (id !== searchId.current) return;
      setResults(list);
      // Código de barras com um único resultado: vai direto para a confirmação
      if (normalizeIsbn(text) && list.length === 1) setPicked(list[0]);
    } catch (e) {
      if (id === searchId.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (id === searchId.current) setLoading(false);
    }
  };

  const scan = async () => {
    try {
      const isbn = await scanIsbn();
      if (!isbn) return;
      setQuery(isbn);
      search(isbn);
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      if (!/cancel/i.test(message)) setError(message);
    }
  };

  const save = async () => {
    if (!picked || !picked.title.trim()) return;
    setSaving(true);
    const raw = picked.coverUrl ? await downloadCover(picked.coverUrl) : null;
    const cover = raw ? await processCover(raw) : null;
    const book = await addBook(
      {
        title: picked.title.trim(),
        authors: picked.authors,
        format: "fisico",
        status: "quero-ler",
        pageCount: picked.pageCount,
        pageCountEstimated: false,
        isbn: picked.isbn,
        publisher: picked.publisher,
        year: picked.year,
        language: picked.language,
        description: picked.description,
        subjects: picked.subjects,
        tint: cover?.tint ?? null,
        fileId: null,
        fileHash: null,
      },
      cover?.blob ?? null,
    );
    if (status !== "quero-ler") await setInitialStatus(book.id, status, year || null);
    setSaving(false);
    setPhysicalOpen(false);
    setTimeout(() => openBook(book.id), 320);
  };

  const edit = (changes: Partial<BookCandidate>) => setPicked((p) => (p ? { ...p, ...changes } : p));

  return (
    <Sheet open={physicalOpen} onClose={() => setPhysicalOpen(false)} label="Adicionar livro físico" tall={!picked && !!results?.length}>
      {!picked ? (
        <div className="physical">
          <p className="reading-form-eyebrow">Livro físico</p>
          <h2 className="reading-form-title">Qual livro é?</h2>

          {platform === "android" && (
            <button className="scan-button" onClick={scan}>
              <span className="scan-icon">
                <Icon name="barcode" size={26} />
              </span>
              <span>
                <strong>Escanear código de barras</strong>
                <span>Aponte a câmera para o verso do livro</span>
              </span>
            </button>
          )}

          <form
            className="search physical-search"
            onSubmit={(e) => {
              e.preventDefault();
              search(query);
            }}
          >
            <Icon name="search" size={17} />
            <input
              type="search"
              enterKeyHint="search"
              placeholder="Título, autor ou ISBN"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus={platform !== "android"}
            />
            {query && (
              <button type="submit" className="physical-go">
                Buscar
              </button>
            )}
          </form>

          {loading && <p className="physical-status">Procurando nos catálogos…</p>}
          {error && <p className="physical-status is-error">{error}</p>}
          {results && !loading && results.length === 0 && <p className="physical-status">Nenhum livro encontrado com essa busca.</p>}

          {results && results.length > 0 && (
            <ul className="candidates">
              {results.map((c) => (
                <li key={c.key}>
                  <button onClick={() => setPicked({ ...c })}>
                    <CandidateCover url={c.coverUrl} />
                    <span className="candidate-body">
                      <strong>{c.title}</strong>
                      <span>{c.authors.join(", ") || "Autor desconhecido"}</span>
                      <span className="candidate-meta">
                        {[c.publisher, c.year, c.pageCount && `${c.pageCount} págs.`].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button className="physical-manual" onClick={() => setPicked({ ...blank(), title: normalizeIsbn(query) ? "" : query })}>
            Não achou? <strong>Cadastrar à mão</strong>
          </button>
        </div>
      ) : (
        <div className="physical">
          <button className="physical-back" onClick={() => setPicked(null)}>
            <Icon name="back" size={18} /> Voltar
          </button>
          <div className="physical-confirm">
            <CandidateCover url={picked.coverUrl} />
            <div className="physical-confirm-fields">
              <label className="field">
                <span className="field-label">Título</span>
                <input type="text" value={picked.title} onChange={(e) => edit({ title: e.target.value })} placeholder="Título do livro" />
              </label>
              <label className="field">
                <span className="field-label">Autoria</span>
                <input
                  type="text"
                  value={picked.authors.join(", ")}
                  onChange={(e) => edit({ authors: e.target.value.split(",").map((a) => a.trimStart()) })}
                  placeholder="Nome do autor ou autora"
                />
              </label>
              <label className="field">
                <span className="field-label">Páginas</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={picked.pageCount ?? ""}
                  onChange={(e) => edit({ pageCount: parseInt(e.target.value, 10) || null })}
                />
              </label>
            </div>
          </div>

          <div className="field">
            <span className="field-label">Esse livro</span>
            <div className="segmented">
              {STATUS.map((s) => (
                <button key={s.id} className={status === s.id ? "is-active" : ""} onClick={() => setStatus(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            {status === "lido" && (
              <label className="import-year">
                Terminei em
                <select value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}>
                  <option value="">não lembro</option>
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          <div className="reading-form-actions">
            <Button size="lg" onClick={save} disabled={saving || !picked.title.trim()}>
              {saving ? "Colocando na estante…" : "Adicionar à estante"}
            </Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
