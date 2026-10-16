/**
 * O que é um contato: a pessoa que deixou o WhatsApp num formulário.
 *
 * Dado pessoal vive só aqui e em `consentimentos_contato`; `respostas.valores`
 * nunca o recebe. A lista do painel mostra o contato mascarado — o valor
 * completo só sai de `revelarContato`, que audita.
 */
import type { OrigemDaResposta } from "@/dominio/respostas/tipos";
import {
  FINALIDADES_DE_CONSENTIMENTO,
  type FinalidadeDeConsentimento,
} from "@/lib/texts/consentimento";

/** As finalidades aceitas — a definição única mora em `src/lib/texts/consentimento.ts`. */
export const FINALIDADES = FINALIDADES_DE_CONSENTIMENTO;
export type Finalidade = FinalidadeDeConsentimento;

/** O contato pronto para ser gravado junto com a resposta, na mesma transação. */
export type ContatoParaGravar = {
  nome: string | null;
  /** E.164. */
  telefone: string;
  /** Versão do texto de consentimento exibido; nula quando nenhuma finalidade foi exibida. */
  versaoDoConsentimento: string | null;
  /** Uma linha por finalidade exibida, aceita ou não. */
  consentimentos: { finalidade: Finalidade; concedido: boolean }[];
  cupom: { codigo: string; brinde: string | null; expiraEm: Date } | null;
  codigoIndicacao: string | null;
  /** Id do contato que indicou, já resolvido pelo serviço. */
  indicadoPor: string | null;
};

export type ContatoGravado = {
  id: string;
  cupom: string | null;
  cupomExpiraEm: Date | null;
  codigoIndicacao: string | null;
};

export const ORDENS_DE_CONTATOS = ["recentes", "indicacoes"] as const;
export type OrdemDeContatos = (typeof ORDENS_DE_CONTATOS)[number];

export type FiltrosDeContatos = {
  formularioId?: string;
  origem?: OrigemDaResposta;
  somenteQueAceitam?: boolean;
  ordem: OrdemDeContatos;
  pagina: number;
};

/**
 * Situação do cupom de um contato na lista:
 * - `emitido`: este cadastro recebeu o cupom;
 * - `ja_tinha`: este cadastro não recebeu porque o mesmo número já tinha cupom
 *   neste formulário, emitido em outro cadastro (não é falha);
 * - `nenhum`: este cadastro não tem cupom. Se o formulário tem o módulo de
 *   cupom ligado, foi uma falha na emissão.
 */
export type SituacaoDoCupom = "emitido" | "ja_tinha" | "nenhum";

/** Uma linha da lista do painel, já mascarada (feito em `src/servicos/contatos.ts`). */
export type LinhaDeContato = {
  id: string;
  nomeOculto: string | null;
  telefoneOculto: string;
  formularioNome: string;
  origem: OrigemDaResposta;
  criadoEm: Date;
  aceitaMensagens: boolean;
  cupom: { emitido: boolean; situacao: SituacaoDoCupom; validoAte: string | null; expirado: boolean };
  indicacoes: number;
};

/** O que `revelarContato` devolve. O código do cupom só aparece aqui. */
export type ContatoRevelado = {
  nome: string | null;
  /** Formatado, como `(35) 99999-8832`. */
  telefone: string;
  /** Só para quem aceitou mensagens. */
  linkWhatsapp: string | null;
  cupom: { codigo: string; validoAte: string; expirado: boolean } | null;
  /** Só com cupom emitido e ainda válido. */
  linkEnvioDoCupom: string | null;
};

/** A linha como o repositório devolve: completa, sem máscara. */
export type LinhaCrua = {
  id: string;
  nome: string | null;
  telefone: string;
  formularioId: string;
  formularioNome: string;
  origem: OrigemDaResposta;
  criadoEm: Date;
  /** Calculado por telefone: vale o consentimento do cadastro mais recente do número. */
  aceitaMensagens: boolean;
  cupomEmitido: boolean;
  /** Outro cadastro do mesmo número, neste mesmo formulário, emitiu cupom. */
  cupomEmitidoEmOutroCadastro: boolean;
  cupomExpiraEm: Date | null;
  /** Telefones distintos indicados por esta pessoa. */
  indicacoes: number;
};

export type ContatoCompleto = {
  id: string;
  nome: string | null;
  telefone: string;
  formularioId: string;
  aceitaMensagens: boolean;
  cupom: { codigo: string; brinde: string | null; expiraEm: Date } | null;
};

/** Uma linha da exportação: um registro por telefone, o cadastro mais recente. */
export type LinhaCsv = {
  nome: string | null;
  telefone: string;
  formularioNome: string;
  origem: OrigemDaResposta;
  criadoEm: Date;
  aceitaRecompra: boolean;
  aceitaOfertas: boolean;
  indicacoes: number;
};

export type ResumoDeContatos = {
  contatos: number;
  aceitamMensagens: number;
  cuponsEmitidos: number;
  indicacoes: number;
};
