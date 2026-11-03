import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { FoliateView, RelocateDetail } from "foliate-js/view.js";
import { bookCss } from "./bookStyles";
import { repairDocument } from "./textfix";
import type { Highlight } from "../../db/types";
import { zoneFor, type EngineCallbacks, type ReaderEngine } from "./engine";
import type { Paper, ReaderSettings } from "./settings";

interface Props extends EngineCallbacks {
  file: File;
  initialLocation: string | null;
  /** Onde estava, em fração do livro: confere se o ponto salvo ainda leva ao mesmo lugar */
  initialFraction?: number | null;
  highlights?: Highlight[];
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
    clearSelection: () => selDoc.current?.getSelection()?.removeAllRanges(),
  }));
  const selDoc = useRef<Document | null>(null);
  const drawn = useRef(new Map<string, string>());
  const placedRef = useRef<Map<string, { doc: Document; range: Range }> | null>(null);

  // Abre o livro uma vez
  useEffect(() => {
    let cancelled = false;
    let view: FoliateView | null = null;
    let annotationTapAt = 0;
    /** Onde cada destaque desenhado está (o teste de toque do motor falha em duas colunas) */
    const placed = new Map<string, { doc: Document; range: Range }>();
    placedRef.current = placed;
    const highlightAt = (doc: Document, x: number, y: number): string | null => {
      const caret = doc.caretRangeFromPoint?.(x, y);
      if (!caret) return null;
      for (const [cfi, p] of placed) {
        if (p.doc !== doc) continue;
        try {
          if (p.range.isPointInRange(caret.startContainer, caret.startOffset)) return cfi;
        } catch {
          // destaque de um capítulo que já saiu da tela
        }
      }
      return null;
    };

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

        // Destaques: o motor pede para desenhar cada um quando o capítulo aparece
        const { Overlayer } = await import("foliate-js/overlayer.js");
        view.addEventListener("draw-annotation", (e) => {
          const { draw, annotation, doc, range } = (
            e as CustomEvent<{ draw: (f: unknown, o: unknown) => void; annotation: { value: string; color: string }; doc: Document; range: Range }>
          ).detail;
          draw(Overlayer.highlight, { color: annotation.color });
          // guarda onde o destaque está no texto, para reconhecer um toque nele
          if (range) placed.set(annotation.value, { doc, range });
        });
        view.addEventListener("create-overlay", () => {
          for (const h of cb.current.highlights ?? []) view!.addAnnotation({ value: h.cfi, color: h.color });
        });
        view.addEventListener("show-annotation", (e) => {
          annotationTapAt = Date.now();
          cb.current.onHighlightTap?.((e as CustomEvent<{ value: string }>).detail.value);
        });

        view.addEventListener("load", (e) => {
          const { doc, index } = (e as CustomEvent<{ doc: Document; index: number }>).detail;
          repairDocument(doc);
          doc.documentElement.style.setProperty("--overlayer-highlight-opacity", "0.38");
          // Seleção de texto: avisa o leitor (com o CFI) para oferecer "Destacar"
          let selTimer: number | undefined;
          doc.addEventListener("selectionchange", () => {
            window.clearTimeout(selTimer);
            selTimer = window.setTimeout(() => {
              const sel = doc.getSelection();
              const text = sel?.toString().replace(/\s+/g, " ").trim() ?? "";
              if (!sel || sel.isCollapsed || text.length < 3 || !sel.rangeCount) {
                if (selDoc.current === doc) {
                  selDoc.current = null;
                  cb.current.onSelect?.(null);
                }
                return;
              }
              try {
                const cfi = view!.getCFI(index, sel.getRangeAt(0));
                selDoc.current = doc;
                cb.current.onSelect?.({ cfi, text });
              } catch {
                // seleção estranha (fora do texto): ignora
              }
            }, 250);
          });
          doc.addEventListener("click", (ev) => {
            if ((ev.target as Element | null)?.closest?.("a")) return;
            const sel = doc.getSelection();
            if (sel && !sel.isCollapsed) return;
            const hit = highlightAt(doc, ev.clientX, ev.clientY);
            if (hit) {
              annotationTapAt = Date.now();
              cb.current.onHighlightTap?.(hit);
              return;
            }
            const frame = doc.defaultView?.frameElement?.getBoundingClientRect();
            const box = host.current?.getBoundingClientRect();
            if (!frame || !box) return;
            const x = frame.left + ev.clientX - box.left;
            const y = frame.top + ev.clientY - box.top;
            // Toque num destaque abre as opções dele: não vira a página nem abre o menu
            setTimeout(() => {
              if (Date.now() - annotationTapAt < 120) return;
              cb.current.onTap(zoneFor(x, y, box.width, box.height));
            }, 0);
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
        // Se o texto do capítulo foi remontado (ou o arquivo mudou), o ponto salvo pode cair
        // longe de onde ela estava: aí volta pela porcentagem, que não depende do texto
        const want = props.initialFraction ?? null;
        if (!cancelled && want !== null && want > 0.01) {
          const got = view.lastLocation?.fraction ?? 0;
          if (Math.abs(got - want) > 0.03) await view.goToFraction(want);
        }
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

  // Destaques: desenha os novos, apaga os removidos e redesenha os que mudaram de cor
  const { highlights } = props;
  useEffect(() => {
    const view = viewRef.current;
    if (!view?.renderer || !highlights) return;
    const now = new Map(highlights.map((h) => [h.cfi, h.color]));
    for (const [cfi, color] of drawn.current) {
      if (now.get(cfi) !== color) {
        view.deleteAnnotation({ value: cfi });
        placedRef.current?.delete(cfi);
      }
    }
    for (const [cfi, color] of now) {
      if (drawn.current.get(cfi) !== color) view.addAnnotation({ value: cfi, color });
    }
    drawn.current = now;
  }, [highlights]);

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

/** CFI de intervalo "epubcfi(base,ini,fim)" → [CFI do início, CFI do fim]. */
function splitRange(cfi: string): [string, string | undefined] {
  const m = cfi.match(/^epubcfi\((.*),(.*),(.*)\)$/);
  if (!m) return [cfi, undefined];
  return [`epubcfi(${m[1]}${m[2]})`, `epubcfi(${m[1]}${m[3]})`];
}
