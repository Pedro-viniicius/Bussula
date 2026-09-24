/**
 * Situação de um formulário — a definição única, usada pelo banco, pelas
 * telas e pelas regras. Se um status novo precisar existir, ele nasce aqui.
 */
export const SITUACOES_DO_FORMULARIO = ["RASCUNHO", "ATIVO", "INATIVO", "ARQUIVADO"] as const;

export type SituacaoDoFormulario = (typeof SITUACOES_DO_FORMULARIO)[number];

/**
 * Como cada situação aparece para quem usa o painel.
 *
 * O rascunho aparece como "Em preparação": quem escreve e configura os
 * formulários é a equipe que cuida do sistema, e para a loja ele é um
 * formulário que ainda está sendo preparado — não um rascunho dela.
 */
export const ROTULO_DA_SITUACAO: Record<SituacaoDoFormulario, string> = {
  RASCUNHO: "Em preparação",
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  ARQUIVADO: "Arquivado",
};

/** O que cada situação significa na prática, para explicar na tela. */
export const EXPLICACAO_DA_SITUACAO: Record<SituacaoDoFormulario, string> = {
  RASCUNHO: "Ainda está sendo configurado. O link público só abre quando ele entrar no ar.",
  ATIVO: "No ar e recebendo respostas pelo NFC ou QR Code.",
  INATIVO: "Pausado. Quem abrir o link vê um aviso, e as respostas já recebidas continuam aqui.",
  ARQUIVADO: "Fora de uso. As respostas já recebidas continuam no painel.",
};

/** Só um formulário ativo aceita resposta de cliente. */
export function aceitaResposta(situacao: SituacaoDoFormulario): boolean {
  return situacao === "ATIVO";
}

/** Rascunho e arquivado não têm link público que valha a pena copiar. */
export function temLinkPublico(situacao: SituacaoDoFormulario): boolean {
  return situacao === "ATIVO" || situacao === "INATIVO";
}

/**
 * Para onde a loja pode levar um formulário pelo painel, a partir de cada
 * situação.
 *
 * Pausar, retomar e arquivar são decisões do dia a dia da loja. Publicar um
 * formulário em preparação, não: é o último passo de configurá-lo, e isso
 * fica com a equipe que cuida do sistema. Um arquivado também não volta pelo
 * painel. O servidor confere esta mesma lista antes de mudar qualquer coisa —
 * esconder o botão não bastaria.
 */
const MUDANCAS_PERMITIDAS_A_LOJA: Record<SituacaoDoFormulario, readonly SituacaoDoFormulario[]> = {
  RASCUNHO: [],
  ATIVO: ["INATIVO", "ARQUIVADO"],
  INATIVO: ["ATIVO", "ARQUIVADO"],
  ARQUIVADO: [],
};

export function mudancasPermitidasALoja(situacao: SituacaoDoFormulario): readonly SituacaoDoFormulario[] {
  return MUDANCAS_PERMITIDAS_A_LOJA[situacao];
}

export function lojaPodeMudarSituacao(atual: SituacaoDoFormulario, nova: SituacaoDoFormulario): boolean {
  return MUDANCAS_PERMITIDAS_A_LOJA[atual].includes(nova);
}
