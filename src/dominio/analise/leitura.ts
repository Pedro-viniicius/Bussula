/**
 * A peça com que as regras da análise são montadas.
 *
 * Cada regra olha para um único assunto — uma pergunta, o ritmo da coleta, os
 * canais — e devolve uma `Leitura`: as evidências que calculou e o que elas
 * permitem dizer. O analista junta as leituras no fim. Assim cada regra pode
 * ser lida, testada e trocada sem mexer nas outras.
 */
import type { Achado, Evidencia, PossivelAcao } from "./tipos";

export type Leitura = {
  evidencias: Evidencia[];
  achados: Achado[];
  acoes: PossivelAcao[];
  limites: string[];
};

export function leituraVazia(): Leitura {
  return { evidencias: [], achados: [], acoes: [], limites: [] };
}

/** Uma leitura que só registra um limite: "sobre isto, ainda não dá para dizer nada". */
export function apenasLimite(limite: string): Leitura {
  return { ...leituraVazia(), limites: [limite] };
}

/** Junta várias leituras em uma, preservando a ordem em que chegaram. */
export function juntarLeituras(leituras: Leitura[]): Leitura {
  const juntas = leituraVazia();
  for (const leitura of leituras) {
    juntas.evidencias.push(...leitura.evidencias);
    juntas.achados.push(...leitura.achados);
    juntas.acoes.push(...leitura.acoes);
    juntas.limites.push(...leitura.limites);
  }
  return juntas;
}

/**
 * Descreve um conjunto de valores como se fala: [4, 5] → "4 ou 5",
 * [8, 9, 10] → "de 8 a 10", [5] → "5".
 */
export function descreverFaixa(valores: number[]): string {
  if (valores.length === 1) return String(valores[0]);
  if (valores.length === 2) return `${valores[0]} ou ${valores[1]}`;
  return `de ${valores[0]} a ${valores[valores.length - 1]}`;
}

/** Tira repetições de uma lista de textos, mantendo a primeira ocorrência. */
export function semRepeticao(textos: string[]): string[] {
  return [...new Set(textos)];
}
