import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./Sheet.css";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  label: string;
}

/**
 * Folha que sobe de baixo no celular e vira um cartão centralizado em telas largas.
 * Fecha arrastando para baixo, tocando fora ou com Esc.
 */
export function Sheet({ open, onClose, children, label }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 120 || info.velocity.y > 600) onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="sheet-root">
          <motion.div
            className="sheet-scrim"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
          />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.6 }}
            transition={{ type: "spring", damping: 34, stiffness: 380, mass: 0.9 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={onDragEnd}
          >
            <div className="sheet-grabber" aria-hidden />
            <div className="sheet-content">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
