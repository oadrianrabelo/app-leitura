import { useId } from "react";

/*
 * Ilustrações botânicas do Sépia: orquídeas e folhas, em traço de ilustração.
 * SVG inline (sem imagens), cores próprias, servem como enfeite discreto.
 */

const petal = (len: number, w: number) =>
  `M0 0 C ${w} ${-len * 0.28} ${w * 0.95} ${-len * 0.95} 0 ${-len} C ${-w * 0.95} ${-len * 0.95} ${-w} ${-len * 0.28} 0 0 Z`;

const leaf = (len: number, w: number) =>
  `M0 0 C ${w} ${-len * 0.22} ${w * 0.75} ${-len * 0.82} 0 ${-len} C ${-w * 0.75} ${-len * 0.82} ${-w} ${-len * 0.22} 0 0 Z`;

interface FlowerProps {
  x: number;
  y: number;
  s?: number;
  r?: number;
  ids: Ids;
}

interface Ids {
  petal: string;
  sepal: string;
  lip: string;
  leaf: string;
  leafDark: string;
}

const INK = "#5b3f55";

function Flower({ x, y, s = 1, r = 0, ids }: FlowerProps) {
  const vein = (len: number, rot: number, key: string) => (
    <g key={key} transform={`rotate(${rot})`} stroke="#a7708f" strokeWidth={0.6} fill="none" opacity={0.55}>
      <path d={`M0 -3 Q 3 ${-len * 0.5} 1 ${-len * 0.85}`} />
      <path d={`M0 -3 Q -3 ${-len * 0.5} -1 ${-len * 0.85}`} />
      <path d={`M0 -3 L 0 ${-len * 0.9}`} />
    </g>
  );
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      {/* sépalas: uma em cima, duas embaixo */}
      {[0, 148, -148].map((rot) => (
        <path key={rot} d={petal(30, 10)} transform={`rotate(${rot})`} fill={`url(#${ids.sepal})`} stroke={INK} strokeWidth={0.7} strokeOpacity={0.45} />
      ))}
      {/* pétalas largas dos lados */}
      {[72, -72].map((rot) => (
        <path key={rot} d={petal(33, 21)} transform={`rotate(${rot})`} fill={`url(#${ids.petal})`} stroke={INK} strokeWidth={0.7} strokeOpacity={0.45} />
      ))}
      {[72, -72, 0].map((rot) => vein(rot === 0 ? 28 : 31, rot, `v${rot}`))}
      {/* labelo e coluna no centro */}
      <path d={petal(15, 8)} transform="rotate(180)" fill={`url(#${ids.lip})`} stroke={INK} strokeWidth={0.6} strokeOpacity={0.5} />
      <ellipse cx={0} cy={-1} rx={4} ry={5} fill="#f4e3c6" stroke={INK} strokeWidth={0.5} strokeOpacity={0.4} />
      <circle cx={0} cy={-2} r={1.4} fill="#c98a6a" />
    </g>
  );
}

function Bud({ x, y, r = 0, s = 1 }: { x: number; y: number; r?: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <path d="M0 0 C 5 -3 6 -11 0 -15 C -6 -11 -5 -3 0 0 Z" fill="#dcb2cc" stroke={INK} strokeWidth={0.6} strokeOpacity={0.45} />
      <path d="M0 0 C 2 -4 2 -9 0 -12" stroke="#a7708f" strokeWidth={0.5} fill="none" opacity={0.6} />
    </g>
  );
}

function Leaf({ x, y, len, w, r, ids, dark = false }: { x: number; y: number; len: number; w: number; r: number; ids: Ids; dark?: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r})`}>
      <path d={leaf(len, w)} fill={`url(#${dark ? ids.leafDark : ids.leaf})`} stroke="#33452f" strokeWidth={0.7} strokeOpacity={0.5} />
      <path d={`M0 -2 Q ${w * 0.08} ${-len * 0.5} 0 ${-len * 0.96}`} stroke="#2f402b" strokeWidth={0.8} fill="none" opacity={0.45} />
      {[0.25, 0.42, 0.59].map((t) => (
        <g key={t} stroke="#2f402b" strokeWidth={0.5} fill="none" opacity={0.25}>
          <path d={`M0 ${-len * t} Q ${w * 0.25} ${-len * (t + 0.06)} ${w * 0.42} ${-len * (t + 0.12)}`} />
          <path d={`M0 ${-len * t} Q ${-w * 0.25} ${-len * (t + 0.06)} ${-w * 0.42} ${-len * (t + 0.12)}`} />
        </g>
      ))}
    </g>
  );
}

