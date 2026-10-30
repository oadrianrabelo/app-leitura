import { useState } from "react";
import type { TocItem } from "foliate-js/view.js";
import { Sheet } from "../../components/Sheet";
import { Icon } from "../../components/Icon";
import type { Bookmark } from "../../db/types";
import "../conquistas/ribbons.css";
import "./TocSheet.css";

interface Props {
  open: boolean;
  onClose: () => void;
  toc: TocItem[];
  bookmarks: Bookmark[];
  currentChapter: string | null;
  onGo: (target: string) => void;
  onRemoveBookmark: (id: string) => void;
}

function TocList({ items, depth, current, onGo }: { items: TocItem[]; depth: number; current: string | null; onGo: (h: string) => void }) {
  return (
    <ul className="toc-list">
      {items.map((item, i) => (
        <li key={`${item.href}-${i}`}>
          <button
            className={`toc-item${item.label?.trim() === current ? " is-current" : ""}`}
            style={{ paddingLeft: 12 + depth * 18 }}
            onClick={() => onGo(item.href)}
          >
            {item.label?.trim() || "Sem título"}
          </button>
          {item.subitems && item.subitems.length > 0 && <TocList items={item.subitems} depth={depth + 1} current={current} onGo={onGo} />}
        </li>
      ))}
    </ul>
  );
}

export function TocSheet({ open, onClose, toc, bookmarks, currentChapter, onGo, onRemoveBookmark }: Props) {
  const [tab, setTab] = useState<"sumario" | "marcadores">("sumario");

  return (
    <Sheet open={open} onClose={onClose} label="Sumário e marcadores" tall>
      <div className="segmented toc-tabs">
        <button className={tab === "sumario" ? "is-active" : ""} onClick={() => setTab("sumario")}>
          Sumário
        </button>
        <button className={tab === "marcadores" ? "is-active" : ""} onClick={() => setTab("marcadores")}>
          Marcadores {bookmarks.length > 0 && <span className="toc-count">{bookmarks.length}</span>}
        </button>
      </div>

      {tab === "sumario" ? (
        toc.length > 0 ? (
          <TocList items={toc} depth={0} current={currentChapter} onGo={onGo} />
        ) : (
          <p className="toc-empty">Este livro não tem sumário.</p>
        )
      ) : bookmarks.length > 0 ? (
        <ul className="bookmark-list">
          {bookmarks.map((b) => (
            <li key={b.id}>
              <button className="bookmark-item" onClick={() => onGo(b.location)}>
                <span className={`bookmark-ribbon ribbon ribbon-${b.style}`} aria-hidden />
                <span className="bookmark-body">
                  <span className="bookmark-meta">
                    {b.chapter ?? "Marcador"} · {Math.round(b.fraction * 100)}%
                  </span>
                  <span className="bookmark-excerpt">{b.excerpt ? `“${b.excerpt}…”` : "Página marcada"}</span>
                </span>
              </button>
              <button className="bookmark-remove" onClick={() => onRemoveBookmark(b.id)} aria-label="Remover marcador">
                <Icon name="close" size={16} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="toc-empty">
          <p>Nenhum marcador ainda.</p>
          <p>Toque no canto superior direito da página para marcá-la, como dobrar a ponta de uma folha.</p>
        </div>
      )}
    </Sheet>
  );
}
