/**
 * Conserta o texto de EPUBs mal convertidos (geralmente vindos de PDF), capítulo a
 * capítulo, assim que o motor carrega cada um:
 * - letras ligadas (ﬁ, ﬂ…) que a fonte não tem e viram um buraco ("a rmação");
 * - espaços invisíveis que deixam quebrar a palavra no meio;
 * - quebras de linha "carimbadas" do PDF (<br> ou um parágrafo por linha);
 * - pedaços de texto em blocos (inline-block), que quebram a palavra na margem.
 * Livros bem feitos passam intactos: cada conserto só age quando o defeito aparece.
 */

const LIGATURES: Record<string, string> = { "ﬀ": "ff", "ﬁ": "fi", "ﬂ": "fl", "ﬃ": "ffi", "ﬄ": "ffl", "ﬅ": "st", "ﬆ": "st" };
// Sem /g no teste: regex global guarda posição entre chamadas e falhava nos capítulos seguintes
const HAS_LIGATURE = /[ﬀ-ﬆ]/;
const ALL_LIGATURES = /[ﬀ-ﬆ]/g;
/** Espaço de largura zero e afins: oportunidades de quebra no meio da palavra */
const INVISIBLE = /[​⁠﻿]/g;

const BLOCKS = "p, div";
const ENDS_SENTENCE = /[.!?…:;"”»)\]—]\s*$/;
const STARTS_LOWER = /^\s*[a-zà-ÿ0-9,;:)\]»”]/;

function fixText(doc: Document) {
  const body = doc.body;
  if (!body) return;
  const text = body.textContent ?? "";
  if (!HAS_LIGATURE.test(text) && !/[​⁠﻿]/.test(text)) return;
  const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const v = node.nodeValue ?? "";
    if (HAS_LIGATURE.test(v) || /[​⁠﻿]/.test(v)) {
      node.nodeValue = v.replace(ALL_LIGATURES, (c) => LIGATURES[c] ?? c).replace(INVISIBLE, "");
    }
  }
}

/** Texto logo antes / depois de um nó, para decidir se a quebra corta uma frase */
function textBefore(node: Node): string {
  let n: Node | null = node.previousSibling;
  while (n && !(n.textContent ?? "").trim()) n = n.previousSibling;
  return n?.textContent ?? "";
}
function textAfter(node: Node): string {
  let n: Node | null = node.nextSibling;
  while (n && !(n.textContent ?? "").trim()) n = n.nextSibling;
  return n?.textContent ?? "";
}

/** <br> no fim de cada linha do PDF: vira espaço quando a frase continua */
function unwrapBreaks(doc: Document): number {
  const brs = Array.from(doc.querySelectorAll("p br, div br"));
  const blocks = doc.querySelectorAll(BLOCKS).length || 1;
  // poucas quebras = poesia, endereço, diálogo: deixa como está
  if (brs.length < 6 || brs.length / blocks < 0.8) return 0;
  let joined = 0;
  for (const br of brs) {
    const before = textBefore(br);
    const after = textAfter(br);
    if (!after.trim() || !before.trim()) continue;
    if (ENDS_SENTENCE.test(before) && !STARTS_LOWER.test(after)) continue;
    const before2 = before.replace(/\s+$/, "");
    // palavra hifenizada na quebra ("explica-\nva") se junta sem espaço
    if (/[a-zà-ÿ]-$/i.test(before2) && STARTS_LOWER.test(after)) {
      const prev = br.previousSibling;
      if (prev?.nodeType === Node.TEXT_NODE) prev.nodeValue = (prev.nodeValue ?? "").replace(/-\s*$/, "");
      br.replaceWith(doc.createTextNode(""));
    } else br.replaceWith(doc.createTextNode(" "));
    joined++;
  }
  return joined;
}

/** Um parágrafo por linha do PDF: junta os que continuam a frase do anterior */
function mergeLineBlocks(doc: Document): number {
  const blocks = Array.from(doc.querySelectorAll<HTMLElement>("p"));
  if (blocks.length < 8) return 0;
  const continues = (a: HTMLElement, b: HTMLElement) => {
    if (a.nextElementSibling !== b) return false;
    const ta = (a.textContent ?? "").trim();
    const tb = (b.textContent ?? "").trim();
    return !!ta && !!tb && !ENDS_SENTENCE.test(ta) && STARTS_LOWER.test(tb) && !b.querySelector("img, svg, table");
  };
  // só age se o padrão for frequente: em livros normais, quase nenhum parágrafo começa em minúscula
  let pairs = 0;
  for (let i = 0; i < blocks.length - 1; i++) if (continues(blocks[i], blocks[i + 1])) pairs++;
  if (pairs / blocks.length < 0.15) return 0;
  let merged = 0;
  for (let i = blocks.length - 2; i >= 0; i--) {
    const a = blocks[i];
    const b = blocks[i + 1];
    if (!b.isConnected || !continues(a, b)) continue;
    a.append(doc.createTextNode(" "), ...Array.from(b.childNodes));
    b.remove();
    merged++;
  }
  return merged;
}

/** Pedaços de texto como blocos (inline-block, flex): marcam o documento para o CSS de conserto */
function detectBrokenInline(doc: Document): boolean {
  const win = doc.defaultView;
  if (!win) return false;
  const spans = Array.from(doc.querySelectorAll("p span, p a, p em, p strong, p i, p b, div > span")).slice(0, 200);
  if (spans.length < 10) return false;
  const bad = spans.filter((s) => {
    const d = win.getComputedStyle(s).display;
    return d === "inline-block" || d === "block" || d === "inline-flex";
  }).length;
  return bad / spans.length > 0.3;
}

export function repairDocument(doc: Document) {
  try {
    fixText(doc);
    const fixed = unwrapBreaks(doc) + mergeLineBlocks(doc);
    if (fixed > 0 || detectBrokenInline(doc)) doc.documentElement.classList.add("sepia-reflow");
  } catch {
    // conserto é bônus: se algo der errado, o capítulo segue como veio
  }
}

/** CSS que só vale nos capítulos marcados como "convertidos de PDF" */
export const REFLOW_CSS = `
html.sepia-reflow body, html.sepia-reflow p, html.sepia-reflow div {
  white-space: normal !important;
}
html.sepia-reflow p span, html.sepia-reflow p a, html.sepia-reflow p em, html.sepia-reflow p strong,
html.sepia-reflow p i, html.sepia-reflow p b, html.sepia-reflow p font, html.sepia-reflow div > span {
  display: inline !important;
  float: none !important;
  position: static !important;
  width: auto !important;
  white-space: normal !important;
}
html.sepia-reflow p {
  text-indent: 1.2em;
  margin-top: 0 !important;
  margin-bottom: 0.6em !important;
}
`;
