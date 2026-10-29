import { Icon } from "../../components/Icon";
import "./Stars.css";

interface StarsProps {
  value: number | null;
  onChange?: (value: number | null) => void;
  size?: number;
}

/** Nota de 1 a 5. Tocar na estrela atual apaga a nota. */
export function Stars({ value, onChange, size = 18 }: StarsProps) {
  const v = value ?? 0;
  return (
    <span className={`stars${onChange ? " is-editable" : ""}`} role={onChange ? "radiogroup" : "img"} aria-label={value ? `${value} de 5 estrelas` : "Sem nota"}>
      {[1, 2, 3, 4, 5].map((n) => {
        const star = <Icon name="star" size={size} className={n <= v ? "is-on" : ""} fill={n <= v ? "currentColor" : "none"} />;
        return onChange ? (
          <button key={n} role="radio" aria-checked={v === n} aria-label={`${n} estrela${n > 1 ? "s" : ""}`} onClick={() => onChange(v === n ? null : n)}>
            {star}
          </button>
        ) : (
          <span key={n}>{star}</span>
        );
      })}
    </span>
  );
}
