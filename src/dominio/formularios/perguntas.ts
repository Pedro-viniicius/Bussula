/**
 * Tipos de pergunta — a definição única.
 *
 * Cada tipo é descrito uma vez, aqui, e todo o resto lê esta descrição: o
 * editor sabe quais campos mostrar, o formulário público sabe o que renderizar
 * e a validação sabe o que aceitar. Acrescentar um tipo é acrescentar uma
 * entrada em `DESCRICAO_DO_TIPO` e um caso no componente da pergunta — nada
 * além disso precisa ser reescrito.
 */
export const TIPOS_DE_PERGUNTA = [
  "escolha_unica",
  "multipla_escolha",
  "escala",
  "avaliacao",
  "sim_nao",
  "texto_curto",
  "texto_livre",
  "whatsapp",
  "nome",
] as const;

export type TipoDePergunta = (typeof TIPOS_DE_PERGUNTA)[number];

/**
 * O jeito de ler as respostas de um tipo:
 * - nota: um número numa escala, que dá para somar e tirar média;
 * - escolha: opções que dá para contar;
 * - texto: palavras da própria pessoa, que se leem, não se somam.
 */
export type FamiliaDoTipo = "nota" | "escolha" | "texto";

export type DescricaoDoTipo = {
  /** Nome do tipo quando é preciso mostrá-lo. */
  rotulo: string;
  /** Uma linha explicando quando usar. */
  quandoUsar: string;
  /** Se o tipo precisa de uma lista de opções escritas pelo administrador. */
  usaOpcoes: boolean;
  /** Se o tipo precisa de um intervalo numérico configurável. */
  usaEscala: boolean;
  familia: FamiliaDoTipo;
  /**
   * Se a resposta é dado pessoal. Dado pessoal nunca fica em `respostas.valores`:
   * o servidor o separa e o guarda em `contatos`, fora da análise e da IA.
   */
  pessoal: boolean;
};

export const DESCRICAO_DO_TIPO: Record<TipoDePergunta, DescricaoDoTipo> = {
  escolha_unica: {
    rotulo: "Escolha única",
    quandoUsar: "Uma opção entre várias. É a pergunta mais rápida de responder.",
    usaOpcoes: true,
    usaEscala: false,
    familia: "escolha",
    pessoal: false,
  },
  multipla_escolha: {
    rotulo: "Múltipla escolha",
    quandoUsar: "Quando mais de uma opção pode ser verdadeira ao mesmo tempo.",
    usaOpcoes: true,
    usaEscala: false,
    familia: "escolha",
    pessoal: false,
  },
  escala: {
    rotulo: "Escala",
    quandoUsar: "Intensidade ou concordância, de um número a outro.",
    usaOpcoes: false,
    usaEscala: true,
    familia: "nota",
    pessoal: false,
  },
  avaliacao: {
    rotulo: "Avaliação",
    quandoUsar: "Nota de 1 a 5 estrelas para uma experiência.",
    usaOpcoes: false,
    usaEscala: false,
    familia: "nota",
    pessoal: false,
  },
  sim_nao: {
    rotulo: "Sim ou não",
    quandoUsar: "Uma pergunta fechada, com duas respostas possíveis.",
    usaOpcoes: false,
    usaEscala: false,
    familia: "escolha",
    pessoal: false,
  },
  texto_curto: {
    rotulo: "Texto curto",
    quandoUsar: "Um nome, um número, uma palavra. Digitar cansa: use pouco.",
    usaOpcoes: false,
    usaEscala: false,
    familia: "texto",
    pessoal: false,
  },
  texto_livre: {
    rotulo: "Texto livre",
    quandoUsar: "Só quando a opinião em palavras da pessoa vale mais que uma opção.",
    usaOpcoes: false,
    usaEscala: false,
    familia: "texto",
    pessoal: false,
  },
  whatsapp: {
    rotulo: "WhatsApp",
    quandoUsar: "O número de celular de quem responde. Só com uma finalidade clara para ele.",
    usaOpcoes: false,
    usaEscala: false,
    familia: "texto",
    pessoal: true,
  },
  nome: {
    rotulo: "Nome",
    quandoUsar: "Como a pessoa quer ser chamada. É guardado só junto do WhatsApp.",
    usaOpcoes: false,
    usaEscala: false,
    familia: "texto",
    pessoal: true,
  },
};

