import { Section } from "../../components/Page";
import { Botanical } from "../../components/Botanical";
import { Icon } from "../../components/Icon";
import { useSettings, type FloraAmount, type FloraColor } from "../../lib/settings";
import "./JardimSection.css";

const COLORS: { id: FloraColor; label: string; swatch: string }[] = [
  { id: "tema", label: "Do tema", swatch: "conic-gradient(from 200deg, var(--accent), var(--accent-text), var(--accent))" },
  { id: "lilas", label: "Lilás", swatch: "linear-gradient(180deg, #d6c8f0, #8a6cc8)" },
  { id: "azul", label: "Azul", swatch: "linear-gradient(180deg, #ccdaf4, #5a7ec4)" },
  { id: "rosa", label: "Rosa", swatch: "linear-gradient(180deg, #f6d6e2, #c2648e)" },
  { id: "coral", label: "Coral", swatch: "linear-gradient(180deg, #f8decc, #cc7452)" },
  { id: "mista", label: "Colorida", swatch: "conic-gradient(#a88cdc, #e296b6, #e8a080, #86a6e0, #a88cdc)" },
];

const AMOUNTS: { id: FloraAmount; label: string }[] = [
  { id: "nenhuma", label: "Nenhuma" },
  { id: "pouca", label: "Pouca" },
  { id: "normal", label: "Normal" },
  { id: "muita", label: "Muita" },
];

/** Ajustes → Jardim: cor das glicínias, quanto enfeite e trepadeiras na estante */
export function JardimSection() {
  const { floraColor, setFloraColor, floraAmount, setFloraAmount, floraClimbers, setFloraClimbers } = useSettings();
  return (
    <Section title="Jardim">
      <div className="jardim">
        <div className="jardim-preview" aria-hidden>
          <div className="jardim-board" />
          <Botanical art="guirlanda-1" tone="destaque" className="jardim-garland" />
          {floraAmount === "nenhuma" && <span className="jardim-empty">Sem enfeites</span>}
        </div>

        <span className="jardim-label">Cor das flores</span>
        <div className="jardim-colors" role="radiogroup" aria-label="Cor das flores">
          {COLORS.map((c) => (
            <button
              key={c.id}
              role="radio"
              aria-checked={floraColor === c.id}
              className={`jardim-color${floraColor === c.id ? " is-selected" : ""}`}
              onClick={() => setFloraColor(c.id)}
            >
              <span className="jardim-swatch" style={{ background: c.swatch }} />
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        <span className="jardim-label">Quantidade de enfeites</span>
        <div className="jardim-amount" role="radiogroup" aria-label="Quantidade de enfeites">
          {AMOUNTS.map((a) => (
            <button
              key={a.id}
              role="radio"
              aria-checked={floraAmount === a.id}
              className={floraAmount === a.id ? "is-active" : ""}
              onClick={() => setFloraAmount(a.id)}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="group jardim-group">
        <label className="row">
          <span className="row-icon">
            <Icon name="sparkles" size={18} />
          </span>
          <span className="row-label sync-who">
            Trepadeiras na estante
            <small>Ramos subindo pelas laterais das prateleiras</small>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={floraClimbers}
            disabled={floraAmount === "nenhuma"}
            onChange={(e) => setFloraClimbers(e.target.checked)}
          />
        </label>
      </div>
    </Section>
  );
}
