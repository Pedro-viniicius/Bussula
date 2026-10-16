/**
 * Erros com nome.
 *
 * O código interno classifica o que deu errado; a pessoa lê uma frase simples.
 * Os dois vivem lado a lado aqui para não existir mensagem órfã espalhada pelo
 * projeto, e para o log dizer a mesma coisa que a tela.
 */
export const CODIGOS_DE_ERRO = [
  "VALIDACAO_FALHOU",
  "FORMULARIO_NAO_ENCONTRADO",
  "FORMULARIO_INATIVO",
  "RESPOSTA_DUPLICADA",
  "ENVIO_EXPIRADO",
  "FALHA_DE_PERSISTENCIA",
  "NAO_AUTORIZADO",
  "LIMITE_EXCEDIDO",
  "FORMULARIO_TRAVADO",
] as const;

export type CodigoDeErro = (typeof CODIGOS_DE_ERRO)[number];

/** O que a pessoa lê. Sempre em português simples, sem jargão nem código. */
export const MENSAGEM_DO_ERRO: Record<CodigoDeErro, string> = {
  VALIDACAO_FALHOU: "Confira as respostas destacadas e tente de novo.",
  FORMULARIO_NAO_ENCONTRADO: "Este formulário não existe ou saiu do ar.",
  FORMULARIO_INATIVO: "Este formulário não está recebendo respostas no momento.",
  RESPOSTA_DUPLICADA: "Sua resposta já tinha sido registrada. Está tudo certo.",
  ENVIO_EXPIRADO: "A conexão demorou demais. Tente enviar de novo.",
  FALHA_DE_PERSISTENCIA: "Não conseguimos salvar agora. Tente de novo em instantes.",
  NAO_AUTORIZADO: "Você precisa entrar no painel para ver esta página.",
  LIMITE_EXCEDIDO:
    "Muitos envios em pouco tempo. Suas respostas continuam aqui: espere um pouco e envie de novo.",
  FORMULARIO_TRAVADO: "Este formulário está indisponível no momento.",
};

/** Resultado de uma operação que pode falhar de um jeito previsto. */
export type Resultado<T> = { ok: true; valor: T } | { ok: false; erro: CodigoDeErro; detalhe?: string };

export function deuCerto<T>(valor: T): Resultado<T> {
  return { ok: true, valor };
}

export function deuErrado<T>(erro: CodigoDeErro, detalhe?: string): Resultado<T> {
  return { ok: false, erro, detalhe };
}
