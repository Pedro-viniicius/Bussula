/**
 * O que é um formulário para o resto do sistema.
 *
 * Note que o formulário e as suas perguntas são coisas separadas: as perguntas
 * pertencem a uma *versão*. Editar um formulário publicado cria uma versão
 * nova, e as respostas antigas continuam apontando para a versão em que foram
 * dadas — é o que mantém uma resposta de março legível depois de a pergunta
 * mudar em junho.
 */
import type { Finalidade } from "@/dominio/contatos/tipos";
import type { ModulosDoFormulario } from "./modulos";
import type { Pergunta } from "./perguntas";
import type { SituacaoDoFormulario } from "./status";

/**
 * O que a loja ajusta sem criar versão: não muda o sentido das respostas, só a
 * operação. Cada alteração é auditada (antes e depois), sem dado pessoal.
 */
export type ConfiguracaoDaLoja = {
  /** 1 a 120 caracteres; obrigatório para salvar quando o cupom está ligado. */
  textoDoBrinde: string | null;
  nomeObrigatorio: boolean;
  /** Padrão verdadeiro. Falso: quem pula fica sem cupom e sem link de indicação. */
  whatsappObrigatorio: boolean;
  /** Formulário que recebe quem veio por indicação; nulo = o próprio formulário. */
  formularioDeIndicacaoId: string | null;
};

export const CONFIGURACAO_DA_LOJA_PADRAO: Readonly<ConfiguracaoDaLoja> = Object.freeze({
  textoDoBrinde: null,
  nomeObrigatorio: false,
  whatsappObrigatorio: true,
  formularioDeIndicacaoId: null,
});

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
  configuracaoDaLoja: ConfiguracaoDaLoja;
};

/** O formulário junto com as perguntas e os módulos da versão que está no ar. */
export type FormularioComPerguntas = Formulario & { perguntas: Pergunta[]; modulos: ModulosDoFormulario };

/** O que cada módulo liga, sem os detalhes internos (prefixo do cupom, texto do brinde). */
export type ModulosPublicos = {
  recompra: boolean;
  ofertas: boolean;
  cupom: boolean;
  indicacao: boolean;
};

export type ConsentimentoPublico = {
  versao: string;
  finalidades: { id: Finalidade; rotulo: string }[];
};

/** O resumo da etapa de consentimento: quem cuida dos dados e como falar com essa pessoa. */
export type ControladorPublico = {
  razaoSocial: string;
  cnpj: string;
  emailPrivacidade: string;
};

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
  /** Com a obrigatoriedade efetiva de WhatsApp e nome, vinda da configuração da loja. */
  perguntas: Pergunta[];
  modulos: ModulosPublicos;
  /** Nulo quando o formulário não pede WhatsApp ou nenhuma finalidade está ligada. */
  consentimento: ConsentimentoPublico | null;
  /** Nulo quando o formulário não pede dado pessoal. */
  controlador: ControladorPublico | null;
  pedeDadosPessoais: boolean;
};

/** Linha da lista de formulários do painel: o formulário mais o que ele produziu. */
export type FormularioNaLista = Formulario & {
  totalDeRespostas: number;
  ultimaRespostaEm: Date | null;
  modulos: ModulosDoFormulario;
  pedeDadosPessoais: boolean;
  /** Pede dado pessoal e a trava do controlador está valendo: o link público não abre. */
  travado: boolean;
};

/** Os dados que criam ou atualizam um formulário. */
export type DadosDoFormulario = {
  nome: string;
  descricao: string | null;
  perguntas: Pergunta[];
  /** Opcional: chamadas que não conhecem módulos continuam valendo. */
  modulos?: ModulosDoFormulario;
};
