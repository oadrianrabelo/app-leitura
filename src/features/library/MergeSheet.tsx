import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { db } from "../../db/db";
import { mergeBooks } from "../../db/books";
import { findSimilar } from "../../db/similar";
import type { Book } from "../../db/types";
import { BookCover } from "./BookCover";
import "./MergeSheet.css";

const FORMAT: Record<Book["format"], string> = { epub: "EPUB", pdf: "PDF", mobi: "MOBI", fisico: "Físico" };
const strip = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

interface Props {
  book: Book;
  /** Já sabe com qual juntar (sugestão); sem isso, a leitora escolhe na lista */
  other?: Book | null;
  open: boolean;
  onClose: () => void;
  onMerged?: (keptId: string) => void;
}

/** Junta dois registros do mesmo livro: a leitora escolhe a capa, o resto vem junto */
export function MergeSheet({ book, other: suggested, open, onClose, onMerged }: Props) {
  const books = useLiveQuery(() => db.books.filter((b) => !b.deletedAt).toArray(), []);
  const counts = useLiveQuery(async () => {
    const ids = [book.id, suggested?.id].filter(Boolean) as string[];
    const out: Record<string, number> = {};
    for (const id of ids) out[id] = await db.readings.where("bookId").equals(id).filter((r) => !r.deletedAt).count();
    return out;
  }, [book.id, suggested?.id]);
  const [other, setOther] = useState<Book | null>(suggested ?? null);
  const [cover, setCover] = useState<string>(book.id);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setOther(suggested ?? null);
    setQuery("");
    // capa padrão: a que veio de um arquivo ou catálogo (tem imagem); senão a deste
    setCover(!book.hasCover && suggested?.hasCover ? suggested.id : book.id);
  }, [open, suggested, book]);

  const candidates = useMemo(() => {
    if (!books) return [];
    const others = books.filter((b) => b.id !== book.id);
    const q = strip(query.trim());
    if (q) return others.filter((b) => strip(`${b.title} ${b.authors.join(" ")}`).includes(q)).slice(0, 30);
    const similar = findSimilar(book, books);
    return similar ? [similar] : others.slice(0, 12);
  }, [books, book, query]);

  const merge = async () => {
    if (!other) return;
    setSaving(true);
    // fica o registro mais antigo (é o que tem mais história); a capa é a escolhida
    const [keep, drop] = book.createdAt <= other.createdAt ? [book, other] : [other, book];
    await mergeBooks(keep.id, drop.id, cover);
    setSaving(false);
    onClose();
    onMerged?.(keep.id);
  };

  const card = (b: Book) => (
    <button key={b.id} className={`merge-card${cover === b.id ? " is-chosen" : ""}`} onClick={() => setCover(b.id)}>
      <BookCover book={b} width={110} />
      <span className="merge-card-meta">
        {FORMAT[b.format]}
        {b.fileHash ? " · com arquivo" : ""}
      </span>
      {counts?.[b.id] ? <span className="merge-card-meta">{counts[b.id]} {counts[b.id] === 1 ? "leitura" : "leituras"}</span> : null}
      <span className="merge-card-pick">{cover === b.id ? "Esta capa" : "Usar esta capa"}</span>
    </button>
  );

  return (
    <Sheet open={open} onClose={onClose} label="Juntar livros" tall={!other}>
      <p className="reading-form-eyebrow">Juntar</p>
      {!other ? (
        <>
          <h2 className="reading-form-title">Juntar com qual livro?</h2>
          <label className="search merge-search">
            <Icon name="search" size={17} />
            <input type="search" placeholder="Buscar na estante" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <ul className="merge-list">
            {candidates.map((b) => (
              <li key={b.id}>
                <button onClick={() => setOther(b)}>
                  <BookCover book={b} width={40} />
                  <span>
                    <strong>{b.title}</strong>
                    <small>
                      {b.authors.join(", ") || "Autor desconhecido"} · {FORMAT[b.format]}
                    </small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <h2 className="reading-form-title">Um livro só</h2>
          <p className="merge-note">Escolha a capa que fica. Arquivo, leituras, marcadores e onde você parou vêm todos juntos.</p>
          <div className="merge-pair">
            {card(book)}
            <Icon name="plus" size={18} className="merge-plus" />
            {card(other)}
          </div>
          <div className="reading-form-actions">
            <Button size="lg" onClick={merge} disabled={saving}>
              {saving ? "Juntando…" : "Juntar os dois"}
            </Button>
            {!suggested && (
              <button className="merge-back" onClick={() => setOther(null)}>
                Escolher outro livro
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
