/**
 * A trava contra conclusão sem base.
 *
 * Todo achado e toda ação precisam apontar para evidências que existem de
 * verdade. E todo número escrito no texto precisa aparecer em alguma dessas
 * evidências: é o que impede uma frase de trazer "80%" quando os dados dizem
 * 62%. O que não passa aqui é descartado — nunca corrigido, nunca completado.
 *
 * As regras fixas passam por esta trava sem esforço, porque escrevem só o que
 * calcularam. Ela existe sobretudo para o texto vindo de um modelo de
 * linguagem, que pode soar convincente sem ter base nenhuma.
 */
import type { Evidencia } from "./tipos";

type ItemComEvidencias = { texto: string; evidencias: string[] };

/**
 * Os números escritos num texto, como sequências de dígitos.
 * "média 4,2 e 64%" → ["4", "2", "64"]. Assim "4,2" e "4.2" contam igual.
 */
function numerosEscritos(texto: string): string[] {
  return texto.match(/\d+/g) ?? [];
}

/**
 * Palavras que transformam hipótese em certeza. A análise fala de
 * possibilidades; um texto com estas palavras é descartado.
 */
const LINGUAGEM_DE_CERTEZA = /\b(certamente|com certeza|definitivamente|sem dúvida|com toda certeza|comprovadamente)\b/i;

function usaLinguagemDeCerteza(texto: string): boolean {
  return LINGUAGEM_DE_CERTEZA.test(texto);
}

/**
 * Verdadeiro quando o item cita só evidências conhecidas, não traz número que
 * elas não tenham e não fala como se tivesse certeza.
 */
export function estaSustentado(item: ItemComEvidencias, evidenciasPorId: Map<string, Evidencia>): boolean {
  if (item.evidencias.length === 0) return false;
  if (usaLinguagemDeCerteza(item.texto)) return false;

  const numerosDasEvidencias = new Set<string>();
  for (const id of item.evidencias) {
    const evidencia = evidenciasPorId.get(id);
    if (!evidencia) return false;
    for (const numero of numerosEscritos(evidencia.texto)) numerosDasEvidencias.add(numero);
    for (const numero of numerosEscritos(evidencia.fonte)) numerosDasEvidencias.add(numero);
  }

  const numerosDoTexto = numerosEscritos(item.texto);
  return numerosDoTexto.every((numero) => numerosDasEvidencias.has(numero));
}

/** Fica só com o que está sustentado pelas evidências, na ordem original. */
export function manterSoOSustentado<T extends ItemComEvidencias>(itens: T[], evidencias: Evidencia[]): T[] {
  const evidenciasPorId = new Map(evidencias.map((evidencia) => [evidencia.id, evidencia]));
  return itens.filter((item) => estaSustentado(item, evidenciasPorId));
}
