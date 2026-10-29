import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { platform } from "../../lib/platform";
import { useUpdates } from "./updates";
import "./UpdateSheet.css";

/** Limpa o markdown básico das notas de release para exibição. */
function noteLines(notes: string): string[] {
  return notes
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").replace(/^[-*]\s+/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

export function UpdateSheet() {
  const { sheetOpen, closeSheet, info, status, progress, error, install } = useUpdates();
  const busy = status === "downloading" || status === "installing";

  let action = "Atualizar agora";
  if (status === "downloading")
    action = progress != null ? `Baixando… ${Math.round(progress * 100)}%` : "Baixando…";
  if (status === "installing") action = platform === "android" ? "Abrindo instalador…" : "Reiniciando…";
  if (status === "permission-required") action = "Já permiti, tentar de novo";

  return (
    <Sheet open={sheetOpen && !!info} onClose={busy ? () => {} : closeSheet} label="Atualização disponível">
      {info && (
        <div className="update">
          <div className="update-badge">
            <Icon name="download" size={22} />
          </div>
          <p className="update-eyebrow">Atualização disponível</p>
          <h2 className="update-title">Sépia {info.version}</h2>

          {noteLines(info.notes).length > 0 && (
            <ul className="update-notes">
              {noteLines(info.notes).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}

          {status === "permission-required" && (
            <p className="update-hint">
              O Android pediu para você permitir que o Sépia instale atualizações. Ative a opção na tela
              que abriu, volte aqui e toque no botão de novo.
            </p>
          )}
          {platform === "android" && status === "installing" && (
            <p className="update-hint">Confirme a instalação na janela do Android. Seus dados ficam guardados.</p>
          )}
          {status === "error" && error && <p className="update-error">Algo deu errado: {error}</p>}

          {status === "downloading" && progress != null && (
            <div className="update-progress" aria-hidden>
              <div style={{ transform: `scaleX(${progress})` }} />
            </div>
          )}

          <div className="update-actions">
            <Button size="lg" onClick={install} disabled={busy}>
              {action}
            </Button>
            {!busy && (
              <Button size="lg" variant="ghost" onClick={closeSheet}>
                Depois
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
