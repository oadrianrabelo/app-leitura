import { Section } from "../../components/Page";
import { Icon } from "../../components/Icon";
import { Button } from "../../components/Button";
import { googleAvailable } from "./google";
import { useSync } from "./sync";
import "./SyncSection.css";

const ago = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });
function since(ts: number) {
  const s = Math.round((ts - Date.now()) / 1000);
  if (s > -60) return "agora mesmo";
  if (s > -3600) return ago.format(Math.round(s / 60), "minute");
  if (s > -86400) return ago.format(Math.round(s / 3600), "hour");
  return ago.format(Math.round(s / 86400), "day");
}

export function SyncSection() {
  const { connected, email, lastSyncedAt, syncFiles, status, detail, error, connect, disconnect, syncNow, setSyncFiles } = useSync();
  const available = googleAvailable();

  return (
    <Section title="Sincronização">
      {!connected ? (
        <div className="sync-card">
          <div className="sync-card-head">
            <span className="sync-icon">
              <Icon name="cloud" size={22} />
            </span>
            <div>
              <strong>Guarde tudo no seu Google Drive</strong>
              <p>
                Biblioteca, leituras, marcadores e progresso ficam salvos e iguais em todos os aparelhos. O Sépia usa
                uma pasta privada dele: não vê nem mexe nos seus outros arquivos.
              </p>
            </div>
          </div>
          {available.ok ? (
            <Button size="lg" onClick={connect} disabled={status === "syncing"}>
              {status === "syncing" ? "Conectando…" : "Conectar com o Google"}
            </Button>
          ) : (
            <p className="sync-note">{available.reason}</p>
          )}
          {error && <p className="sync-error">{error}</p>}
        </div>
      ) : (
        <div className="group">
          <div className="row">
            <span className="row-icon">
              <Icon name="cloud" size={18} />
            </span>
            <span className="row-label sync-who">
              {email}
              <small>
                {status === "syncing"
                  ? detail ?? "Sincronizando…"
                  : status === "error"
                    ? error
                    : lastSyncedAt
                      ? `Sincronizado ${since(lastSyncedAt)}`
                      : "Ainda não sincronizado"}
              </small>
            </span>
            {status === "syncing" ? (
              <Icon name="refresh" size={18} className="spin row-check" />
            ) : status === "error" ? (
              <Icon name="info" size={18} className="sync-alert" />
            ) : (
              <Icon name="check" size={18} className="row-check" />
            )}
          </div>
          <button className="row" onClick={() => syncNow()} disabled={status === "syncing"}>
            <span className="row-icon">
              <Icon name="refresh" size={18} />
            </span>
            <span className="row-label">Sincronizar agora</span>
          </button>
          <label className="row">
            <span className="row-icon">
              <Icon name="file" size={18} />
            </span>
            <span className="row-label sync-who">
              Guardar os arquivos dos livros
              <small>Para abrir seus EPUBs e PDFs em outro aparelho</small>
            </span>
            <input type="checkbox" className="switch" checked={syncFiles} onChange={(e) => setSyncFiles(e.target.checked)} />
          </label>
          <button className="row" onClick={disconnect}>
            <span className="row-icon">
              <Icon name="close" size={18} />
            </span>
            <span className="row-label sync-who">
              Desconectar ou trocar de conta
              <small>Seus livros continuam neste aparelho</small>
            </span>
          </button>
        </div>
      )}
    </Section>
  );
}
