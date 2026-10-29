import { newSession, saveSession } from "../../db/reading";
import type { Session } from "../../db/types";

const IDLE_LIMIT = 120; // segundos parados que ainda contam como leitura

/**
 * Registra uma sessão de leitura: páginas avançadas e tempo ativo.
 * Saltos grandes (sumário, barra de progresso) não contam como páginas lidas.
 */
export class SessionTracker {
  private session: Session;
  private lastTick = Date.now();
  private lastPage: number | null = null;
  private dirty = false;
  private timer: number | undefined;

  constructor(bookId: string, readingId: string | null, fraction: number) {
    this.session = newSession(bookId, readingId, fraction);
    this.timer = window.setInterval(() => this.flush(), 20_000);
  }

  setReading(readingId: string) {
    this.session.readingId = readingId;
  }

  /** Chamado a cada mudança de página. `page` é a posição absoluta no livro. */
  onPage(page: number, fraction: number) {
    this.tick();
    if (this.lastPage !== null) {
      const diff = page - this.lastPage;
      if (diff >= 1 && diff <= 3) {
        this.session.pages += diff;
        this.dirty = true;
      }
    }
    this.lastPage = page;
    this.session.endFraction = fraction;
  }

  /** Qualquer interação mantém a sessão "acordada". */
  tick() {
    const now = Date.now();
    const delta = Math.round((now - this.lastTick) / 1000);
    if (delta > 0) this.session.seconds += Math.min(delta, IDLE_LIMIT);
    this.lastTick = now;
    this.session.endedAt = now;
    this.session.updatedAt = now;
    this.dirty = true;
  }

  get pages() {
    return this.session.pages;
  }

  async flush() {
    if (!this.dirty || (this.session.pages === 0 && this.session.seconds < 30)) return;
    this.dirty = false;
    await saveSession({ ...this.session });
  }

  async end() {
    window.clearInterval(this.timer);
    this.tick();
    await this.flush();
  }
}
