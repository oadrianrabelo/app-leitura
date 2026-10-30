import { useState } from "react";
import { motion } from "motion/react";
import { Page, Section } from "../components/Page";
import { Icon } from "../components/Icon";
import { Sheet } from "../components/Sheet";
import { Button } from "../components/Button";
import { Botanical } from "../components/Botanical";
import { useSettings } from "../lib/settings";
import { TIER_NAMES, type AchievementState } from "../features/conquistas/achievements";
import { useConquistas } from "../features/conquistas/useConquistas";
import { Medal } from "../features/conquistas/Medal";
import { RIBBONS, ribbonUnlocked, ribbonsFor } from "../features/conquistas/ribbons";
import { JardimVivo } from "../features/flora/JardimVivo";
import "../features/conquistas/ribbons.css";
import "./Conquistas.css";

const fmtDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });
const fmtNum = (n: number) => Math.round(n).toLocaleString("pt-BR");

/** Quanto falta até o próximo nível, de 0 a 1 */
function progressOf(a: AchievementState) {
  if (a.next === null) return 1;
  const prev = a.level > 0 ? a.tiers[a.level - 1] : 0;
  return Math.max(0, Math.min(1, (a.value - prev) / (a.next - prev)));
}

function YearGoal({ done, goal, onEdit }: { done: number; goal: number | null; onEdit: () => void }) {
  const year = new Date().getFullYear();
  const pct = goal ? Math.min(1, done / goal) : 0;
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <button className="goal" onClick={onEdit}>
      <svg className="goal-ring" viewBox="0 0 80 80" aria-hidden>
        <circle cx="40" cy="40" r={r} className="goal-track" />
        {goal && <circle cx="40" cy="40" r={r} className="goal-fill" strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 40 40)" />}
        <text x="40" y="46" textAnchor="middle" className="goal-count">
          {done}
        </text>
      </svg>
      <span className="goal-body">
        <span className="goal-eyebrow">Meta de {year}</span>
        {goal ? (
          <>
            <strong>
              {done} de {goal} livros
            </strong>
            <span>
              {done >= goal
                ? "Meta cumprida! Que ano de leituras."
                : `Faltam ${goal - done}. ${goal - done <= 2 ? "Quase lá!" : "Um livro de cada vez."}`}
            </span>
          </>
        ) : (
          <>
            <strong>Quantos livros este ano?</strong>
            <span>Toque para escolher uma meta. Ela é só sua, sem pressão.</span>
          </>
        )}
      </span>
      <Icon name="pencil" size={16} className="goal-edit" />
    </button>
  );
}

function GoalSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { yearGoal, setYearGoal } = useSettings();
  const [value, setValue] = useState(yearGoal ?? 12);
  return (
    <Sheet open={open} onClose={onClose} label="Meta do ano">
      <p className="reading-form-eyebrow">Meta de {new Date().getFullYear()}</p>
      <h2 className="reading-form-title">Quantos livros?</h2>
      <div className="goal-stepper">
        <button onClick={() => setValue((v) => Math.max(1, v - 1))} aria-label="Menos">
          −
        </button>
        <span>{value}</span>
        <button onClick={() => setValue((v) => Math.min(365, v + 1))} aria-label="Mais">
          +
        </button>
      </div>
      <div className="goal-presets">
        {[6, 12, 24, 52].map((n) => (
          <button key={n} className={value === n ? "is-active" : ""} onClick={() => setValue(n)}>
            {n === 12 ? "1 por mês" : n === 52 ? "1 por semana" : n === 24 ? "2 por mês" : `${n} no ano`}
          </button>
        ))}
      </div>
      <div className="reading-form-actions">
        <Button
          size="lg"
          onClick={() => {
            setYearGoal(value);
            onClose();
          }}
        >
          Guardar meta
        </Button>
        {yearGoal && (
          <button
            className="goal-clear"
            onClick={() => {
              setYearGoal(null);
              onClose();
            }}
          >
            Ficar sem meta
          </button>
        )}
      </div>
    </Sheet>
  );
}

