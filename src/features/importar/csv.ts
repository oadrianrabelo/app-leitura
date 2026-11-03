/** Leitor de CSV (RFC 4180): aspas, aspas dobradas, quebras de linha dentro de campos. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const sep = detectSeparator(src);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

/** Vírgula, ponto e vírgula (Excel em português) ou tabulação: o que mais aparece na 1ª linha */
function detectSeparator(text: string): string {
  const first = text.slice(0, text.indexOf("\n") >>> 0 || text.length);
  const counts = [",", ";", "\t"].map((s) => [s, first.split(s).length] as const);
  return counts.sort((a, b) => b[1] - a[1])[0][0];
}

/** Linhas viram objetos pelo cabeçalho */
export function toRecords(rows: string[][]): { headers: string[]; records: Record<string, string>[] } {
  const [head, ...body] = rows;
  const headers = (head ?? []).map((h) => h.trim());
  return {
    headers,
    records: body.map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))),
  };
}
