import { useMemo, type CSSProperties } from "react";
import { motion } from "motion/react";
import { Page, Section } from "../components/Page";
import { Icon } from "../components/Icon";
import { Button } from "../components/Button";
import { useBooks } from "../db/hooks";
import { useLibraryStats } from "../db/stats";
import { BookCover } from "../features/library/BookCover";
import { useLibraryUi } from "../features/library/state";
import { useReaderUi } from "../features/reader/state";
import { useRhythm } from "../db/reading";
import { useReadings } from "../db/hooks";
import { WeekRow } from "../components/WeekRow";
import { Botanical } from "../components/Botanical";
import { useSettings } from "../lib/settings";
import { useState } from "react";
import type { Book } from "../db/types";
import { useTrecho } from "../features/hoje/trecho";
import "./Hoje.css";

/** Uma frase pessoal embaixo da saudação, conforme a hora e o que está lendo. */
function whisper(date: Date, reading: string | null, readToday: boolean): string {
  const h = date.getHours();
  if (readToday) return h >= 21 ? "Já leu hoje. Que tal só mais um capítulo antes de dormir?" : "Que bom te ver de novo por aqui.";
  if (reading) {
    if (h < 12) return `${reading} está te esperando. Umas páginas com o café?`;
    if (h < 18) return `Uma pausa no dia para ${reading}?`;
    return `${reading} está te esperando para uma leitura calma.`;
  }
  if (h < 12) return "Que tal começar o dia com um livro?";
  if (h < 18) return "Um bom momento para escolher a próxima leitura.";
  return "A noite pede uma boa história.";
}

function NamePrompt() {
  const setName = useSettings((s) => s.setName);
  const [value, setValue] = useState("");
  return (
    <form
      className="name-prompt"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim()) setName(value);
      }}
    >
      <label htmlFor="name-input">Como você gosta de ser chamada?</label>
      <div className="name-prompt-row">
        <input id="name-input" type="text" autoComplete="given-name" placeholder="Seu nome" value={value} onChange={(e) => setValue(e.target.value)} />
        <Button type="submit" disabled={!value.trim()}>
          Pronto
        </Button>
      </div>
    </form>
  );
}

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const readable = (b: Book) => b.format !== "fisico" && !!(b.fileId || b.fileHash);

/** Fundo do destaque: a cor da capa, escurecida, para o texto claro ficar legível */
function heroStyle(tint: string | null): CSSProperties {
  const base = tint ?? "#4a3a5c";
  return {
    background: `linear-gradient(160deg, color-mix(in srgb, ${base} 62%, #1d1724), color-mix(in srgb, ${base} 38%, #15111b))`,
  };
}