function AchievementSheet({ a, onClose }: { a: AchievementState | null; onClose: () => void }) {
  return (
    <Sheet open={!!a} onClose={onClose} label={a?.name ?? "Conquista"}>
      {a && (
        <div className="ach">
          <Medal icon={a.icon} level={a.level} progress={progressOf(a)} size={92} />
          <p className="reading-form-eyebrow">{a.level ? TIER_NAMES[a.level - 1] : "Ainda trancada"}</p>
          <h2 className="reading-form-title">{a.name}</h2>
          <p className="ach-now">
            {a.next !== null
              ? `${a.goal(a.next)}. Agora: ${fmtNum(a.value)}.`
              : "Todos os níveis conquistados. Lendária!"}
          </p>
          <ol className="ach-tiers">
            {a.tiers.map((n, i) => {
              const at = a.reachedAt[i];
              const ribbons = ribbonsFor(a.id, i);
              return (
                <li key={n} className={at ? "is-done" : ""}>
                  <Medal icon={a.icon} level={at ? i + 1 : 0} size={34} />
                  <span className="ach-tier-body">
                    <strong>{a.goal(n)}</strong>
                    <small>
                      {at ? `${TIER_NAMES[i]} · ${fmtDate.format(at)}` : TIER_NAMES[i]}
                      {ribbons.length > 0 && ` · destrava a fita ${ribbons.map((r) => r.name).join(", ")}`}
                    </small>
                  </span>
                  {at && <Icon name="check" size={16} className="ach-check" />}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Sheet>
  );
}

export function Conquistas() {
  const summary = useConquistas();
  const { yearGoal, bookmarkStyle, setBookmarkStyle } = useSettings();
  const [goalOpen, setGoalOpen] = useState(false);
  const [open, setOpen] = useState<AchievementState | null>(null);

  const achievements = summary?.achievements ?? [];
  const unlocked = achievements.reduce((n, a) => n + a.level, 0);
  const total = achievements.reduce((n, a) => n + a.tiers.length, 0);
  // Destravadas primeiro, depois as mais perto do próximo nível
  const ordered = [...achievements].sort((a, b) => b.level - a.level || progressOf(b) - progressOf(a));
  const thisYear = summary?.byYear.get(new Date().getFullYear()) ?? 0;
  const r = summary?.records;

  return (
    <Page eyebrow="Sua jornada" title="Conquistas" decoration={<Botanical art="haste" />}>
      {summary && <JardimVivo finished={summary.finished} streak={r?.bestStreak ?? 0} readDays={r?.readDays ?? 0} />}

      <Section>
        <YearGoal done={thisYear} goal={yearGoal} onEdit={() => setGoalOpen(true)} />
      </Section>

      <Section title={`Insígnias · ${unlocked} de ${total}`}>
        <div className="badges">
          {ordered.map((a, i) => (
            <motion.button
              key={a.id}
              className={`badge${a.level ? "" : " is-locked"}`}
              onClick={() => setOpen(a)}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i, 12) * 0.03, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <Medal icon={a.icon} level={a.level} progress={progressOf(a)} />
              <span className="badge-name">{a.name}</span>
              <span className="badge-hint">
                {a.next !== null ? a.goal(a.next) : `${TIER_NAMES[a.level - 1]} · completa`}
              </span>
              {a.level > 0 && (
                <span className="badge-pips" aria-label={`${a.level} de ${a.tiers.length} níveis`}>
                  {a.tiers.map((_, t) => (
                    <span key={t} className={t < a.level ? "is-on" : ""} />
                  ))}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </Section>

      <Section title="Marcadores">
        <p className="section-lead">Fitas que você ganha com as insígnias. Toque para usar nos seus marcadores do leitor.</p>
        <div className="ribbons">
          {RIBBONS.map((rb) => {
            const owned = ribbonUnlocked(rb, achievements);
            const source = rb.unlock && achievements.find((x) => x.id === rb.unlock![0]);
            return (
              <button
                key={rb.id}
                className={`ribbon-card${bookmarkStyle === rb.id ? " is-active" : ""}${owned ? "" : " is-locked"}`}
                disabled={!owned}
                onClick={() => setBookmarkStyle(rb.id)}
                title={owned ? rb.name : source ? `${source.name}: ${source.goal(source.tiers[rb.unlock![1]])}` : rb.name}
              >
                <span className={`ribbon ribbon-${rb.id} ribbon-sample`} />
                <span className="ribbon-name">{owned ? rb.name : "?"}</span>
                {!owned && source && <span className="ribbon-hint">{source.goal(source.tiers[rb.unlock![1]])}</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {r && (
        <Section title="Recordes">
          <div className="group">
            <div className="row">
              <span className="row-icon">
                <Icon name="flame" size={18} />
              </span>
              <span className="row-label">Maior sequência</span>
              <span className="row-value">{r.bestStreak} {r.bestStreak === 1 ? "dia" : "dias"}</span>
            </div>
            <div className="row">
              <span className="row-icon">
                <Icon name="file" size={18} />
              </span>
              <span className="row-label">Mais páginas num dia</span>
              <span className="row-value">{fmtNum(r.mostPagesDay.pages)}</span>
            </div>
            <div className="row">
              <span className="row-icon">
                <Icon name="award" size={18} />
              </span>
              <span className="row-label">Melhor ano</span>
              <span className="row-value">
                {r.mostBooksYear.year ? `${r.mostBooksYear.books} em ${r.mostBooksYear.year}` : "—"}
              </span>
            </div>
            <div className="row">
              <span className="row-icon">
                <Icon name="bookmarked" size={18} />
              </span>
              <span className="row-label">Maior livro</span>
              <span className="row-value row-value-clip">
                {r.longestBook ? `${r.longestBook.title} · ${r.longestBook.pageCount} págs.` : "—"}
              </span>
            </div>
            <div className="row">
              <span className="row-icon">
                <Icon name="coffee" size={18} />
              </span>
              <span className="row-label">Tempo lendo</span>
              <span className="row-value">{r.totalHours >= 1 ? `${fmtNum(r.totalHours)} h` : `${fmtNum(r.totalHours * 60)} min`}</span>
            </div>
          </div>
        </Section>
      )}

      <GoalSheet open={goalOpen} onClose={() => setGoalOpen(false)} />
      <AchievementSheet a={open} onClose={() => setOpen(null)} />
    </Page>
  );
}
