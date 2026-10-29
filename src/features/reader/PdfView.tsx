import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { TocItem } from "foliate-js/view.js";
import { openPdf, type PdfDocument } from "../pdf/pdf";
import { zoneFor, type EngineCallbacks, type ReaderEngine } from "./engine";
import type { Paper, ReaderSettings } from "./settings";

interface Props extends EngineCallbacks {
  file: File;
  initialLocation: string | null;
  settings: ReaderSettings;
  paper: Paper;
}

const pageFrom = (loc: string | null) => (loc?.startsWith("page:") ? Math.max(1, Number(loc.slice(5)) || 1) : 1);

/** PDF página a página, ajustado à tela, com as cores do papel escolhido. */
export const PdfView = forwardRef<ReaderEngine, Props>(function PdfView(props, ref) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [page, setPage] = useState(() => pageFrom(props.initialLocation));
  const [size, setSize] = useState({ w: 0, h: 0 });
  const cb = useRef(props);
  cb.current = props;
  const touch = useRef<{ x: number; y: number; t: number } | null>(null);
  const labels = useRef<Map<number, string>>(new Map());

  const total = doc?.numPages ?? 1;
  const go = useCallback((p: number) => setPage((cur) => Math.min(Math.max(1, p), doc?.numPages ?? cur)), [doc]);

  useImperativeHandle(ref, () => ({
    next: () => go(page + 1),
    prev: () => go(page - 1),
    goTo: (loc) => go(pageFrom(loc)),
    goToFraction: (f) => go(Math.round(f * (total - 1)) + 1),
  }));

  // Abre o documento e monta o sumário (outline)
  useEffect(() => {
    let cancelled = false;
    let opened: PdfDocument | null = null;
    (async () => {
      try {
        opened = await openPdf(await props.file.arrayBuffer());
        if (cancelled) return opened.loadingTask.destroy();
        setDoc(opened);
        const outline = (await opened.getOutline().catch(() => null)) ?? [];
        const toItem = async (o: { title: string; dest: unknown; items?: unknown[] }): Promise<TocItem> => {
          let target = 1;
          try {
            const dest = typeof o.dest === "string" ? await opened!.getDestination(o.dest) : (o.dest as unknown[] | null);
            if (dest?.[0]) target = (await opened!.getPageIndex(dest[0] as never)) + 1;
          } catch {
            /* destino inválido: vai para o começo */
          }
          labels.current.set(target, o.title);
          return {
            label: o.title,
            href: `page:${target}`,
            subitems: await Promise.all(((o.items ?? []) as (typeof o)[]).map(toItem)),
          };
        };
        cb.current.onReady(await Promise.all((outline as never[]).map(toItem)));
      } catch (e) {
        if (!cancelled) cb.current.onError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      opened?.loadingTask.destroy();
    };
  }, [props.file]);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Desenha a página atual
  const { paper } = props;
  useEffect(() => {
    if (!doc || !size.w || !canvas.current) return;
    let task: { cancel(): void; promise: Promise<void> } | null = null;
    let cancelled = false;
    (async () => {
      const p = await doc.getPage(page);
      if (cancelled) return;
      const base = p.getViewport({ scale: 1 });
      const pad = 16;
      const scale = Math.min((size.w - pad * 2) / base.width, (size.h - pad * 2) / base.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const viewport = p.getViewport({ scale: scale * dpr });
      const c = canvas.current!;
      c.width = Math.round(viewport.width);
      c.height = Math.round(viewport.height);
      c.style.width = `${Math.round(viewport.width / dpr)}px`;
      c.style.height = `${Math.round(viewport.height / dpr)}px`;
      task = p.render({ canvas: c, viewport, pageColors: { background: paper.bg, foreground: paper.ink } });
      await task.promise.catch(() => {});
      if (cancelled) return;
      const text = await p.getTextContent().catch(() => null);
      const excerpt = text
        ? (text.items as { str?: string }[]).map((i) => i.str ?? "").join(" ").replace(/\s+/g, " ").trim().slice(0, 160)
        : "";
      // Capítulo: o último item do sumário que começa nesta página ou antes
      let chapter: string | null = null;
      for (const [start, label] of [...labels.current.entries()].sort((a, b) => a[0] - b[0])) if (start <= page) chapter = label;
      cb.current.onRelocate({
        location: `page:${page}`,
        resume: `page:${page}`,
        fraction: doc.numPages > 1 ? (page - 1) / (doc.numPages - 1) : 1,
        page,
        total: doc.numPages,
        printedPage: null,
        chapter,
        minutesLeftInChapter: null,
        atEnd: page >= doc.numPages,
        excerpt,
      });
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, page, size, paper]);

  // Teclado no desktop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (["ArrowRight", "PageDown", " "].includes(e.key)) go(page + 1);
      else if (["ArrowLeft", "PageUp"].includes(e.key)) go(page - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, page]);

  return (
    <div
      ref={host}
      className="pdf-host"
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = { x: t.clientX, y: t.clientY, t: Date.now() };
        cb.current.onActivity();
      }}
      onTouchEnd={(e) => {
        const start = touch.current;
        const t = e.changedTouches[0];
        touch.current = null;
        if (!start) return;
        const dx = t.clientX - start.x;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(t.clientY - start.y)) {
          e.preventDefault();
          cb.current.onTap(dx < 0 ? "next" : "prev");
        }
      }}
      onClick={(e) => {
        const box = host.current!.getBoundingClientRect();
        cb.current.onTap(zoneFor(e.clientX - box.left, e.clientY - box.top, box.width, box.height));
      }}
    >
      <canvas ref={canvas} />
    </div>
  );
});
