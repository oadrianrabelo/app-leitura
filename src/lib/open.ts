import { isTauri } from "@tauri-apps/api/core";

/** Abre um link no navegador do aparelho (fora do app) */
export async function openExternal(url: string) {
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } else window.open(url, "_blank", "noopener");
}
