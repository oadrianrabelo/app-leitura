import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Animation, Paper } from "./settings";
import "./PageTurnFx.css";

export interface PageTurnFxHandle {
  /** Toca o efeito e chama `turn` no meio dele (com a página "fora de cena"). */
  play(dir: 1 | -1, turn: () => unknown): Promise<void>;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
/** Nunca espera para sempre: se o motor não responder, segue mesmo assim */
const within = (p: unknown, ms: number) => Promise.race([Promise.resolve(p).catch(() => {}), wait(ms)]);

/**
 * Efeitos de virar página que o motor não tem: "folhear" (a folha atravessa a tela) e
 * "esmaecer" (a página some e volta). Só transformação e opacidade, que a placa de vídeo
 * anima sem pesar; com tempo-limite e limpeza garantida, para nunca deixar a tela coberta.
 */
export const PageTurnFx = forwardRef<PageTurnFxHandle, { animation: Animation; paper: Paper; target: () => HTMLElement | null }>(
  function PageTurnFx({ animation, paper, target }, ref) {
    const shade = useRef<HTMLDivElement>(null);
    const busy = useRef(false);

    useImperativeHandle(ref, () => ({
      async play(dir, turn) {
        const el = target();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!el || busy.current || reduce || (animation !== "folhear" && animation !== "esmaecer")) {
          await within(turn(), 1500);
          return;
        }
        busy.current = true;
        const anims: globalThis.Animation[] = [];
        const run = (node: Element, frames: Keyframe[], options: KeyframeAnimationOptions) => {
          const a = node.animate(frames, { fill: "forwards", ...options });
          anims.push(a);
          return within(a.finished, (Number(options.duration) || 300) + 250);
        };
        try {
          if (animation === "esmaecer") {
            await run(el, [{ opacity: 1 }, { opacity: 0 }], { duration: 130, easing: "ease-in" });
            await within(turn(), 1500);
            await run(el, [{ opacity: 0 }, { opacity: 1 }], { duration: 190, easing: "ease-out" });
          } else {
            // Uma folha (o verso da página que vira) atravessa a tela: cobre a página atual,
            // a próxima entra por baixo e a folha segue, revelando-a. O livro em si não se
            // mexe (girar o livro confundia o motor sobre a página em que está).
            const sh = shade.current;
            if (!sh) {
              await within(turn(), 1500);
              return;
            }
            sh.dataset.dir = dir === 1 ? "next" : "prev";
            const from = dir === 1 ? "105%" : "-105%";
            const to = dir === 1 ? "-105%" : "105%";
            await run(sh, [{ transform: `translateX(${from})`, opacity: 1 }, { transform: "translateX(0)", opacity: 1 }], {
              duration: 230,
              easing: "cubic-bezier(0.45, 0, 0.75, 0.6)",
            });
            await within(turn(), 1500);
            await run(sh, [{ transform: "translateX(0)", opacity: 1 }, { transform: `translateX(${to})`, opacity: 1 }], {
              duration: 260,
              easing: "cubic-bezier(0.2, 0.6, 0.35, 1)",
            });
          }
        } finally {
          // Limpa tudo, aconteça o que acontecer: o livro volta ao normal
          anims.forEach((a) => a.cancel());
          busy.current = false;
        }
      },
    }));

    return (
      <div
        ref={shade}
        className="turn-shade"
        data-kind={animation}
        style={{ ["--paper" as string]: paper.bg, ["--ink" as string]: paper.ink }}
        aria-hidden
      />
    );
  },
);
