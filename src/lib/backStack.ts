import { useEffect, useRef } from "react";

/**
 * O botão "voltar" do Android fecha a camada mais recente (folha, painel,
 * livro aberto) em vez de sair da tela. Cada camada aberta ocupa uma entrada
 * no histórico do navegador.
 */
interface Layer {
  id: number;
  close: () => void;
}

const stack: Layer[] = [];
let seq = 0;
let ignorePops = 0;

window.addEventListener("popstate", () => {
  if (ignorePops > 0) {
    ignorePops--;
    return;
  }
  stack.pop()?.close();
});

function pushLayer(close: () => void): () => void {
  const id = ++seq;
  stack.push({ id, close });
  window.history.pushState({ sepiaLayer: id }, "");
  // Fechada pela interface: tira a entrada do histórico sem disparar o close de novo
  return () => {
    const i = stack.findIndex((l) => l.id === id);
    if (i < 0) return;
    stack.splice(i, 1);
    ignorePops++;
    window.history.back();
  };
}

/** Registra uma camada enquanto `open` for verdadeiro. */
export function useBackLayer(open: boolean, onClose: () => void) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    let closedByBack = false;
    const release = pushLayer(() => {
      closedByBack = true;
      closeRef.current();
    });
    return () => {
      if (!closedByBack) release();
    };
  }, [open]);
}
