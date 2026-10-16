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

/** Por quanto tempo o hash do IP de um envio fica gravado; depois disso é zerado. */
export const RETENCAO_DO_IP_HASH_MS = 2 * 60 * 60_000;

/** De quanto em quanto tempo (no mínimo, por instância) a limpeza do hash do IP roda. */
export const INTERVALO_DA_LIMPEZA_DO_IP_HASH_MS = 10 * 60_000;

/** Linhas por página na lista de respostas do painel. */
export const RESPOSTAS_POR_PAGINA = 20;

/** Janela padrão dos indicadores do painel. */
export const DIAS_PERIODO_PADRAO = 7;

/** Quantas respostas recentes a visão geral mostra sem precisar de paginação. */
export const RESPOSTAS_RECENTES_NA_VISAO_GERAL = 5;

/** Fuso de toda data exibida e de todo agrupamento por dia. */
export const FUSO_HORARIO = "America/Sao_Paulo";

/** Por quantos dias vale um cupom, contados do cadastro. */
export const VALIDADE_DO_CUPOM_DIAS = 30;

/** Linhas por página na lista de contatos do painel. */
export const CONTATOS_POR_PAGINA = 25;

/** Maior texto do brinde que a loja pode cadastrar. */
export const MAIOR_TEXTO_DO_BRINDE = 120;
