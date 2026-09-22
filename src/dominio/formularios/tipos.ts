/**
 * O que é um formulário para o resto do sistema.
 *
 * Note que o formulário e as suas perguntas são coisas separadas: as perguntas
 * pertencem a uma *versão*. Editar um formulário publicado cria uma versão
 * nova, e as respostas antigas continuam apontando para a versão em que foram
 * dadas — é o que mantém uma resposta de março legível depois de a pergunta
 * mudar em junho.
 */
import type { Pergunta } from "./perguntas";
import type { SituacaoDoFormulario } from "./status";

export type Formulario = {
  id: string;
  /** Vai na URL pública `/f/<slug>`; é o que se grava no cartão NFC ou no QR. */
  slug: string;
  nome: string;
  descricao: string | null;
  situacao: SituacaoDoFormulario;
  /** Versão que está no ar. Sobe a cada publicação com perguntas diferentes. */
  versaoAtual: number;
  criadoEm: Date;
  atualizadoEm: Date;
};

/** O formulário junto com as perguntas de uma versão. */
export type FormularioComPerguntas = Formulario & { perguntas: Pergunta[] };

/**
 * O recorte que chega ao navegador de quem responde. Não carrega situação,
 * datas internas nem contagem de respostas: a tela pública não precisa e o
 * que não é enviado não vaza.
 */
export type FormularioPublico = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  versao: number;
  perguntas: Pergunta[];
};

/** Linha da lista de formulários do painel: o formulário mais o que ele produziu. */
export type FormularioNaLista = Formulario & {
  totalDeRespostas: number;
  ultimaRespostaEm: Date | null;
};

/** Os dados que criam ou atualizam um formulário. */
export type DadosDoFormulario = {
  nome: string;
  descricao: string | null;
  perguntas: Pergunta[];
};
