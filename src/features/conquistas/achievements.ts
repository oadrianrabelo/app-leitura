/**
 * Conquistas do Sépia: calculadas a partir do que já existe no banco (leituras,
 * sessões, marcadores, visitas). Nada aqui é gravado: como os dados sincronizam,
 * as conquistas aparecem iguais em todos os aparelhos.
 */
import type { Book, Bookmark, Reading, Session, Visit } from "../../db/types";
import { dayKey } from "../../db/streak";

export type Tier = 0 | 1 | 2 | 3 | 4 | 5;

/** Nomes dos níveis, do primeiro ao último */
export const TIER_NAMES = ["Bronze", "Prata", "Ouro", "Glicínia", "Lendária", "Eterna"] as const;

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  /** Frase do que conta, com {n} no lugar da meta */
  goal: (n: number) => string;
  tiers: number[];
  unit?: string;
}

export interface Progress {
  value: number;
  /** Quando cada nível foi alcançado (mesma ordem de `tiers`); null se ainda não */
  reachedAt: (number | null)[];
}

export interface AchievementState extends AchievementDef, Progress {
  /** Quantos níveis já destravados */
  level: number;
  /** Próxima meta, ou null se completou todos */
  next: number | null;
}

export interface ReadingData {
  books: Book[];
  readings: Reading[];
  sessions: Session[];
  bookmarks: Bookmark[];
  visits: Visit[];
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: "livros", name: "Fim da história", icon: "book", tiers: [1, 5, 10, 25, 50, 100], goal: (n) => `Termine ${n} ${plural(n, "livro", "livros")}` },
  { id: "constancia", name: "Constância", icon: "flame", tiers: [3, 7, 14, 30, 100, 365], goal: (n) => `${n} dias seguidos lendo` },
  { id: "semanas", name: "Semana a semana", icon: "calendar", tiers: [2, 4, 12, 26, 52], goal: (n) => `Leia em ${n} semanas seguidas` },
  { id: "paginas", name: "Páginas viradas", icon: "file", tiers: [100, 1000, 5000, 10000, 50000, 100000], goal: (n) => `${n.toLocaleString("pt-BR")} páginas lidas` },
  { id: "horas", name: "Tempo bem gasto", icon: "coffee", tiers: [1, 10, 50, 100, 500], goal: (n) => `${n} ${plural(n, "hora", "horas")} de leitura` },
  { id: "maratona", name: "Maratona", icon: "sparkles", tiers: [60, 120, 240], goal: (n) => `${n / 60} ${plural(n / 60, "hora", "horas")} de leitura num só dia` },
  { id: "coruja", name: "Coruja", icon: "moon", tiers: [1, 10, 50], goal: (n) => `Leia depois da meia-noite ${n === 1 ? "uma vez" : `${n} vezes`}` },
  { id: "aurora", name: "Café com livro", icon: "sun", tiers: [1, 10, 50], goal: (n) => `Leia antes das 8h ${n === 1 ? "uma vez" : `${n} vezes`}` },
  { id: "fimdesemana", name: "Fim de semana de livro", icon: "heart", tiers: [1, 4, 12], goal: (n) => `Leia no sábado e no domingo em ${n} ${plural(n, "fim de semana", "fins de semana")}` },
  { id: "fa", name: "Fã de carteirinha", icon: "star", tiers: [3, 5, 10], goal: (n) => `Termine ${n} livros do mesmo autor` },
  { id: "vozes", name: "Muitas vozes", icon: "library", tiers: [5, 15, 30], goal: (n) => `Termine livros de ${n} autores diferentes` },
  { id: "releitura", name: "Velho amigo", icon: "reread", tiers: [1, 3, 10], goal: (n) => `Releia ${n} ${plural(n, "livro", "livros")}` },
  { id: "calhamaco", name: "Calhamaço", icon: "bookmarked", tiers: [1, 3, 10], goal: (n) => `Termine ${n} ${plural(n, "livro", "livros")} com 500 páginas ou mais` },
  { id: "folego", name: "Num fôlego só", icon: "target", tiers: [1, 5, 15], goal: (n) => `Termine ${n} ${plural(n, "livro", "livros")} em até 3 dias` },
  { id: "ano", name: "Um ano de livros", icon: "award", tiers: [12, 24, 52], goal: (n) => `${n} livros terminados no mesmo ano` },
  { id: "doismundos", name: "Dois mundos", icon: "barcode", tiers: [1], goal: () => "Termine um livro físico e um digital" },
  { id: "marcadores", name: "Orelha de livro", icon: "bookmark", tiers: [1, 10, 50], goal: (n) => `Marque ${n} ${plural(n, "página", "páginas")}` },
  { id: "presenca", name: "Presença", icon: "check", tiers: [7, 30, 100], goal: (n) => `Abra o Sépia ${n} dias seguidos` },
];

