import { invoke } from "@tauri-apps/api/core";
import { platform } from "../../lib/platform";
import { httpFetch } from "../../lib/http";
import { safeStorage } from "../../lib/storage";

const SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const KEY = "sepia.google";

// Cliente OAuth "App para computador" do Google Cloud. Em apps instalados o
// "segredo" não é confidencial (o Google trata assim); vem do build.
const DESKTOP_ID = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_ID as string | undefined;
const DESKTOP_SECRET = import.meta.env.VITE_GOOGLE_DESKTOP_CLIENT_SECRET as string | undefined;

interface Stored {
  accessToken?: string;
  expiresAt?: number;
  refreshToken?: string;
}

const load = (): Stored => {
  try {
    return JSON.parse(safeStorage.get(KEY) ?? "{}");
  } catch {
    return {};
  }
};
const save = (s: Stored) => safeStorage.set(KEY, JSON.stringify(s));

export class AuthError extends Error {
  constructor(message: string, readonly needsConsent = false) {
    super(message);
  }
}

/** O login com o Google está disponível neste aparelho/build? */
export function googleAvailable(): { ok: boolean; reason?: string } {
  if (platform === "android") return { ok: true };
  if (platform === "desktop") return DESKTOP_ID ? { ok: true } : { ok: false, reason: "Esta versão do desktop foi compilada sem a chave do Google." };
  return { ok: false, reason: "A sincronização funciona no app instalado." };
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function desktopLogin(): Promise<Stored> {
  const { openUrl } = await import("@tauri-apps/plugin-opener");
  const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)));
  const challenge = b64url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));
  const state = b64url(crypto.getRandomValues(new Uint8Array(16)));
  const port = await invoke<number>("oauth_listen");
  const redirect = `http://127.0.0.1:${port}`;
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: DESKTOP_ID!,
    redirect_uri: redirect,
    response_type: "code",
    scope: SCOPE,
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    access_type: "offline",
    prompt: "consent",
  }).toString();
  await openUrl(url.toString());
  const query = new URLSearchParams(await invoke<string>("oauth_wait"));
  if (query.get("error")) throw new AuthError(query.get("error") === "access_denied" ? "Login cancelado" : query.get("error")!);
  if (query.get("state") !== state) throw new AuthError("Resposta de login inválida");
  return exchange({
    grant_type: "authorization_code",
    code: query.get("code")!,
    code_verifier: verifier,
    redirect_uri: redirect,
  });
}

async function exchange(params: Record<string, string>): Promise<Stored> {
  const res = await httpFetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: DESKTOP_ID!, client_secret: DESKTOP_SECRET ?? "", ...params }).toString(),
  });
  const data = (await res.json()) as { access_token?: string; expires_in?: number; refresh_token?: string; error?: string };
  if (!res.ok || !data.access_token) {
    throw new AuthError(data.error === "invalid_grant" ? "O acesso ao Google expirou. Conecte de novo." : `Falha no login (${data.error ?? res.status})`, data.error === "invalid_grant");
  }
  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + ((data.expires_in ?? 3600) - 120) * 1000,
    refreshToken: data.refresh_token ?? params.refresh_token,
  };
}

/**
 * Token de acesso ao Drive. Sem `interactive`, nunca mostra telas: se precisar
 * de consentimento, lança AuthError com needsConsent.
 */
export async function getAccessToken(interactive: boolean): Promise<string> {
  const stored = load();
  if (stored.accessToken && stored.expiresAt && stored.expiresAt > Date.now()) return stored.accessToken;

  if (platform === "android") {
    try {
      const { accessToken } = await invoke<{ accessToken: string }>("google_authorize", { interactive });
      // O Android não informa a validade; tokens do Google duram 1 hora
      save({ accessToken, expiresAt: Date.now() + 50 * 60 * 1000 });
      return accessToken;
    } catch (e) {
      const msg = String(e);
      throw new AuthError(/consent-required|cancel/i.test(msg) ? "Conecte sua conta Google para sincronizar." : msg, /consent-required/.test(msg));
    }
  }

  if (platform === "desktop") {
    if (!DESKTOP_ID) throw new AuthError("Login do Google indisponível nesta versão.");
    let next: Stored;
    if (stored.refreshToken) next = await exchange({ grant_type: "refresh_token", refresh_token: stored.refreshToken });
    else if (interactive) next = await desktopLogin();
    else throw new AuthError("Conecte sua conta Google para sincronizar.", true);
    save(next);
    return next.accessToken!;
  }

  throw new AuthError("A sincronização funciona no app instalado.");
}

export async function signOut() {
  const { accessToken, refreshToken } = load();
  safeStorage.set(KEY, "{}");
  const token = refreshToken ?? accessToken;
  if (token) {
    await httpFetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" }).catch(() => {});
  }
}

/** Esquece o token atual (ex.: o Drive respondeu 401). */
export function dropAccessToken() {
  const s = load();
  delete s.accessToken;
  delete s.expiresAt;
  save(s);
}
