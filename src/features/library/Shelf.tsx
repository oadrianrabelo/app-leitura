import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import type { Book } from "../../db/types";
import { BookCover } from "./BookCover";
import { BookSpine, spineSize } from "./BookSpine";
import { useSettings, type ShelfView } from "../../lib/settings";
import { Botanical } from "../../components/Botanical";
import "./Shelf.css";

interface ShelfProps {
  books: Book[];
  timesRead: Map<string, number>;
  onOpen: (id: string) => void;
  view?: ShelfView;
  /** Soltou um livro em outro lugar: `order` é a nova ordem dos livros mostrados */
  onReorder?: (order: string[], movedId: string) => void;
}

const HOLD_MS = 380;

interface Drag {
  id: string;
  /** Distância do dedo ao canto do livro, para o livro não "pular" ao levantar */
  dx: number;
  dy: number;
  w: number;
  h: number;
  node: ReactNode;
}

const moveTo = (list: string[], id: string, index: number) => {
  const out = list.filter((x) => x !== id);
  out.splice(index, 0, id);
  return out;
};

const GARLANDS = ["guirlanda-1", "guirlanda-2", "guirlanda-3", "guirlanda-4", "guirlanda-5", "guirlanda-6"] as const;
const MIN_COVER = 92;
const GAP = 16;
const SPINE_GAP = 2;

