import { isTauri } from "@tauri-apps/api/core";
import { getVersion } from "@tauri-apps/api/app";

/** Versão do pacote, embutida no build pelo Vite. */
export const BUILD_VERSION: string = __APP_VERSION__;

export async function appVersion(): Promise<string> {
  if (!isTauri()) return BUILD_VERSION;
  try {
    return await getVersion();
  } catch {
    return BUILD_VERSION;
  }
}

/** Compara versões semânticas simples (1.2.3). Retorna >0 se a > b. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, "").split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, "").split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
