import { useEffect } from "react";
import { Sheet } from "../../components/Sheet";
import { fontFaces } from "./fonts";
import { FONTS, PAPERS, useReaderSettings, type Animation, type ReaderSettings } from "./settings";
import { Pill } from "./Pill";
import { Icon } from "../../components/Icon";
import "./ReaderSettingsSheet.css";

// As fontes de leitura também aparecem no painel, cada uma escrita nela mesma
let facesInjected = false;
function injectFaces() {
  if (facesInjected) return;
  facesInjected = true;
  const style = document.createElement("style");
  style.textContent = fontFaces();
  document.head.appendChild(style);
}

function Segmented<T extends string | number | null>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented rs-segmented">
      {options.map((o) => (
        <button key={String(o.id)} className={value === o.id ? "is-active" : ""} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

const MARGINS: ReaderSettings["margin"][] = ["estreita", "normal", "larga"];
const SPACINGS: ReaderSettings["lineHeight"][] = [null, 1.4, 1.65, 1.9];

const ANIMATIONS: { id: Animation; label: string }[] = [
  { id: "deslizar", label: "Deslizar" },
  { id: "folhear", label: "Folhear" },
  { id: "esmaecer", label: "Esmaecer" },
  { id: "nenhuma", label: "Nenhuma" },
];

export function ReaderSettingsSheet({ open, onClose, isPdf }: { open: boolean; onClose: () => void; isPdf: boolean }) {
  const s = useReaderSettings();
  const set = (c: Partial<ReaderSettings>) => s.set(c);

  useEffect(() => {
    if (open) injectFaces();
  }, [open]);

  return (
    <Sheet open={open} onClose={onClose} label="Aparência do livro" seeThrough>
      <div className="rs">
        <section className="rs-section">
          <h3>Papel</h3>
          <div className="rs-papers">
            <button className={`rs-paper is-auto${s.paper === "auto" ? " is-active" : ""}`} onClick={() => set({ paper: "auto" })}>
              <span className="rs-paper-swatch" />
              <span className="rs-paper-label">Automático</span>
            </button>
            {PAPERS.map((p) => (
              <button key={p.id} className={`rs-paper${s.paper === p.id ? " is-active" : ""}`} onClick={() => set({ paper: p.id })}>
                <span className="rs-paper-swatch" style={{ background: p.bg, color: p.ink }}>
                  Aa
                </span>
                <span className="rs-paper-label">{p.label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="rs-section">
          <div className="rs-pills">
            {!isPdf && (
              <>
                <Pill
                  label="Tamanho"
                  icon={<span style={{ fontSize: 17 }}>Aa</span>}
                  value={(s.fontSize - 70) / 130}
                  onChange={(v) => set({ fontSize: Math.round((70 + v * 130) / 5) * 5 })}
                />
                <Pill
                  label="Margens"
                  icon={<Icon name="margins" size={18} />}
                  steps={3}
                  value={MARGINS.indexOf(s.margin) / 2}
                  onChange={(v) => set({ margin: MARGINS[Math.round(v * 2)] })}
                />
                <Pill
                  label="Espaçamento"
                  icon={<Icon name="spacing" size={18} />}
                  steps={4}
                  value={SPACINGS.indexOf(s.lineHeight) / 3}
                  onChange={(v) => set({ lineHeight: SPACINGS[Math.round(v * 3)] })}
                />
              </>
            )}
            <Pill
              label="Brilho"
              icon={<Icon name="sun" size={18} />}
              value={1 - s.dim / 0.6}
              onChange={(v) => set({ dim: Math.round((1 - v) * 0.6 * 100) / 100 })}
            />
          </div>
          {!isPdf && (
            <p className="rs-hint rs-pill-hint">
              Espaçamento no mínimo usa o do próprio livro. Brilho abaixo do máximo escurece além do mínimo do celular.
            </p>
          )}
        </section>

        {!isPdf && (
          <>
            <section className="rs-section">
              <h3>Fonte</h3>
              <div className="rs-fonts">
                {FONTS.map((f) => (
                  <button
                    key={f.id}
                    className={`rs-font${s.font === f.id ? " is-active" : ""}`}
                    onClick={() => set({ font: f.id })}
                    style={f.family ? { fontFamily: f.family } : undefined}
                  >
                    <span className="rs-font-name">{f.label}</span>
                    {f.note && <span className="rs-font-note">{f.note}</span>}
                  </button>
                ))}
              </div>
            </section>

            <section className="rs-section rs-toggles">
              <label>
                <span>Texto justificado</span>
                <input type="checkbox" className="switch" checked={s.justify} onChange={(e) => set({ justify: e.target.checked })} />
              </label>
              <label>
                <span>Hifenização</span>
                <input type="checkbox" className="switch" checked={s.hyphenate} onChange={(e) => set({ hyphenate: e.target.checked })} />
              </label>
            </section>

            <section className="rs-section">
              <h3>Leitura</h3>
              <Segmented
                value={s.flow}
                onChange={(v) => set({ flow: v })}
                options={[
                  { id: "paginado", label: "Páginas" },
                  { id: "rolagem", label: "Rolagem contínua" },
                ]}
              />
            </section>
          </>
        )}

        <section className="rs-section">
          <h3>Virar a página</h3>
          <Segmented value={s.animation} onChange={(v) => set({ animation: v })} options={ANIMATIONS} />
        </section>

        <section className="rs-section">
          <h3>Conforto para os olhos</h3>
          <div className="rs-comfort">
            <div className="rs-comfort-row">
              <span>Luz quente</span>
              <Segmented
                value={s.warmLight}
                onChange={(v) => set({ warmLight: v })}
                options={[
                  { id: "auto", label: "À noite" },
                  { id: "sempre", label: "Sempre" },
                  { id: "nunca", label: "Nunca" },
                ]}
              />
            </div>
            {s.warmLight !== "nunca" && (
              <div className="rs-slider">
                <span>Intensidade</span>
                <input
                  type="range"
                  min={0.08}
                  max={0.5}
                  step={0.02}
                  value={s.warmth}
                  onChange={(e) => set({ warmth: Number(e.target.value) })}
                  style={{ ["--fill" as string]: `${((s.warmth - 0.08) / 0.42) * 100}%` }}
                />
              </div>
            )}

          </div>
        </section>

        <section className="rs-section rs-toggles">
          <label>
            <span>
              Lembrete de pausa
              <small>a cada 20 minutos, olhar para longe por 20 segundos</small>
            </span>
            <input type="checkbox" className="switch" checked={s.breakReminder} onChange={(e) => set({ breakReminder: e.target.checked })} />
          </label>
          <label>
            <span>Mostrar progresso no rodapé</span>
            <input type="checkbox" className="switch" checked={s.showProgress} onChange={(e) => set({ showProgress: e.target.checked })} />
          </label>
        </section>

        <button className="rs-reset" onClick={s.reset}>
          Voltar ao padrão
        </button>
      </div>
    </Sheet>
  );
}
