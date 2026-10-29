export interface ChangelogEntry {
  version: string;
  date: string; // AAAA-MM-DD
  title: string;
  highlights: { icon: string; title: string; text: string }[];
}

/** Mais recente primeiro. Cada release adiciona uma entrada aqui. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.5.1",
    date: "2026-10-29",
    title: "Orquídeas",
    highlights: [
      {
        icon: "sparkles",
        title: "Flores pelo caminho",
        text: "Orquídeas e folhas verdes enfeitam o Sépia, da tela de boas-vindas ao fim de cada livro.",
      },
      {
        icon: "library",
        title: "Estante sem piscar",
        text: "As capas aparecem na hora ao voltar para a biblioteca.",
      },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-10-29",
    title: "Do seu jeito",
    highlights: [
      {
        icon: "palette",
        title: "Tudo em lilás",
        text: "Um novo visual em todos os temas, com dois temas novos: Lavanda e Ameixa. E mais papéis para ler: Lavanda, Rosé, Névoa, Ameixa e Oliva.",
      },
      {
        icon: "heart",
        title: "Feito para você",
        text: "O Sépia agora te chama pelo nome e acompanha a sua semana: cada dia em que você passou por aqui ou leu.",
      },
      {
        icon: "type",
        title: "Ajuste vendo o livro",
        text: "O painel de aparência deixa a página à vista e ganhou controles de tamanho, margens, espaçamento e brilho.",
      },
      {
        icon: "book",
        title: "Texto bem arrumado",
        text: "Livros que quebravam palavras no meio ou tinham buracos no lugar de letras agora aparecem certinhos.",
      },
      {
        icon: "back",
        title: "Voltar sem sair do livro",
        text: "O botão voltar do celular fecha primeiro o painel aberto, e só depois o livro. E a leitura ficou mais leve.",
      },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-10-30",
    title: "Sua biblioteca, a salvo",
    highlights: [
      {
        icon: "cloud",
        title: "Sincronização com o Google Drive",
        text: "Biblioteca, leituras, marcadores e o ponto onde você parou ficam guardados e iguais em todos os aparelhos.",
      },
      {
        icon: "file",
        title: "Seus livros em qualquer lugar",
        text: "Os EPUBs e PDFs também vão para o Drive. Em outro aparelho, é só abrir que o livro chega.",
      },
      {
        icon: "info",
        title: "Privado de verdade",
        text: "O Sépia usa uma pasta só dele no seu Drive: não vê nem mexe nos seus outros arquivos.",
      },
    ],
  },
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
