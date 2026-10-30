import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { useSettings } from "../../lib/settings";
import { useReaderUi } from "../reader/state";
import { useNovidades } from "../novidades/novidades";
import { TIER_NAMES, tierKey, unlockedKeys } from "./achievements";
import { useConquistas } from "./useConquistas";
import { Medal } from "./Medal";
import { ribbonsFor } from "./ribbons";
import "./ribbons.css";
import "./Celebration.css";

const SPARKS = Array.from({ length: 14 }, (_, i) => i);

/**
 * Comemora níveis de conquista recém-destravados. Espera o livro fechar e as
 * novidades da versão saírem da frente, para não atropelar nada.
 */
export function Celebration() {
  const summary = useConquistas();
  const { seenAchievements, setSeenAchievements, setBookmarkStyle } = useSettings();
  const readerOpen = useReaderUi((s) => !!s.bookId);
  const novidadesOpen = useNovidades((s) => s.open);
  const [fresh, setFresh] = useState<string[] | null>(null);

  const keys = useMemo(() => (summary ? unlockedKeys(summary.achievements) : null), [summary]);

  useEffect(() => {
    if (!keys || fresh || readerOpen || novidadesOpen) return;
    const seen = new Set(seenAchievements ?? []);
    const added = keys.filter((k) => !seen.has(k));
    if (!added.length) return;
    const t = setTimeout(() => setFresh(added), 900);
    return () => clearTimeout(t);
  }, [keys, seenAchievements, fresh, readerOpen, novidadesOpen]);

  const close = () => {
    setSeenAchievements([...new Set([...(seenAchievements ?? []), ...(keys ?? [])])]);
    setFresh(null);
  };

  const items = useMemo(() => {
    if (!fresh || !summary) return [];
    const set = new Set(fresh);
    return summary.achievements.flatMap((a) =>
      a.tiers.flatMap((n, i) => (set.has(tierKey(a.id, i)) ? [{ a, tier: i, n }] : [])),
    );
  }, [fresh, summary]);
  // Só o nível mais alto de cada conquista, para a lista não ficar enorme
  const best = items.filter((it) => !items.some((o) => o.a.id === it.a.id && o.tier > it.tier));
  const ribbons = items.flatMap((it) => ribbonsFor(it.a.id, it.tier));
  const first = seenAchievements === null;

  return (
    <Sheet open={!!fresh && best.length > 0} onClose={close} label="Nova conquista">
      <div className="celebrate">
        <div className="celebrate-hero">
          {SPARKS.map((i) => (
            <motion.span
              key={i}
              className="celebrate-spark"
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0, 1, 0.5],
                x: Math.cos((i / SPARKS.length) * Math.PI * 2) * (64 + (i % 3) * 20),
                y: Math.sin((i / SPARKS.length) * Math.PI * 2) * (46 + (i % 3) * 14),
              }}
              transition={{ duration: 1.4, delay: 0.15 + (i % 4) * 0.06, ease: "easeOut" }}
            />
          ))}
          <motion.div initial={{ scale: 0.4, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 14 }}>
            <Medal icon={best[0]?.a.icon ?? "award"} level={(best[0]?.tier ?? 0) + 1} size={96} />
          </motion.div>
        </div>
        <p className="reading-form-eyebrow">
          {first ? "Suas conquistas chegaram" : best.length === 1 ? "Nova conquista" : `${best.length} novas conquistas`}
        </p>
        <h2 className="reading-form-title">
          {best.length === 1 ? best[0].a.name : first ? "Olha tudo o que você já fez" : "Que fase de leituras!"}
        </h2>
        <ul className="celebrate-list">
          {best.map(({ a, tier, n }) => (
            <li key={a.id}>
              <Medal icon={a.icon} level={tier + 1} size={40} />
              <span>
                <strong>{a.name}</strong>
                <small>
                  {TIER_NAMES[tier]} · {a.goal(n)}
                </small>
              </span>
            </li>
          ))}
        </ul>
        {ribbons.length > 0 && (
          <div className="celebrate-ribbons">
            <p>{ribbons.length === 1 ? "Nova fita de marcador" : "Novas fitas de marcador"}</p>
            <div>
              {ribbons.map((r) => (
                <button key={r.id} onClick={() => setBookmarkStyle(r.id)} className="celebrate-ribbon">
                  <span className={`ribbon ribbon-${r.id}`} />
                  <span>{r.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="reading-form-actions">
          <Button size="lg" onClick={close}>
            Continuar lendo
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
