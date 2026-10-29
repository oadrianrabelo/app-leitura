import { useEffect } from "react";
import { motion } from "motion/react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { useSettings } from "../../lib/settings";
import { BUILD_VERSION } from "../../lib/version";
import { CHANGELOG } from "./changelog";
import { useNovidades } from "./novidades";
import { Botanical } from "../../components/Botanical";
import "./NovidadesSheet.css";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

export function NovidadesSheet() {
  const { open, show, hide } = useNovidades();
  const lastSeen = useSettings((s) => s.lastSeenVersion);
  const setLastSeen = useSettings((s) => s.setLastSeenVersion);

  // Abre sozinha na primeira vez e depois de cada atualização.
  useEffect(() => {
    if (lastSeen !== BUILD_VERSION) {
      const t = setTimeout(show, 700);
      return () => clearTimeout(t);
    }
  }, [lastSeen, show]);

  const close = () => {
    setLastSeen(BUILD_VERSION);
    hide();
  };

  const [latest, ...older] = CHANGELOG;

  return (
    <Sheet open={open} onClose={close} label="Novidades">
      <div className="novidades">
        <Botanical art="haste" className="novidades-orchid" />
        <p className="novidades-eyebrow">
          Novidades da versão {latest.version} · {dateFormat.format(new Date(`${latest.date}T12:00:00`))}
        </p>
        <h2 className="novidades-title">{latest.title}</h2>

        <ul className="novidades-list">
          {latest.highlights.map((h, i) => (
            <motion.li
              key={h.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="novidades-icon">
                <Icon name={h.icon} size={20} />
              </span>
              <span>
                <strong>{h.title}</strong>
                <span>{h.text}</span>
              </span>
            </motion.li>
          ))}
        </ul>

        {older.length > 0 && (
          <details className="novidades-older">
            <summary>Versões anteriores</summary>
            {older.map((entry) => (
              <div key={entry.version} className="novidades-older-entry">
                <p>
                  <strong>{entry.version}</strong> · {entry.title}
                </p>
                <ul>
                  {entry.highlights.map((h) => (
                    <li key={h.title}>{h.title}</li>
                  ))}
                </ul>
              </div>
            ))}
          </details>
        )}

        <Button size="lg" onClick={close} className="novidades-cta">
          Continuar
        </Button>
      </div>
    </Sheet>
  );
}
