import { useSettings } from "../../lib/settings";
import { lazy, startTransition, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { TocItem } from "foliate-js/view.js";
import { db } from "../../db/db";
import { useBook } from "../../db/hooks";
import {
  addBookmark,
  ensureActiveReading,
  getPosition,
  removeBookmark,
  savePosition,
  setReadingProgress,
  useHighlights,
  addHighlight,
  updateHighlight,
  removeHighlight,
  useBookmarks,
} from "../../db/reading";
import type { Book } from "../../db/types";
import { Icon } from "../../components/Icon";
import { EpubView } from "./EpubView";
// O leitor de PDF (pdf.js, ~450 kB) só carrega quando um PDF é aberto: o app abre mais rápido
const PdfView = lazy(() => import("./PdfView").then((m) => ({ default: m.PdfView })));
import { PageTurnFx, type PageTurnFxHandle } from "./PageTurnFx";
import { ComfortLayer } from "./ComfortLayer";
import { ReaderSettingsSheet } from "./ReaderSettingsSheet";
import { TocSheet } from "./TocSheet";
import { HighlightBar } from "./HighlightBar";
import { FinishSheet } from "./FinishSheet";
import { SessionTracker } from "./session";
import { resolvePaper, useReaderSettings } from "./settings";
import { useReaderUi } from "./state";
import { useBackLayer } from "../../lib/backStack";
import type { LocationInfo, ReaderEngine, TapZone, TextSelection } from "./engine";
import { compareLocations } from "./locations";
import "../conquistas/ribbons.css";
import "./Reader.css";

interface Loaded {
  file: File;
  initialLocation: string | null;
  initialFraction: number | null;
  readingId: string;
}

function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () =>
      navigator.wakeLock
        .request("screen")
        .then((l) => (lock = l))
        .catch(() => {});
    request();
    const onVisible = () => document.visibilityState === "visible" && request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release().catch(() => {});
    };
  }, [active]);
}

declare global {
  interface Window {
    /** Ponte do app Android (MainActivity): liga os botões de volume para virar página */
    SepiaNative?: { setVolumePaging(on: boolean): void; setImmersive?(on: boolean): void };
  }
}

/** Android: enquanto ligado, os botões de volume viram a página em vez de mudar o som */
function useVolumeKeys(active: boolean, turn: (dir: 1 | -1) => void) {
  const turnRef = useRef(turn);
  turnRef.current = turn;
  useEffect(() => {
    const native = window.SepiaNative;
    if (!active || !native) return;
    const onKey = (e: Event) => turnRef.current((e as CustomEvent<number>).detail === -1 ? -1 : 1);
    window.addEventListener("sepia-volume", onKey);
    try {
      native.setVolumePaging(true);
    } catch {
      /* app antigo sem a ponte */
    }
    return () => {
      window.removeEventListener("sepia-volume", onKey);
      try {
        native.setVolumePaging(false);
      } catch {
        /* idem */
      }
    };
  }, [active]);
}

/** Android: tela cheia enquanto o livro está aberto */
function useImmersive(active: boolean) {
  useEffect(() => {
    const native = window.SepiaNative;
    if (!active || !native?.setImmersive) return;
    const enter = () => {
      try {
        native.setImmersive?.(true);
      } catch {
        /* app antigo sem a ponte */
      }
    };
    enter();
    // voltar de outro app pode trazer as barras de volta
    const onVisible = () => document.visibilityState === "visible" && enter();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      try {
        native.setImmersive?.(false);
      } catch {
        /* nada a fazer */
      }
    };
  }, [active]);
}

