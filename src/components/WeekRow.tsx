import { motion } from "motion/react";
import { useWeek } from "../db/week";
import { useRhythm } from "../db/reading";
import "./WeekRow.css";

const FLOWERS = import.meta.glob<string>("../assets/aquarela/flor-*.webp", { eager: true, import: "default", query: "?url" });
const flower = (i: number) => FLOWERS[`../assets/aquarela/flor-${(i % 7) + 1}.webp`];
const bud = import.meta.glob<string>("../assets/aquarela/broto.webp", { eager: true, import: "default", query: "?url" })["../assets/aquarela/broto.webp"];

/**
 * A semana como um canteiro: cada dia lido vira uma florzinha em aquarela (cada dia de
 * uma cor), o dia em que só passou por aqui vira um broto, e o que ainda vai chegar
 * fica esperando.
 */
export function WeekRow() {
  const week = useWeek();
  const rhythm = useRhythm();
  if (!week) return null;
  const streak = rhythm?.streak ?? 0;
  const read = week.days.filter((d) => d.state === "read").length;

  return (
    <div className="week">
      <div className="week-head">
        <div>
          <strong>Sua semana</strong>
          <span>
            {read === 0 ? "Nenhuma flor ainda. A primeira desabrocha com a leitura de hoje." : `${read} ${read === 1 ? "flor" : "flores"} no canteiro desta semana`}
          </span>
        </div>
        {streak > 1 && (
          <span className="week-streak" title="Dias seguidos lendo">
            <b>{streak}</b> dias seguidos
          </span>
        )}
      </div>
      <div className="week-days">
        {week.days.map((d, i) => (
          <div key={d.day} className={`week-day is-${d.state}${d.isToday ? " is-today" : ""}`}>
            <span className="week-spot">
              {d.state === "read" && (
                <motion.img
                  src={flower(i)}
                  alt=""
                  initial={{ scale: 0.3, rotate: -40, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.06, type: "spring", stiffness: 260, damping: 16 }}
                />
              )}
              {d.state === "visited" && (
                <motion.img
                  src={bud}
                  alt=""
                  className="is-bud"
                  initial={{ y: 8, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 + i * 0.06, duration: 0.5 }}
                />
              )}
            </span>
            <span className="week-letter">{d.letter}</span>
          </div>
        ))}
      </div>
      <div className="week-legend">
        <span>
          <img src={flower(0)} alt="" /> leu
        </span>
        <span>
          <img src={bud} alt="" /> passou por aqui
        </span>
      </div>
    </div>
  );
}
