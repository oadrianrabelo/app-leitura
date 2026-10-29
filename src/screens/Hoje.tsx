import { useMemo } from "react";
import { motion } from "motion/react";
import { Page, Section } from "../components/Page";
import { Icon, type IconName } from "../components/Icon";
import { Button } from "../components/Button";
import { useBooks } from "../db/hooks";
import { useLibraryStats } from "../db/stats";
import { BookCover } from "../features/library/BookCover";
import { useLibraryUi } from "../features/library/state";
import { useReaderUi } from "../features/reader/state";
import { useRhythm } from "../db/reading";
import { useReadings } from "../db/hooks";
import "./Hoje.css";

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export function Hoje({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const now = new Date();
  const books = useBooks();
  const stats = useLibraryStats();
  const openBook = useLibraryUi((s) => s.openBook);
  const openReader = useReaderUi((s) => s.open);
  const rhythm = useRhythm();
  const readings = useReadings();
  const progressOf = (bookId: string) => readings?.find((r) => r.bookId === bookId && r.state === "lendo")?.progress ?? 0;

  const current = useMemo(() => (books ?? []).filter((b) => b.status === "lendo"), [books]);

  const tiles: { icon: IconName; value: number; label: string }[] = [
    { icon: "bookmark", value: stats?.booksRead ?? 0, label: (stats?.booksRead ?? 0) === 1 ? "livro lido na vida" : "livros lidos na vida" },
    { icon: "target", value: rhythm?.pagesToday ?? 0, label: (rhythm?.pagesToday ?? 0) === 1 ? "página hoje" : "páginas hoje" },
    { icon: "flame", value: rhythm?.streak ?? 0, label: (rhythm?.streak ?? 0) === 1 ? "dia seguido" : "dias seguidos" },
  ];

  return (
    <Page eyebrow={weekday.format(now)} title={greeting(now)}>
      {current.length > 0 ? (
        <div className="current-list">
          {current.map((book, i) => (
            <motion.button
              key={book.id}
              className="current-card is-book"
              onClick={() => (book.format !== "fisico" && book.fileId ? openReader(book.id) : openBook(book.id))}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <BookCover book={book} width={84} />
              <div className="current-body">
                <p className="current-eyebrow">Lendo agora</p>
                <h2 className="current-title">{book.title}</h2>
                <p className="current-author">{book.authors.join(", ")}</p>
                {book.format !== "fisico" && book.fileId ? (
                  <div className="current-progress">
                    <div className="current-progress-bar">
                      <span style={{ transform: `scaleX(${progressOf(book.id)})` }} />
                    </div>
                    <span className="current-progress-label">
                      {Math.round(progressOf(book.id) * 100)}%
                      {book.pageCount ? ` · faltam ≈ ${Math.max(0, Math.round(book.pageCount * (1 - progressOf(book.id))))} páginas` : ""}
                    </span>
                  </div>
                ) : (
                  book.pageCount && <p className="current-text">{book.pageCount} páginas</p>
                )}
              </div>
              <Icon name="chevron" size={18} className="current-chevron" />
            </motion.button>
          ))}
        </div>
      ) : (
        <motion.div
          className="current-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="current-cover" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className="current-body">
            <p className="current-eyebrow">Lendo agora</p>
            <h2 className="current-title">Nenhum livro aberto</h2>
            <p className="current-text">
              Escolha um livro na biblioteca e toque em “Comecei a ler”. Ele aparece aqui para você voltar
              rapidinho.
            </p>
            <Button variant="secondary" onClick={onOpenLibrary}>
              <Icon name="library" size={16} />
              Ir para a biblioteca
            </Button>
          </div>
        </motion.div>
      )}

      <Section title="Seu ritmo">
        <div className="stats">
          {tiles.map((s, i) => (
            <motion.div
              key={s.icon}
              className="stat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon name={s.icon} size={18} className="stat-icon" />
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </motion.div>
          ))}
        </div>
        <p className="stats-note">
          {rhythm?.readToday
            ? rhythm.minutesToday >= 1
              ? `Hoje já foram ${rhythm.minutesToday} min de leitura. `
              : "Você já leu hoje. "
            : "Algumas páginas hoje mantêm a sequência viva. "}
          Ela é gentil: um dia de descanso na semana não apaga o que você construiu.
        </p>
      </Section>
    </Page>
  );
}
