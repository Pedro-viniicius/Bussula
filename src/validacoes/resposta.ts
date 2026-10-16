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
import { motivoTelefoneInvalido } from "@/lib/validation/phone";
import { FORMULARIO_PUBLICO } from "@/lib/texts/publico";

/** Erro por pergunta, indexado pelo id dela. Vazio significa tudo certo. */
export type ErrosDasRespostas = Record<string, string>;

const OBRIGATORIA = "Responda esta pergunta para continuar.";
const NOME_OBRIGATORIO = "Digite seu nome para continuar.";
const CARACTERE_INVALIDO = "Há um caractere que não podemos aceitar. Remova-o para continuar.";

/**
 * Controles (exceto tabulação e quebras de linha) e pares substitutos soltos.
 * O Postgres recusa U+0000 em `text` e em `jsonb`, e recusa substituto solto
 * em `jsonb`: sem esta barreira a gravação falharia com 5xx e a fila offline
 * tentaria de novo para sempre.
 */
const CARACTERE_PROIBIDO = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

function temCaractereProibido(valor: ValorDaResposta): boolean {
  if (typeof valor === "string") return CARACTERE_PROIBIDO.test(valor);
  if (Array.isArray(valor)) return valor.some((v) => typeof v === "string" && CARACTERE_PROIBIDO.test(v));
  return false;
}

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
    if (!pergunta.obrigatoria) return null;
    if (pergunta.tipo === "whatsapp") return FORMULARIO_PUBLICO.whatsapp.erros.vazio;
    if (pergunta.tipo === "nome") return NOME_OBRIGATORIO;
    return OBRIGATORIA;
  }

  if (temCaractereProibido(valor)) return CARACTERE_INVALIDO;

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

    case "whatsapp": {
      // Chega como o cliente digitou (com máscara); o servidor guarda só o E.164.
      if (typeof valor !== "string") return FORMULARIO_PUBLICO.whatsapp.erros.vazio;
      const motivo = motivoTelefoneInvalido(valor);
      return motivo ? FORMULARIO_PUBLICO.whatsapp.erros[motivo] : null;
    }

    case "nome":
      if (typeof valor !== "string") return NOME_OBRIGATORIO;
      return valor.trim().length <= MAIOR_TEXTO_CURTO ? null : `Escreva no máximo ${MAIOR_TEXTO_CURTO} caracteres.`;
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
