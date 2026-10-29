import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Animation, Paper } from "./settings";
import "./PageTurnFx.css";

export interface PageTurnFxHandle {
  /** Toca o efeito e chama `turn` no momento em que a página está coberta. */
  play(dir: 1 | -1, turn: () => unknown): Promise<void>;
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Efeitos de virar página que o motor não tem: "folhear" (uma folha que passa
 * por cima, com a sombra da curva) e "esmaecer" (a página some e volta).
 */
export const PageTurnFx = forwardRef<PageTurnFxHandle, { animation: Animation; paper: Paper }>(function PageTurnFx(
  { animation, paper },
  ref,
) {
  const el = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useImperativeHandle(ref, () => ({
    async play(dir, turn) {
      const node = el.current;
      if (!node || busy.current || (animation !== "folhear" && animation !== "esmaecer")) {
        await turn();
        return;
      }
      busy.current = true;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduce) {
        await turn();
        busy.current = false;
        return;
      }
      node.dataset.kind = animation;
      node.dataset.dir = dir === 1 ? "next" : "prev";
      node.classList.remove("is-out");
      node.classList.add("is-in");
      await wait(animation === "folhear" ? 230 : 130);
      await turn();
      await wait(40);
      node.classList.remove("is-in");
      node.classList.add("is-out");
      await wait(animation === "folhear" ? 260 : 180);
      node.classList.remove("is-out");
      busy.current = false;
    },
  }));

  return <div ref={el} className="turn-fx" style={{ ["--paper" as string]: paper.bg, ["--ink" as string]: paper.ink }} aria-hidden />;
});
