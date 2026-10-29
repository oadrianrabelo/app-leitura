// Gera o texto da release a partir da entrada mais recente do changelog.
// Uso: node --experimental-strip-types scripts/release-notes.ts
import { CHANGELOG } from "../src/features/novidades/changelog.ts";

const [latest] = CHANGELOG;
const lines = [`## ${latest.title}`, ""];
for (const h of latest.highlights) lines.push(`- **${h.title}** — ${h.text}`);
console.log(lines.join("\n"));
