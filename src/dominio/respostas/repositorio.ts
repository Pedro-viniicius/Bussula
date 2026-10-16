/**
 * O contrato de guardar respostas.
 *
 * Tudo que o painel mostra sai daqui: não existe número de dashboard gravado
 * no banco, só resposta crua e contas feitas na hora.
 */
import type { ContatoGravado, ContatoParaGravar } from "@/dominio/contatos/tipos";
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import type { Resposta, RespostaParaGravar } from "./tipos";

/** Quanto cada formulário recebeu, para a lista de formulários. */
export type TotalDoFormulario = { total: number; ultimaEm: Date | null };

/** Quantos envios um IP (já em hash) fez numa janela, e quando foi o mais antigo dela. */
export type ContagemPorIp = { total: number; maisAntigaEm: Date | null };

export type RepositorioDeRespostas = {
  /**
   * Grava a resposta e, se houver, o contato com os consentimentos — tudo numa
   * transação: ou grava tudo ou nada. Se a mesma `chaveEnvio` já existir,
   * devolve a resposta original e o contato original com `duplicada: true`,
   * sem gravar nada de novo — é o que faz uma retentativa de rede ser inofensiva.
   *
   * Lança `ConflitoDeContato` (e não grava nada) quando o cupom ou o código de
   * indicação já existem, ou quando o telefone já tem cupom neste formulário.
   */
  gravar(
    resposta: RespostaParaGravar & {
      /** Nulo quando não há sal configurado (só em desenvolvimento) ou IP no cabeçalho. */
      ipHash: string | null;
      contato: ContatoParaGravar | null;
    },
  ): Promise<{ resposta: Resposta; duplicada: boolean; contato: ContatoGravado | null }>;

  /**
   * A resposta (e o contato) de uma chave de envio, ou nulo se ela não existe.
   * `telefoneDoContato` é o do cadastro ORIGINAL, nunca o de um reenvio: é com
   * ele que se decide o que contar a quem repete a chave.
   */
  buscarPorChave(chaveEnvio: string): Promise<{
    resposta: Resposta;
    contato: ContatoGravado | null;
    telefoneDoContato: string | null;
  } | null>;

  /** Envios feitos por um IP desde `desde`, para o limite anti-abuso. */
  contarPorIp(ipHash: string, desde: Date): Promise<ContagemPorIp>;

  /**
   * Zera o hash do IP das respostas criadas antes de `antesDe` (a resposta fica;
   * só o hash sai). Devolve quantas linhas mudaram.
   */
  limparIpsAntigos(antesDe: Date): Promise<number>;

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
