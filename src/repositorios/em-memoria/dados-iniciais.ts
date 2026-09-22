/**
 * Os formulários e respostas de exemplo do modo de teste.
 *
 * Existem para que o projeto abra com as telas cheias mesmo sem banco. Nada
 * aqui é real: são três formulários plausíveis da Essencial Fit e respostas
 * sorteadas com semente fixa, para a história ser a mesma a cada execução.
 *
 * As datas são relativas ao momento em que o servidor sobe, e não fixas no
 * calendário — é o que faz "respostas hoje" e "última resposta há 4 min"
 * mostrarem alguma coisa em qualquer dia do ano.
 */
import type { Pergunta } from "@/dominio/formularios/perguntas";
import type { Formulario } from "@/dominio/formularios/tipos";
import type { OrigemDaResposta, Resposta } from "@/dominio/respostas/tipos";

export type VersaoEmMemoria = { formularioId: string; versao: number; perguntas: Pergunta[] };

export type DadosIniciais = {
  formularios: Formulario[];
  versoes: VersaoEmMemoria[];
  respostas: Resposta[];
};

/** Sorteio com semente fixa: mesma história em toda execução. */
function sorteador(semente: number) {
  let estado = semente;
  return () => {
    estado |= 0;
    estado = (estado + 0x6d2b79f5) | 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const EXPERIENCIA_NA_LOJA: Pergunta[] = [
  {
    id: "p-nota-geral",
    tipo: "avaliacao",
    enunciado: "Como foi sua experiência hoje na loja?",
    ajuda: null,
    obrigatoria: true,
    opcoes: [],
    escala: null,
  },
  {
    id: "p-motivo-visita",
    tipo: "escolha_unica",
    enunciado: "O que trouxe você até aqui?",
    ajuda: "Toque na opção mais próxima.",
    obrigatoria: false,
    opcoes: ["Comprar algo específico", "Tirar uma dúvida", "Conhecer a loja", "Retirar um pedido"],
    escala: null,
  },
  {
    id: "p-ajudou",
    tipo: "multipla_escolha",
    enunciado: "O que mais ajudou na sua visita?",
    ajuda: "Pode escolher mais de uma.",
    obrigatoria: false,
    opcoes: ["Atendimento", "Variedade de produtos", "Preço", "Organização da loja", "Rapidez"],
    escala: null,
  },
  {
    id: "p-recomendaria",
    tipo: "escala",
    enunciado: "Qual a chance de você indicar a Essencial Fit para alguém?",
    ajuda: null,
    obrigatoria: true,
    opcoes: [],
    escala: { minimo: 0, maximo: 10, rotuloMinimo: "Nenhuma", rotuloMaximo: "Com certeza" },
  },
  {
    id: "p-melhorar",
    tipo: "texto_livre",
    enunciado: "Tem algo que a gente poderia fazer melhor?",
    ajuda: "Opcional, mas é o que mais nos ajuda.",
    obrigatoria: false,
    opcoes: [],
    escala: null,
  },
];

const INTERESSE_EM_SUPLEMENTOS: Pergunta[] = [
  {
    id: "p-objetivo",
    tipo: "escolha_unica",
    enunciado: "Qual é o seu objetivo principal hoje?",
    ajuda: null,
    obrigatoria: true,
    opcoes: ["Ganhar massa", "Emagrecer", "Ter mais energia", "Cuidar da saúde", "Ainda estou decidindo"],
    escala: null,
  },
  {
    id: "p-categorias",
    tipo: "multipla_escolha",
    enunciado: "Quais produtos te interessam?",
    ajuda: "Pode escolher mais de um.",
    obrigatoria: false,
    opcoes: ["Creatina", "Whey Protein", "Vitaminas", "Snacks saudáveis", "Acessórios"],
    escala: null,
  },
  {
    id: "p-orientacao",
    tipo: "sim_nao",
    enunciado: "Quer receber orientação de alguém da equipe?",
    ajuda: null,
    obrigatoria: true,
    opcoes: [],
    escala: null,
  },
];

const POS_VENDA: Pergunta[] = [
  {
    id: "p-chegou-bem",
    tipo: "sim_nao",
    enunciado: "Seu pedido chegou como você esperava?",
    ajuda: null,
    obrigatoria: true,
    opcoes: [],
    escala: null,
  },
  {
    id: "p-comentario",
    tipo: "texto_curto",
    enunciado: "Quer deixar um comentário?",
    ajuda: null,
    obrigatoria: false,
    opcoes: [],
    escala: null,
  },
];

const COMENTARIOS = [
  "Atendimento muito bom, me explicaram tudo com calma.",
  "Senti falta de mais opções sem lactose.",
  "A fila do caixa estava um pouco longa no fim da tarde.",
  "Gostei da organização das prateleiras.",
  "Poderiam ter mais sabores de whey.",
  "O rapaz do balcão foi super atencioso.",
  "Achei os preços justos.",
  "Queria horário estendido aos sábados.",
];

const ORIGENS: OrigemDaResposta[] = ["nfc", "nfc", "nfc", "qr", "qr", "link"];

const MINUTO = 60_000;
const DIA = 24 * 60 * MINUTO;

export function gerarDadosIniciais(agora: Date = new Date()): DadosIniciais {
  const sortear = sorteador(20260922);
  const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(sortear() * lista.length)];
  const entre = (menor: number, maior: number) => menor + Math.floor(sortear() * (maior - menor + 1));

  const experiencia: Formulario = {
    id: "form-experiencia-na-loja",
    slug: "experiencia-na-loja",
    nome: "Experiência na loja",
    descricao: "Três perguntas rápidas para quem acabou de ser atendido.",
    situacao: "ATIVO",
    versaoAtual: 2,
    criadoEm: new Date(agora.getTime() - 32 * DIA),
    atualizadoEm: new Date(agora.getTime() - 9 * DIA),
  };

  const suplementos: Formulario = {
    id: "form-interesse-suplementos",
    slug: "interesse-em-suplementos",
    nome: "Interesse em suplementos",
    descricao: "Para o cartão do balcão de suplementos.",
    situacao: "ATIVO",
    versaoAtual: 1,
    criadoEm: new Date(agora.getTime() - 18 * DIA),
    atualizadoEm: new Date(agora.getTime() - 18 * DIA),
  };

  const posVenda: Formulario = {
    id: "form-pos-venda",
    slug: "pos-venda",
    nome: "Pós-venda",
    descricao: "Ainda sendo escrito: vai no e-mail de confirmação do pedido.",
    situacao: "RASCUNHO",
    versaoAtual: 1,
    criadoEm: new Date(agora.getTime() - 3 * DIA),
    atualizadoEm: new Date(agora.getTime() - 2 * DIA),
  };

  const versoes: VersaoEmMemoria[] = [
    // A versão 1 tinha uma pergunta a menos: é o que mostra que uma resposta
    // antiga continua legível depois de o formulário mudar.
    { formularioId: experiencia.id, versao: 1, perguntas: EXPERIENCIA_NA_LOJA.slice(0, 4) },
    { formularioId: experiencia.id, versao: 2, perguntas: EXPERIENCIA_NA_LOJA },
    { formularioId: suplementos.id, versao: 1, perguntas: INTERESSE_EM_SUPLEMENTOS },
    { formularioId: posVenda.id, versao: 1, perguntas: POS_VENDA },
  ];

  const respostas: Resposta[] = [];
  let contador = 0;

  // Quantas respostas cada dia recebeu, de 13 dias atrás até hoje. O fim de
  // semana move mais gente, e hoje ainda está a meio caminho.
  const porDia = [6, 9, 4, 5, 11, 14, 8, 7, 10, 6, 13, 16, 9, 5];

  porDia.forEach((quantidade, indice) => {
    const diasAtras = porDia.length - 1 - indice;
    for (let i = 0; i < quantidade; i++) {
      // Espalha as respostas pelo horário de funcionamento (9h às 20h).
      const minutosNoDia = entre(9 * 60, 20 * 60);
      const quando = new Date(agora.getTime() - diasAtras * DIA);
      quando.setHours(0, minutosNoDia, entre(0, 59), 0);
      if (quando > agora) quando.setTime(agora.getTime() - entre(2, 90) * MINUTO);

      const naLoja = sortear() < 0.68;
      const formulario = naLoja ? experiencia : suplementos;
      const versao = naLoja && diasAtras > 9 ? 1 : formulario.versaoAtual;

      respostas.push({
        id: `resposta-${++contador}`,
        formularioId: formulario.id,
        versaoFormulario: versao,
        origem: escolher(ORIGENS),
        criadoEm: quando,
        valores: naLoja
          ? valoresDaExperiencia(versao, sortear, escolher, entre)
          : valoresDeSuplementos(sortear, escolher),
      });
    }
  });

  respostas.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());

  return { formularios: [experiencia, suplementos, posVenda], versoes, respostas };
}

