export interface ChangelogEntry {
  version: string;
  date: string; // AAAA-MM-DD
  title: string;
  highlights: { icon: string; title: string; text: string }[];
}

/** Mais recente primeiro. Cada release adiciona uma entrada aqui. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.3.0",
    date: "2026-10-29",
    title: "Hora de ler",
    highlights: [
      {
        icon: "read",
        title: "O leitor do Sépia",
        text: "EPUB, MOBI e PDF, com a fonte original do livro, toque nas bordas para virar e o livro sempre reabrindo onde você parou.",
      },
      {
        icon: "palette",
        title: "Seis papéis e sete fontes",
        text: "Papel, Sépia, Sálvia, Cinza, Noite e Breu. Tamanho, espaçamento, margens e páginas ou rolagem contínua.",
      },
      {
        icon: "moon",
        title: "Feito para os seus olhos",
        text: "Luz quente à noite, escurecer além do brilho mínimo e um lembrete gentil de pausa a cada 20 minutos.",
      },
      {
        icon: "bookmark",
        title: "Marcadores",
        text: "Toque no canto da página para marcá-la, como dobrar a ponta de uma folha.",
      },
      {
        icon: "flame",
        title: "Seu ritmo de verdade",
        text: "Páginas lidas hoje e a sequência de dias, agora contadas enquanto você lê.",
      },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-10-29",
    title: "Sua biblioteca chegou",
    highlights: [
      {
        icon: "library",
        title: "Uma estante de verdade",
        text: "Seus livros em pé nas prateleiras, com busca, filtros e o selo de quantas vezes cada um foi lido.",
      },
      {
        icon: "upload",
        title: "Importe seus livros digitais",
        text: "EPUB, MOBI e PDF, vários de uma vez. Capa, autor e páginas saem do próprio arquivo.",
      },
      {
        icon: "barcode",
        title: "Livros físicos também",
        text: "Escaneie o código de barras, busque pelo título ou cadastre à mão.",
      },
      {
        icon: "reread",
        title: "Cada leitura conta",
        text: "Registre releituras, leituras antigas, notas e o que ficou de cada livro em você.",
      },
    ],
  },
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
