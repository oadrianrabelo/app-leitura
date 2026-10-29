import { FONTS, type Paper, type ReaderSettings } from "./settings";
import { fontFaces } from "./fonts";

/** CSS injetado no documento do livro. Respeita o livro onde dá, força onde precisa. */
export function bookCss(s: ReaderSettings, paper: Paper): string {
  const family = FONTS.find((f) => f.id === s.font)?.family;
  const lh = s.lineHeight;

  return `
${fontFaces()}
@namespace epub "http://www.idpf.org/2007/ops";
html {
  /* O motor pinta as margens com esta cor (e não com a guardada ao carregar o capítulo) */
  --theme-bg-color: ${paper.bg};
  color-scheme: ${paper.dark ? "dark" : "light"};
  background: ${paper.bg} !important;
  color: ${paper.ink} !important;
  font-size: ${s.fontSize}% !important;
  -webkit-text-size-adjust: none;
  text-rendering: optimizeLegibility;
}
body {
  background: transparent !important;
  color: ${paper.ink} !important;
  ${family ? `font-family: ${family} !important;` : ""}
}
${family ? `body *:not(code):not(pre):not(kbd):not(samp) { font-family: inherit !important; }` : ""}
p, li, blockquote, dd, div {
  ${lh ? `line-height: ${lh} !important;` : ""}
}
p, li, blockquote, dd {
  text-align: ${s.justify ? "justify" : "start"};
  -webkit-hyphens: ${s.hyphenate ? "auto" : "manual"};
  hyphens: ${s.hyphenate ? "auto" : "manual"};
  hanging-punctuation: allow-end last;
  widows: 2;
  orphans: 2;
}
a:any-link { color: ${paper.link} !important; text-decoration-thickness: 0.06em; }
img, svg, video { max-width: 100%; height: auto; }
pre { white-space: pre-wrap !important; }
::selection { background: color-mix(in srgb, ${paper.link} 28%, transparent); }
aside[epub|type~="endnote"], aside[epub|type~="footnote"], aside[epub|type~="note"], aside[epub|type~="rearnote"] {
  display: none;
}
${
  paper.dark
    ? `
/* No escuro, cores fixas do livro (texto preto, fundos brancos) ficariam ilegíveis */
body *:not(a):not(img):not(svg):not(image) {
  color: inherit !important;
  background-color: transparent !important;
  border-color: color-mix(in srgb, ${paper.ink} 25%, transparent) !important;
}
img { filter: brightness(0.82) contrast(1.05); }
`
    : ""
}`;
}