function valoresDaExperiencia(
  versao: number,
  sortear: () => number,
  escolher: <T>(lista: readonly T[]) => T,
  entre: (menor: number, maior: number) => number,
) {
  // A maioria sai satisfeita; uma minoria clara não, que é o que dá o que pensar.
  const contente = sortear() < 0.74;
  const valores: Record<string, string | string[] | number | boolean> = {
    "p-nota-geral": contente ? entre(4, 5) : entre(1, 3),
    "p-recomendaria": contente ? entre(8, 10) : entre(3, 7),
  };
  if (sortear() < 0.86) {
    valores["p-motivo-visita"] = escolher([
      "Comprar algo específico",
      "Tirar uma dúvida",
      "Conhecer a loja",
      "Retirar um pedido",
    ]);
  }
  if (sortear() < 0.7) {
    const possiveis = ["Atendimento", "Variedade de produtos", "Preço", "Organização da loja", "Rapidez"];
    const quantidade = entre(1, 3);
    const escolhidas = new Set<string>();
    while (escolhidas.size < quantidade) escolhidas.add(escolher(possiveis));
    valores["p-ajudou"] = [...escolhidas];
  }
  // A pergunta aberta só existe a partir da versão 2.
  if (versao >= 2 && sortear() < 0.22) valores["p-melhorar"] = escolher(COMENTARIOS);
  return valores;
}

function valoresDeSuplementos(sortear: () => number, escolher: <T>(lista: readonly T[]) => T) {
  const valores: Record<string, string | string[] | number | boolean> = {
    "p-objetivo": escolher([
      "Ganhar massa",
      "Emagrecer",
      "Ter mais energia",
      "Cuidar da saúde",
      "Ainda estou decidindo",
    ]),
    "p-orientacao": sortear() < 0.42,
  };
  if (sortear() < 0.8) {
    const possiveis = ["Creatina", "Whey Protein", "Vitaminas", "Snacks saudáveis", "Acessórios"];
    const escolhidas = new Set<string>();
    const quantidade = 1 + Math.floor(sortear() * 2);
    while (escolhidas.size < quantidade) escolhidas.add(escolher(possiveis));
    valores["p-categorias"] = [...escolhidas];
  }
  return valores;
}
