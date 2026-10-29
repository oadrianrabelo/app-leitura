// Fontes de leitura embarcadas: o livro é renderizado num iframe, então as
// declarações @font-face são injetadas no documento do livro com URLs do app.
import literataN from "@fontsource-variable/literata/files/literata-latin-wght-normal.woff2?url";
import literataNx from "@fontsource-variable/literata/files/literata-latin-ext-wght-normal.woff2?url";
import literataI from "@fontsource-variable/literata/files/literata-latin-wght-italic.woff2?url";
import sourceN from "@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-normal.woff2?url";
import sourceNx from "@fontsource-variable/source-serif-4/files/source-serif-4-latin-ext-wght-normal.woff2?url";
import sourceI from "@fontsource-variable/source-serif-4/files/source-serif-4-latin-wght-italic.woff2?url";
import garamondN from "@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-normal.woff2?url";
import garamondNx from "@fontsource-variable/eb-garamond/files/eb-garamond-latin-ext-wght-normal.woff2?url";
import garamondI from "@fontsource-variable/eb-garamond/files/eb-garamond-latin-wght-italic.woff2?url";
import charis400 from "@fontsource/charis-sil/files/charis-sil-latin-400-normal.woff2?url";
import charis400i from "@fontsource/charis-sil/files/charis-sil-latin-400-italic.woff2?url";
import charis700 from "@fontsource/charis-sil/files/charis-sil-latin-700-normal.woff2?url";
import atkinson400 from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-normal.woff2?url";
import atkinson400i from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-400-italic.woff2?url";
import atkinson700 from "@fontsource/atkinson-hyperlegible/files/atkinson-hyperlegible-latin-700-normal.woff2?url";
import dys400 from "@fontsource/opendyslexic/files/opendyslexic-latin-400-normal.woff2?url";
import dys400i from "@fontsource/opendyslexic/files/opendyslexic-latin-400-italic.woff2?url";
import dys700 from "@fontsource/opendyslexic/files/opendyslexic-latin-700-normal.woff2?url";

const abs = (url: string) => new URL(url, window.location.href).href;
const LATIN_EXT = "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF";

const face = (family: string, url: string, weight: string, style = "normal", range?: string) =>
  `@font-face{font-family:"${family}";src:url("${abs(url)}") format("woff2");font-weight:${weight};font-style:${style};font-display:block;${range ? `unicode-range:${range};` : ""}}`;

export function fontFaces(): string {
  return [
    face("Sepia Literata", literataN, "200 900"),
    face("Sepia Literata", literataNx, "200 900", "normal", LATIN_EXT),
    face("Sepia Literata", literataI, "200 900", "italic"),
    face("Sepia Source Serif", sourceN, "200 900"),
    face("Sepia Source Serif", sourceNx, "200 900", "normal", LATIN_EXT),
    face("Sepia Source Serif", sourceI, "200 900", "italic"),
    face("Sepia Garamond", garamondN, "400 800"),
    face("Sepia Garamond", garamondNx, "400 800", "normal", LATIN_EXT),
    face("Sepia Garamond", garamondI, "400 800", "italic"),
    face("Sepia Charis", charis400, "400"),
    face("Sepia Charis", charis400i, "400", "italic"),
    face("Sepia Charis", charis700, "700"),
    face("Sepia Atkinson", atkinson400, "400"),
    face("Sepia Atkinson", atkinson400i, "400", "italic"),
    face("Sepia Atkinson", atkinson700, "700"),
    face("Sepia OpenDyslexic", dys400, "400"),
    face("Sepia OpenDyslexic", dys400i, "400", "italic"),
    face("Sepia OpenDyslexic", dys700, "700"),
  ].join("\n");
}
