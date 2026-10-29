import { create } from "zustand";

interface ReaderUi {
  bookId: string | null;
  open: (bookId: string) => void;
  close: () => void;
}

// O botão "voltar" fecha o livro via useBackLayer, no componente Reader
export const useReaderUi = create<ReaderUi>()((set, get) => ({
  bookId: null,
  open: (bookId) => {
    if (get().bookId) return;
    set({ bookId });
  },
  close: () => set({ bookId: null }),
}));
