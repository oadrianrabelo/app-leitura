import { useEffect } from "react";
import { useSettings } from "./settings";

const THEME_COLORS = { papel: "#f4ede1", sepia: "#eadbc0", noite: "#1b1815" } as const;

/** Aplica o tema escolhido (ou o do sistema) no <html>. */
export function useApplyTheme() {
  const choice = useSettings((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = choice === "sistema" ? (media.matches ? "noite" : "papel") : choice;
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", THEME_COLORS[resolved]);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [choice]);
}
