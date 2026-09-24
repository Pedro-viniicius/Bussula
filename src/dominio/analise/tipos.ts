/**
 * O contrato da análise dos resultados.
 *
 * A análise transforma os números de um formulário em entendimento para quem
 * administra. Ela nunca inventa: cada coisa que diz aponta para uma
 * `Evidencia`, e cada evidência é um número tirado direto das respostas.
 *
 * O que ela diz vem sempre separado por natureza, porque misturar as quatro
 * coisas é o jeito mais rápido de transformar palpite em certeza:
 *
 *   fato observado → interpretação → hipótese → possível ação
 *
 * Quem analisa pode ser um conjunto de regras fixas ou um modelo de
 * linguagem. As telas não sabem qual está em uso: falam só com este contrato.
 */
import type { Pergunta } from "@/dominio/formularios/perguntas";
import type { Resposta } from "@/dominio/respostas/tipos";
import type { ResultadosDoFormulario } from "@/dominio/resultados/tipos";

/** Tudo que a análise recebe. Nada além disto pode aparecer no que ela diz. */
export type EntradaDaAnalise = {
  formulario: {
    id: string;
    nome: string;
    /** O objetivo do formulário, quando foi escrito. */
    objetivo: string | null;
    versao: number;
  };
  /** As perguntas da versão atual, na ordem do formulário. */
  perguntas: Pergunta[];
  /** Os números já calculados — os mesmos que a tela mostra na parte de dados. */
  resultados: ResultadosDoFormulario;
  /** As respostas cruas, usadas só para cruzar uma pergunta com outra. Nunca saem do servidor. */
  respostas: Resposta[];
};

/** Um dado concreto, tirado direto das respostas, que sustenta o que a análise diz. */
export type Evidencia = {
  /** Estável entre execuções: é por ele que achados e ações apontam para esta evidência. */
  id: string;
  /** Sempre com o número cru ao lado da porcentagem: "64% (45 de 70) deram nota 4 ou 5." */
  texto: string;
  /** De onde o número veio: o enunciado da pergunta, ou "Coleta" para os números gerais. */
  fonte: string;
};

export const NATUREZAS_DO_ACHADO = ["fato", "interpretacao", "hipotese"] as const;
export type NaturezaDoAchado = (typeof NATUREZAS_DO_ACHADO)[number];

/**
 * Uma coisa que a análise diz.
 *
 * - fato: o que as respostas mostram, sem leitura nenhuma.
 * - interpretação: o que o fato pode indicar.
 * - hipótese: uma explicação possível, que ainda precisa ser investigada.
 */
export type Achado = {
  natureza: NaturezaDoAchado;
  texto: string;
  /** Ids das evidências que sustentam o achado. Nunca vazio. */
  evidencias: string[];
};

/** Algo que a equipe pode fazer, escrito como sugestão e nunca como ordem. */
export type PossivelAcao = {
  texto: string;
  /** Ids das evidências que motivam a ação. Nunca vazio. */
  evidencias: string[];
};

export type AnaliseDosResultados =
  /** Poucas respostas para dizer qualquer coisa além dos próprios números. */
  | { situacao: "dados-insuficientes"; totalDeRespostas: number; minimoDeRespostas: number }
  | {
      situacao: "pronta";
      evidencias: Evidencia[];
      achados: Achado[];
      acoes: PossivelAcao[];
      /** O que os dados atuais não permitem concluir. Dito às claras, sem esconder. */
      limites: string[];
    };

/** Quem analisa. Trocar a implementação não muda nada nas telas. */
export type AnalistaDeResultados = {
  analisar(entrada: EntradaDaAnalise): Promise<AnaliseDosResultados>;
};
