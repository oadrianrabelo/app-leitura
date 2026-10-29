import { create } from "zustand";

interface LibraryUi {
  openBookId: string | null;
  addOpen: boolean;
  physicalOpen: boolean;
  openBook: (id: string) => void;
  closeBook: () => void;
  setAddOpen: (open: boolean) => void;
  setPhysicalOpen: (open: boolean) => void;
}

export const useLibraryUi = create<LibraryUi>()((set) => ({
  openBookId: null,
  addOpen: false,
  physicalOpen: false,
  openBook: (openBookId) => set({ openBookId }),
  closeBook: () => set({ openBookId: null }),
  setAddOpen: (addOpen) => set({ addOpen }),
  setPhysicalOpen: (physicalOpen) => set({ physicalOpen }),
}));
