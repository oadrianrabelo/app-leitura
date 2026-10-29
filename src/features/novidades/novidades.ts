import { create } from "zustand";

interface NovidadesState {
  open: boolean;
  show: () => void;
  hide: () => void;
}

export const useNovidades = create<NovidadesState>()((set) => ({
  open: false,
  show: () => set({ open: true }),
  hide: () => set({ open: false }),
}));
