import { isTauri } from "@tauri-apps/api/core";

/**
 * fetch pelo lado nativo quando roda no app (sem bloqueio de CORS nas capas),
 * fetch do navegador quando roda na pré-visualização web.
 */
export async function httpFetch(url: string, init?: RequestInit): Promise<Response> {
  if (isTauri()) {
    const { fetch } = await import("@tauri-apps/plugin-http");
    return fetch(url, init);
  }
  return fetch(url, init);
}
