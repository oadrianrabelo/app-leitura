import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Page, Section } from "../components/Page";
import { Icon, type IconName } from "../components/Icon";
import { useSettings, type ThemeChoice } from "../lib/settings";
import { appVersion, BUILD_VERSION } from "../lib/version";
import { platform } from "../lib/platform";
import { useUpdates } from "../features/updates/updates";
import { useNovidades } from "../features/novidades/novidades";
import { SyncSection } from "../features/sync/SyncSection";
import { JardimSection } from "../features/flora/JardimSection";
import { Botanical } from "../components/Botanical";
import "./Ajustes.css";

// swatch: fundo, texto e as cores das flores daquele tema
const THEMES: { id: ThemeChoice; label: string; icon: IconName; swatch: [string, string]; flora?: string[] }[] = [
  { id: "sistema", label: "Automático", icon: "monitor", swatch: ["#f4f1f8", "#1a1620"] },
  { id: "lavanda", label: "Lavanda", icon: "sun", swatch: ["#f4f1f8", "#6e53ae"], flora: ["#5f8a5a", "#9479d1", "#5b86c6"] },
  { id: "jardim", label: "Jardim", icon: "sun", swatch: ["#eff3f7", "#36609f"], flora: ["#5b8a5e", "#4f7fc4", "#8a9fc4"] },
  { id: "papel", label: "Papel", icon: "sun", swatch: ["#f4ede1", "#2a241d"], flora: ["#6b8a4f", "#c26f86", "#5f86c4"] },
  { id: "rose", label: "Rosé", icon: "sun", swatch: ["#f6eff0", "#a4466a"], flora: ["#6f8a5c", "#cf7894", "#9a82d6"] },
  { id: "terracota", label: "Terracota", icon: "sun", swatch: ["#f3e8dc", "#9c4a29"], flora: ["#6e7748", "#b65c3a", "#a15869"] },
  { id: "sepia", label: "Sépia", icon: "coffee", swatch: ["#eadbc0", "#8f4c2b"], flora: ["#6f7743", "#b4583a", "#c08e3a"] },
  { id: "noite", label: "Noite", icon: "moon", swatch: ["#1b1815", "#e6d9c3"], flora: ["#8fae84", "#c4b0f0", "#e3a6b8"] },
  { id: "ameixa", label: "Ameixa", icon: "moon", swatch: ["#1a1620", "#cdbcf5"], flora: ["#93b38a", "#cdb8f5", "#f0b3c6"] },
];

export function Ajustes() {
  const { theme, setTheme, autoCheckUpdates, setAutoCheckUpdates, name, setName } = useSettings();
  const { status, check, info, openSheet } = useUpdates();
  const showNovidades = useNovidades((s) => s.show);
  const [version, setVersion] = useState(BUILD_VERSION);

  useEffect(() => {
    appVersion().then(setVersion);
  }, []);

  const canUpdate = platform === "android" || platform === "desktop";
  let updateLabel = "Procurar atualização";
  if (status === "checking") updateLabel = "Procurando…";
  if (status === "up-to-date") updateLabel = "Você está na versão mais recente";
  if (status === "available" && info) updateLabel = `Instalar a versão ${info.version}`;
  if (status === "error") updateLabel = "Sem conexão. Tentar de novo";

  return (
    <Page eyebrow="Do seu jeito" title="Ajustes" decoration={<Botanical art="raminho" className="decor-sprig" />}>
      <Section title="Você">
        <div className="group">
          <label className="row">
            <span className="row-icon">
              <Icon name="heart" size={18} />
            </span>
            <span className="row-label">Seu nome</span>
            <input
              className="row-input"
              type="text"
              placeholder="Como te chamamos"
              defaultValue={name ?? ""}
              onBlur={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            />
          </label>
        </div>
      </Section>

      <Section title="Aparência">
        <div className="themes" role="radiogroup" aria-label="Tema">
          {THEMES.map((t) => {
            const selected = theme === t.id;
            return (
              <button
                key={t.id}
                role="radio"
                aria-checked={selected}
                className={`theme-option${selected ? " is-selected" : ""}`}
                onClick={() => setTheme(t.id)}
              >
                <span
                  className="theme-swatch"
                  style={
                    t.id === "sistema"
                      ? { background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)` }
                      : { background: t.swatch[0], color: t.swatch[1] }
                  }
                >
                  {t.id !== "sistema" && <span className="theme-swatch-text">Aa</span>}
                  {t.flora && (
                    <span className="theme-flora" aria-hidden>
                      {t.flora.map((c) => (
                        <span key={c} style={{ background: c }} />
                      ))}
                    </span>
                  )}
                  {selected && (
                    <motion.span
                      layoutId="theme-ring"
                      className="theme-ring"
                      transition={{ type: "spring", stiffness: 500, damping: 36 }}
                    />
                  )}
                </span>
                <span className="theme-label">{t.label}</span>
              </button>
            );
          })}
        </div>
        <p className="settings-footnote">
          Nenhum tema usa branco ou preto puros. O contraste é suficiente para ler bem, sem ofuscar.
        </p>
      </Section>

      <JardimSection />

      <SyncSection />

      {canUpdate && (
        <Section title="Atualizações">
          <div className="group">
            <button
              className="row"
              onClick={() => (status === "available" ? openSheet() : check())}
              disabled={status === "checking"}
            >
              <span className="row-icon">
                <Icon name="refresh" size={18} className={status === "checking" ? "spin" : ""} />
              </span>
              <span className="row-label">{updateLabel}</span>
              {status === "up-to-date" && <Icon name="check" size={18} className="row-check" />}
            </button>
            <label className="row">
              <span className="row-icon">
                <Icon name="download" size={18} />
              </span>
              <span className="row-label">Procurar ao abrir o app</span>
              <input
                type="checkbox"
                className="switch"
                checked={autoCheckUpdates}
                onChange={(e) => setAutoCheckUpdates(e.target.checked)}
              />
            </label>
          </div>
        </Section>
      )}

      <Section title="Sobre">
        <div className="group">
          <button className="row" onClick={showNovidades}>
            <span className="row-icon">
              <Icon name="sparkles" size={18} />
            </span>
            <span className="row-label">Novidades</span>
            <Icon name="chevron" size={18} className="row-chevron" />
          </button>
          <div className="row">
            <span className="row-icon">
              <Icon name="info" size={18} />
            </span>
            <span className="row-label">Versão</span>
            <span className="row-value">{version}</span>
          </div>
        </div>
        <div className="settings-signature">
          <Botanical art="orquidea" tone="destaque" className="signature-bloom" />
          <p>Feito com carinho para quem ama ler.</p>
        </div>
      </Section>
    </Page>
  );
}
