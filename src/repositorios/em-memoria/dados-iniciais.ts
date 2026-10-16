/**
 * Os formulários e respostas de exemplo do modo de teste.
 *
 * Existem para que o projeto abra com as telas cheias mesmo sem banco. Nada
 * aqui é real: são os três formulários incluídos no serviço da Essencial Fit —
 * dois no ar e um ainda em preparação — e respostas sorteadas com semente
 * fixa, para a história ser a mesma a cada execução.
 *
 * As datas são relativas ao momento em que o servidor sobe, e não fixas no
 * calendário — é o que faz "respostas hoje" e "última resposta há 4 min"
 * mostrarem alguma coisa em qualquer dia do ano.
 */
import { ALFABETO_DOS_CODIGOS, PREFIXO_PADRAO_DO_CUPOM, TAMANHO_DO_CODIGO_DE_INDICACAO } from "@/dominio/contatos/codigos";
import type { Finalidade } from "@/dominio/contatos/tipos";
import { MODULOS_DESLIGADOS, type ModulosDoFormulario } from "@/dominio/formularios/modulos";
import type { Pergunta } from "@/dominio/formularios/perguntas";
import { CONFIGURACAO_DA_LOJA_PADRAO, type Formulario } from "@/dominio/formularios/tipos";
import { VALIDADE_DO_CUPOM_DIAS } from "@/dominio/constantes";
import type { OrigemDaResposta, Resposta } from "@/dominio/respostas/tipos";
import { VERSAO_ATUAL } from "@/lib/texts/consentimento";

export type VersaoEmMemoria = {
  formularioId: string;
  versao: number;
  perguntas: Pergunta[];
  modulos: ModulosDoFormulario;
};

/** Um contato guardado em memória: as mesmas colunas da tabela `contatos`. */
export type ContatoEmMemoria = {
  id: string;
  respostaId: string;
  formularioId: string;
  nome: string | null;
  telefone: string;
  cupom: string | null;
  cupomBrinde: string | null;
  cupomExpiraEm: Date | null;
  codigoIndicacao: string | null;
  indicadoPor: string | null;
  criadoEm: Date;
};

/** As mesmas colunas da tabela `consentimentos_contato`. */
export type ConsentimentoEmMemoria = {
  contatoId: string;
  finalidade: Finalidade;
  concedido: boolean;
  textoVersao: string;
  registradoEm: Date;
};

export type DadosIniciais = {
  formularios: Formulario[];
  versoes: VersaoEmMemoria[];
  respostas: Resposta[];
  contatos: ContatoEmMemoria[];
  consentimentos: ConsentimentoEmMemoria[];
  /** O `ip_hash` de cada resposta que o tem, para o limite por IP. */
  ipsDeEnvio: { ipHash: string; criadoEm: Date }[];
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
    descricao: "Entender como foi a visita de quem acabou de ser atendido na loja.",
    situacao: "ATIVO",
    versaoAtual: 2,
    criadoEm: new Date(agora.getTime() - 32 * DIA),
    atualizadoEm: new Date(agora.getTime() - 9 * DIA),
    configuracaoDaLoja: { ...CONFIGURACAO_DA_LOJA_PADRAO },
  };

  const suplementos: Formulario = {
    id: "form-interesse-suplementos",
    slug: "interesse-em-suplementos",
    nome: "Interesse em suplementos",
    descricao: "Descobrir o que procura quem passa pelo balcão de suplementos.",
    situacao: "ATIVO",
    versaoAtual: 1,
    criadoEm: new Date(agora.getTime() - 18 * DIA),
    atualizadoEm: new Date(agora.getTime() - 18 * DIA),
    configuracaoDaLoja: { ...CONFIGURACAO_DA_LOJA_PADRAO },
  };

  const posVenda: Formulario = {
    id: "form-pos-venda",
    slug: "pos-venda",
    nome: "Pós-venda",
    descricao: "Saber se o pedido chegou como o cliente esperava. Vai no e-mail de confirmação.",
    situacao: "RASCUNHO",
    versaoAtual: 1,
    criadoEm: new Date(agora.getTime() - 3 * DIA),
    atualizadoEm: new Date(agora.getTime() - 2 * DIA),
    configuracaoDaLoja: { ...CONFIGURACAO_DA_LOJA_PADRAO },
  };

  const versoes: VersaoEmMemoria[] = [
    // A versão 1 tinha uma pergunta a menos: é o que mostra que uma resposta
    // antiga continua legível depois de o formulário mudar.
    { formularioId: experiencia.id, versao: 1, perguntas: EXPERIENCIA_NA_LOJA.slice(0, 4), modulos: { ...MODULOS_DESLIGADOS } },
    { formularioId: experiencia.id, versao: 2, perguntas: EXPERIENCIA_NA_LOJA, modulos: { ...MODULOS_DESLIGADOS } },
    { formularioId: suplementos.id, versao: 1, perguntas: INTERESSE_EM_SUPLEMENTOS, modulos: { ...MODULOS_DESLIGADOS } },
    { formularioId: posVenda.id, versao: 1, perguntas: POS_VENDA, modulos: { ...MODULOS_DESLIGADOS } },
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

  // O quarto formulário vem DEPOIS do sorteio acima e usa semente própria:
  // assim as respostas dos três primeiros continuam exatamente as mesmas.
  const balcao = gerarCadastroNoBalcao(agora);
  versoes.push(balcao.versao);
  respostas.push(...balcao.respostas);
  respostas.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());

  return {
    formularios: [experiencia, suplementos, posVenda, balcao.formulario],
    versoes,
    respostas,
    contatos: balcao.contatos,
    consentimentos: balcao.consentimentos,
    ipsDeEnvio: [],
  };
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

