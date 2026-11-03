import { create } from "zustand";

interface LibraryUi {
  openBookId: string | null;
  addOpen: boolean;
  physicalOpen: boolean;
  importOpen: boolean;
  setImportOpen: (open: boolean) => void;
  openBook: (id: string) => void;
  closeBook: () => void;
  setAddOpen: (open: boolean) => void;
  setPhysicalOpen: (open: boolean) => void;
}

export const useLibraryUi = create<LibraryUi>()((set) => ({
  openBookId: null,
  addOpen: false,
  physicalOpen: false,
  importOpen: false,
  setImportOpen: (importOpen) => set({ importOpen }),
  openBook: (openBookId) => set({ openBookId }),
  closeBook: () => set({ openBookId: null }),
  setAddOpen: (addOpen) => set({ addOpen }),
  setPhysicalOpen: (physicalOpen) => set({ physicalOpen }),
}));
