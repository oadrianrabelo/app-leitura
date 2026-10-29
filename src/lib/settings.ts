import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "./storage";

export type ThemeChoice = "sistema" | "lavanda" | "papel" | "rose" | "sepia" | "noite" | "ameixa";

interface SettingsState {
  theme: ThemeChoice;
  /** Como a leitora gosta de ser chamada */
  name: string | null;
  lastSeenVersion: string | null;
  autoCheckUpdates: boolean;
  setTheme: (theme: ThemeChoice) => void;
  setName: (name: string | null) => void;
  setLastSeenVersion: (version: string) => void;
  setAutoCheckUpdates: (value: boolean) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "sistema",
      name: null,
      lastSeenVersion: null,
      autoCheckUpdates: true,
      setTheme: (theme) => set({ theme }),
      setName: (name) => set({ name: name?.trim() || null }),
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