/* ------------------------------------------------------------------ *
 * Cadastro no balcão: o formulário com WhatsApp, cupom e indicação.   *
 *                                                                     *
 * TUDO AQUI É FICTÍCIO: nomes "Contato Fictício NN" e telefones       *
 * +55 11 9 0000-00NN, que não existem. O dado pessoal vai para        *
 * `contatos`, nunca para `valores` — igual ao envio de verdade.       *
 * ------------------------------------------------------------------ */

const BALCAO_PERGUNTAS: Pergunta[] = [
  {
    id: "p-conheceu",
    tipo: "escolha_unica",
    enunciado: "Como você conheceu a loja?",
    ajuda: null,
    obrigatoria: false,
    opcoes: ["Passando na rua", "Indicação de um amigo", "Redes sociais", "Já sou cliente"],
    escala: null,
  },
  {
    id: "p-nome",
    tipo: "nome",
    enunciado: "Como você se chama?",
    ajuda: "Pode ser só o primeiro nome.",
    obrigatoria: false,
    opcoes: [],
    escala: null,
  },
  {
    id: "p-whatsapp",
    tipo: "whatsapp",
    enunciado: "Qual é o seu WhatsApp?",
    ajuda:
      "Com DDD. Na última etapa você escolhe como podemos usar o número. O cupom é enviado para este número: sem WhatsApp, não dá para gerar o cupom.",
    obrigatoria: true,
    opcoes: [],
    escala: null,
  },
];

const BALCAO_MODULOS: ModulosDoFormulario = {
  recompra: true,
  ofertas: true,
  cupom: { prefixo: PREFIXO_PADRAO_DO_CUPOM },
  indicacao: true,
};

const BRINDE_FICTICIO = "Brinde de exemplo (dado fictício): um shaker na primeira compra";

/** Quantas respostas o balcão recebeu em cada um dos últimos cinco dias (de 4 dias atrás até hoje). */
const BALCAO_POR_DIA = [2, 3, 1, 4, 2];

