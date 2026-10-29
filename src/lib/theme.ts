import { useEffect } from "react";
import { useSettings } from "./settings";

const THEME_COLORS = {
  lavanda: "#f4f1f8",
  papel: "#f4ede1",
  rose: "#f6eff0",
  sepia: "#eadbc0",
  noite: "#1b1815",
  ameixa: "#1a1620",
} as const;

/** Aplica o tema escolhido (ou o do sistema) no <html>. */
export function useApplyTheme() {
  const choice = useSettings((s) => s.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = choice === "sistema" ? (media.matches ? "ameixa" : "lavanda") : choice;
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
