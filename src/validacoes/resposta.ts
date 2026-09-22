/**
 * Regras do que uma pessoa pode responder.
 *
 * Roda nos dois lados: no celular, para avisar antes de enviar; no servidor,
 * porque a requisição pode vir de qualquer lugar. O formato aceito depende do
 * tipo da pergunta, e cada tipo é conferido num caso próprio abaixo.
 */
import {
  MAIOR_NOTA_DA_AVALIACAO,
  MAIOR_TEXTO_CURTO,
  MAIOR_TEXTO_LIVRE,
  respostaVazia,
  type Pergunta,
  type ValorDaResposta,
} from "@/dominio/formularios/perguntas";

/** Erro por pergunta, indexado pelo id dela. Vazio significa tudo certo. */
export type ErrosDasRespostas = Record<string, string>;

const OBRIGATORIA = "Responda esta pergunta para continuar.";

export function validarRespostas(
  perguntas: Pergunta[],
  valores: Record<string, ValorDaResposta>,
): ErrosDasRespostas {
  const erros: ErrosDasRespostas = {};
  for (const pergunta of perguntas) {
    const erro = validarResposta(pergunta, valores[pergunta.id] ?? null);
    if (erro) erros[pergunta.id] = erro;
  }
  return erros;
}

/** Nulo quando a resposta serve. */
export function validarResposta(pergunta: Pergunta, valor: ValorDaResposta): string | null {
  if (respostaVazia(valor)) {
    return pergunta.obrigatoria ? OBRIGATORIA : null;
  }

  switch (pergunta.tipo) {
    case "escolha_unica":
      if (typeof valor !== "string") return OBRIGATORIA;
      return pergunta.opcoes.includes(valor) ? null : "Escolha uma das opções.";

    case "multipla_escolha":
      if (!Array.isArray(valor)) return OBRIGATORIA;
      return valor.every((v) => pergunta.opcoes.includes(v)) ? null : "Escolha entre as opções disponíveis.";

    case "escala": {
      if (typeof valor !== "number" || !Number.isFinite(valor)) return "Escolha um ponto da escala.";
      const escala = pergunta.escala;
      if (!escala) return null;
      return valor >= escala.minimo && valor <= escala.maximo ? null : "Escolha um ponto da escala.";
    }

    case "avaliacao":
      if (typeof valor !== "number" || !Number.isInteger(valor)) return "Escolha de 1 a 5 estrelas.";
      return valor >= 1 && valor <= MAIOR_NOTA_DA_AVALIACAO ? null : "Escolha de 1 a 5 estrelas.";

    case "sim_nao":
      return typeof valor === "boolean" ? null : "Escolha sim ou não.";

    case "texto_curto":
      if (typeof valor !== "string") return OBRIGATORIA;
      return valor.trim().length <= MAIOR_TEXTO_CURTO ? null : `Escreva no máximo ${MAIOR_TEXTO_CURTO} caracteres.`;

    case "texto_livre":
      if (typeof valor !== "string") return OBRIGATORIA;
      return valor.trim().length <= MAIOR_TEXTO_LIVRE ? null : `Escreva no máximo ${MAIOR_TEXTO_LIVRE} caracteres.`;
  }
}

export function respostasEstaoValidas(erros: ErrosDasRespostas): boolean {
  return Object.keys(erros).length === 0;
}

/**
 * Deixa só o que pertence a alguma pergunta desta versão e descarta o vazio.
 * O que chega a mais é ignorado em silêncio — nunca é gravado.
 */
export function limparValores(
  perguntas: Pergunta[],
  valores: Record<string, ValorDaResposta>,
): Record<string, ValorDaResposta> {
  const limpos: Record<string, ValorDaResposta> = {};
  for (const pergunta of perguntas) {
    const valor = valores[pergunta.id];
    if (respostaVazia(valor ?? null)) continue;
    limpos[pergunta.id] = typeof valor === "string" ? valor.trim() : valor;
  }
  return limpos;
}
