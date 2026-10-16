/**
 * O contrato de ler contatos.
 *
 * Gravar contato não está aqui: nasce na mesma transação da resposta
 * (`RepositorioDeRespostas.gravar`), para nunca existir um sem o outro.
 *
 * "Aceita mensagens" é calculado por telefone e por finalidade (recompra,
 * ofertas): vale a última resposta explícita entre todos os cadastros daquele
 * número. Cadastro que não exibiu a finalidade não altera o estado dela; uma
 * caixa exibida e não marcada é recusa e revoga um "sim" anterior. Quem nunca
 * respondeu a nenhuma finalidade não aceita.
 */
import type { ContatoCompleto, FiltrosDeContatos, LinhaCrua, LinhaCsv, ResumoDeContatos } from "./tipos";

/**
 * A gravação bateu numa regra de unicidade. O banco decide, porque só ele
 * enxerga duas requisições simultâneas:
 * - `codigo`: o cupom ou o código de indicação sorteado já existe (sortear outro);
 * - `cupom_do_telefone`: o telefone já tem cupom neste formulário.
 */
export class ConflitoDeContato extends Error {
  constructor(readonly tipo: "codigo" | "cupom_do_telefone") {
    super(`conflito ao gravar contato: ${tipo}`);
    this.name = "ConflitoDeContato";
  }
}

export type RepositorioDeContatos = {
  /** Página da lista, ainda sem máscara (quem mascara é o serviço). */
  listar(
    filtros: FiltrosDeContatos,
    porPagina: number,
  ): Promise<{ itens: LinhaCrua[]; total: number; paginas: number }>;

  /** Totais do painel, sem filtro. */
  resumo(): Promise<ResumoDeContatos>;

  buscarCompleto(id: string): Promise<ContatoCompleto | null>;

  /** Um registro por telefone (o mais recente), só de quem aceita mensagens. */
  paraExportacao(filtros: Omit<FiltrosDeContatos, "pagina" | "ordem" | "somenteQueAceitam">): Promise<LinhaCsv[]>;

  /** O contato dono do código de indicação, ou nulo. */
  porCodigoDeIndicacao(codigo: string): Promise<{ id: string; telefone: string } | null>;

  /** Verdadeiro se o telefone já recebeu cupom neste formulário (mesmo vencido). */
  jaRecebeuCupom(formularioId: string, telefone: string): Promise<boolean>;
};
