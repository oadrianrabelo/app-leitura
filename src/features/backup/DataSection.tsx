import { useState } from "react";
import { Section } from "../../components/Page";
import { Icon } from "../../components/Icon";
import { useSettings } from "../../lib/settings";
import { useLibraryUi } from "../library/state";
import { buildBackup, restoreBackup, saveBackup } from "./backup";

const fmt = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric" });

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip,.json,application/zip,application/json";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Ajustes → Seus dados: backup manual, restaurar e importar de outros apps */
export function DataSection() {
  const { lastBackupAt, setLastBackupAt } = useSettings();
  const setImportOpen = useLibraryUi((s) => s.setImportOpen);
  const [withFiles, setWithFiles] = useState(false);
  const [busy, setBusy] = useState<"backup" | "restore" | null>(null);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const backup = async () => {
    setBusy("backup");
    setMessage(null);
    try {
      const { name, bytes, books } = await buildBackup(withFiles);
      const where = await saveBackup(name, bytes);
      if (where) {
        setLastBackupAt(Date.now());
        const size =
          bytes.length < 1048576
            ? `${Math.max(1, Math.round(bytes.length / 1024))} KB`
            : `${(bytes.length / 1048576).toFixed(1).replace(".", ",")} MB`;
        setMessage({ text: `Backup salvo: ${books} livros, ${size}${where.includes("/") || where.includes("\\") ? ` em ${where}` : ""}.` });
      }
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    const file = await pickFile();
    if (!file) return;
    setBusy("restore");
    setMessage(null);
    try {
      const r = await restoreBackup(new Uint8Array(await file.arrayBuffer()));
      const parts = [
        `${r.books} ${r.books === 1 ? "livro" : "livros"}`,
        `${r.readings} ${r.readings === 1 ? "leitura" : "leituras"}`,
        r.covers && `${r.covers} capas`,
        r.files && `${r.files} arquivos de livro`,
      ].filter(Boolean);
      setMessage({
        text: r.books || r.readings || r.covers ? `Restaurado: ${parts.join(", ")}.` : "Tudo desse backup já estava aqui. Nada mudou.",
      });
    } catch (e) {
      setMessage({ text: e instanceof Error ? e.message : String(e), error: true });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Section title="Seus dados">
      <div className="group">
        <button className="row" onClick={backup} disabled={!!busy}>
          <span className="row-icon">
            <Icon name="download" size={18} />
          </span>
          <span className="row-label sync-who">
            {busy === "backup" ? "Preparando o backup…" : "Fazer backup"}
            <small>{lastBackupAt ? `Último: ${fmt.format(lastBackupAt)}` : "Um arquivo com tudo: livros, leituras, marcadores e capas"}</small>
          </span>
        </button>
        <label className="row">
          <span className="row-icon">
            <Icon name="file" size={18} />
          </span>
          <span className="row-label sync-who">
            Incluir os arquivos dos livros
            <small>EPUBs e PDFs dentro do backup (fica bem maior)</small>
          </span>
          <input type="checkbox" className="switch" checked={withFiles} onChange={(e) => setWithFiles(e.target.checked)} />
        </label>
        <button className="row" onClick={restore} disabled={!!busy}>
          <span className="row-icon">
            <Icon name="reread" size={18} />
          </span>
          <span className="row-label sync-who">
            {busy === "restore" ? "Restaurando…" : "Restaurar um backup"}
            <small>Junta com o que já está aqui, sem apagar nada</small>
          </span>
        </button>
        <button className="row" onClick={() => setImportOpen(true)} disabled={!!busy}>
          <span className="row-icon">
            <Icon name="upload" size={18} />
          </span>
          <span className="row-label sync-who">
            Importar de outro app
            <small>Goodreads, StoryGraph ou planilha</small>
          </span>
        </button>
      </div>
      {message && <p className={`data-message${message.error ? " is-error" : ""}`}>{message.text}</p>}
    </Section>
  );
}