function ReaderBody({ book }: { book: Book }) {
  const close = useReaderUi((s) => s.close);
  const settings = useReaderSettings();
  const paper = useMemo(() => resolvePaper(settings.paper), [settings.paper]);
  const bookmarks = useBookmarks(book.id);

  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [loc, setLoc] = useState<LocationInfo | null>(null);
  const [chrome, setChrome] = useState(false);
  const [panel, setPanel] = useState<"settings" | "toc" | null>(null);
  const [finishOpen, setFinishOpen] = useState(false);
  const [scrub, setScrub] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);

  const engine = useRef<ReaderEngine>(null);
  const fx = useRef<PageTurnFxHandle>(null);
  const tracker = useRef<SessionTracker | null>(null);
  const finishShown = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  /** Posição que ainda espera para ir ao banco (gravada já se o app sair de cena) */
  const pendingSave = useRef<(() => void) | null>(null);
  const latestFraction = useRef<number | null>(null);
  const locTimer = useRef<number | undefined>(undefined);
  /** Quando ela pediu um salto (sumário, barra): aí ir para o começo vale */
  const navAt = useRef(0);
  const stage = useRef<HTMLDivElement>(null);
  /** A página de verdade agora (a tela atualiza um pouco depois, para não engasgar) */
  const locNow = useRef<LocationInfo | null>(null);
  const highlights = useHighlights(book.id);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [tappedCfi, setTappedCfi] = useState<string | null>(null);
  const tapped = highlights?.find((h) => h.cfi === tappedCfi) ?? null;

  const highlightSelection = useCallback(
    async (color: string) => {
      if (!selection) return;
      const here = locNow.current;
      await addHighlight({ bookId: book.id, cfi: selection.cfi, text: selection.text, color, chapter: here?.chapter ?? null, fraction: here?.fraction ?? 0 });
      engine.current?.clearSelection?.();
      setSelection(null);
      navigator.vibrate?.(10);
    },
    [selection, book.id],
  );

  useWakeLock(true);
  useImmersive(settings.immersive);

  // Carrega o arquivo, a posição salva e a leitura em andamento
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let record = book.fileId ? await db.files.get(book.fileId) : undefined;
      if (!record && book.fileHash) {
        // Importado em outro aparelho: busca no Drive
        setDownloading(true);
        try {
          const { downloadBookFile } = await import("../sync/sync");
          const id = await downloadBookFile(book);
          record = id ? await db.files.get(id) : undefined;
        } catch {
          /* cai na mensagem abaixo */
        } finally {
          setDownloading(false);
        }
      }
      if (cancelled) return;
      if (!record) {
        setError("O arquivo deste livro não está neste aparelho. Conecte o Google Drive em Ajustes para trazê-lo do outro aparelho.");
        return;
      }
      const position = await getPosition(book.id);
      const readingId = await ensureActiveReading(book.id);
      if (cancelled) return;
      tracker.current = new SessionTracker(book.id, readingId, position?.fraction ?? 0);
      setLoaded({
        file: new File([record.blob], record.name, { type: record.type }),
        initialLocation: position?.location ?? null,
        initialFraction: position?.fraction ?? null,
        readingId,
      });
    })();
    return () => {
      cancelled = true;
      tracker.current?.end();
      tracker.current = null;
    };
  }, [book.id, book.fileId]);

  // Progresso da leitura (que a estante e a tela Hoje mostram) não precisa ir
  // ao banco a cada página: gravar sempre fazia essas telas, montadas por trás,
  // redesenharem a cada virada.
  useEffect(() => {
    if (!loaded) return;
    const flush = () => {
      if (latestFraction.current !== null) setReadingProgress(loaded.readingId, latestFraction.current);
    };
    const timer = window.setInterval(flush, 30_000);
    const onHide = () => document.visibilityState === "hidden" && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onHide);
      flush();
    };
  }, [loaded]);

  // Ao ir para segundo plano (o Android pode fechar o app a qualquer momento depois disso),
  // grava na hora a página e a sessão; o tempo fora do app não conta como leitura
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        pendingSave.current?.();
        tracker.current?.pause();
      } else tracker.current?.resume();
    };
    const onLeave = () => pendingSave.current?.();
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pagehide", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pagehide", onLeave);
      // fechar o livro logo depois de virar a página também grava
      pendingSave.current?.();
    };
  }, []);

  const onRelocate = useCallback(
    (info: LocationInfo) => {
      // Posição inválida (o motor às vezes manda no meio de uma troca) nunca é gravada
      if (!Number.isFinite(info.fraction)) return;
      // Redesenhar a tela do leitor no meio da animação da página dava engasgo: a barra,
      // o rodapé e o marcador esperam a página assentar
      locNow.current = info;
      window.clearTimeout(locTimer.current);
      locTimer.current = window.setTimeout(() => startTransition(() => setLoc(info)), 280);
      tracker.current?.onPage(info.page, info.fraction);
      // Proteção: um salto para o começo que ela não pediu (motor reiniciando, travamento)
      // não pode apagar onde ela estava
      const prev = latestFraction.current;
      const jumpedToStart = prev !== null && prev > 0.03 && info.fraction < 0.005 && Date.now() - navAt.current > 3000;
      if (!jumpedToStart) {
        window.clearTimeout(saveTimer.current);
        const save = () => {
          pendingSave.current = null;
          window.clearTimeout(saveTimer.current);
          savePosition(book.id, info.resume, info.fraction);
        };
        pendingSave.current = save;
        saveTimer.current = window.setTimeout(save, 500);
        latestFraction.current = info.fraction;
      }
      if (info.atEnd && !finishShown.current) {
        finishShown.current = true;
        setTimeout(() => setFinishOpen(true), 400);
      }
    },
    [book.id],
  );

  const turn = useCallback(
    (dir: 1 | -1) => {
      const go = () => (dir === 1 ? engine.current?.next() : engine.current?.prev());
      if (fx.current) fx.current.play(dir, go);
      else go();
    },
    [],
  );

  useVolumeKeys(settings.volumeKeys && !panel && !finishOpen, turn);

  const currentBookmark = useMemo(() => {
    if (!loc || !bookmarks) return undefined;
    return bookmarks.find((b) => compareLocations(b.location, loc.location, loc.endLocation));
  }, [loc, bookmarks]);

  const toggleBookmark = useCallback(async () => {
    const here = locNow.current ?? loc;
    if (!here) return;
    const marked = bookmarks?.find((b) => compareLocations(b.location, here.location, here.endLocation));
    if (marked) await removeBookmark(marked.id);
    else
      await addBookmark({
        bookId: book.id,
        location: here.location,
        fraction: here.fraction,
        excerpt: here.excerpt,
        chapter: here.chapter,
      }, useSettings.getState().bookmarkStyle);
    navigator.vibrate?.(12);
  }, [loc, bookmarks, book.id]);

  const onTap = useCallback(
    (zone: TapZone) => {
      tracker.current?.tick();
      if (chrome && zone !== "menu") {
        setChrome(false);
        return;
      }
      if (zone === "menu") setChrome((c) => !c);
      else if (zone === "corner") toggleBookmark();
      else turn(zone === "next" ? 1 : -1);
    },
    [chrome, toggleBookmark, turn],
  );

  const onActivity = useCallback(() => tracker.current?.tick(), []);

  const progressLabel = loc
    ? loc.printedPage
      ? `Página ${loc.printedPage}`
      : `Página ${loc.page} de ${loc.total}`
    : "";
  const fractionShown = scrub ?? loc?.fraction ?? 0;

  const engineProps = loaded && {
    file: loaded.file,
    initialLocation: loaded.initialLocation,
    initialFraction: loaded.initialFraction,
    settings,
    paper,
    onReady: setToc,
    onRelocate,
    onTap,
    onActivity,
    onError: setError,
    highlights: highlights ?? [],
    onSelect: (sel: TextSelection | null) => {
      setSelection(sel);
      if (sel) setTappedCfi(null);
    },
    onHighlightTap: (cfi: string) => {
      setSelection(null);
      setTappedCfi(cfi);
    },
  };

  return (
    <div
      className={`reader${paper.dark ? " is-dark" : ""}`}
      style={{ ["--paper" as string]: paper.bg, ["--ink" as string]: paper.ink, ["--muted" as string]: paper.muted }}
    >
      <div className="reader-stage" ref={stage}>
        {error ? (
          <div className="reader-error">
            <Icon name="info" size={28} />
            <p>{error}</p>
            <button onClick={close}>Voltar à biblioteca</button>
          </div>
        ) : engineProps ? (
          book.format === "pdf" ? (
            <Suspense fallback={<div className="reader-loading"><span /></div>}>
              <PdfView ref={engine} {...engineProps} />
            </Suspense>
          ) : (
            <EpubView ref={engine} {...engineProps} />
          )
        ) : (
          <div className="reader-loading">
            <span />
            {downloading && <p>Trazendo o livro do Google Drive…</p>}
          </div>
        )}
        <PageTurnFx
          ref={fx}
          animation={settings.animation}
          paper={paper}
          target={() => stage.current?.querySelector<HTMLElement>(".epub-host, .pdf-host") ?? null}
        />
        {currentBookmark && (
          <motion.span
            className={`reader-ribbon ribbon ribbon-${currentBookmark.style}`}
            initial={{ y: -40 }}
            animate={{ y: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 26 }}
            aria-label="Página marcada"
          />
        )}
      </div>

      {/* Espaço fixo: se o rodapé aparecesse e sumisse, o livro seria repaginado */}
      <div className="reader-footer" aria-hidden style={{ visibility: settings.showProgress && loc && !chrome ? "visible" : "hidden" }}>
        <span>{loc?.chapter ?? ""}</span>
        <span>{loc && Number.isFinite(loc.fraction) ? `${Math.round(loc.fraction * 100)}%` : ""}</span>
      </div>

      <ComfortLayer settings={settings} />

      <HighlightBar
        mode={selection ? "nova" : tapped ? "existente" : null}
        current={tapped?.color ?? null}
        onColor={(color) => (selection ? highlightSelection(color) : tapped && updateHighlight(tapped.id, { color }).then(() => setTappedCfi(null)))}
        onCopy={() => {
          if (selection) navigator.clipboard?.writeText(selection.text).catch(() => {});
          engine.current?.clearSelection?.();
          setSelection(null);
        }}
        onRemove={() => tapped && removeHighlight(tapped.id).then(() => setTappedCfi(null))}
        onDismiss={() => {
          engine.current?.clearSelection?.();
          setSelection(null);
          setTappedCfi(null);
        }}
      />

      <AnimatePresence>
        {chrome && (
          <>
            <motion.header
              className="reader-bar is-top"
              initial={{ y: "-100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <button onClick={close} aria-label="Fechar livro">
                <Icon name="back" size={22} />
              </button>
              <div className="reader-bar-title">
                <strong>{book.title}</strong>
                {loc?.chapter && <span>{loc.chapter}</span>}
              </div>
              <button onClick={toggleBookmark} aria-label={currentBookmark ? "Tirar marcador" : "Marcar página"} className={currentBookmark ? "is-on" : ""}>
                <Icon name="bookmark" size={21} fill={currentBookmark ? "currentColor" : "none"} />
              </button>
            </motion.header>

            <motion.footer
              className="reader-bar is-bottom"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <div className="reader-scrub">
                <input
                  type="range"
                  min={0}
                  max={1000}
                  value={Math.round(fractionShown * 1000)}
                  onChange={(e) => setScrub(Number(e.target.value) / 1000)}
                  onPointerUp={() => {
                    if (scrub !== null) {
                      navAt.current = Date.now();
                      engine.current?.goToFraction(scrub);
                    }
                    setScrub(null);
                  }}
                  onKeyUp={() => {
                    if (scrub !== null) {
                      navAt.current = Date.now();
                      engine.current?.goToFraction(scrub);
                    }
                    setScrub(null);
                  }}
                  aria-label="Posição no livro"
                  style={{ ["--fill" as string]: `${fractionShown * 100}%` }}
                />
                <div className="reader-scrub-info">
                  <span>{scrub !== null ? `${Math.round(scrub * 100)}%` : progressLabel}</span>
                  {loc?.minutesLeftInChapter != null && scrub === null && (
                    <span>
                      {loc.minutesLeftInChapter < 1 ? "menos de 1 min" : `${loc.minutesLeftInChapter} min`} até o fim do capítulo
                    </span>
                  )}
                </div>
              </div>
              <div className="reader-tools">
                <button onClick={() => setPanel("toc")}>
                  <Icon name="list" size={22} />
                  <span>Sumário</span>
                </button>
                <button onClick={() => setPanel("settings")}>
                  <Icon name="type" size={22} />
                  <span>Aparência</span>
                </button>
              </div>
            </motion.footer>
          </>
        )}
      </AnimatePresence>

      <ReaderSettingsSheet open={panel === "settings"} onClose={() => setPanel(null)} isPdf={book.format === "pdf"} />
      <TocSheet
        open={panel === "toc"}
        onClose={() => setPanel(null)}
        toc={toc}
        bookmarks={bookmarks ?? []}
        highlights={highlights ?? []}
        currentChapter={loc?.chapter ?? null}
        onGo={(target) => {
          setPanel(null);
          setChrome(false);
          navAt.current = Date.now();
          engine.current?.goTo(target);
        }}
        onRemoveBookmark={removeBookmark}
      />
      {loaded && (
        <FinishSheet
          open={finishOpen}
          onClose={() => setFinishOpen(false)}
          book={book}
          readingId={loaded.readingId}
          pagesThisSession={tracker.current?.pages ?? 0}
        />
      )}
    </div>
  );
}

export function Reader() {
  const bookId = useReaderUi((s) => s.bookId);
  const close = useReaderUi((s) => s.close);
  const book = useBook(bookId);
  useBackLayer(!!bookId, close);
  return (
    <AnimatePresence>
      {bookId && book && (
        <motion.div
          key={bookId}
          className="reader-root"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          <ReaderBody book={book} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
