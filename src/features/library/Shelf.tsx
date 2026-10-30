import { useEffect, useRef, useState } from "react";
import type { Book } from "../../db/types";
import { BookCover } from "./BookCover";
import { BookSpine, spineSize } from "./BookSpine";
import { useSettings, type ShelfView } from "../../lib/settings";
import { Botanical } from "../../components/Botanical";
import "./Shelf.css";

interface ShelfProps {
  books: Book[];
  timesRead: Map<string, number>;
  onOpen: (id: string) => void;
  view?: ShelfView;
}

const GARLANDS = ["guirlanda-1", "guirlanda-2", "guirlanda-3", "guirlanda-4", "guirlanda-5", "guirlanda-6"] as const;
const MIN_COVER = 92;
const GAP = 16;
const SPINE_GAP = 2;

/** Livros em pé sobre prateleiras: cada linha da grade ganha sua tábua. */
export function Shelf({ books, timesRead, onOpen, view = "capas" }: ShelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  const amount = useSettings((s) => s.floraAmount);
  const climbers = useSettings((s) => s.floraClimbers);
  // Quanto enfeite cada prateleira ganha, conforme Ajustes → Jardim
  const hasGarland = (i: number) => amount === "normal" || amount === "muita" || (amount === "pouca" && i % 2 === 0);
  // a primeira prateleira não ganha trepadeira: ela subiria por cima dos botões da tela
  const hasClimber = (i: number) => climbers && i > 0 && (amount === "muita" || (amount === "normal" && i % 3 === 1) || (amount === "pouca" && i % 4 === 1));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Aba escondida mede 0: ignora, senão a estante inteira seria desmontada e recriada
    const ro = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inner = Math.max(0, width - 2 * 14);
  const columns = Math.max(3, Math.floor((inner + GAP) / (MIN_COVER + GAP)));
  const coverWidth = width ? Math.floor((inner - GAP * (columns - 1)) / columns) : MIN_COVER;

  const spines = view === "lombadas";
  const coverHeight = Math.round(Math.min(coverWidth, 130) * 1.5);
  const rows: Book[][] = [];
  if (spines) {
    // Lombadas lado a lado: enche a prateleira até a largura acabar
    let row: Book[] = [];
    let used = 0;
    for (const book of books) {
      const w = spineSize(book, coverHeight).width + SPINE_GAP;
      if (row.length && used + w > inner + SPINE_GAP) {
        rows.push(row);
        row = [];
        used = 0;
      }
      row.push(book);
      used += w;
    }
    if (row.length) rows.push(row);
  } else {
    for (let i = 0; i < books.length; i += columns) rows.push(books.slice(i, i + columns));
  }

  return (
    <div className="shelf-list" ref={ref}>
      {width > 0 &&
        rows.map((row, i) => (
          <div className="shelf-row" key={i}>
            <div className={`shelf-row-books${spines ? " is-spines" : ""}`} style={{ gap: spines ? SPINE_GAP : GAP }}>
              {row.map((book) => {
                const times = timesRead.get(book.id) ?? 0;
                if (spines) {
                  const size = spineSize(book, coverHeight);
                  return (
                    <button key={book.id} className="shelf-book" onClick={() => onOpen(book.id)} aria-label={book.title}>
                      <BookSpine book={book} width={size.width} height={size.height} />
                      {book.status === "lendo" && <span className="shelf-ribbon is-spine" aria-label="Lendo" />}
                    </button>
                  );
                }
                return (
                  <button key={book.id} className="shelf-book" onClick={() => onOpen(book.id)} aria-label={book.title}>
                    <BookCover book={book} width={coverWidth} />
                    {book.status === "lendo" && <span className="shelf-ribbon" aria-label="Lendo" />}
                    {times > 1 && <span className="shelf-times">{times}×</span>}
                    {book.status === "lido" && times <= 1 && (
                      <span className="shelf-check" aria-label="Lido">✓</span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="shelf-row-board" />
            {/* Glicínias penduradas na tábua: desenhos e lados variando de prateleira em prateleira */}
            {hasGarland(i) && (
              <Botanical
                art={GARLANDS[(i * 5 + 1) % GARLANDS.length]}
                className={`shelf-row-garland${i % 2 ? " is-flipped" : ""}`}
                tone="destaque"
              />
            )}
            {/* Trepadeiras subindo pela lateral, alternando o lado e o desenho */}
            {hasClimber(i) && (
              <Botanical
                art={i % 4 < 2 ? "trepadeira" : "trepadeira-2"}
                className={`shelf-row-climber${i % 2 ? " is-left" : ""}${i % 4 < 2 ? "" : " is-twined"}`}
                tone="destaque"
              />
            )}
          </div>
        ))}
    </div>
  );
}
