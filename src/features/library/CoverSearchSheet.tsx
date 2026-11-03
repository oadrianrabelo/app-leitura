import { useEffect, useRef, useState } from "react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { setCover } from "../../db/books";
import type { Book } from "../../db/types";
import { processCover } from "../import/image";
import { findCovers, type FoundCover } from "../physical/lookup";
import "./CoverSearchSheet.css";

interface Props {
  book: Book;
  open: boolean;
  onClose: () => void;
  /** Escolher uma imagem do aparelho (galeria/arquivos) */
  onPickFile: () => void;
}

/** Procura a capa em todos os catálogos e deixa escolher entre as encontradas */
export function CoverSearchSheet({ book, open, onClose, onPickFile }: Props) {
  const [found, setFound] = useState<(FoundCover & { src: string })[]>([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const run = useRef(0);

  useEffect(() => {
    if (!open) return;
    const id = ++run.current;
    setFound([]);
    setSearching(true);
    findCovers(book, (c) => {
      if (id !== run.current) return;
      setFound((list) => [...list, { ...c, src: URL.createObjectURL(c.blob) }]);
    })
      .catch(() => {})
      .finally(() => id === run.current && setSearching(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, book.id]);

  // libera as imagens temporárias ao fechar
  useEffect(() => {
    if (open) return;
    found.forEach((f) => URL.revokeObjectURL(f.src));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const choose = async (c: FoundCover) => {
    setSaving(c.url);
    const processed = await processCover(c.blob);
    if (processed) await setCover(book.id, processed.blob, processed.tint);
    setSaving(null);
    onClose();
  };

  return (
    <Sheet open={open} onClose={onClose} label="Buscar capa" tall={found.length > 4}>
      <p className="reading-form-eyebrow">Capa</p>
      <h2 className="reading-form-title">Escolha a capa</h2>
      <p className="cover-search-note">
        {searching
          ? "Procurando na Amazon, Google Books, Open Library e catálogos brasileiros…"
          : found.length
            ? "Toque na capa certa."
            : "Não achei nenhuma capa para este livro. Você pode usar uma foto."}
      </p>
      <div className="cover-search-grid">
        {found.map((c) => (
          <button key={c.url} className="cover-search-item" onClick={() => choose(c)} disabled={!!saving}>
            <img src={c.src} alt="" />
            {saving === c.url && <span className="cover-search-saving">Guardando…</span>}
          </button>
        ))}
        {searching && Array.from({ length: Math.max(0, 3 - found.length) }, (_, i) => <span key={i} className="cover-search-skeleton" />)}
      </div>
      <div className="reading-form-actions">
        <Button
          variant="secondary"
          onClick={() => {
            onClose();
            onPickFile();
          }}
        >
          Usar uma foto ou imagem do celular
        </Button>
      </div>
    </Sheet>
  );
}
