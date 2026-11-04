import React from "react";
import ReactDOM from "react-dom/client";
import "@fontsource-variable/inter";
import "@fontsource-variable/fraunces/full.css";
import "@fontsource-variable/fraunces/full-italic.css";
import "@fontsource-variable/literata";
import "./styles/tokens.css";
import "./styles/base.css";
import App from "./App";

// Se a interface recarregou com um livro aberto, volume e barras do sistema voltam ao normal
try {
  window.SepiaNative?.setVolumePaging(false);
  window.SepiaNative?.setImmersive?.(false);
} catch {
  /* fora do Android */
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
