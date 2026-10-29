import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { db } from "../../db/db";
import { finishReading } from "../../db/reading";
import type { Book } from "../../db/types";
import { BookCover } from "../library/BookCover";
import { Stars } from "../library/Stars";
import "./FinishSheet.css";

interface Props {
  open: boolean;
  onClose: () => void;
  book: Book;
  readingId: string;
  pagesThisSession: number;
}

const SPARKS = Array.from({ length: 14 }, (_, i) => i);

export function FinishSheet({ open, onClose, book, readingId }: Props) {
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [info, setInfo] = useState<{ days: number | null; nth: number; pages: number } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDone(false);
    (async () => {
      const reading = await db.readings.get(readingId);
      const previous = await db.readings
        .where("bookId")
        .equals(book.id)
        .filter((r) => r.deletedAt === null && r.state === "concluida")
        .count();
      const sessions = await db.sessions.where("bookId").equals(book.id).filter((s) => s.readingId === readingId).toArray();
      const days = reading?.startedAt ? Math.max(1, Math.ceil((Date.now() - reading.startedAt) / 86_400_000)) : null;
      setInfo({ days, nth: previous + 1, pages: sessions.reduce((a, s) => a + s.pages, 0) });
      setRating(reading?.rating ?? null);
      setNotes(reading?.notes ?? "");
    })();
  }, [open, readingId, book.id]);

  const confirm = async () => {
    await finishReading(readingId, rating, notes.trim());
    setDone(true);
    navigator.vibrate?.([10, 40, 10]);
    setTimeout(onClose, 1400);
  };

  return (
    <Sheet open={open} onClose={onClose} label="Fim do livro">
      <div className="finish">
        <div className="finish-hero">
          {SPARKS.map((i) => (
            <motion.span
              key={i}
              className="finish-spark"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.6],
                x: Math.cos((i / SPARKS.length) * Math.PI * 2) * (70 + (i % 3) * 18),
                y: Math.sin((i / SPARKS.length) * Math.PI * 2) * (60 + (i % 3) * 14),
              }}
              transition={{ duration: 1.4, delay: 0.15 + (i % 4) * 0.05, ease: "easeOut" }}
            />
          ))}
          <motion.div initial={{ scale: 0.8, rotate: -4 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
            <BookCover book={book} width={96} />
          </motion.div>
        </div>
        <p className="finish-eyebrow">Fim</p>
        <h2 className="finish-title">{done ? "Na estante dos lidos!" : `Você terminou ${book.title}`}</h2>
        {info && (
          <p className="finish-facts">
            {info.nth > 1 ? `Sua ${info.nth}ª leitura deste livro` : "Sua primeira leitura deste livro"}
            {info.days ? ` · ${info.days} ${info.days === 1 ? "dia" : "dias"}` : ""}
            {info.pages > 0 ? ` · ${info.pages} páginas com o Sépia` : ""}
          </p>
        )}

        {!done && (
          <>
            <div className="finish-rating">
              <span>O que achou?</span>
              <Stars value={rating} onChange={setRating} size={30} />
            </div>
            <label className="field">
              <span className="field-label">Uma frase para lembrar deste livro</span>
              <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
            </label>
            <div className="reading-form-actions">
              <Button size="lg" onClick={confirm}>
                Marcar como lido
              </Button>
              <Button size="lg" variant="ghost" onClick={onClose}>
                Ainda não terminei
              </Button>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
}
