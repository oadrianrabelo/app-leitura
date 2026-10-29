import { motion } from "motion/react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { BookCover } from "../library/BookCover";
import type { BookStatus } from "../../db/types";
import { useImport } from "./importer";
import "./ImportSheet.css";

const STATUS: { id: BookStatus; label: string }[] = [
  { id: "quero-ler", label: "Quero ler" },
  { id: "lendo", label: "Lendo" },
  { id: "lido", label: "Já li" },
];

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => thisYear - i);

export function ImportSheet() {
  const { phase, done, total, current, outcomes, choices, choose, chooseAll, finish } = useImport();
  const added = outcomes.filter((o) => o.kind === "added");
  const duplicates = outcomes.filter((o) => o.kind === "duplicate");
  const failed = outcomes.filter((o) => o.kind === "error" || o.kind === "skipped");

  return (
    <Sheet open={phase !== "idle"} onClose={finish} label="Importar livros" tall={phase === "review" && added.length > 2} locked={phase === "importing"}>
      {phase === "importing" && (
        <div className="import-progress">
          <div className="import-books" aria-hidden>
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                animate={{ y: [0, -14, 0], rotate: [0, i === 1 ? 0 : i === 0 ? -6 : 6, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
              />
            ))}
          </div>
          <h2 className="import-title">Colocando na estante…</h2>
          <p className="import-current">{current}</p>
          <div className="import-bar">
            <div style={{ transform: `scaleX(${total ? done / total : 0})` }} />
          </div>
          <p className="import-count">
            {done} de {total}
          </p>
        </div>
      )}

      {phase === "review" && (
        <div className="import-review">
          <h2 className="import-title">
            {added.length === 0
              ? "Nada novo para a estante"
              : added.length === 1
                ? "1 livro novo na estante"
                : `${added.length} livros novos na estante`}
          </h2>
          {added.length > 0 && <p className="import-sub">Conte para o Sépia quais você já leu. Dá para mudar depois.</p>}

          {added.length > 1 && (
            <div className="import-bulk">
              <span>Marcar todos:</span>
              {STATUS.map((s) => (
                <button key={s.id} onClick={() => chooseAll(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <ul className="import-list">
            {added.map((o) => {
              if (o.kind !== "added") return null;
              const choice = choices[o.book.id];
              return (
                <li key={o.book.id} className="import-item">
                  <BookCover book={o.book} width={52} />
                  <div className="import-item-body">
                    <p className="import-item-title">{o.book.title}</p>
                    <p className="import-item-author">{o.book.authors.join(", ") || "Autor desconhecido"}</p>
                    <div className="segmented" role="radiogroup">
                      {STATUS.map((s) => (
                        <button
                          key={s.id}
                          role="radio"
                          aria-checked={choice?.status === s.id}
                          className={choice?.status === s.id ? "is-active" : ""}
                          onClick={() => choose(o.book.id, { status: s.id })}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {choice?.status === "lido" && (
                      <label className="import-year">
                        Terminei em
                        <select
                          value={choice.year ?? ""}
                          onChange={(e) => choose(o.book.id, { year: e.target.value ? Number(e.target.value) : null })}
                        >
                          <option value="">não lembro</option>
                          {YEARS.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {(duplicates.length > 0 || failed.length > 0) && (
            <div className="import-notes">
              {duplicates.length > 0 && (
                <p>
                  {duplicates.length === 1 ? "1 arquivo já estava" : `${duplicates.length} arquivos já estavam`} na
                  estante: {duplicates.map((d) => (d.kind === "duplicate" ? d.title : "")).join(", ")}.
                </p>
              )}
              {failed.length > 0 && (
                <p>
                  {failed.length === 1 ? "1 arquivo não pôde" : `${failed.length} arquivos não puderam`} ser lidos:{" "}
                  {failed.map((f) => f.name).join(", ")}.
                </p>
              )}
            </div>
          )}

          <Button size="lg" onClick={finish} className="import-done">
            {added.length > 0 ? "Pronto" : "Fechar"}
          </Button>
        </div>
      )}
    </Sheet>
  );
}
