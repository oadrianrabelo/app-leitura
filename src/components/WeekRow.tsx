import { motion } from "motion/react";
import { Icon } from "./Icon";
import { useWeek } from "../db/week";
import "./WeekRow.css";

/** A semana em sete círculos: leu (cheio), só abriu (meio), faltou, ainda vai chegar. */
export function WeekRow() {
  const week = useWeek();
  if (!week) return null;
  const streak = week.visitStreak;

  return (
    <div className="week">
      <div className="week-head">
        <strong>Sua semana</strong>
        <span>
          {streak > 1 ? `${streak} dias seguidos com o Sépia` : streak === 1 ? "Você passou por aqui hoje" : "Abra o Sépia todo dia"}
        </span>
      </div>
      <div className="week-days">
        {week.days.map((d, i) => (
          <div key={d.day} className={`week-day is-${d.state}${d.isToday ? " is-today" : ""}`}>
            <motion.span
              className="week-dot"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 420, damping: 22 }}
            >
              {d.state === "read" && <Icon name="book" size={16} strokeWidth={2.2} />}
              {d.state === "visited" && <span className="week-dot-inner" />}
            </motion.span>
            <span className="week-letter">{d.letter}</span>
          </div>
        ))}
      </div>
      <div className="week-legend">
        <span>
          <i className="is-read" /> leu
        </span>
        <span>
          <i className="is-visited" /> passou por aqui
        </span>
      </div>
    </div>
  );
}
