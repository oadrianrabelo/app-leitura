import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { warmActive, type ReaderSettings } from "./settings";

const BREAK_EVERY = 20 * 60 * 1000;

/**
 * Camadas por cima do livro: luz quente (corta o azul) e brilho extra-baixo.
 * Também lembra, se ela quiser, de descansar os olhos a cada 20 minutos.
 */
export function ComfortLayer({ settings }: { settings: ReaderSettings }) {
  const [warm, setWarm] = useState(() => warmActive(settings.warmLight));
  const [breakTime, setBreakTime] = useState(false);

  useEffect(() => {
    setWarm(warmActive(settings.warmLight));
    const t = setInterval(() => setWarm(warmActive(settings.warmLight)), 60_000);
    return () => clearInterval(t);
  }, [settings.warmLight]);

  useEffect(() => {
    if (!settings.breakReminder) return;
    const t = setInterval(() => setBreakTime(true), BREAK_EVERY);
    return () => clearInterval(t);
  }, [settings.breakReminder]);

  useEffect(() => {
    if (!breakTime) return;
    const t = setTimeout(() => setBreakTime(false), 20_000);
    return () => clearTimeout(t);
  }, [breakTime]);

  return (
    <>
      {warm && settings.warmth > 0 && (
        <div className="comfort-warm" style={{ opacity: settings.warmth * 0.55 }} aria-hidden />
      )}
      {settings.dim > 0 && <div className="comfort-dim" style={{ opacity: settings.dim }} aria-hidden />}
      <AnimatePresence>
        {breakTime && (
          <motion.button
            className="comfort-break"
            onClick={() => setBreakTime(false)}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <strong>Uma pausa para os olhos</strong>
            <span>Olhe para algo distante por 20 segundos. O livro espera por você.</span>
            <span className="comfort-break-bar" />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
