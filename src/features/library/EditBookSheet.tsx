import { useEffect, useState } from "react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { setCover, updateBook } from "../../db/books";
import type { Book } from "../../db/types";
import { processCover } from "../import/image";
import { BookCover } from "./BookCover";

export function EditBookSheet({ book, open, onClose }: { book: Book; open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState(book.title);
  const [authors, setAuthors] = useState(book.authors.join(", "));
  const [pages, setPages] = useState(book.pageCount ? String(book.pageCount) : "");
  const [year, setYear] = useState(book.year ? String(book.year) : "");
  const [publisher, setPublisher] = useState(book.publisher ?? "");

  useEffect(() => {
    if (!open) return;
    setTitle(book.title);
    setAuthors(book.authors.join(", "));
    setPages(book.pageCount ? String(book.pageCount) : "");
    setYear(book.year ? String(book.year) : "");
    setPublisher(book.publisher ?? "");
  }, [open, book]);

  const pickCover = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const processed = await processCover(file);
      if (processed) await setCover(book.id, processed.blob, processed.tint);
    };
    input.click();
  };

  const save = async () => {
    const pageCount = parseInt(pages, 10);
    await updateBook(book.id, {
      title: title.trim() || book.title,
      authors: authors.split(",").map((a) => a.trim()).filter(Boolean),
      pageCount: pageCount > 0 ? pageCount : null,
      pageCountEstimated: pageCount > 0 && pageCount === book.pageCount ? book.pageCountEstimated : false,
      year: parseInt(year, 10) || null,
      publisher: publisher.trim() || null,
    });
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label="Editar livro">
      <div className="reading-form">
        <p className="reading-form-eyebrow">Editar informações</p>
        <div className="edit-cover">
          <BookCover book={book} width={72} />
          <Button variant="secondary" onClick={pickCover}>
            Trocar capa
          </Button>
        </div>
        <label className="field">
          <span className="field-label">Título</span>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Autoria (separe com vírgula)</span>
          <input type="text" value={authors} onChange={(e) => setAuthors(e.target.value)} />
        </label>
        <div className="field-row">
          <label className="field">
            <span className="field-label">Páginas</span>
            <input type="number" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Ano</span>
            <input type="number" inputMode="numeric" value={year} onChange={(e) => setYear(e.target.value)} />
          </label>
        </div>
        <label className="field">
          <span className="field-label">Editora</span>
          <input type="text" value={publisher} onChange={(e) => setPublisher(e.target.value)} />
        </label>
        <div className="reading-form-actions">
          <Button size="lg" onClick={save}>
            Salvar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
