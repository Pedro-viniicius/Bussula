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
] as const;

export type TipoDePergunta = (typeof TIPOS_DE_PERGUNTA)[number];

export type DescricaoDoTipo = {
  /** Nome do tipo no editor. */
  rotulo: string;
  /** Uma linha explicando quando usar. */
  quandoUsar: string;
  /** Se o tipo precisa de uma lista de opções escritas pelo administrador. */
  usaOpcoes: boolean;
  /** Se o tipo precisa de um intervalo numérico configurável. */
  usaEscala: boolean;
};

export const DESCRICAO_DO_TIPO: Record<TipoDePergunta, DescricaoDoTipo> = {
  escolha_unica: {
    rotulo: "Escolha única",
    quandoUsar: "Uma opção entre várias. É a pergunta mais rápida de responder.",
    usaOpcoes: true,
    usaEscala: false,
  },
  multipla_escolha: {
    rotulo: "Múltipla escolha",
    quandoUsar: "Quando mais de uma opção pode ser verdadeira ao mesmo tempo.",
    usaOpcoes: true,
    usaEscala: false,
  },
  escala: {
    rotulo: "Escala",
    quandoUsar: "Intensidade ou concordância, de um número a outro.",
    usaOpcoes: false,
    usaEscala: true,
  },
  avaliacao: {
    rotulo: "Avaliação",
    quandoUsar: "Nota de 1 a 5 estrelas para uma experiência.",
    usaOpcoes: false,
    usaEscala: false,
  },
  sim_nao: {
    rotulo: "Sim ou não",
    quandoUsar: "Uma pergunta fechada, com duas respostas possíveis.",
    usaOpcoes: false,
    usaEscala: false,
  },
  texto_curto: {
    rotulo: "Texto curto",
    quandoUsar: "Um nome, um número, uma palavra. Digitar cansa: use pouco.",
    usaOpcoes: false,
    usaEscala: false,
  },
  texto_livre: {
    rotulo: "Texto livre",
    quandoUsar: "Só quando a opinião em palavras da pessoa vale mais que uma opção.",
    usaOpcoes: false,
    usaEscala: false,
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

/** Verdadeiro quando a pessoa deixou a pergunta em branco, qualquer que seja o tipo. */
export function respostaVazia(valor: ValorDaResposta): boolean {
  if (valor === null || valor === undefined) return true;
  if (typeof valor === "string") return valor.trim() === "";
  if (Array.isArray(valor)) return valor.length === 0;
  return false;
}
