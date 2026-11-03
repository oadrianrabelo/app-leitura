import { useEffect, useRef, useState } from "react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { setCover } from "../../db/books";
import type { Book } from "../../db/types";
import { processCover } from "../import/image";
import { coverFromPasted, findCovers, imageSearchUrl, type FoundCover } from "../physical/lookup";
import { openExternal } from "../../lib/open";
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
  const [pasted, setPasted] = useState("");
  const [pasteError, setPasteError] = useState<string | null>(null);
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

  const usePasted = async () => {
    setPasteError(null);
    setSaving("colado");
    try {
      const blob = await coverFromPasted(pasted);
      await choose({ url: pasted, blob });
    } catch (e) {
      setSaving(null);
      setPasteError(`${e instanceof Error ? e.message : String(e)} Se não der, baixe a imagem e use “Escolher imagem do celular”.`);
    }
  };

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
            : "Não achei nenhuma capa para este livro nos catálogos."}
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
      <div className="cover-web">
        <p className="cover-web-title">Não achou? Procure na internet</p>
        <ol className="cover-web-steps">
          <li>
            <Button variant="secondary" onClick={() => openExternal(imageSearchUrl(book))}>
              1. Procurar no Google Imagens
            </Button>
          </li>
          <li>
            <span>2. Abra a capa certa, segure o dedo nela e toque em <b>Baixar imagem</b>.</span>
          </li>
          <li>
            <Button
              variant="secondary"
              onClick={() => {
                onClose();
                onPickFile();
              }}
            >
              3. Escolher imagem do celular
            </Button>
          </li>
        </ol>
        <p className="cover-web-hint">Ou cole aqui um link da imagem ou da página do livro (Amazon, Mercado Livre, Skoob…):</p>
        <div className="cover-web-paste">
          <input
            type="url"
            inputMode="url"
            placeholder="Cole o link aqui"
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
          <Button onClick={usePasted} disabled={!pasted.trim() || !!saving}>
            {saving === "colado" ? "…" : "Usar"}
          </Button>
        </div>
        {pasteError && <p className="cover-web-error">{pasteError}</p>}
      </div>
    </Sheet>
  );
}
