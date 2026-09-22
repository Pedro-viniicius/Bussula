/**
 * As perguntas que a visão geral responde.
 *
 * Cada campo aqui existe porque alguém do time precisa da resposta para decidir
 * alguma coisa. Nada é guardado no banco: tudo é calculado a partir das
 * respostas cruas, então não há número que possa ficar defasado.
 */
import type { TipoDePergunta } from "@/dominio/formularios/perguntas";

/** "Como está a coleta?" — o cabeçalho da visão geral. */
export type ResumoDaColeta = {
  /** Quantas respostas foram recebidas ao todo? */
  totalDeRespostas: number;
  /** Quantas chegaram hoje? */
  respostasHoje: number;
  /** E nos últimos dias da janela padrão? */
  respostasNoPeriodo: number;
  /** Quantos formulários estão ativos? */
  formulariosAtivos: number;
  /** Quando foi a última resposta? Nulo enquanto ninguém respondeu. */
  ultimaRespostaEm: Date | null;
  /** Qual formulário está recebendo respostas? */
  formularioMaisRespondido: { id: string; nome: string; total: number } | null;
};

/** Um dia da série "respostas por dia". */
export type PontoDaSerie = { dia: Date; total: number };

/**
 * Como as pessoas responderam a uma pergunta. `opcoes` vale para escolha,
 * sim/não e escala; `media` só existe onde somar faz sentido.
 */
export type DistribuicaoDaPergunta = {
  perguntaId: string;
  enunciado: string;
  tipo: TipoDePergunta;
  totalDeRespostas: number;
  opcoes: { rotulo: string; total: number }[];
  media: number | null;
  /** Últimas respostas em texto, quando a pergunta é aberta. */
  textos: string[];
};

/** Algo que merece atenção agora — só aparece quando os dados sustentam. */
export type SinalRelevante = {
  chave: string;
  titulo: string;
  texto: string;
  tom: "neutro" | "atencao";
  /** Para onde ir para agir sobre o sinal. */
  href?: string;
  acao?: string;
};
