import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "./storage";

export type ThemeChoice = "sistema" | "papel" | "sepia" | "noite";

interface SettingsState {
  theme: ThemeChoice;
  lastSeenVersion: string | null;
  autoCheckUpdates: boolean;
  setTheme: (theme: ThemeChoice) => void;
  setLastSeenVersion: (version: string) => void;
  setAutoCheckUpdates: (value: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "sistema",
      lastSeenVersion: null,
      autoCheckUpdates: true,
      setTheme: (theme) => set({ theme }),
      setLastSeenVersion: (lastSeenVersion) => set({ lastSeenVersion }),
      setAutoCheckUpdates: (autoCheckUpdates) => set({ autoCheckUpdates }),
    }),
    {
      name: "sepia.settings",
      storage: createJSONStorage(() => ({
        getItem: safeStorage.get,
        setItem: safeStorage.set,
        removeItem: () => {},
      })),
    },
  ),
);
