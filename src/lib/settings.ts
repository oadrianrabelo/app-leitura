import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { safeStorage } from "./storage";

export type ShelfView = "capas" | "lombadas";
export type FormatFilter = "todos" | "digitais" | "fisicos";

export type FloraColor = "tema" | "lilas" | "azul" | "rosa" | "coral" | "mista";
export type FloraAmount = "nenhuma" | "pouca" | "normal" | "muita";

export type ThemeChoice = "sistema" | "lavanda" | "jardim" | "papel" | "rose" | "terracota" | "sepia" | "noite" | "ameixa";

interface SettingsState {
  theme: ThemeChoice;
  /** Como a leitora gosta de ser chamada */
  name: string | null;
  lastSeenVersion: string | null;
  autoCheckUpdates: boolean;
  /** Estante mostrando a capa ou a lombada dos livros */
  shelfView: ShelfView;
  formatFilter: FormatFilter;
  /** Glicínias: cor, quantidade de enfeites e trepadeiras na estante */
  floraColor: FloraColor;
  floraAmount: FloraAmount;
  floraClimbers: boolean;
  setFloraColor: (c: FloraColor) => void;
  setFloraAmount: (a: FloraAmount) => void;
  setFloraClimbers: (v: boolean) => void;
  /** Fita usada nos marcadores do leitor (colecionáveis das conquistas) */
  bookmarkStyle: string;
  /** Meta de livros no ano (null = sem meta) */
  yearGoal: number | null;
  /** Níveis de conquista já comemorados neste aparelho; null = ainda não comparou nenhum */
  seenAchievements: string[] | null;
  setBookmarkStyle: (style: string) => void;
  setYearGoal: (goal: number | null) => void;
  setSeenAchievements: (keys: string[]) => void;
  setShelfView: (view: ShelfView) => void;
  setFormatFilter: (filter: FormatFilter) => void;
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
      shelfView: "capas",
      formatFilter: "todos",
      floraColor: "tema",
      floraAmount: "normal",
      floraClimbers: true,
      setFloraColor: (floraColor) => set({ floraColor }),
      setFloraAmount: (floraAmount) => set({ floraAmount }),
      setFloraClimbers: (floraClimbers) => set({ floraClimbers }),
      bookmarkStyle: "fita",
      yearGoal: null,
      seenAchievements: null,
      setBookmarkStyle: (bookmarkStyle) => set({ bookmarkStyle }),
      setYearGoal: (yearGoal) => set({ yearGoal }),
      setSeenAchievements: (seenAchievements) => set({ seenAchievements }),
      setShelfView: (shelfView) => set({ shelfView }),
      setFormatFilter: (formatFilter) => set({ formatFilter }),
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