/** Livros em pé sobre prateleiras: cada linha da grade ganha sua tábua. */
export function Shelf({ books, timesRead, onOpen, view = "capas", onReorder }: ShelfProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [live, setLive] = useState<string[] | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const slots = useRef(new Map<string, HTMLElement>());
  const press = useRef<{ id: string; x: number; y: number; timer: number; el: HTMLElement; pointerId: number } | null>(null);
  const pointer = useRef({ x: 0, y: 0 });
  const liveRef = useRef<string[] | null>(null);
  const suppressClick = useRef(false);
  const lastMove = useRef(0);

  // Segurando e arrastando: a tela não pode rolar junto com o dedo
  useEffect(() => {
    if (!drag) return;
    const block = (e: TouchEvent) => e.preventDefault();
    document.addEventListener("touchmove", block, { passive: false });
    return () => document.removeEventListener("touchmove", block);
  }, [drag]);
  const amount = useSettings((s) => s.floraAmount);
  const climbers = useSettings((s) => s.floraClimbers);
  // Quanto enfeite cada prateleira ganha, conforme Ajustes → Jardim
  const hasGarland = (i: number) => amount === "normal" || amount === "muita" || (amount === "pouca" && i % 2 === 0);
  // a primeira prateleira não ganha trepadeira: ela subiria por cima dos botões da tela
  const hasClimber = (i: number) => climbers && i > 0 && (amount === "muita" || (amount === "normal" && i % 3 === 1) || (amount === "pouca" && i % 4 === 1));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Aba escondida mede 0: ignora, senão a estante inteira seria desmontada e recriada
    const ro = new ResizeObserver(([entry]) => entry.contentRect.width > 0 && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const inner = Math.max(0, width - 2 * 14);
  const columns = Math.max(3, Math.floor((inner + GAP) / (MIN_COVER + GAP)));
  const coverWidth = width ? Math.floor((inner - GAP * (columns - 1)) / columns) : MIN_COVER;

  const byId = useMemo(() => new Map(books.map((b) => [b.id, b])), [books]);
  const shown = live ? live.map((id) => byId.get(id)!).filter(Boolean) : books;

  const lift = (book: Book, el: HTMLElement, pointerId: number, x: number, y: number, node: ReactNode) => {
    const r = el.getBoundingClientRect();
    try {
      el.setPointerCapture(pointerId);
    } catch {
      // o dedo já saiu: segue sem captura
    }
    navigator.vibrate?.(12);
    suppressClick.current = true;
    pointer.current = { x, y };
    const order = books.map((b) => b.id);
    liveRef.current = order;
    setLive(order);
    setDrag({ id: book.id, dx: x - r.left, dy: y - r.top, w: r.width, h: r.height, node });
  };

  /** Livro sob o dedo (ou o mais perto, na mesma prateleira) vira o novo lugar */
  const retarget = () => {
    if (!drag || !liveRef.current) return;
    const { x, y } = pointer.current;
    let best: string | null = null;
    let bestD = Infinity;
    for (const [id, el] of slots.current) {
      const r = el.getBoundingClientRect();
      if (y < r.top - 24 || y > r.bottom + 24) continue;
      const d = Math.abs(x - (r.left + r.width / 2)) + (y < r.top || y > r.bottom ? 40 : 0);
      if (d < bestD) {
        bestD = d;
        best = id;
      }
    }
    // os livros ainda deslizando para o lugar novo: espera assentar, senão fica pulando
    if (!best || best === drag.id || performance.now() - lastMove.current < 160) return;
    const target = liveRef.current.indexOf(best);
    const next = moveTo(liveRef.current, drag.id, target);
    if (next.join() !== liveRef.current.join()) {
      liveRef.current = next;
      lastMove.current = performance.now();
      setLive(next);
    }
  };

  // Rolagem automática perto das bordas e reposicionamento contínuo
  useEffect(() => {
    if (!drag) return;
    const panel = ref.current?.closest(".tab-panel") as HTMLElement | null;
    let raf = 0;
    const tick = () => {
      if (panel) {
        const r = panel.getBoundingClientRect();
        const { y } = pointer.current;
        const edge = 90;
        if (y < r.top + edge) panel.scrollBy(0, -Math.ceil((r.top + edge - y) / 8));
        else if (y > r.bottom - edge - 70) panel.scrollBy(0, Math.ceil((y - (r.bottom - edge - 70)) / 8));
      }
      retarget();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  const onPointerDown = (e: ReactPointerEvent<HTMLElement>, book: Book, node: ReactNode) => {
    if (!onReorder || (e.pointerType === "mouse" && e.button !== 0)) return;
    const el = e.currentTarget;
    const { clientX: x, clientY: y, pointerId } = e;
    const timer = window.setTimeout(() => {
      if (press.current?.id === book.id) lift(book, el, pointerId, pointer.current.x, pointer.current.y, node);
    }, HOLD_MS);
    pointer.current = { x, y };
    press.current = { id: book.id, x, y, timer, el, pointerId };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLElement>) => {
    pointer.current = { x: e.clientX, y: e.clientY };
    if (drag) {
      if (ghost.current) ghost.current.style.transform = `translate(${e.clientX - drag.dx}px, ${e.clientY - drag.dy}px) scale(1.06) rotate(-2deg)`;
      return;
    }
    // Mexeu antes do tempo: é rolagem, não arrasto
    const p = press.current;
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) {
      clearTimeout(p.timer);
      press.current = null;
    }
  };

  const onPointerEnd = () => {
    if (press.current) clearTimeout(press.current.timer);
    press.current = null;
    if (!drag) return;
    const order = liveRef.current;
    const moved = drag.id;
    setDrag(null);
    setLive(null);
    liveRef.current = null;
    if (order && order.join() !== books.map((b) => b.id).join()) onReorder?.(order, moved);
  };

  const handlers = (book: Book, node: ReactNode) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLElement>) => onPointerDown(e, book, node),
    onPointerMove,
    onPointerUp: onPointerEnd,
    onPointerCancel: onPointerEnd,
    onContextMenu: (e: React.MouseEvent) => onReorder && e.preventDefault(),
    onClick: () => {
      if (suppressClick.current) {
        suppressClick.current = false;
        return;
      }
      onOpen(book.id);
    },
    ref: (el: HTMLElement | null) => {
      if (el) slots.current.set(book.id, el);
      else slots.current.delete(book.id);
    },
  });

  const spines = view === "lombadas";
  const coverHeight = Math.round(Math.min(coverWidth, 130) * 1.5);
  const rows: Book[][] = [];
  if (spines) {
    // Lombadas lado a lado: enche a prateleira até a largura acabar
    let row: Book[] = [];
    let used = 0;
    for (const book of shown) {
      const w = spineSize(book, coverHeight).width + SPINE_GAP;
      if (row.length && used + w > inner + SPINE_GAP) {
        rows.push(row);
        row = [];
        used = 0;
      }
      row.push(book);
      used += w;
    }
    if (row.length) rows.push(row);
  } else {
    for (let i = 0; i < shown.length; i += columns) rows.push(shown.slice(i, i + columns));
  }

  return (
    <div className="shelf-list" ref={ref}>
      {width > 0 &&
        rows.map((row, i) => (
          <div className="shelf-row" key={i}>
            <div className={`shelf-row-books${spines ? " is-spines" : ""}`} style={{ gap: spines ? SPINE_GAP : GAP }}>
              {row.map((book) => {
                const times = timesRead.get(book.id) ?? 0;
                const lifted = drag?.id === book.id;
                if (spines) {
                  const size = spineSize(book, coverHeight);
                  const node = (
                    <>
                      <BookSpine book={book} width={size.width} height={size.height} />
                      {book.status === "lendo" && <span className="shelf-ribbon is-spine" aria-label="Lendo" />}
                    </>
                  );
                  return (
                    <motion.button
                      key={book.id}
                      layout={!!drag}
                      layoutId={drag ? book.id : undefined}
                      transition={{ type: "spring", stiffness: 520, damping: 40 }}
                      className={`shelf-book${lifted ? " is-lifted" : ""}`}
                      aria-label={book.title}
                      {...handlers(book, node)}
                    >
                      {node}
                    </motion.button>
                  );
                }
                const node = (
                  <>
                    <BookCover book={book} width={coverWidth} />
                    {book.status === "lendo" && <span className="shelf-ribbon" aria-label="Lendo" />}
                    {times > 1 && <span className="shelf-times">{times}×</span>}
                    {book.status === "lido" && times <= 1 && (
                      <span className="shelf-check" aria-label="Lido">✓</span>
                    )}
                  </>
                );
                return (
                  <motion.button
                    key={book.id}
                    layout={!!drag}
                    layoutId={drag ? book.id : undefined}
                    transition={{ type: "spring", stiffness: 520, damping: 40 }}
                    className={`shelf-book${lifted ? " is-lifted" : ""}`}
                    aria-label={book.title}
                    {...handlers(book, node)}
                  >
                    {node}
                  </motion.button>
                );
              })}
            </div>
            <div className="shelf-row-board" />
            {/* Glicínias penduradas na tábua: desenhos e lados variando de prateleira em prateleira */}
            {hasGarland(i) && (
              <Botanical
                art={GARLANDS[(i * 5 + 1) % GARLANDS.length]}
                className={`shelf-row-garland${i % 2 ? " is-flipped" : ""}`}
                tone="destaque"
              />
            )}
            {/* Trepadeiras subindo pela lateral, alternando o lado e o desenho */}
            {hasClimber(i) && (
              <Botanical
                art={i % 4 < 2 ? "trepadeira" : "trepadeira-2"}
                className={`shelf-row-climber${i % 2 ? " is-left" : ""}${i % 4 < 2 ? "" : " is-twined"}`}
                tone="destaque"
              />
            )}
          </div>
        ))}
      {drag &&
        createPortal(
          <div
            ref={ghost}
            className="shelf-ghost"
            style={{
              width: drag.w,
              height: drag.h,
              transform: `translate(${pointer.current.x - drag.dx}px, ${pointer.current.y - drag.dy}px) scale(1.06) rotate(-2deg)`,
            }}
          >
            {drag.node}
          </div>,
          document.body,
        )}
    </div>
  );
}
