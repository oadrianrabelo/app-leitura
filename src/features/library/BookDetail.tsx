import { useMemo, useState } from "react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { addReading, deleteBook, updateBook } from "../../db/books";
import { useBook, useReadings } from "../../db/hooks";
import type { Book, Reading } from "../../db/types";
import { BookCover } from "./BookCover";
import { EditBookSheet } from "./EditBookSheet";
import { ReadingSheet, type ReadingDraft } from "./ReadingSheet";
import { Stars } from "./Stars";
import { formatDate, ordinal } from "./dates";
import { useLibraryUi } from "./state";
import { useReaderUi } from "../reader/state";
import { db } from "../../db/db";
import { usePosition } from "../../db/reading";
import "./BookDetail.css";

const FORMAT_LABEL: Record<Book["format"], string> = { epub: "EPUB", pdf: "PDF", mobi: "MOBI", fisico: "Livro físico" };
const STATUS_LABEL: Record<Book["status"], string> = { "quero-ler": "Quero ler", lendo: "Lendo", lido: "Lido", abandonado: "Abandonado" };
const STATE_LABEL: Record<Reading["state"], string> = { lendo: "Em andamento", concluida: "Concluída", abandonada: "Abandonada" };

function ReadingCard({ reading, index, onEdit }: { reading: Reading; index: number; onEdit: () => void }) {
  const start = formatDate(reading.startedAt);
  const end = formatDate(reading.finishedAt, reading.approximate);
  let when: string;
  if (reading.state === "lendo") when = start ? `Desde ${start}` : "Em andamento";
  else if (start && end) when = `${start} → ${end}`;
  else if (end) when = `${reading.state === "concluida" ? "Terminou em" : "Parou em"} ${end}`;
  else when = reading.state === "concluida" ? "Lido antes do Sépia" : "Data não registrada";

  return (
    <button className={`reading-card is-${reading.state}`} onClick={onEdit}>
      <span className="reading-card-index">{ordinal(index)}</span>
      <span className="reading-card-body">
        <span className="reading-card-top">
          <strong>{index === 1 ? "Primeira leitura" : `${ordinal(index)} leitura`}</strong>
          <span className="reading-card-state">{STATE_LABEL[reading.state]}</span>
        </span>
        <span className="reading-card-when">
          {when} · {reading.medium === "fisico" ? "físico" : "digital"}
        </span>
        {reading.rating && <Stars value={reading.rating} size={14} />}
        {reading.notes && <span className="reading-card-notes">“{reading.notes}”</span>}
      </span>
      <Icon name="chevron" size={16} className="reading-card-chevron" />
    </button>
  );
}