/** Uma frase de incentivo conforme o que falta */
function nudge(book: Book, progress: number, pagesToday: number): string {
  if (!book.pageCount || !readable(book)) return "Conte para o Sépia até onde você leu.";
  const left = Math.max(0, Math.round(book.pageCount * (1 - progress)));
  if (left === 0) return "Última página à vista!";
  if (left <= 30) return `Faltam só ${left} páginas. Dá para terminar hoje!`;
  if (pagesToday > 0) return `Hoje já foram ${pagesToday} páginas. Faltam ${left} para o fim.`;
  if (left <= 120) return `Faltam ${left} páginas. Dá para terminar esta semana.`;
  return `Faltam ${left} páginas. Um capítulo de cada vez.`;
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

export function Hoje({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const now = new Date();
  const name = useSettings((s) => s.name);
  const books = useBooks();
  const stats = useLibraryStats();
  const openBook = useLibraryUi((s) => s.openBook);
  const openReader = useReaderUi((s) => s.open);
  const rhythm = useRhythm();
  const readings = useReadings();
  const progressOf = (bookId: string) => readings?.find((r) => r.bookId === bookId && r.state === "lendo")?.progress ?? 0;

  // o livro em andamento lido mais recentemente vai para o destaque
  const current = useMemo(() => {
    const lastRead = stats?.lastRead;
    return (books ?? []).filter((b) => b.status === "lendo").sort((a, b) => (lastRead?.get(b.id) ?? b.updatedAt) - (lastRead?.get(a.id) ?? a.updatedAt));
  }, [books, stats]);
  const hero = current[0];
  const others = current.slice(1, 4);
  const trecho = useTrecho();



  return (
    <Page
      eyebrow={weekday.format(now)}
      title={name ? `${greeting(now)}, ${name}` : greeting(now)}
      decoration={<Botanical art="haste" />}
    >
      <p className="whisper">{whisper(now, current[0]?.title ?? null, rhythm?.readToday ?? false)}</p>
      {!name && <NamePrompt />}
      {hero ? (
        <motion.div
          className="hero"
          style={heroStyle(hero.tint)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hero-top">
            <button className="hero-cover" onClick={() => openBook(hero.id)} aria-label={`Detalhes de ${hero.title}`}>
              <BookCover book={hero} width={104} />
            </button>
            <div className="hero-body">
              <p className="hero-eyebrow">Lendo agora</p>
              <h2 className="hero-title">{hero.title}</h2>
              <p className="hero-author">{hero.authors.join(", ") || "Autor desconhecido"}</p>
              <p className="hero-nudge">{nudge(hero, progressOf(hero.id), rhythm?.pagesToday ?? 0)}</p>
            </div>
          </div>
          {readable(hero) && (
            <>
              <div className="hero-bar">
                <span style={{ transform: `scaleX(${Math.max(0.02, progressOf(hero.id))})` }} />
              </div>
              <div className="hero-bar-label">
                <span>{hero.pageCount ? `Página ${Math.max(1, Math.round(hero.pageCount * progressOf(hero.id)))} de ${hero.pageCount}` : "Em andamento"}</span>
                <span>{Math.round(progressOf(hero.id) * 100)}%</span>
              </div>
            </>
          )}
          <Button size="lg" className="hero-go" onClick={() => (readable(hero) ? openReader(hero.id) : openBook(hero.id))}>
            <Icon name={readable(hero) ? "book" : "pencil"} size={18} />
            {readable(hero) ? "Continuar lendo" : "Registrar leitura"}
          </Button>
          {others.length > 0 && (
            <div className="hero-others">
              <span>Também lendo</span>
              {others.map((b) => (
                <button key={b.id} onClick={() => (readable(b) ? openReader(b.id) : openBook(b.id))}>
                  <BookCover book={b} width={30} />
                  <span>{b.title}</span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
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

      <Section>
        <WeekRow />
      </Section>

      <Section>
        <div className="rhythm">
          <div className="rhythm-item is-verde">
            <b>{rhythm?.pagesToday ?? 0}</b>
            <span>{(rhythm?.pagesToday ?? 0) === 1 ? "página hoje" : "páginas hoje"}</span>
          </div>
          <div className="rhythm-item is-azul">
            <b>{rhythm?.minutesToday ?? 0}</b>
            <span>min lendo hoje</span>
          </div>
          <div className="rhythm-item is-rosa">
            <b>{stats?.booksRead ?? 0}</b>
            <span>{(stats?.booksRead ?? 0) === 1 ? "livro lido na vida" : "livros lidos na vida"}</span>
          </div>
        </div>
        <p className="stats-note">
          {rhythm?.readToday ? "A flor de hoje já desabrochou. " : "Algumas páginas hoje fazem a flor de hoje desabrochar. "}
          A sequência é gentil: um dia de descanso na semana não apaga o que você construiu.
        </p>
      </Section>

      {trecho !== undefined && (
        <Section>
          {trecho ? (
            <motion.figure className="trecho" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <span className="trecho-label">{trecho.highlighted ? "Um trecho que você destacou" : "Um trecho que você marcou"}</span>
              <blockquote>“{trecho.text}”</blockquote>
              <figcaption>
                {trecho.book}
                {trecho.chapter ? ` · ${trecho.chapter}` : ""}
              </figcaption>
            </motion.figure>
          ) : (
            <div className="trecho is-empty">
              <span className="trecho-label">Seus trechos favoritos</span>
              <p>Enquanto lê, segure o dedo num trecho que te tocou e escolha uma cor para destacar. Ele aparece aqui, um por dia.</p>
            </div>
          )}
        </Section>
      )}
    </Page>
  );
}
