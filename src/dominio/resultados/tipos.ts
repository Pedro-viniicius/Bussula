/**
 * O que a tela de resultados mostra sobre um formulário.
 *
 * Tudo aqui é calculado a partir das respostas cruas no momento da consulta
 * (ver `metricas.ts`). Nada é gravado, então não existe número que possa
 * discordar do que os clientes responderam. É também o único material que a
 * análise (`src/dominio/analise`) recebe: ela só interpreta o que está aqui.
 */
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import type { TipoDePergunta } from "@/dominio/formularios/perguntas";
import type { OrigemDaResposta } from "@/dominio/respostas/tipos";

/** "Quanto este formulário coletou, e quando?" */
export type ResumoDoFormulario = {
  totalDeRespostas: number;
  respostasHoje: number;
  /** Nos últimos `diasDoPeriodo` dias, contando hoje. */
  respostasNoPeriodo: number;
  /** Nos `diasDoPeriodo` dias imediatamente anteriores, para comparar. */
  respostasNoPeriodoAnterior: number;
  /** Nulo enquanto ninguém respondeu. */
  ultimaRespostaEm: Date | null;
  /** Dias de calendário desde a última resposta: 0 é hoje, 1 é ontem. Nulo enquanto ninguém respondeu. */
  diasSemResposta: number | null;
};

/** Quantas vezes uma opção foi escolhida. */
export type OpcaoContada = { rotulo: string; total: number };

/**
 * Como as pessoas responderam a uma pergunta. `opcoes` vale para escolha,
 * sim/não e escala; `media` só existe onde somar faz sentido.
 */
export type DistribuicaoDaPergunta = {
  perguntaId: string;
  enunciado: string;
  tipo: TipoDePergunta;
  totalDeRespostas: number;
  opcoes: OpcaoContada[];
  media: number | null;
  /** Últimas respostas em texto, quando a pergunta é aberta. */
  textos: string[];
};

/** Por onde as respostas chegaram: cartão NFC, QR Code ou link direto. */
export type OrigemContada = { origem: OrigemDaResposta; rotulo: string; total: number };

export type ResultadosDoFormulario = {
  /** Tamanho da janela de "últimos dias" usada no resumo e na série. */
  diasDoPeriodo: number;
  resumo: ResumoDoFormulario;
  /** Respostas por dia na janela, com os dias vazios preenchidos com zero. */
  serie: PontoDaSerie[];
  /** Da origem mais usada para a menos usada, incluindo as que ficaram em zero. */
  origens: OrigemContada[];
  /** Uma distribuição por pergunta da versão atual, na ordem do formulário. */
  distribuicoes: DistribuicaoDaPergunta[];
};
