export interface ChangelogEntry {
  version: string;
  date: string; // AAAA-MM-DD
  title: string;
  highlights: { icon: string; title: string; text: string }[];
}

/** Mais recente primeiro. Cada release adiciona uma entrada aqui. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.1.0",
    date: "2026-10-29",
    title: "Bem-vinda ao Sépia",
    highlights: [
      {
        icon: "sparkles",
        title: "A fundação",
        text: "O primeiro tijolo da sua biblioteca: identidade visual, temas e a casa onde tudo vai morar.",
      },
      {
        icon: "palette",
        title: "Três papéis para os seus olhos",
        text: "Papel, Sépia e Noite. Nenhum usa branco ou preto puros, para cansar menos a vista.",
      },
      {
        icon: "refresh",
        title: "Atualizações automáticas",
        text: "Quando houver versão nova, o Sépia avisa e instala. Você só confirma.",
      },
    ],
  },
];
