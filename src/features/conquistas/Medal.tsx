import { Icon, type IconName } from "../../components/Icon";
import "./Medal.css";

interface Props {
  icon: string;
  /** Níveis destravados (0 = trancada) */
  level: number;
  /** 0 a 1 até o próximo nível */
  progress?: number;
  size?: number;
}

/** Medalha redonda: a cor do metal mostra o nível; o anel em volta, o caminho até o próximo. */
export function Medal({ icon, level, progress = 0, size = 64 }: Props) {
  const r = size / 2 - 2;
  const c = 2 * Math.PI * r;
  return (
    <span className={`medal tier-${Math.min(level, 6)}`} style={{ width: size, height: size }}>
      <svg className="medal-ring" viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="medal-track" />
        {progress > 0 && progress < 1 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            className="medal-progress"
            strokeDasharray={`${c * progress} ${c}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        )}
      </svg>
      <span className="medal-face">
        <Icon name={icon as IconName} size={Math.round(size * 0.36)} />
      </span>
    </span>
  );
}
