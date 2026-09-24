/**
 * "A coleta subiu ou caiu?" — a comparação entre dois períodos iguais.
 *
 * Usada na visão geral e nos resultados de cada formulário, com a mesma regra
 * nos dois lugares: uma diferença pequena é tratada como "parecido", para uma
 * oscilação normal de um dia para o outro não virar manchete.
 */
import { fracaoDe } from "@/utilitarios/numeros";

/** Abaixo desta diferença (para mais ou para menos), os dois períodos contam como parecidos. */
const DIFERENCA_CONSIDERADA_ESTAVEL = 0.1;

export type Variacao =
  /** O período anterior não teve resposta: não existe base para uma porcentagem. */
  | { tipo: "sem-base" }
  | { tipo: "estavel"; fracao: number }
  | { tipo: "alta"; fracao: number }
  | { tipo: "queda"; fracao: number };

/** Compara `atual` com `anterior`. A fração é sempre positiva; o tipo diz a direção. */
export function calcularVariacao(atual: number, anterior: number): Variacao {
  if (anterior === 0) return { tipo: "sem-base" };

  const diferenca = atual - anterior;
  const fracao = fracaoDe(Math.abs(diferenca), anterior);

  if (fracao < DIFERENCA_CONSIDERADA_ESTAVEL) return { tipo: "estavel", fracao };
  if (diferenca > 0) return { tipo: "alta", fracao };
  return { tipo: "queda", fracao };
}

/** Uma mudança só é dita quando passa desta fração do período anterior. */
const MUDANCA_MINIMA_QUE_MERECE_ATENCAO = 0.25;

/**
 * Quantas "oscilações normais" a diferença precisa ter. O número de respostas
 * de um período varia sozinho, mesmo sem nada mudar na loja; essa variação
 * natural fica perto da raiz quadrada do total de respostas dos dois períodos.
 */
const OSCILACOES_NORMAIS_PARA_SER_MUDANCA = 2;

/**
 * Verdadeiro quando a diferença entre os dois períodos é grande demais para
 * ser só a oscilação natural — e grande o bastante para importar. É o que
 * separa "caiu de 24 para 21" (ruído) de "caiu de 20 para 5" (algo mudou).
 */
export function mudancaMereceAtencao(atual: number, anterior: number): boolean {
  if (anterior === 0) return false;

  const diferenca = Math.abs(atual - anterior);
  const oscilacaoNatural = Math.sqrt(atual + anterior);
  const grandeParaImportar = fracaoDe(diferenca, anterior) >= MUDANCA_MINIMA_QUE_MERECE_ATENCAO;
  const grandeParaNaoSerAcaso = diferenca >= OSCILACOES_NORMAIS_PARA_SER_MUDANCA * oscilacaoNatural;
  return grandeParaImportar && grandeParaNaoSerAcaso;
}
