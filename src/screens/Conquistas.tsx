import { motion } from "motion/react";
import { Page } from "../components/Page";
import { Icon } from "../components/Icon";
import { LeafSprig } from "../components/Botanical";
import "./Conquistas.css";

// Uma prévia das insígnias que vêm por aí. Ainda trancadas.
const BADGES = [
  { icon: "book", name: "Primeira página", hint: "Comece sua primeira leitura" },
  { icon: "bookmark", name: "Fim da história", hint: "Termine um livro" },
  { icon: "refresh", name: "Velho amigo", hint: "Releia um favorito" },
  { icon: "flame", name: "Constância", hint: "7 dias de leitura" },
  { icon: "moon", name: "Madrugada literária", hint: "Leia depois da meia-noite" },
  { icon: "coffee", name: "Café com livro", hint: "Leia antes das 8h" },
  { icon: "library", name: "Estante cheia", hint: "50 livros na biblioteca" },
  { icon: "sparkles", name: "100 mil páginas", hint: "Uma vida de leitura" },
] as const;

export function Conquistas() {
  return (
    <Page eyebrow="Sua jornada" title="Conquistas" decoration={<LeafSprig className="decor-leaves" />}>
      <p className="badges-intro">
        Insígnias que celebram o hábito, não só a quantidade. Elas destrancam conforme você lê.
      </p>
      <div className="badges">
        {BADGES.map((b, i) => (
          <motion.div
            key={b.name}
            className="badge"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.035, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="badge-medal">
              <Icon name={b.icon} size={24} />
            </span>
            <span className="badge-name">{b.name}</span>
            <span className="badge-hint">{b.hint}</span>
          </motion.div>
        ))}
      </div>
    </Page>
  );
}
