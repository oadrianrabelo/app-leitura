import { motion } from "motion/react";
import { Page, Section } from "../components/Page";
import { Icon } from "../components/Icon";
import { Button } from "../components/Button";
import "./Hoje.css";

function greeting(date: Date) {
  const h = date.getHours();
  if (h < 5) return "Boa madrugada";
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long" });

const STATS = [
  { icon: "flame", value: "0", label: "dias seguidos" },
  { icon: "target", value: "0", label: "páginas hoje" },
  { icon: "bookmark", value: "0", label: `livros em ${new Date().getFullYear()}` },
] as const;

export function Hoje({ onOpenLibrary }: { onOpenLibrary: () => void }) {
  const now = new Date();

  return (
    <Page eyebrow={weekday.format(now)} title={greeting(now)}>
      <motion.div
        className="current-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="current-cover" aria-hidden>
          <span />
          <span />
          <span />
        </div>
        <div className="current-body">
          <p className="current-eyebrow">Lendo agora</p>
          <h2 className="current-title">Nenhum livro aberto ainda</h2>
          <p className="current-text">
            Quando você começar uma leitura, ela aparece aqui com as páginas que faltam e o tempo
            estimado até o fim.
          </p>
          <Button variant="secondary" onClick={onOpenLibrary}>
            <Icon name="library" size={16} />
            Ir para a biblioteca
          </Button>
        </div>
      </motion.div>

      <Section title="Seu ritmo">
        <div className="stats">
          {STATS.map((s, i) => (
            <motion.div
              key={s.label}
              className="stat"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.05, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <Icon name={s.icon} size={18} className="stat-icon" />
              <span className="stat-value">{s.value}</span>
              <span className="stat-label">{s.label}</span>
            </motion.div>
          ))}
        </div>
        <p className="stats-note">
          Sua sequência começa na primeira página. E aqui ela é gentil: dias de descanso não apagam
          o que você construiu.
        </p>
      </Section>
    </Page>
  );
}
