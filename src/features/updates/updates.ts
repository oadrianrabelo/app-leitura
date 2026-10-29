import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { platform } from "../../lib/platform";
import { appVersion, compareVersions } from "../../lib/version";

const REPO = "oadrianrabelo/app-leitura";

export type UpdateStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "available"
  | "downloading"
  | "permission-required"
  | "installing"
  | "error";

export interface UpdateInfo {
  version: string;
  notes: string;
  date?: string;
}

interface UpdateState {
  status: UpdateStatus;
  info: UpdateInfo | null;
  progress: number | null; // 0..1, só no desktop
  error: string | null;
  sheetOpen: boolean;
  check: (opts?: { silent?: boolean }) => Promise<void>;
  install: () => Promise<void>;
  openSheet: () => void;
  closeSheet: () => void;
}

// Guardado fora do estado: objetos que não são serializáveis.
let desktopUpdate: import("@tauri-apps/plugin-updater").Update | null = null;
let androidApkUrl: string | null = null;

interface GithubRelease {
  tag_name: string;
  body: string | null;
  published_at: string;
  assets: { name: string; browser_download_url: string }[];
}

async function checkAndroid(): Promise<UpdateInfo | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (res.status === 404) return null; // nenhuma release ainda
  if (!res.ok) throw new Error(`GitHub respondeu ${res.status}`);
  const release = (await res.json()) as GithubRelease;
  const current = await appVersion();
  if (compareVersions(release.tag_name, current) <= 0) return null;

  const apk = release.assets.find((a) => a.name.toLowerCase().endsWith(".apk"));
  if (!apk) return null;
  androidApkUrl = apk.browser_download_url;
  return {
    version: release.tag_name.replace(/^v/, ""),
    notes: release.body ?? "",
    date: release.published_at,
  };
}

async function checkDesktop(): Promise<UpdateInfo | null> {
  const { check } = await import("@tauri-apps/plugin-updater");
  desktopUpdate = await check();
  if (!desktopUpdate) return null;
  return {
    version: desktopUpdate.version,
    notes: desktopUpdate.body ?? "",
    date: desktopUpdate.date,
  };
}

function describe(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}

export const useUpdates = create<UpdateState>()((set, get) => ({
  status: "idle",
  info: null,
  progress: null,
  error: null,
  sheetOpen: false,

  async check({ silent = false } = {}) {
    if (platform === "web" || platform === "ios") return;
    const { status } = get();
    if (status === "checking" || status === "downloading" || status === "installing") return;

    set({ status: "checking", error: null });
    try {
      const info = platform === "android" ? await checkAndroid() : await checkDesktop();
      if (info) {
        set({ status: "available", info, sheetOpen: true });
      } else {
        set({ status: "up-to-date", info: null });
      }
    } catch (e) {
      // Sem internet ou GitHub fora do ar: em verificações silenciosas, não incomoda.
      set({ status: silent ? "idle" : "error", error: describe(e) });
    }
  },

  async install() {
    try {
      if (platform === "android") {
        if (!androidApkUrl) return;
        set({ status: "downloading", error: null, progress: null });
        const result = await invoke<{ status: string }>("install_android_update", {
          url: androidApkUrl,
        });
        set({
          status: result.status === "permission-required" ? "permission-required" : "installing",
        });
        return;
      }

      if (!desktopUpdate) return;
      set({ status: "downloading", error: null, progress: 0 });
      let total = 0;
      let received = 0;
      await desktopUpdate.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          received += event.data.chunkLength;
          set({ progress: total ? received / total : null });
        }
      });
      set({ status: "installing" });
      const { relaunch } = await import("@tauri-apps/plugin-process");
      await relaunch();
    } catch (e) {
      set({ status: "error", error: describe(e) });
    }
  },

  openSheet: () => set({ sheetOpen: true }),
  closeSheet: () => set({ sheetOpen: false }),
}));
