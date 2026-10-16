/**
 * O contrato de guardar formulários.
 *
 * Os serviços conhecem só estas operações — não sabem se por trás existe um
 * Postgres, uma lista em memória ou outra coisa. É o que permite rodar o
 * projeto sem banco nenhum e testar as regras sem subir infraestrutura.
 */
import type { ModulosDoFormulario } from "./modulos";
import type { Pergunta } from "./perguntas";
import type { SituacaoDoFormulario } from "./status";
import type { ConfiguracaoDaLoja, DadosDoFormulario, Formulario, FormularioComPerguntas } from "./tipos";

export type RepositorioDeFormularios = {
  /** Todos os formulários, do mais recente para o mais antigo. */
  listar(): Promise<Formulario[]>;

  /** Um formulário com as perguntas da versão que está no ar. */
  buscarPorId(id: string): Promise<FormularioComPerguntas | null>;

  /** Usado pela tela pública; não traz as perguntas. */
  buscarPorSlug(slug: string): Promise<Formulario | null>;

  /** As perguntas exatas de uma versão — inclusive de versões antigas. */
  perguntasDaVersao(formularioId: string, versao: number): Promise<Pergunta[] | null>;

  /** Os módulos exatos de uma versão. Nulo quando a versão não existe. */
  modulosDaVersao(formularioId: string, versao: number): Promise<ModulosDoFormulario | null>;

  /** Falso quando outro formulário já usa este endereço. */
  slugEstaLivre(slug: string): Promise<boolean>;

  /** Cria já na versão 1, como rascunho. Sem `modulos`, todos desligados. */
  criar(entrada: { slug: string } & DadosDoFormulario): Promise<Formulario>;

  /**
   * Grava as perguntas numa versão nova e atualiza nome e descrição. Sem
   * `modulos` em `dados`, a versão nova herda os da versão que estava no ar.
   * Nulo quando o formulário não existe.
   */
  salvarNovaVersao(id: string, dados: DadosDoFormulario): Promise<Formulario | null>;

  /**
   * Grava a configuração da loja. Não cria versão e não confere regra nenhuma:
   * as travas ficam em `validarConfiguracaoDaLoja`, no serviço.
   * Nulo quando o formulário não existe.
   */
  salvarConfiguracaoDaLoja(id: string, configuracao: ConfiguracaoDaLoja): Promise<Formulario | null>;

  /** Nulo quando o formulário não existe. */
  mudarSituacao(id: string, situacao: SituacaoDoFormulario): Promise<Formulario | null>;
};
