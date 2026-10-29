import { motion } from "motion/react";
import { Page, SoonTag } from "../components/Page";
import { Icon } from "../components/Icon";
import "./Biblioteca.css";

// Lombadas "fantasma" da estante vazia: altura, largura e tom variados como numa estante real.
const SPINES = [
  { h: 86, w: 18, tone: 1 },
  { h: 94, w: 22, tone: 2 },
  { h: 78, w: 16, tone: 3 },
  { h: 90, w: 26, tone: 1 },
  { h: 82, w: 14, tone: 2 },
  { h: 96, w: 20, tone: 3, tilt: true },
];

const ACTIONS = [
  {
    icon: "upload",
    title: "Importar EPUBs",
    text: "Arraste uma pasta inteira; capa, título e autor vêm do próprio arquivo.",
  },
  {
    icon: "barcode",
    title: "Livro físico",
    text: "Aponte a câmera para o código de barras e ele entra na sua estante.",
  },
] as const;

export function Biblioteca() {
  return (
    <Page eyebrow="Tudo o que você já leu" title="Biblioteca">
      <div className="shelf" aria-hidden>
        <div className="shelf-books">
          {SPINES.map((s, i) => (
            <motion.span
              key={i}
              className={`spine tone-${s.tone}${s.tilt ? " is-tilted" : ""}`}
              style={{ height: s.h, width: s.w }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            />
          ))}
        </div>
        <div className="shelf-board" />
      </div>

      <div className="shelf-empty">
        <h2>Sua estante está esperando</h2>
        <p>Cada livro que você já leu, físico ou digital, vai morar aqui. Releituras também contam.</p>
      </div>

      <div className="library-actions">
        {ACTIONS.map((a) => (
          <div key={a.title} className="library-action" aria-disabled>
            <span className="library-action-icon">
              <Icon name={a.icon} size={20} />
            </span>
            <span className="library-action-body">
              <span className="library-action-title">
                {a.title} <SoonTag />
              </span>
              <span className="library-action-text">{a.text}</span>
            </span>
          </div>
        ))}
      </div>
    </Page>
  );
}
