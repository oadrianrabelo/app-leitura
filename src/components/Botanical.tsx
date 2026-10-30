import { useEffect, useState, type CSSProperties } from "react";
import "./Botanical.css";

/*
 * Ilustrações em aquarela (geradas por design/aquarela): glicínias, folhas e
 * galhos. Cada peça existe em quatro paletas; aparece a que combina com o tema.
 */
const FILES = import.meta.glob<string>("../assets/aquarela/*.webp", { eager: true, import: "default", query: "?url" });

const GARLAND = 560 / 1100;
const ART = {
  haste: { file: "canto", ratio: 1500 / 1100 },
  "guirlanda-1": { file: "guirlanda-1", ratio: GARLAND },
  "guirlanda-2": { file: "guirlanda-2", ratio: GARLAND },
  "guirlanda-3": { file: "guirlanda-3", ratio: GARLAND },
  "guirlanda-4": { file: "guirlanda-4", ratio: GARLAND },
  trepadeira: { file: "trepadeira", ratio: 1100 / 420 },
  raminho: { file: "raminho", ratio: 1 },
  orquidea: { file: "raminho", ratio: 1 },
} as const;

export type BotanicalArt = keyof typeof ART;

const PALETTE: Record<string, string> = {
  lavanda: "lilas",
  ameixa: "lilas",
  noite: "lilas",
  jardim: "azul",
  rose: "rosa",
  papel: "rosa",
  terracota: "coral",
  sepia: "coral",
};

/** Tema aplicado no <html> (já resolvido, mesmo no automático) */
function useTheme() {
  const read = () => document.documentElement.dataset.theme ?? "lavanda";
  const [theme, setTheme] = useState(read);
  useEffect(() => {
    const mo = new MutationObserver(() => setTheme(read()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => mo.disconnect();
  }, []);
  return theme;
}

interface Props {
  art: BotanicalArt;
  className?: string;
  style?: CSSProperties;
  /** "fundo" mais suave; "destaque" mais presente */
  tone?: "fundo" | "destaque";
}

export function Botanical({ art, className = "", style, tone = "fundo" }: Props) {
  const theme = useTheme();
  const { file, ratio } = ART[art];
  const src = FILES[`../assets/aquarela/${file}-${PALETTE[theme] ?? "lilas"}.webp`];
  return (
    <img
      className={`botanical is-${tone} ${className}`}
      src={src}
      alt=""
      draggable={false}
      decoding="async"
      style={{ aspectRatio: `${1 / ratio}`, ...style }}
      aria-hidden
    />
  );
}