const DAY = 86400000;
const parseDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
};

/** Hora em que o n-ésimo evento aconteceu, para cada meta (eventos em ordem de tempo) */
function countReached(times: number[], tiers: number[]): (number | null)[] {
  const sorted = [...times].sort((a, b) => a - b);
  return tiers.map((n) => sorted[n - 1] ?? null);
}

/** Valor acumulado que cresce no tempo: quando passou de cada meta */
function cumulativeReached(events: { at: number; amount: number }[], tiers: number[]): (number | null)[] {
  const sorted = [...events].sort((a, b) => a.at - b.at);
  const out: (number | null)[] = tiers.map(() => null);
  let total = 0;
  for (const e of sorted) {
    total += e.amount;
    tiers.forEach((n, i) => {
      if (out[i] === null && total >= n) out[i] = e.at;
    });
  }
  return out;
}

/** Maior valor visto até cada momento (recordes como "maior sequência") */
function bestReached(series: { at: number; value: number }[], tiers: number[]): (number | null)[] {
  const out: (number | null)[] = tiers.map(() => null);
  for (const s of [...series].sort((a, b) => a.at - b.at)) {
    tiers.forEach((n, i) => {
      if (out[i] === null && s.value >= n) out[i] = s.at;
    });
  }
  return out;
}

/**
 * Sequência gentil dia a dia, em ordem: um dia sem ler entre dois dias lidos não quebra
 * (no máximo um por semana), igual à regra da tela Hoje.
 */
export function streakSeries(days: string[]): { at: number; value: number }[] {
  const sorted = [...new Set(days)].sort();
  const series: { at: number; value: number }[] = [];
  let streak = 0;
  let prev: number | null = null;
  let lastRest = -Infinity;
  for (const key of sorted) {
    const t = parseDay(key);
    if (prev === null) streak = 1;
    else {
      const gap = Math.round((t - prev) / DAY);
      if (gap === 1) streak++;
      else if (gap === 2 && t - lastRest >= 7 * DAY) {
        streak++;
        lastRest = t;
      } else streak = 1;
    }
    prev = t;
    series.push({ at: t, value: streak });
  }
  return series;
}

/** Semanas seguidas (de domingo a sábado) com pelo menos uma leitura */
function weekSeries(days: string[]): { at: number; value: number }[] {
  const weeks = [...new Set(days.map((k) => {
    const d = new Date(parseDay(k));
    d.setDate(d.getDate() - d.getDay());
    return d.getTime();
  }))].sort((a, b) => a - b);
  const series: { at: number; value: number }[] = [];
  let run = 0;
  let prev: number | null = null;
  for (const w of weeks) {
    run = prev !== null && Math.round((w - prev) / DAY) === 7 ? run + 1 : 1;
    prev = w;
    series.push({ at: w, value: run });
  }
  return series;
}

function consecutiveRuns(days: string[]): { at: number; value: number }[] {
  const sorted = [...new Set(days)].sort();
  const series: { at: number; value: number }[] = [];
  let run = 0;
  let prev: number | null = null;
  for (const key of sorted) {
    const t = parseDay(key);
    run = prev !== null && Math.round((t - prev) / DAY) === 1 ? run + 1 : 1;
    prev = t;
    series.push({ at: t, value: run });
  }
  return series;
}

export interface Summary {
  achievements: AchievementState[];
  finished: { reading: Reading; book: Book }[];
  records: {
    bestStreak: number;
    mostPagesDay: { pages: number; day: string | null };
    mostBooksYear: { books: number; year: number | null };
    longestBook: Book | null;
    totalHours: number;
    totalPages: number;
    readDays: number;
  };
  /** Livros terminados por ano */
  byYear: Map<number, number>;
}

