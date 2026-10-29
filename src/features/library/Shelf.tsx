import { useEffect, useRef, useState } from "react";
import type { Book } from "../../db/types";
import { BookCover } from "./BookCover";
import "./Shelf.css";

interface ShelfProps {
  books: Book[];
  timesRead: Map<string, number>;
  onOpen: (id: string) => void;
}

const MIN_COVER = 92;
const GAP = 16;

/** Livros em pé sobre prateleiras: cada linha da grade ganha sua tábua. */
export function Shelf({ books, timesRead, onOpen }: ShelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inner = Math.max(0, width - 2 * 14);
  const columns = Math.max(3, Math.floor((inner + GAP) / (MIN_COVER + GAP)));
  const coverWidth = width ? Math.floor((inner - GAP * (columns - 1)) / columns) : MIN_COVER;

  const rows: Book[][] = [];
  for (let i = 0; i < books.length; i += columns) rows.push(books.slice(i, i + columns));

  return (
    <div className="shelf-list" ref={ref}>
      {width > 0 &&
        rows.map((row, i) => (
          <div className="shelf-row" key={i}>
            <div className="shelf-row-books" style={{ gap: GAP }}>
              {row.map((book) => {
                const times = timesRead.get(book.id) ?? 0;
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
          </div>
        ))}
    </div>
  );
}
