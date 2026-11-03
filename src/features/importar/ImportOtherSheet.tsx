import { useEffect, useState } from "react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { Icon } from "../../components/Icon";
import { useLibraryUi } from "../library/state";
import { parseImport, type ParsedImport } from "./formats";
import {
  planImport,
  runImport,
  useImportProgress,
  type ImportPlan,
} from "./apply";
import "./ImportOtherSheet.css";

const SOURCE_NAME = {
  goodreads: "Goodreads",
  storygraph: "StoryGraph",
  planilha: "planilha",
} as const;

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv,text/plain,text/comma-separated-values";
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

/** Importar a estante de outro app (Goodreads, StoryGraph) ou de uma planilha */
export function ImportOtherSheet() {
  const { importOpen, setImportOpen } = useLibraryUi();
  const progress = useImportProgress();
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [plan, setPlan] = useState<ImportPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [covers, setCovers] = useState(true);
  const running = progress.phase === "books" || progress.phase === "covers";

  useEffect(() => {
    if (importOpen || running) return;
    const t = setTimeout(() => {
      setParsed(null);
      setPlan(null);
      setError(null);
      if (progress.phase === "done")
        useImportProgress.setState({ phase: "idle" });
    }, 300);
    return () => clearTimeout(t);
  }, [importOpen, running, progress.phase]);

  const choose = async () => {
    setError(null);
    const file = await pickFile();
    if (!file) return;
    try {
      const p = parseImport(await file.text());
      if (!p.books.length)
        throw new Error(
          "Não encontrei livros nesse arquivo. Ele precisa ter uma coluna com o título.",
        );
      setParsed(p);
      setPlan(await planImport(p));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const count = (status: string) =>
    plan?.fresh.filter((b) => b.status === status).length ?? 0;
  const readings = plan
    ? plan.fresh.reduce((n, b) => n + b.readings.length, 0)
    : 0;

  return (
    <Sheet
      open={importOpen}
      onClose={() => setImportOpen(false)}
      label="Importar de outro app"
    >
      <p className="reading-form-eyebrow">Importar</p>
      {progress.phase === "idle" && !plan && (
        <>
          <h2 className="reading-form-title">Traga sua estante</h2>
          <ol className="import-steps">
            <li>
              <strong>Goodreads:</strong> no site, abra{" "}
              <em>Meus livros → Importar e exportar → Exportar biblioteca</em>.
            </li>
            <li>
              <strong>StoryGraph:</strong> em{" "}
              <em>Preferências → Gerenciar conta → Exportar dados</em>.
            </li>
            <li>
              <strong>Planilha:</strong> salve como CSV com colunas como Título,
              Autor, Status, Data e Nota.
            </li>
          </ol>
          <div className="reading-form-actions">
            <Button size="lg" onClick={choose}>
              <Icon name="upload" size={18} />
              Escolher arquivo CSV
            </Button>
          </div>
          {error && <p className="import-error">{error}</p>}
        </>
      )}

      {progress.phase === "idle" && plan && parsed && (
        <>
          <h2 className="reading-form-title">
            {plan.fresh.length
              ? `${plan.fresh.length} ${plan.fresh.length === 1 ? "livro novo" : "livros novos"}`
              : "Tudo já está na estante"}
          </h2>
          <p className="import-source">
            {parsed.source === "planilha"
              ? "Planilha"
              : `Arquivo do ${SOURCE_NAME[parsed.source]}`}{" "}
            · {parsed.books.length}{" "}
            {parsed.books.length === 1 ? "livro" : "livros"}
          </p>
          {plan.fresh.length > 0 && (
            <div className="import-summary">
              {count("lido") > 0 && (
                <span>
                  <strong>{count("lido")}</strong> lidos
                </span>
              )}
              {count("lendo") > 0 && (
                <span>
                  <strong>{count("lendo")}</strong> lendo
                </span>
              )}
              {count("quero-ler") > 0 && (
                <span>
                  <strong>{count("quero-ler")}</strong> quero ler
                </span>
              )}
              {count("abandonado") > 0 && (
                <span>
                  <strong>{count("abandonado")}</strong> abandonados
                </span>
              )}
            </div>
          )}
          <p className="import-note">
            {plan.fresh.length > 0 &&
              `${readings} ${readings === 1 ? "leitura" : "leituras"} com datas e notas. `}
            {plan.known.length > 0 &&
              `${plan.known.length} ${plan.known.length === 1 ? "já está" : "já estão"} na sua estante: só entram as leituras que faltarem.`}
          </p>
          <label className="row import-covers">
            <span className="row-label sync-who">
              Buscar as capas
              <small>Continua em segundo plano depois de importar</small>
            </span>
            <input
              type="checkbox"
              className="switch"
              checked={covers}
              onChange={(e) => setCovers(e.target.checked)}
            />
          </label>
          <div className="reading-form-actions">
            <Button
              size="lg"
              onClick={() => runImport(plan, covers)}
              disabled={!plan.fresh.length && !plan.known.length}
            >
              Importar para a estante
            </Button>
            <button className="import-again" onClick={choose}>
              Escolher outro arquivo
            </button>
          </div>
        </>
      )}

      {running && (
        <>
          <h2 className="reading-form-title">
            {progress.phase === "books"
              ? "Colocando na estante…"
              : "Procurando as capas…"}
          </h2>
          <div className="import-bar">
            <span
              style={{
                width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
          <p className="import-note">
            {progress.done} de {progress.total}
            {progress.phase === "covers" &&
              ` · ${progress.coversFound} capas encontradas. Pode fechar, a busca continua.`}
          </p>
        </>
      )}

      {progress.phase === "done" && (
        <>
          <h2 className="reading-form-title">Pronto!</h2>
          <p className="import-note">
            {progress.added}{" "}
            {progress.added === 1 ? "livro entrou" : "livros entraram"} na
            estante, com {progress.readingsAdded}{" "}
            {progress.readingsAdded === 1 ? "leitura" : "leituras"}
            {progress.coversFound > 0 && ` e ${progress.coversFound} capas`}. As
            conquistas e o seu jardim já contam tudo isso.
          </p>
          <div className="reading-form-actions">
            <Button size="lg" onClick={() => setImportOpen(false)}>
              Ver minha estante
            </Button>
          </div>
        </>
      )}
    </Sheet>
  );
}
