/**
 * Situação de um formulário — a definição única, usada pelo banco, pelas
 * telas e pelas regras. Se um status novo precisar existir, ele nasce aqui.
 */
export const SITUACOES_DO_FORMULARIO = ["RASCUNHO", "ATIVO", "INATIVO", "ARQUIVADO"] as const;

export type SituacaoDoFormulario = (typeof SITUACOES_DO_FORMULARIO)[number];

/** Como cada situação aparece para quem usa o painel. */
export const ROTULO_DA_SITUACAO: Record<SituacaoDoFormulario, string> = {
  RASCUNHO: "Rascunho",
  ATIVO: "Ativo",
  INATIVO: "Inativo",
  ARQUIVADO: "Arquivado",
};

/** O que cada situação significa na prática, para explicar na tela. */
export const EXPLICACAO_DA_SITUACAO: Record<SituacaoDoFormulario, string> = {
  RASCUNHO: "Ainda não foi publicado. O link público não abre.",
  ATIVO: "Publicado e recebendo respostas pelo NFC ou QR Code.",
  INATIVO: "Publicado, mas pausado. Quem abrir o link vê um aviso.",
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