function gerarCadastroNoBalcao(agora: Date) {
  const sortear = sorteador(20261015);
  const escolher = <T,>(lista: readonly T[]) => lista[Math.floor(sortear() * lista.length)];
  const sortearCodigo = (tamanho: number) =>
    Array.from({ length: tamanho }, () => ALFABETO_DOS_CODIGOS[Math.floor(sortear() * ALFABETO_DOS_CODIGOS.length)]).join("");

  const formulario: Formulario = {
    id: "form-cadastro-no-balcao",
    slug: "cadastro-no-balcao",
    nome: "Cadastro no balcão",
    descricao: "Cadastro de quem compra no balcão, com cupom de boas-vindas e link de indicação.",
    situacao: "ATIVO",
    versaoAtual: 1,
    criadoEm: new Date(agora.getTime() - 5 * DIA),
    atualizadoEm: new Date(agora.getTime() - 5 * DIA),
    configuracaoDaLoja: {
      textoDoBrinde: BRINDE_FICTICIO,
      nomeObrigatorio: false,
      whatsappObrigatorio: true,
      formularioDeIndicacaoId: null,
    },
  };

  const versao: VersaoEmMemoria = {
    formularioId: formulario.id,
    versao: 1,
    perguntas: BALCAO_PERGUNTAS,
    modulos: { ...BALCAO_MODULOS, cupom: { ...BALCAO_MODULOS.cupom! } },
  };

  const respostas: Resposta[] = [];
  BALCAO_POR_DIA.forEach((quantidade, indice) => {
    const diasAtras = BALCAO_POR_DIA.length - 1 - indice;
    for (let i = 0; i < quantidade; i++) {
      const minutosNoDia = 9 * 60 + Math.floor(sortear() * (11 * 60 + 1));
      const quando = new Date(agora.getTime() - diasAtras * DIA);
      quando.setHours(0, minutosNoDia, Math.floor(sortear() * 60), 0);
      if (quando > agora) quando.setTime(agora.getTime() - (2 + Math.floor(sortear() * 89)) * MINUTO);
      respostas.push({
        id: `resposta-balcao-${respostas.length + 1}`,
        formularioId: formulario.id,
        versaoFormulario: 1,
        origem: escolher(ORIGENS),
        criadoEm: quando,
        // Só a pergunta comum: nome e WhatsApp nunca entram em `valores`.
        valores: sortear() < 0.85 ? { "p-conheceu": escolher(BALCAO_PERGUNTAS[0].opcoes) } : {},
      });
    }
  });
  respostas.sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime());

  // Um contato por resposta, em ordem de tempo. O 9º reaproveita o telefone do
  // 3º e revoga as mensagens (mostra o "cadastro mais recente vale"); como o
  // telefone já tinha cupom neste formulário, o 9º fica sem cupom.
  const contatos: ContatoEmMemoria[] = [];
  const consentimentos: ConsentimentoEmMemoria[] = [];
  const telefoneDe = (numero: number) => `+55119000000${String(numero).padStart(2, "0")}`;
  const INDICADOS_PELO_PRIMEIRO = [4, 5, 6];
  const INDICADO_PELO_TERCEIRO = [8];

  respostas.forEach((resposta, i) => {
    const posicao = i + 1;
    const repetido = posicao === 9;
    const id = `contato-balcao-${posicao}`;
    const emitirCupom = !repetido;
    const indicadoPor = INDICADOS_PELO_PRIMEIRO.includes(posicao)
      ? "contato-balcao-1"
      : INDICADO_PELO_TERCEIRO.includes(posicao)
        ? "contato-balcao-3"
        : null;

    contatos.push({
      id,
      respostaId: resposta.id,
      formularioId: formulario.id,
      nome: posicao % 4 === 0 ? null : `Contato Fictício ${String(posicao).padStart(2, "0")}`,
      telefone: telefoneDe(repetido ? 3 : posicao),
      cupom: emitirCupom ? `${PREFIXO_PADRAO_DO_CUPOM}-${sortearCodigo(4)}-${sortearCodigo(2)}` : null,
      cupomBrinde: emitirCupom ? BRINDE_FICTICIO : null,
      cupomExpiraEm: emitirCupom ? new Date(resposta.criadoEm.getTime() + VALIDADE_DO_CUPOM_DIAS * DIA) : null,
      codigoIndicacao: sortearCodigo(TAMANHO_DO_CODIGO_DE_INDICACAO),
      indicadoPor,
      criadoEm: resposta.criadoEm,
    });

    const aceitaRecompra = repetido ? false : sortear() < 0.6;
    const aceitaOfertas = repetido ? false : sortear() < 0.3;
    for (const [finalidade, concedido] of [
      ["recompra", aceitaRecompra],
      ["ofertas", aceitaOfertas],
    ] as const) {
      consentimentos.push({
        contatoId: id,
        finalidade,
        concedido,
        textoVersao: VERSAO_ATUAL,
        registradoEm: resposta.criadoEm,
      });
    }
  });

  return { formulario, versao, respostas, contatos, consentimentos };
}
