import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { FoliateView, RelocateDetail } from "foliate-js/view.js";
import { bookCss } from "./bookStyles";
import { zoneFor, type EngineCallbacks, type ReaderEngine } from "./engine";
import type { Paper, ReaderSettings } from "./settings";

interface Props extends EngineCallbacks {
  file: File;
  initialLocation: string | null;
  settings: ReaderSettings;
  paper: Paper;
}

const MARGINS = {
  estreita: { margin: "28px", gap: "5%" },
  normal: { margin: "44px", gap: "8%" },
  larga: { margin: "60px", gap: "14%" },
} as const;

function applyLayout(view: FoliateView, s: ReaderSettings) {
  const r = view.renderer;
  const m = MARGINS[s.margin];
  r.setAttribute("flow", s.flow === "rolagem" ? "scrolled" : "paginated");
  r.setAttribute("margin", m.margin);
  r.setAttribute("gap", m.gap);
  r.setAttribute("max-inline-size", "660px");
  r.setAttribute("max-column-count", "2");
  if (s.animation === "deslizar") r.setAttribute("animated", "");
  else r.removeAttribute("animated");
}

export const EpubView = forwardRef<ReaderEngine, Props>(function EpubView(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const viewRef = useRef<FoliateView | null>(null);
  const cb = useRef(props);
  cb.current = props;

  useImperativeHandle(ref, () => ({
    next: () => viewRef.current?.next(),
    prev: () => viewRef.current?.prev(),
    goTo: (location) => viewRef.current?.goTo(location),
    goToFraction: (f) => viewRef.current?.goToFraction(f),
  }));

  // Abre o livro uma vez
  useEffect(() => {
    let cancelled = false;
    let view: FoliateView | null = null;

    (async () => {
      try {
        await import("foliate-js/view.js");
        if (cancelled || !host.current) return;
        view = document.createElement("foliate-view") as FoliateView;
        view.style.cssText = "display:block;width:100%;height:100%";
        host.current.append(view);
        viewRef.current = view;

        view.addEventListener("relocate", (e) => {
          const d = (e as CustomEvent<RelocateDetail>).detail;
          const total = Math.max(1, d.location?.total ?? 1);
          const page = Math.min(total, (d.location?.current ?? 0) + 1);
          const [start, end] = splitRange(d.cfi);
          cb.current.onRelocate({
            location: start,
            endLocation: end,
            resume: d.cfi,
            fraction: d.fraction ?? 0,
            page,
            total,
            printedPage: d.pageItem?.label ?? null,
            chapter: d.tocItem?.label?.trim() ?? null,
            minutesLeftInChapter: d.time ? Math.max(0, Math.round(d.time.section)) : null,
            atEnd: (d.location?.next ?? 0) >= total - 1 && (d.fraction ?? 0) > 0.97,
            excerpt: (d.range?.toString() ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
          });
        });

        view.addEventListener("load", (e) => {
          const { doc } = (e as CustomEvent<{ doc: Document }>).detail;
          fixLigatures(doc);
          doc.addEventListener("click", (ev) => {
            if ((ev.target as Element | null)?.closest?.("a")) return;
            const sel = doc.getSelection();
            if (sel && !sel.isCollapsed) return;
            const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
            const box = host.current?.getBoundingClientRect();
            if (!frame || !box) return;
            const x = frame.left + ev.clientX - box.left;
            const y = frame.top + ev.clientY - box.top;
            cb.current.onTap(zoneFor(x, y, box.width, box.height));
          });
          const activity = () => cb.current.onActivity();
          doc.addEventListener("touchstart", activity, { passive: true });
          doc.addEventListener("keydown", (ev) => handleKey(ev, view!));
        });

        await view.open(props.file);
        if (cancelled) return;
        applyLayout(view, cb.current.settings);
        view.renderer.setStyles(bookCss(cb.current.settings, cb.current.paper));
        cb.current.onReady(view.book.toc ?? []);
        await view.init({ lastLocation: props.initialLocation, showTextStart: !props.initialLocation });
      } catch (e) {
        if (!cancelled) cb.current.onError(e instanceof Error ? e.message : String(e));
      }
    })();

    const onKey = (ev: KeyboardEvent) => view && handleKey(ev, view);
    window.addEventListener("keydown", onKey);
    return () => {
      cancelled = true;
      window.removeEventListener("keydown", onKey);
      view?.close();
      view?.remove();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.file]);

  // Ajustes ao vivo
  const { settings, paper } = props;
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.renderer) return;
    applyLayout(view, settings);
    view.renderer.setStyles(bookCss(settings, paper));
  }, [settings, paper]);

  return <div ref={host} className="epub-host" onClick={(e) => clickOutsideBook(e, host.current, cb.current)} />;
});

/** Toques nas margens (fora do iframe do livro) também viram página. */
function clickOutsideBook(e: React.MouseEvent, hostEl: HTMLDivElement | null, cb: EngineCallbacks) {
  if (!hostEl) return;
  const box = hostEl.getBoundingClientRect();
  cb.onTap(zoneFor(e.clientX - box.left, e.clientY - box.top, box.width, box.height));
}

function handleKey(ev: KeyboardEvent, view: FoliateView) {
  if (ev.defaultPrevented) return;
  const k = ev.key;
  if (k === "ArrowRight" || k === "PageDown" || (k === " " && !ev.shiftKey)) {
    ev.preventDefault();
    view.next();
  } else if (k === "ArrowLeft" || k === "PageUp" || (k === " " && ev.shiftKey)) {
    ev.preventDefault();
    view.prev();
  }
}

// Letras ligadas (ﬁ, ﬂ...) que muitas fontes não têm e viram um buraco no texto
const LIGATURES: Record<string, string> = { "\uFB00": "ff", "\uFB01": "fi", "\uFB02": "fl", "\uFB03": "ffi", "\uFB04": "ffl", "\uFB05": "st", "\uFB06": "st" };
const LIGATURE_RE = /[\uFB00-\uFB06]/g;

function fixLigatures(doc: Document) {
  if (!doc.body || !LIGATURE_RE.test(doc.body.textContent ?? "")) return;
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    LIGATURE_RE.lastIndex = 0;
    if (LIGATURE_RE.test(text)) node.nodeValue = text.replace(LIGATURE_RE, (c) => LIGATURES[c] ?? c);
  }
}

/** CFI de intervalo "epubcfi(base,ini,fim)" → [CFI do início, CFI do fim]. */
function splitRange(cfi: string): [string, string | undefined] {
  const m = cfi.match(/^epubcfi\((.*),(.*),(.*)\)$/);
  if (!m) return [cfi, undefined];
  return [`epubcfi(${m[1]}${m[2]})`, `epubcfi(${m[1]}${m[3]})`];
}
