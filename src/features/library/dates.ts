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
