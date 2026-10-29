import { AnimatePresence, motion, useDragControls, type PanInfo } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./Sheet.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
  /** Ocupa quase a tela toda (listas longas, detalhes) */
  tall?: boolean;
  /** Impede fechar arrastando ou tocando fora (ex.: durante uma importação) */
  locked?: boolean;
}

/**
 * Folha que sobe de baixo no celular e vira um cartão centralizado em telas largas.
 * Fecha arrastando a alça para baixo, tocando fora ou com Esc.
 */
export function Sheet({ open, onClose, children, label, tall = false, locked = false }: SheetProps) {
  // Arrastar só pela alça: assim a rolagem do conteúdo nunca puxa a folha junto.
  const drag = useDragControls();
  useEffect(() => {
    if (!open || locked) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, locked]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (!locked && (info.offset.y > 120 || info.velocity.y > 600)) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-root">
          <motion.div
            className="sheet-scrim"
            onClick={locked ? undefined : onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          />
          <motion.div
            className={`sheet${tall ? " is-tall" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.9 }}
            drag={locked ? false : "y"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="sheet-handle" onPointerDown={(e) => !locked && drag.start(e)} aria-hidden>
              <div className="sheet-grabber" />
            </div>
            <div className="sheet-content">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
