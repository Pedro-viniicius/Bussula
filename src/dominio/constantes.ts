/**
 * Números com nome.
 *
 * Qualquer valor que apareça mais de uma vez, ou cujo significado não seja
 * óbvio ao lado do código, mora aqui. Mudar um limite é mudar uma linha deste
 * arquivo — não caçar o número espalhado pelo projeto.
 */

/** Quanto tempo o navegador espera o servidor antes de desistir de um envio. */
export const TEMPO_LIMITE_ENVIO_MS = 15_000;

/** Quantas vezes o envio é tentado ao todo (a primeira tentativa conta). */
export const MAXIMO_TENTATIVAS_ENVIO = 4;

/** Espera antes da segunda tentativa; dobra a cada nova (1 s → 2 s → 4 s). */
export const ESPERA_INICIAL_ENTRE_TENTATIVAS_MS = 1_000;

/** Linhas por página na lista de respostas do painel. */
export const RESPOSTAS_POR_PAGINA = 20;

/** Janela padrão dos indicadores do painel. */
export const DIAS_PERIODO_PADRAO = 7;

/** Quantas respostas recentes a visão geral mostra sem precisar de paginação. */
export const RESPOSTAS_RECENTES_NA_VISAO_GERAL = 5;

/** Fuso de toda data exibida e de todo agrupamento por dia. */
export const FUSO_HORARIO = "America/Sao_Paulo";
