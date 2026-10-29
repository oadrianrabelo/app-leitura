import { useEffect, useState } from "react";
import { Sheet } from "../../components/Sheet";
import { Button } from "../../components/Button";
import { addReading, deleteReading, updateReading } from "../../db/books";
import type { Reading, ReadingState } from "../../db/types";
import { Stars } from "./Stars";
import { fromInputDate, toInputDate } from "./dates";
import "./ReadingSheet.css";

export interface ReadingDraft {
  bookId: string;
  reading?: Reading;
  /** Valores iniciais para uma leitura nova */
  preset?: Partial<Pick<Reading, "state" | "approximate" | "medium">>;
  title: string;
}

const STATES: { id: ReadingState; label: string }[] = [
  { id: "lendo", label: "Lendo" },
  { id: "concluida", label: "Terminei" },
  { id: "abandonada", label: "Abandonei" },
];

const thisYear = new Date().getFullYear();
const YEARS = Array.from({ length: 70 }, (_, i) => thisYear - i);

export function ReadingSheet({ draft, onClose }: { draft: ReadingDraft | null; onClose: () => void }) {
  const [state, setState] = useState<ReadingState>("concluida");
  const [medium, setMedium] = useState<Reading["medium"]>("digital");
  const [startedAt, setStartedAt] = useState("");
  const [finishedAt, setFinishedAt] = useState("");
  const [onlyYear, setOnlyYear] = useState(false);
  const [year, setYear] = useState<number | "">("");
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!draft) return;
    const r = draft.reading;
    setState(r?.state ?? draft.preset?.state ?? "concluida");
    setMedium(r?.medium ?? draft.preset?.medium ?? "digital");
    setStartedAt(toInputDate(r?.startedAt ?? null));
    const approx = r?.approximate ?? draft.preset?.approximate ?? false;
    setOnlyYear(approx);
    setFinishedAt(approx ? "" : toInputDate(r?.finishedAt ?? (!r || r.state === "concluida" ? Date.now() : null)));
    setYear(approx && r?.finishedAt ? new Date(r.finishedAt).getFullYear() : "");
    setRating(r?.rating ?? null);
    setNotes(r?.notes ?? "");
    setConfirmDelete(false);
  }, [draft]);

  const save = async () => {
    if (!draft) return;
    const finished = state === "lendo" ? null : onlyYear ? (year ? new Date(year, 6, 1).getTime() : null) : fromInputDate(finishedAt);
    const data = {
      state,
      medium,
      startedAt: fromInputDate(startedAt),
      finishedAt: finished,
      approximate: state !== "lendo" && onlyYear,
      rating,
      notes: notes.trim(),
    };
    if (draft.reading) await updateReading(draft.reading.id, data);
    else await addReading(draft.bookId, data);
    onClose();
  };

  const remove = async () => {
    if (!draft?.reading) return;
    if (!confirmDelete) return setConfirmDelete(true);
    await deleteReading(draft.reading.id);
    onClose();
  };

  return (
    <Sheet open={!!draft} onClose={onClose} label="Leitura">
      {draft && (
        <div className="reading-form">
          <p className="reading-form-eyebrow">{draft.reading ? "Editar leitura" : "Nova leitura"}</p>
          <h2 className="reading-form-title">{draft.title}</h2>

          <div className="field">
            <span className="field-label">Como está</span>
            <div className="segmented">
              {STATES.map((s) => (
                <button key={s.id} className={state === s.id ? "is-active" : ""} onClick={() => setState(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="field-label">Onde leu</span>
            <div className="segmented">
              <button className={medium === "fisico" ? "is-active" : ""} onClick={() => setMedium("fisico")}>
                Livro físico
              </button>
              <button className={medium === "digital" ? "is-active" : ""} onClick={() => setMedium("digital")}>
                Digital
              </button>
            </div>
          </div>

          <div className="field-row">
            <label className="field">
              <span className="field-label">Comecei em</span>
              <input type="date" value={startedAt} onChange={(e) => setStartedAt(e.target.value)} max={toInputDate(Date.now())} />
            </label>
            {state !== "lendo" && (
              <div className="field">
                <span className="field-label">{state === "concluida" ? "Terminei em" : "Parei em"}</span>
                {onlyYear ? (
                  <select value={year} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}>
                    <option value="">não lembro</option>
                    {YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input type="date" value={finishedAt} onChange={(e) => setFinishedAt(e.target.value)} max={toInputDate(Date.now())} />
                )}
              </div>
            )}
          </div>
          {state !== "lendo" && (
            <label className="toggle-line">
              <input type="checkbox" className="switch" checked={onlyYear} onChange={(e) => setOnlyYear(e.target.checked)} />
              Só lembro o ano
            </label>
          )}

          <div className="field">
            <span className="field-label">Sua nota</span>
            <Stars value={rating} onChange={setRating} size={26} />
          </div>

          <label className="field">
            <span className="field-label">Anotações</span>
            <textarea rows={3} placeholder="O que ficou desse livro em você?" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>

          <div className="reading-form-actions">
            <Button size="lg" onClick={save}>
              Salvar
            </Button>
            {draft.reading && (
              <Button size="lg" variant="ghost" onClick={remove} className={confirmDelete ? "is-danger" : ""}>
                {confirmDelete ? "Toque de novo para apagar" : "Apagar esta leitura"}
              </Button>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
