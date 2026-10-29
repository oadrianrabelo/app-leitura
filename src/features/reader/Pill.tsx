import { useRef, type ReactNode } from "react";

interface PillProps {
  label: string;
  icon: ReactNode;
  /** Posição atual, de 0 a 1 */
  value: number;
  /** Quantos passos (0 = contínuo) */
  steps?: number;
  onChange: (value: number) => void;
}

/**
 * Controle vertical em pílula: arraste para cima/baixo ou toque na metade de
 * cima (+) e de baixo (−). O preenchimento mostra o nível.
 */
export function Pill({ label, icon, value, steps = 0, onChange }: PillProps) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<{ y: number; v: number; moved: boolean } | null>(null);

  const snap = (v: number) => {
    const c = Math.min(1, Math.max(0, v));
    return steps > 1 ? Math.round(c * (steps - 1)) / (steps - 1) : c;
  };

  return (
    <div className="pill-control">
      <div
        ref={ref}
        className="pill"
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        tabIndex={0}
        onKeyDown={(e) => {
          const step = steps > 1 ? 1 / (steps - 1) : 0.1;
          if (e.key === "ArrowUp" || e.key === "ArrowRight") onChange(snap(value + step));
          if (e.key === "ArrowDown" || e.key === "ArrowLeft") onChange(snap(value - step));
        }}
        onPointerDown={(e) => {
          (e.target as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, v: value, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          const h = ref.current?.clientHeight ?? 150;
          if (!d) return;
          const dy = d.y - e.clientY;
          if (Math.abs(dy) > 4) d.moved = true;
          if (d.moved) {
            const next = snap(d.v + dy / h);
            if (next !== value) onChange(next);
          }
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d || d.moved) return;
          // Toque: metade de cima aumenta, de baixo diminui
          const box = ref.current!.getBoundingClientRect();
          const step = steps > 1 ? 1 / (steps - 1) : 0.1;
          onChange(snap(value + (e.clientY < box.top + box.height / 2 ? step : -step)));
        }}
      >
        <span className="pill-fill" style={{ transform: `scaleY(${Math.max(0.12, value)})` }} />
        {steps > 1 && (
          <span className="pill-dots" aria-hidden>
            {Array.from({ length: steps }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        )}
        <span className="pill-icon">{icon}</span>
      </div>
      <span className="pill-label">{label}</span>
    </div>
  );
}
