import { create } from "zustand";

interface ReaderUi {
  bookId: string | null;
  open: (bookId: string) => void;
  close: () => void;
}

export const useReaderUi = create<ReaderUi>()((set, get) => ({
  bookId: null,
  open: (bookId) => {
    if (get().bookId) return;
    // Uma entrada no histórico: o botão "voltar" do Android fecha o livro
    window.history.pushState({ reader: bookId }, "");
    set({ bookId });
  },
  close: () => {
    if (!get().bookId) return;
    set({ bookId: null });
    if (window.history.state?.reader) window.history.back();
  },
}));

window.addEventListener("popstate", () => {
  if (useReaderUi.getState().bookId) useReaderUi.setState({ bookId: null });
});
