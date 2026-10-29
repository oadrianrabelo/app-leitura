import { isTauri } from "@tauri-apps/api/core";
import { platform as osPlatform } from "@tauri-apps/plugin-os";

export type Platform = "android" | "ios" | "desktop" | "web";

function detect(): Platform {
  if (!isTauri()) return "web";
  try {
    const p = osPlatform();
    if (p === "android") return "android";
    if (p === "ios") return "ios";
    return "desktop";
  } catch {
    return "web";
  }
}

export const platform: Platform = detect();
export const isMobile = platform === "android" || platform === "ios";
