import { useDeferredValue, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { useBooks } from "../db/hooks";
import { useLibraryStats } from "../db/stats";
import type { Book, BookStatus } from "../db/types";
import { Shelf } from "../features/library/Shelf";
import { useLibraryUi } from "../features/library/state";
import { pickAndImport } from "../features/import/importer";
import { platform } from "../lib/platform";
import { Botanical } from "../components/Botanical";
import "./Biblioteca.css";

// Lombadas "fantasma" da estante vazia: altura, largura e tom variados como numa estante real.
const SPINES = [
  { h: 86, w: 18, tone: 1 },
  { h: 94, w: 22, tone: 2 },
  { h: 78, w: 16, tone: 3 },
  { h: 90, w: 26, tone: 1 },
  { h: 82, w: 14, tone: 2 },
  { h: 96, w: 20, tone: 3, tilt: true },
];

type Filter = "todos" | BookStatus;
type Sort = "recentes" | "titulo" | "autor";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "todos", label: "Todos" },
  { id: "lido", label: "Lidos" },
  { id: "lendo", label: "Lendo" },
  { id: "quero-ler", label: "Quero ler" },
  { id: "abandonado", label: "Abandonados" },
];

const SORTS: { id: Sort; label: string }[] = [
  { id: "recentes", label: "Recentes" },
  { id: "titulo", label: "Título" },
  { id: "autor", label: "Autor" },
];

const collator = new Intl.Collator("pt-BR", { sensitivity: "base" });
const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

function EmptyLibrary({ onImport, onPhysical }: { onImport: () => void; onPhysical: () => void }) {
  return (
    <>
      <div className="shelf" aria-hidden>
        <Botanical art="haste" className="shelf-orchid" />
        <Botanical art="guirlanda-1" tone="destaque" className="shelf-garland" />
        <div className="shelf-books">
          {SPINES.map((s, i) => (
            <motion.span
              key={i}
              className={`spine tone-${s.tone}${s.tilt ? " is-tilted" : ""}`}
              style={{ height: s.h, width: s.w }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
        <div className="shelf-board" />
      </div>

      <div className="shelf-empty">
        <h2>Sua estante está esperando</h2>
        <p>Cada livro que você já leu, físico ou digital, vai morar aqui. Releituras também contam.</p>
      </div>

      <div className="library-actions">
        <button className="library-action" onClick={onImport}>
          <span className="library-action-icon">
            <Icon name="upload" size={20} />
          </span>
          <span className="library-action-body">
            <span className="library-action-title">Importar livros digitais</span>
            <span className="library-action-text">EPUB, MOBI ou PDF. Capa, título e autor vêm do próprio arquivo.</span>
          </span>
        </button>
        <button className="library-action" onClick={onPhysical}>
          <span className="library-action-icon">
            <Icon name="barcode" size={20} />
          </span>
          <span className="library-action-body">
            <span className="library-action-title">Livro físico</span>
            <span className="library-action-text">
              {platform === "android"
                ? "Aponte a câmera para o código de barras ou busque pelo título."
                : "Busque pelo título, autor ou ISBN."}
            </span>
          </span>
        </button>
      </div>
    </>
  );
}

export function Biblioteca() {
  const books = useBooks();
  const stats = useLibraryStats();
  const { openBook, setAddOpen, setPhysicalOpen } = useLibraryUi();
  const [filter, setFilter] = useState<Filter>("todos");
  const [sort, setSort] = useState<Sort>("recentes");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { todos: 0, lido: 0, lendo: 0, "quero-ler": 0, abandonado: 0 };
    for (const b of books ?? []) {
      c.todos++;
      c[b.status]++;
    }
    return c;
  }, [books]);

  const visible = useMemo(() => {
    let list: Book[] = books ?? [];
    if (filter !== "todos") list = list.filter((b) => b.status === filter);
    const q = normalize(deferredQuery.trim());
    if (q) list = list.filter((b) => normalize(`${b.title} ${b.authors.join(" ")}`).includes(q));
    const lastRead = stats?.lastRead;
    return [...list].sort((a, b) => {
      if (sort === "titulo") return collator.compare(a.title, b.title);
      if (sort === "autor") return collator.compare(a.authors[0] ?? "~", b.authors[0] ?? "~") || collator.compare(a.title, b.title);
      const ta = Math.max(lastRead?.get(a.id) ?? 0, a.createdAt);
      const tb = Math.max(lastRead?.get(b.id) ?? 0, b.createdAt);
      return tb - ta;
    });
  }, [books, filter, deferredQuery, sort, stats]);

  if (!books) return <Page eyebrow="Tudo o que você já leu" title="Biblioteca">{null}</Page>;

  const booksRead = stats?.booksRead ?? 0;
  const eyebrow =
    books.length === 0
      ? "Tudo o que você já leu"
      : `${booksRead} ${booksRead === 1 ? "lido" : "lidos"} na vida · ${books.length} na estante`;

  return (
    <Page
      eyebrow={eyebrow}
      title="Biblioteca"
      actions={
        books.length > 0 && (
          <button className="round-button" onClick={() => setAddOpen(true)} aria-label="Adicionar livros">
            <Icon name="plus" size={22} />
          </button>
        )
      }
    >
      {books.length === 0 ? (
        <EmptyLibrary onImport={() => pickAndImport()} onPhysical={() => setPhysicalOpen(true)} />
      ) : (
        <>
          <div className="library-tools">
            <label className="search">
              <Icon name="search" size={17} />
              <input
                type="search"
                placeholder="Buscar por título ou autor"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <div className="chips" role="tablist">
              {FILTERS.filter((f) => f.id === "todos" || counts[f.id] > 0).map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  className={`chip${filter === f.id ? " is-active" : ""}`}
                  onClick={() => setFilter(f.id)}
                >
                  {f.label}
                  <span className="chip-count">{counts[f.id]}</span>
                </button>
              ))}
            </div>
            <div className="sort">
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  className={`sort-option${sort === s.id ? " is-active" : ""}`}
                  onClick={() => setSort(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {visible.length > 0 ? (
            <Shelf books={visible} timesRead={stats?.timesRead ?? new Map()} onOpen={openBook} />
          ) : (
            <p className="library-nothing">Nenhum livro encontrado.</p>
          )}
        </>
      )}
    </Page>
  );
}
