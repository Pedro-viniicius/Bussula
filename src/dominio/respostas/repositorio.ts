/**
 * O contrato de guardar respostas.
 *
 * Tudo que o painel mostra sai daqui: não existe número de dashboard gravado
 * no banco, só resposta crua e contas feitas na hora.
 */
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import type { Resposta, RespostaParaGravar } from "./tipos";

/** Quanto cada formulário recebeu, para a lista de formulários. */
export type TotalDoFormulario = { total: number; ultimaEm: Date | null };

export type RepositorioDeRespostas = {
  /**
   * Grava uma resposta. Se a mesma `chaveEnvio` já existir, devolve a resposta
   * original com `duplicada: true` — é o que faz uma retentativa de rede ser
   * inofensiva.
   */
  gravar(resposta: RespostaParaGravar): Promise<{ resposta: Resposta; duplicada: boolean }>;

  /** Página da lista de respostas, da mais recente para a mais antiga. */
  listar(filtros: { formularioId?: string; pagina: number; porPagina: number }): Promise<{
    itens: Resposta[];
    total: number;
    paginas: number;
  }>;

  /** As últimas respostas, sem paginação, para a visão geral. */
  recentes(limite: number): Promise<Resposta[]>;

  /** Todas as respostas de um formulário, para calcular as distribuições. */
  doFormulario(formularioId: string): Promise<Resposta[]>;

  contarTudo(): Promise<number>;

  contarDesde(data: Date): Promise<number>;

  /** Quando chegou a última resposta. Nulo enquanto não houver nenhuma. */
  ultimaEm(): Promise<Date | null>;

  /** Respostas por dia, do dia indicado até hoje. */
  porDia(desde: Date): Promise<PontoDaSerie[]>;

  /** Total e última resposta de cada formulário, indexado pelo id. */
  totaisPorFormulario(): Promise<Map<string, TotalDoFormulario>>;
};
