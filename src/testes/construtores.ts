/**
 * Peças para montar cenários de teste sem repetir objetos inteiros.
 *
 * Cada função preenche o que o teste não quer discutir e deixa o teste dizer
 * só o que importa para ele — "uma avaliação obrigatória", "uma resposta de
 * ontem pelo QR Code".
 */
import type { Pergunta, ValorDaResposta } from "../dominio/formularios/perguntas";
import type { OrigemDaResposta, Resposta } from "../dominio/respostas/tipos";

export function pergunta(parcial: Partial<Pergunta> & Pick<Pergunta, "id" | "tipo">): Pergunta {
  return {
    enunciado: `Pergunta ${parcial.id}`,
    ajuda: null,
    obrigatoria: false,
    opcoes: [],
    escala: null,
    ...parcial,
  };
}

let contadorDeRespostas = 0;

export function resposta(
  valores: Record<string, ValorDaResposta>,
  criadoEm: Date,
  origem: OrigemDaResposta = "nfc",
): Resposta {
  contadorDeRespostas += 1;
  return {
    id: `resposta-de-teste-${contadorDeRespostas}`,
    formularioId: "formulario-de-teste",
    versaoFormulario: 1,
    valores,
    origem,
    criadoEm,
  };
}

/** Várias respostas iguais, uma para cada item da lista, todas no mesmo instante. */
export function respostasComValores(
  listaDeValores: Record<string, ValorDaResposta>[],
  criadoEm: Date,
  origem: OrigemDaResposta = "nfc",
): Resposta[] {
  return listaDeValores.map((valores) => resposta(valores, criadoEm, origem));
}

/** Repete o mesmo valor `vezes` vezes — "18 pessoas deram nota 5". */
export function repetir<T>(valor: T, vezes: number): T[] {
  return Array.from({ length: vezes }, () => valor);
}

export const UM_DIA_MS = 24 * 60 * 60 * 1000;
