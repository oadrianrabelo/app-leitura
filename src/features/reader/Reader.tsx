import { useSettings } from "../../lib/settings";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useBookmarks,
} from "../../db/reading";
import type { Book } from "../../db/types";
import { Icon } from "../../components/Icon";
import { EpubView } from "./EpubView";
import { PdfView } from "./PdfView";
import { PageTurnFx, type PageTurnFxHandle } from "./PageTurnFx";
import { ComfortLayer } from "./ComfortLayer";
import { ReaderSettingsSheet } from "./ReaderSettingsSheet";
import { TocSheet } from "./TocSheet";
import { FinishSheet } from "./FinishSheet";
import { SessionTracker } from "./session";
import { resolvePaper, useReaderSettings } from "./settings";
import { useReaderUi } from "./state";
import { useBackLayer } from "../../lib/backStack";
import type { LocationInfo, ReaderEngine, TapZone } from "./engine";
import { compareLocations } from "./locations";
import "../conquistas/ribbons.css";
import "./Reader.css";

interface Loaded {
  file: File;
  initialLocation: string | null;
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
  const latestFraction = useRef<number | null>(null);

  useWakeLock(true);

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

  // Salva a sessão quando o app vai para segundo plano
  useEffect(() => {
    const onHide = () => document.visibilityState === "hidden" && tracker.current?.flush();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  const onRelocate = useCallback(
    (info: LocationInfo) => {
      setLoc(info);
      tracker.current?.onPage(info.page, info.fraction);
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => savePosition(book.id, info.resume, info.fraction), 500);
      latestFraction.current = info.fraction;
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

  const currentBookmark = useMemo(() => {
    if (!loc || !bookmarks) return undefined;
    return bookmarks.find((b) => compareLocations(b.location, loc.location, loc.endLocation));
  }, [loc, bookmarks]);

  const toggleBookmark = useCallback(async () => {
    if (!loc) return;
    if (currentBookmark) await removeBookmark(currentBookmark.id);
    else
      await addBookmark({
        bookId: book.id,
        location: loc.location,
        fraction: loc.fraction,
        excerpt: loc.excerpt,
        chapter: loc.chapter,
      }, useSettings.getState().bookmarkStyle);
    navigator.vibrate?.(12);
  }, [loc, currentBookmark, book.id]);

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
    settings,
    paper,
    onReady: setToc,
    onRelocate,
    onTap,
    onActivity,
    onError: setError,
  };

  return (
    <div
      className={`reader${paper.dark ? " is-dark" : ""}`}
      style={{ ["--paper" as string]: paper.bg, ["--ink" as string]: paper.ink, ["--muted" as string]: paper.muted }}
    >
      <div className="reader-stage">
        {error ? (
          <div className="reader-error">
            <Icon name="info" size={28} />
            <p>{error}</p>
            <button onClick={close}>Voltar à biblioteca</button>
          </div>
        ) : engineProps ? (
          book.format === "pdf" ? (
            <PdfView ref={engine} {...engineProps} />
          ) : (
            <EpubView ref={engine} {...engineProps} />
          )
        ) : (
          <div className="reader-loading">
            <span />
            {downloading && <p>Trazendo o livro do Google Drive…</p>}
          </div>
        )}
        <PageTurnFx ref={fx} animation={settings.animation} paper={paper} />
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
        <span>{loc ? `${Math.round(loc.fraction * 100)}%` : ""}</span>
      </div>

      <ComfortLayer settings={settings} />

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
                    if (scrub !== null) engine.current?.goToFraction(scrub);
                    setScrub(null);
                  }}
                  onKeyUp={() => {
                    if (scrub !== null) engine.current?.goToFraction(scrub);
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
        currentChapter={loc?.chapter ?? null}
        onGo={(target) => {
          setPanel(null);
          setChrome(false);
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
