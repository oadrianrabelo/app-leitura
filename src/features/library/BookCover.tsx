import { memo } from "react";
import { useCoverUrl } from "../../db/hooks";
import type { Book } from "../../db/types";
import "./BookCover.css";

// Paleta das capas geradas: tons de encadernação de tecido
const CLOTH = [
  ["#7a3b22", "#f1dcc0"],
  ["#2f4a43", "#e3dcc4"],
  ["#4a3a5c", "#ece0d0"],
  ["#5c4a1e", "#f3e3b8"],
  ["#283a52", "#e6dcc8"],
  ["#6b2c3a", "#f2dccf"],
  ["#3d4a2a", "#e9e2c4"],
  ["#4b3b33", "#efe0cc"],
];

function hash(text: string) {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(h);
}

interface Props {
  book: Pick<Book, "id" | "title" | "authors" | "hasCover">;
  width: number;
  className?: string;
}

export const BookCover = memo(function BookCover({ book, width, className = "" }: Props) {
  const url = useCoverUrl(book.id, book.hasCover);
  const height = Math.round(width * 1.5);
  const [bg, fg] = CLOTH[hash(book.title) % CLOTH.length];

  return (
    <div className={`cover ${className}`} style={{ width, height }}>
      {url ? (
        <img src={url} alt="" draggable={false} decoding="async" />
      ) : url === undefined ? (
        <div className="cover-loading" />
      ) : (
        <div className="cover-generated" style={{ background: bg, color: fg, fontSize: width / 8.5 }}>
          <span className="cover-generated-title">{book.title}</span>
          {book.authors[0] && <span className="cover-generated-author">{book.authors[0]}</span>}
        </div>
      )}
      <span className="cover-spine" aria-hidden />
    </div>
  );
});
