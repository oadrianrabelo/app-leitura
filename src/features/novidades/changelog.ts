export interface ChangelogEntry {
  version: string;
  date: string; // AAAA-MM-DD
  title: string;
  highlights: { icon: string; title: string; text: string }[];
}

/** Mais recente primeiro. Cada release adiciona uma entrada aqui. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.7.0",
    date: "2026-10-30",
    title: "Glicínias em aquarela",
    highlights: [
      {
        icon: "sparkles",
        title: "Um jardim pintado à mão",
        text: "Glicínias em aquarela sobem pela estante, atravessam o canto da tela e pendem das prateleiras, cada uma de um jeito.",
      },
      {
        icon: "palette",
        title: "Cores de cada tema",
        text: "Lilás na Lavanda, azul no Jardim, rosa no Rosé e no Papel, coral no Terracota e no Sépia.",
      },
    ],
  },
  {
    version: "0.6.2",
    date: "2026-10-30",
    title: "Ajustes",
    highlights: [
      {
        icon: "barcode",
        title: "Leitor de código de barras",
        text: "Mais uma correção na abertura da câmera.",
      },
      {
        icon: "sparkles",
        title: "Ilustrações em pausa",
        text: "As folhas e flores saem de cena enquanto preparamos ilustrações mais bonitas e naturais.",
      },
    ],
  },
  {
    version: "0.6.1",
    date: "2026-10-29",
    title: "Câmera consertada",
    highlights: [
      {
        icon: "barcode",
        title: "Leitor de código de barras",
        text: "Se o leitor do Google ainda não estiver no celular, o Sépia baixa antes de abrir a câmera.",
      },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-10-29",
    title: "Mais cores no jardim",
    highlights: [
      {
        icon: "palette",
        title: "Flores coloridas e dois temas novos",
        text: "Folhas verdes, glicínias, florzinhas azuis e borboletas, com as cores de cada tema. Novos temas Jardim e Terracota.",
      },
      {
        icon: "library",
        title: "Capas ou lombadas",
        text: "Na biblioteca, escolha ver a estante pelas capas ou pelas lombadas, e filtre só os digitais ou só os físicos.",
      },
      {
        icon: "barcode",
        title: "Código de barras que funciona",
        text: "O leitor de código de barras agora é o do Google. A busca por ISBN procura também em catálogos brasileiros, e o teclado não cobre mais o campo.",
      },
      {
        icon: "cloud",
        title: "Conexão com o Google mais clara",
        text: "Se algo der errado ao conectar, o Sépia explica o motivo e deixa tentar de novo ou trocar de conta.",
      },
    ],
  },
  {
    version: "0.5.2",
    date: "2026-10-29",
    title: "Um jardim na estante",
    highlights: [
      {
        icon: "sparkles",
        title: "Orquídeas em traço de gravura",
        text: "Novas ilustrações, num tom só, no fundo das telas, que acompanham o tema que você escolher.",
      },
      {
        icon: "library",
        title: "Guirlandas nas prateleiras",
        text: "Folhinhas e pequenas flores penduradas em cada prateleira da sua estante.",
      },
    ],
  },
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
