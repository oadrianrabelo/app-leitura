import { memo } from "react";
import type { Book } from "../../db/types";
import { CLOTH, hash } from "./BookCover";
import "./BookSpine.css";

/** Texto claro ou escuro, conforme a cor da lombada */
function inkFor(hex: string) {
  const n = parseInt(hex.replace("#", "").slice(0, 6), 16);
  if (Number.isNaN(n)) return "#f6ecdc";
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? "#2a2018" : "#f6ecdc";
}

/** Largura pela grossura do livro (páginas) e altura variando um pouco, como numa estante de verdade. */
export function spineSize(book: Pick<Book, "title" | "pageCount">, coverHeight: number) {
  const pages = book.pageCount ?? 260;
  const width = Math.round(Math.min(46, Math.max(22, 16 + pages / 16)));
  const height = Math.round(coverHeight * (0.9 + (hash(book.title) % 16) / 100));
  return { width, height };
}

/** Diminui a letra dos títulos longos para caberem inteiros na lombada, até um mínimo legível */
function titleSize(title: string, width: number, height: number) {
  const fit = (height - 52) / (title.length * 0.56);
  return Math.max(8, Math.min(13, width * 0.42, fit));
}

interface Props {
  book: Pick<Book, "title" | "authors" | "pageCount" | "tint">;
  width: number;
  height: number;
}

export const BookSpine = memo(function BookSpine({ book, width, height }: Props) {
  const h = hash(book.title);
  const [cloth, foil] = CLOTH[h % CLOTH.length];
  const bg = book.tint ?? cloth;
  const ink = book.tint ? inkFor(book.tint) : foil;
  const author = book.authors[0]?.split(" ").pop();
  return (
    <div className={`spine-book band-${h % 3}`} style={{ width, height, background: bg, color: ink }}>
      <span className="spine-title" style={{ fontSize: titleSize(book.title, width, height) }}>
        {book.title}
      </span>
      {author && <span className="spine-author">{author}</span>}
    </div>
  );
});
