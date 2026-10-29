import type { CSSProperties } from "react";
import haste from "../assets/botanica/orquidea-haste.png";
import guirlanda1 from "../assets/botanica/guirlanda-1.png";
import guirlanda2 from "../assets/botanica/guirlanda-2.png";
import raminho from "../assets/botanica/raminho.png";
import orquidea from "../assets/botanica/orquidea.png";
import "./Botanical.css";

/*
 * Ilustrações botânicas em traço de gravura (geradas por design/botanica).
 * São máscaras: a cor vem do tema, num tom só, um pouco mais escuro que o fundo.
 */
const ART = {
  haste: { src: haste, ratio: 912 / 720 },
  "guirlanda-1": { src: guirlanda1, ratio: 260 / 988 },
  "guirlanda-2": { src: guirlanda2, ratio: 260 / 988 },
  raminho: { src: raminho, ratio: 408 / 456 },
  orquidea: { src: orquidea, ratio: 1 },
} as const;

export type BotanicalArt = keyof typeof ART;

interface Props {
  art: BotanicalArt;
  className?: string;
  style?: CSSProperties;
  /** "fundo" bem suave; "destaque" um pouco mais presente */
  tone?: "fundo" | "destaque";
}

export function Botanical({ art, className = "", style, tone = "fundo" }: Props) {
  const { src, ratio } = ART[art];
  return (
    <span
      className={`botanical is-${tone} ${className}`}
      style={{ maskImage: `url(${src})`, WebkitMaskImage: `url(${src})`, aspectRatio: `${1 / ratio}`, ...style }}
      aria-hidden
    />
  );
}