export function evaluate(data: ReadingData): Summary {
  const books = new Map(data.books.filter((b) => !b.deletedAt).map((b) => [b.id, b]));
  const sessions = data.sessions.filter((s) => !s.deletedAt && books.has(s.bookId));
  const readings = data.readings.filter((r) => !r.deletedAt && books.has(r.bookId));
  const finished = readings
    .filter((r) => r.state === "concluida")
    .map((reading) => ({ reading, book: books.get(reading.bookId)! }))
    // leituras antigas sem data contam, mas vão para o começo da linha do tempo
    .sort((a, b) => (a.reading.finishedAt ?? a.reading.createdAt) - (b.reading.finishedAt ?? b.reading.createdAt));
  const doneAt = (r: Reading) => r.finishedAt ?? r.createdAt;

  const readDays = sessions.filter((s) => s.pages > 0 || s.seconds >= 60).map((s) => s.day);
  const perDay = new Map<string, { pages: number; seconds: number; at: number }>();
  for (const s of sessions) {
    const d = perDay.get(s.day) ?? { pages: 0, seconds: 0, at: s.endedAt };
    d.pages += s.pages;
    d.seconds += s.seconds;
    d.at = Math.max(d.at, s.endedAt);
    perDay.set(s.day, d);
  }

  // Livros por autor e por ano
  // livros distintos por autor (releitura não conta duas vezes aqui)
  const byAuthor = new Map<string, number[]>();
  const authorBooks = new Set<string>();
  const firstByAuthor = new Map<string, number>();
  const byYear = new Map<number, number>();
  const yearTimes = new Map<number, number[]>();
  const timesRead = new Map<string, number[]>();
  for (const { reading, book } of finished) {
    const t = doneAt(reading);
    const author = book.authors[0]?.trim().toLowerCase();
    if (author && !authorBooks.has(book.id)) {
      authorBooks.add(book.id);
      byAuthor.set(author, [...(byAuthor.get(author) ?? []), t]);
      if (!firstByAuthor.has(author)) firstByAuthor.set(author, t);
    }
    if (reading.finishedAt) {
      const y = new Date(reading.finishedAt).getFullYear();
      byYear.set(y, (byYear.get(y) ?? 0) + 1);
      yearTimes.set(y, [...(yearTimes.get(y) ?? []), t]);
    }
    timesRead.set(book.id, [...(timesRead.get(book.id) ?? []), t]);
  }

  const hourOf = (s: Session) => new Date(s.startedAt).getHours();
  const weekendTimes: number[] = [];
  {
    const days = new Set(readDays);
    for (const key of days) {
      const t = parseDay(key);
      if (new Date(t).getDay() !== 6) continue;
      if (days.has(dayKey(t + DAY))) weekendTimes.push(t + DAY);
    }
  }

  const sameAuthorSeries: { at: number; value: number }[] = [];
  for (const times of byAuthor.values()) times.forEach((t, i) => sameAuthorSeries.push({ at: t, value: i + 1 }));

  const yearSeries: { at: number; value: number }[] = [];
  for (const times of yearTimes.values()) [...times].sort((a, b) => a - b).forEach((t, i) => yearSeries.push({ at: t, value: i + 1 }));

  const rereadTimes = [...timesRead.values()].filter((t) => t.length > 1).map((t) => [...t].sort((a, b) => a - b)[1]);

  const physical = finished.filter((f) => f.reading.medium === "fisico").map((f) => doneAt(f.reading));
  const digital = finished.filter((f) => f.reading.medium !== "fisico").map((f) => doneAt(f.reading));
  const bothAt = physical.length && digital.length ? Math.max(Math.min(...physical), Math.min(...digital)) : null;

  const measures: Record<string, Progress> = {};
  const set = (id: string, value: number, reachedAt: (number | null)[]) => (measures[id] = { value, reachedAt });
  const def = (id: string) => ACHIEVEMENTS.find((a) => a.id === id)!.tiers;

  set("livros", finished.length, countReached(finished.map((f) => doneAt(f.reading)), def("livros")));

  const streaks = streakSeries(readDays);
  const bestStreak = Math.max(0, ...streaks.map((s) => s.value));
  set("constancia", bestStreak, bestReached(streaks, def("constancia")));

  const weeks = weekSeries(readDays);
  set("semanas", Math.max(0, ...weeks.map((w) => w.value)), bestReached(weeks, def("semanas")));

  const pageEvents = sessions.map((s) => ({ at: s.endedAt, amount: s.pages }));
  const totalPages = pageEvents.reduce((a, e) => a + e.amount, 0);
  set("paginas", totalPages, cumulativeReached(pageEvents, def("paginas")));

  const hourEvents = sessions.map((s) => ({ at: s.endedAt, amount: s.seconds / 3600 }));
  const totalHours = hourEvents.reduce((a, e) => a + e.amount, 0);
  set("horas", Math.floor(totalHours), cumulativeReached(hourEvents, def("horas")));

  const dayMinutes = [...perDay.values()].map((d) => ({ at: d.at, value: d.seconds / 60 }));
  set("maratona", Math.floor(Math.max(0, ...dayMinutes.map((d) => d.value))), bestReached(dayMinutes, def("maratona")));

  const owl = sessions.filter((s) => hourOf(s) < 4 && s.seconds >= 120).map((s) => s.startedAt);
  set("coruja", owl.length, countReached(owl, def("coruja")));

  const dawn = sessions.filter((s) => hourOf(s) >= 4 && hourOf(s) < 8 && s.seconds >= 120).map((s) => s.startedAt);
  set("aurora", dawn.length, countReached(dawn, def("aurora")));

  set("fimdesemana", weekendTimes.length, countReached(weekendTimes, def("fimdesemana")));
  set("fa", Math.max(0, ...[...byAuthor.values()].map((t) => t.length)), bestReached(sameAuthorSeries, def("fa")));
  set("vozes", byAuthor.size, countReached([...firstByAuthor.values()], def("vozes")));
  set("releitura", rereadTimes.length, countReached(rereadTimes, def("releitura")));

  const big = finished.filter((f) => (f.book.pageCount ?? 0) >= 500).map((f) => doneAt(f.reading));
  set("calhamaco", big.length, countReached(big, def("calhamaco")));

  const quick = finished
    .filter((f) => f.reading.startedAt && f.reading.finishedAt && !f.reading.approximate && f.reading.finishedAt - f.reading.startedAt <= 3 * DAY)
    .map((f) => f.reading.finishedAt!);
  set("folego", quick.length, countReached(quick, def("folego")));

  set("ano", Math.max(0, ...byYear.values()), bestReached(yearSeries, def("ano")));
  set("doismundos", bothAt ? 1 : 0, [bothAt]);

  const marks = data.bookmarks.filter((b) => !b.deletedAt).map((b) => b.createdAt);
  set("marcadores", marks.length, countReached(marks, def("marcadores")));

  const visitRuns = consecutiveRuns(data.visits.map((v) => v.day));
  set("presenca", Math.max(0, ...visitRuns.map((v) => v.value)), bestReached(visitRuns, def("presenca")));

  const achievements = ACHIEVEMENTS.map((a) => {
    const m = measures[a.id];
    const level = m.reachedAt.filter((t) => t !== null).length;
    return { ...a, ...m, level, next: a.tiers[level] ?? null };
  });

  let mostPagesDay = { pages: 0, day: null as string | null };
  for (const [day, d] of perDay) if (d.pages > mostPagesDay.pages) mostPagesDay = { pages: d.pages, day };
  let mostBooksYear = { books: 0, year: null as number | null };
  for (const [year, n] of byYear) if (n > mostBooksYear.books) mostBooksYear = { books: n, year };
  const longestBook = finished.reduce<Book | null>((best, f) => ((f.book.pageCount ?? 0) > (best?.pageCount ?? 0) ? f.book : best), null);

  return {
    achievements,
    finished,
    byYear,
    records: { bestStreak, mostPagesDay, mostBooksYear, longestBook, totalHours, totalPages, readDays: new Set(readDays).size },
  };
}

/** Chave única de cada nível destravado, para saber o que é novidade */
export const tierKey = (id: string, tier: number) => `${id}:${tier}`;

export function unlockedKeys(achievements: AchievementState[]): string[] {
  return achievements.flatMap((a) => a.reachedAt.flatMap((t, i) => (t !== null ? [tierKey(a.id, i)] : [])));
}