function DetailBody({ book, readings }: { book: Book; readings: Reading[] }) {
  const closeBook = useLibraryUi((s) => s.closeBook);
  const position = usePosition(book.id);
  const [draft, setDraft] = useState<ReadingDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showFull, setShowFull] = useState(false);

  // Ordem cronológica para numerar (1ª, 2ª...), exibida da mais recente para a mais antiga
  const numbered = useMemo(() => {
    const chrono = [...readings].sort(
      (a, b) => (a.startedAt ?? a.finishedAt ?? a.createdAt) - (b.startedAt ?? b.finishedAt ?? b.createdAt),
    );
    return chrono.map((r, i) => ({ reading: r, index: i + 1 })).reverse();
  }, [readings]);

  const timesRead = readings.filter((r) => r.state === "concluida").length;
  const active = readings.find((r) => r.state === "lendo");
  const physical = book.format === "fisico";
  const medium: Reading["medium"] = physical ? "fisico" : "digital";
  const readable = !physical && !!book.fileId;
  const openReader = () => {
    closeBook();
    setTimeout(() => useReaderUi.getState().open(book.id), 240);
  };
  // Releitura começa do início, com uma leitura nova
  const rereadInApp = async () => {
    await db.positions.delete(book.id);
    await addReading(book.id, { state: "lendo", medium: "digital" });
    openReader();
  };
  const newReading = (preset: ReadingDraft["preset"]) => setDraft({ bookId: book.id, title: book.title, preset: { medium, ...preset } });

  const meta = [
    FORMAT_LABEL[book.format],
    book.pageCount ? `${book.pageCountEstimated ? "≈ " : ""}${book.pageCount} páginas` : null,
    book.year ? String(book.year) : null,
    book.publisher,
  ].filter(Boolean);

  const remove = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteBook(book.id);
    closeBook();
  };

  return (
    <div className="detail">
      <div className="detail-hero" style={{ ["--tint" as string]: book.tint ?? "var(--accent)" }}>
        <BookCover book={book} width={128} className="detail-cover" />
        <div className="detail-heading">
          <h2 className="detail-title">{book.title}</h2>
          <p className="detail-authors">{book.authors.join(", ") || "Autor desconhecido"}</p>
          <p className="detail-meta">{meta.join(" · ")}</p>
          <div className="detail-badges">
            <span className={`status-pill is-${book.status}`}>{STATUS_LABEL[book.status]}</span>
            {timesRead > 1 && <span className="times-pill">Lido {timesRead}×</span>}
            <button
              className={`fav${book.favorite ? " is-on" : ""}`}
              onClick={() => updateBook(book.id, { favorite: !book.favorite })}
              aria-label={book.favorite ? "Tirar dos favoritos" : "Favoritar"}
            >
              <Icon name="heart" size={20} fill={book.favorite ? "currentColor" : "none"} />
            </button>
          </div>
        </div>
      </div>

      <div className="detail-actions">
        {readable && (
          <Button size="lg" onClick={() => (book.status === "lido" && !active ? rereadInApp() : openReader())}>
            <Icon name={book.status === "lido" && !active ? "reread" : "read"} size={18} />
            {active && position
              ? `Continuar lendo · ${Math.round(position.fraction * 100)}%`
              : book.status === "lido"
                ? "Ler de novo"
                : "Começar a ler"}
          </Button>
        )}
        {active ? (
          <>
            {!readable && (
              <Button size="lg" onClick={() => setDraft({ bookId: book.id, title: book.title, reading: { ...active, state: "concluida" } })}>
                <Icon name="check" size={18} /> Terminei
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => setDraft({ bookId: book.id, title: book.title, reading: readable ? { ...active, state: "concluida" } : active })}>
              {readable ? "Marcar como terminado" : "Editar leitura"}
            </Button>
          </>
        ) : book.status === "lido" ? (
          !readable && (
            <Button size="lg" onClick={() => addReading(book.id, { state: "lendo", medium })}>
              <Icon name="reread" size={18} /> Ler de novo
            </Button>
          )
        ) : (
          <>
            {!readable && (
              <Button size="lg" onClick={() => addReading(book.id, { state: "lendo", medium })}>
                <Icon name="book" size={18} /> Comecei a ler
              </Button>
            )}
            <Button size="lg" variant="secondary" onClick={() => newReading({ state: "concluida" })}>
              Já li este livro
            </Button>
          </>
        )}
      </div>

      <section className="detail-section">
        <div className="detail-section-head">
          <h3>Leituras</h3>
          <button onClick={() => newReading({ state: "concluida", approximate: true })}>
            <Icon name="plus" size={16} /> Leitura antiga
          </button>
        </div>
        {numbered.length === 0 ? (
          <p className="detail-empty">Nenhuma leitura registrada ainda.</p>
        ) : (
          <div className="reading-list">
            {numbered.map(({ reading, index }) => (
              <ReadingCard key={reading.id} reading={reading} index={index} onEdit={() => setDraft({ bookId: book.id, title: book.title, reading })} />
            ))}
          </div>
        )}
      </section>

      {book.description && (
        <section className="detail-section">
          <h3>Sinopse</h3>
          <p className={`detail-description${showFull ? " is-full" : ""}`}>{book.description}</p>
          {book.description.length > 280 && (
            <button className="detail-more" onClick={() => setShowFull(!showFull)}>
              {showFull ? "Mostrar menos" : "Mostrar mais"}
            </button>
          )}
        </section>
      )}

      {(book.isbn || book.subjects.length > 0 || book.language) && (
        <section className="detail-section">
          <h3>Detalhes</h3>
          <dl className="detail-facts">
            {book.isbn && (
              <>
                <dt>ISBN</dt>
                <dd>{book.isbn}</dd>
              </>
            )}
            {book.language && (
              <>
                <dt>Idioma</dt>
                <dd>{book.language}</dd>
              </>
            )}
            {book.subjects.length > 0 && (
              <>
                <dt>Assuntos</dt>
                <dd>{book.subjects.slice(0, 6).join(", ")}</dd>
              </>
            )}
          </dl>
        </section>
      )}

      <div className="detail-footer">
        <Button variant="ghost" onClick={() => setEditing(true)}>
          <Icon name="pencil" size={16} /> Editar informações
        </Button>
        <Button variant="ghost" onClick={remove} className={confirmDelete ? "is-danger" : ""}>
          <Icon name="trash" size={16} /> {confirmDelete ? "Toque de novo para remover" : "Remover da estante"}
        </Button>
      </div>

      <ReadingSheet draft={draft} onClose={() => setDraft(null)} />
      <EditBookSheet book={book} open={editing} onClose={() => setEditing(false)} />
    </div>
  );
}

export function BookDetail() {
  const { openBookId, closeBook } = useLibraryUi();
  const book = useBook(openBookId);
  const readings = useReadings(openBookId);

  return (
    <Sheet open={!!openBookId} onClose={closeBook} label={book?.title ?? "Livro"} tall>
      {book && readings && <DetailBody key={book.id} book={book} readings={readings} />}
    </Sheet>
  );
}
