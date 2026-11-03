import { AnimatePresence, motion } from "motion/react";
import { Icon } from "../../components/Icon";
import "./HighlightBar.css";

/** Cores de marca-texto: suaves o bastante para o texto continuar legível */
export const HIGHLIGHT_COLORS = [
  { id: "amarelo", color: "#f2d35b", label: "Amarelo" },
  { id: "rosa", color: "#f29bbd", label: "Rosa" },
  { id: "verde", color: "#93d08c", label: "Verde" },
  { id: "lilas", color: "#bba2f0", label: "Lilás" },
  { id: "azul", color: "#8fb8ee", label: "Azul" },
] as const;

interface Props {
  /** "nova": há texto selecionado; "existente": tocou num destaque */
  mode: "nova" | "existente" | null;
  current?: string | null;
  onColor: (color: string) => void;
  onCopy?: () => void;
  onRemove?: () => void;
  onDismiss: () => void;
}

/** Barrinha flutuante no topo do leitor para destacar (ou mudar/remover) um trecho */
export function HighlightBar({ mode, current, onColor, onCopy, onRemove, onDismiss }: Props) {
  return (
    <AnimatePresence>
      {mode && (
        <motion.div
          className="hl-bar"
          role="toolbar"
          aria-label={mode === "nova" ? "Destacar trecho" : "Trecho destacado"}
          initial={{ y: -16, opacity: 0, scale: 0.96 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -12, opacity: 0, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 520, damping: 34 }}
        >
          <span className="hl-label">{mode === "nova" ? "Destacar" : "Destaque"}</span>
          <div className="hl-colors">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.id}
                className={`hl-dot${current === c.color ? " is-on" : ""}`}
                style={{ background: c.color }}
                onClick={() => onColor(c.color)}
                aria-label={c.label}
              />
            ))}
          </div>
          {mode === "nova" && onCopy && (
            <button className="hl-action" onClick={onCopy} aria-label="Copiar">
              <Icon name="file" size={17} />
            </button>
          )}
          {mode === "existente" && onRemove && (
            <button className="hl-action" onClick={onRemove} aria-label="Remover destaque">
              <Icon name="trash" size={17} />
            </button>
          )}
          <button className="hl-action" onClick={onDismiss} aria-label="Fechar">
            <Icon name="close" size={17} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
