import type { CSSProperties } from "react";
import layers from "../assets/botanica/layers.json";
import "./Botanical.css";

/*
 * Ilustrações botânicas em traço de gravura (geradas por design/botanica),
 * coloridas como gravura pintada à mão: cada camada (folhas, flores,
 * florzinhas, detalhes) é uma máscara pintada com uma cor do tema.
 */
const FILES = import.meta.glob<string>("../assets/botanica/*.png", { eager: true, import: "default" });
const src = (name: string, layer: string) => FILES[`../assets/botanica/${name}-${layer}.png`];

const ART = {
  haste: { file: "orquidea-haste", ratio: 912 / 720 },
  "guirlanda-1": { file: "guirlanda-1", ratio: 286 / 988 },
  "guirlanda-2": { file: "guirlanda-2", ratio: 286 / 988 },
  raminho: { file: "raminho", ratio: 408 / 456 },
  orquidea: { file: "orquidea", ratio: 1 },
  borboleta: { file: "borboleta", ratio: 168 / 204 },
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
  const { file, ratio } = ART[art];
  return (
    <span className={`botanical is-${tone} ${className}`} style={{ aspectRatio: `${1 / ratio}`, ...style }} aria-hidden>
      {(layers as Record<string, string[]>)[file].map((layer) => {
        const url = `url(${src(file, layer)})`;
        return <span key={layer} className={`botanical-layer is-${layer}`} style={{ maskImage: url, WebkitMaskImage: url }} />;
      })}
    </span>
  );
}