/** Nota máxima de uma pergunta de avaliação. */
export const MAIOR_NOTA_DA_AVALIACAO = 5;

export const MAIOR_TEXTO_CURTO = 120;
export const MAIOR_TEXTO_LIVRE = 1_000;

export type EscalaDaPergunta = {
  minimo: number;
  maximo: number;
  rotuloMinimo: string | null;
  rotuloMaximo: string | null;
};

export type Pergunta = {
  /** Estável entre versões: é a chave pela qual a resposta é guardada. */
  id: string;
  tipo: TipoDePergunta;
  enunciado: string;
  /** Uma linha de apoio abaixo do enunciado, quando ajuda de verdade. */
  ajuda: string | null;
  obrigatoria: boolean;
  /** Vazio quando o tipo não usa opções. */
  opcoes: string[];
  /** Nulo quando o tipo não usa escala. */
  escala: EscalaDaPergunta | null;
};

/**
 * O que uma pessoa respondeu a uma pergunta. O formato depende do tipo:
 * texto e escolha única guardam texto, múltipla escolha guarda uma lista,
 * escala e avaliação guardam número, sim/não guarda booleano.
 */
export type ValorDaResposta = string | string[] | number | boolean | null;

export const ESCALA_PADRAO: EscalaDaPergunta = {
  minimo: 1,
  maximo: 5,
  rotuloMinimo: null,
  rotuloMaximo: null,
};

/** Uma pergunta nova, já com os campos que o tipo escolhido exige. */
export function perguntaEmBranco(id: string, tipo: TipoDePergunta): Pergunta {
  const descricao = DESCRICAO_DO_TIPO[tipo];
  return {
    id,
    tipo,
    enunciado: "",
    ajuda: null,
    obrigatoria: false,
    opcoes: descricao.usaOpcoes ? ["", ""] : [],
    escala: descricao.usaEscala ? { ...ESCALA_PADRAO } : null,
  };
}

/**
 * Ajusta a pergunta quando o tipo muda: o que o novo tipo não usa é zerado,
 * e o que ele exige ganha um começo utilizável.
 */
export function trocarTipo(pergunta: Pergunta, tipo: TipoDePergunta): Pergunta {
  const descricao = DESCRICAO_DO_TIPO[tipo];
  return {
    ...pergunta,
    tipo,
    opcoes: descricao.usaOpcoes ? (pergunta.opcoes.length ? pergunta.opcoes : ["", ""]) : [],
    escala: descricao.usaEscala ? (pergunta.escala ?? { ...ESCALA_PADRAO }) : null,
  };
}

/** Verdadeiro para os tipos cuja resposta é dado pessoal (WhatsApp, nome). */
export function ehPerguntaPessoal(pergunta: Pergunta): boolean {
  return DESCRICAO_DO_TIPO[pergunta.tipo].pessoal;
}

/**
 * As perguntas sem as de dado pessoal. É o que resultados, análise e respostas
 * individuais percorrem: dado pessoal não entra em conta, gráfico nem pedido a
 * modelo de linguagem.
 */
export function semDadosPessoais(perguntas: Pergunta[]): Pergunta[] {
  return perguntas.filter((pergunta) => !ehPerguntaPessoal(pergunta));
}

/** Verdadeiro quando alguma pergunta pede dado pessoal. */
export function pedeDadosPessoais(perguntas: Pergunta[]): boolean {
  return perguntas.some(ehPerguntaPessoal);
}

/** Se a resposta de um tipo se soma, se conta ou se lê. */
export function familiaDoTipo(tipo: TipoDePergunta): FamiliaDoTipo {
  return DESCRICAO_DO_TIPO[tipo].familia;
}

/**
 * O menor e o maior valor possíveis numa pergunta de nota. A avaliação vai
 * sempre de 1 a 5; a escala usa o intervalo que foi configurado nela.
 */
export function limitesDaNota(pergunta: Pergunta): { menor: number; maior: number } {
  if (pergunta.tipo === "avaliacao") return { menor: 1, maior: MAIOR_NOTA_DA_AVALIACAO };
  return { menor: pergunta.escala?.minimo ?? 0, maior: pergunta.escala?.maximo ?? 10 };
}

/** Verdadeiro quando a pessoa deixou a pergunta em branco, qualquer que seja o tipo. */
export function respostaVazia(valor: ValorDaResposta): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "string") return valor.trim() === "";
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}