function Defs({ ids }: { ids: Ids }) {
  return (
    <defs>
      <radialGradient id={ids.petal} cx="0.5" cy="0.9" r="0.9">
        <stop offset="0" stopColor="#e2b3cf" />
        <stop offset="0.55" stopColor="#ecd0e2" />
        <stop offset="1" stopColor="#f5e4ee" />
      </radialGradient>
      <radialGradient id={ids.sepal} cx="0.5" cy="0.9" r="0.9">
        <stop offset="0" stopColor="#d9a7c5" />
        <stop offset="1" stopColor="#efd8e6" />
      </radialGradient>
      <linearGradient id={ids.lip} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#a8507f" />
        <stop offset="1" stopColor="#c97ea6" />
      </linearGradient>
      <linearGradient id={ids.leaf} x1="0" y1="1" x2="0.3" y2="0">
        <stop offset="0" stopColor="#4f6b47" />
        <stop offset="1" stopColor="#89a37a" />
      </linearGradient>
      <linearGradient id={ids.leafDark} x1="0" y1="1" x2="0.3" y2="0">
        <stop offset="0" stopColor="#3f5a3a" />
        <stop offset="1" stopColor="#6e8a62" />
      </linearGradient>
    </defs>
  );
}

function useIds(): Ids {
  const base = useId().replace(/:/g, "");
  return { petal: `${base}p`, sepal: `${base}s`, lip: `${base}l`, leaf: `${base}f`, leafDark: `${base}d` };
}

/** Haste de orquídea com três flores, botões e folhas na base. */
export function OrchidSprig({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ids = useIds();
  return (
    <svg viewBox="-34 14 270 306" className={className} style={style} aria-hidden>
      <Defs ids={ids} />
      {/* haste arqueada */}
      <path d="M70 290 C 62 220 70 150 105 100 C 130 64 160 46 192 40" stroke="#5f6e48" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d="M140 66 C 150 52 160 44 168 30" stroke="#5f6e48" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <Leaf x={70} y={292} len={96} w={34} r={-62} ids={ids} dark />
      <Leaf x={72} y={292} len={110} w={36} r={48} ids={ids} />
      <Leaf x={70} y={292} len={80} w={28} r={-10} ids={ids} />
      <Flower x={88} y={150} s={1.05} r={-12} ids={ids} />
      <Flower x={128} y={86} s={0.95} r={8} ids={ids} />
      <Flower x={176} y={58} s={0.78} r={22} ids={ids} />
      <Bud x={196} y={44} r={60} s={0.9} />
      <Bud x={170} y={30} r={20} s={0.75} />
    </svg>
  );
}

/** Raminho de folhas para cantos e divisórias. */
export function LeafSprig({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ids = useIds();
  return (
    <svg viewBox="0 10 170 120" className={className} style={style} aria-hidden>
      <Defs ids={ids} />
      <path d="M8 112 C 40 90 80 70 152 54" stroke="#5f6e48" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <Leaf x={40} y={92} len={44} w={15} r={-20} ids={ids} />
      <Leaf x={58} y={82} len={40} w={14} r={120} ids={ids} dark />
      <Leaf x={86} y={72} len={42} w={14} r={-30} ids={ids} />
      <Leaf x={108} y={65} len={36} w={12} r={115} ids={ids} dark />
      <Leaf x={132} y={58} len={34} w={12} r={-40} ids={ids} />
      <Leaf x={150} y={55} len={26} w={9} r={70} ids={ids} />
    </svg>
  );
}

/** Uma flor só, para selos e momentos especiais. */
export function OrchidBloom({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const ids = useIds();
  return (
    <svg viewBox="-40 -40 80 80" className={className} style={style} aria-hidden>
      <Defs ids={ids} />
      <Flower x={0} y={2} s={1.05} ids={ids} />
    </svg>
  );
}
