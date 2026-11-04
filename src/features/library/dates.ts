const monthYear = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" });
const dayMonthYear = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" });

export function formatDate(ts: number | null, approximate = false): string | null {
  if (!ts) return null;
  if (approximate) return String(new Date(ts).getFullYear());
  return dayMonthYear.format(ts).replace(/\./g, "");
}

export function formatMonth(ts: number): string {
  return monthYear.format(ts).replace(/\./g, "");
}

/** "2026-03-15" ↔ timestamp ao meio-dia local (evita pular de dia com fuso) */
export function toInputDate(ts: number | null): string {
  if (!ts) return "";
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromInputDate(value: string): number | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d, 12).getTime();
}

export const ordinal = (n: number) => `${n}ª`;

/** "hoje", "ontem", "há 5 dias", ou a data (para quando ela leu pela última vez) */
export function sinceLabel(ts: number, now = Date.now()): string {
  const day = (t: number) => {
    const d = new Date(t);
    return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
  };
  const diff = day(now) - day(ts);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  if (diff < 30) return `há ${diff} dias`;
  return `em ${formatDate(ts)}`;
}

/** "página 123 de 320", "página 123" */
export function pageLabel(page: number, of?: number | null): string {
  return of && of >= page ? `página ${page} de ${of}` : `página ${page}`;
}
