/**
 * Regras de um formulário bem feito.
 *
 * A mesma função roda no navegador (para avisar enquanto a pessoa escreve) e
 * no servidor (porque o que vem do navegador nunca é confiável). Uma função
 * comum, e não um esquema de biblioteca, porque as regras dependem do tipo de
 * cada pergunta — e porque qualquer pessoa do time consegue ler isto aqui.
 */
import { MAIOR_TEXTO_DO_BRINDE } from "@/dominio/constantes";
import { prefixoDeCupomValido } from "@/dominio/contatos/codigos";
import type { ModulosDoFormulario } from "@/dominio/formularios/modulos";
import { DESCRICAO_DO_TIPO, type Pergunta } from "@/dominio/formularios/perguntas";
import type { SituacaoDoFormulario } from "@/dominio/formularios/status";
import type { ConfiguracaoDaLoja, DadosDoFormulario } from "@/dominio/formularios/tipos";

export const MAIOR_NOME = 120;
export const MAIOR_DESCRICAO = 300;
export const MAIOR_ENUNCIADO = 200;
export const MINIMO_DE_OPCOES = 2;
export const MAXIMO_DE_OPCOES = 12;
export const MAXIMO_DE_PERGUNTAS = 30;

export type ErrosDoFormulario = {
  nome?: string;
  descricao?: string;
  /** Erro geral das perguntas (nenhuma pergunta, perguntas demais). */
  perguntas?: string;
  /** Erro de uma pergunta específica, indexado pelo id dela. */
  porPergunta: Record<string, string>;
  /** Erro dos módulos (prefixo do cupom inválido). */
  modulos?: string;
};

export function validarFormulario(dados: DadosDoFormulario): ErrosDoFormulario {
  const erros: ErrosDoFormulario = { porPergunta: {} };

  const nome = dados.nome.trim();
  if (!nome) erros.nome = "Dê um nome ao formulário.";
  else if (nome.length > MAIOR_NOME) erros.nome = `O nome precisa ter até ${MAIOR_NOME} caracteres.`;

  if (dados.descricao && dados.descricao.trim().length > MAIOR_DESCRICAO) {
    erros.descricao = `A descrição precisa ter até ${MAIOR_DESCRICAO} caracteres.`;
  }

  if (dados.perguntas.length === 0) {
    erros.perguntas = "Crie ao menos uma pergunta.";
  } else if (dados.perguntas.length > MAXIMO_DE_PERGUNTAS) {
    erros.perguntas = `Um formulário pode ter no máximo ${MAXIMO_DE_PERGUNTAS} perguntas.`;
  }

  for (const pergunta of dados.perguntas) {
    const erro = validarPergunta(pergunta);
    if (erro) erros.porPergunta[pergunta.id] = erro;
  }

  if (dados.modulos) {
    const erroDosModulos = validarModulos(dados.modulos);
    if (erroDosModulos) erros.modulos = erroDosModulos;
  }

  return erros;
}

/** Nulo quando os módulos servem. Hoje só o prefixo do cupom pode estar errado. */
export function validarModulos(modulos: ModulosDoFormulario): string | null {
  if (modulos.cupom && !prefixoDeCupomValido(modulos.cupom.prefixo)) {
    return "O prefixo do cupom precisa ter de 2 a 6 letras maiúsculas ou números.";
  }
  return null;
}

/** Nulo quando a pergunta está pronta para ir ao ar. */
export function validarPergunta(pergunta: Pergunta): string | null {
  const enunciado = pergunta.enunciado.trim();
  if (!enunciado) return "Escreva a pergunta.";
  if (enunciado.length > MAIOR_ENUNCIADO) return `A pergunta precisa ter até ${MAIOR_ENUNCIADO} caracteres.`;

  const descricao = DESCRICAO_DO_TIPO[pergunta.tipo];

  if (descricao.usaOpcoes) {
    const preenchidas = pergunta.opcoes.map((o) => o.trim()).filter(Boolean);
    if (preenchidas.length < MINIMO_DE_OPCOES) return `Escreva ao menos ${MINIMO_DE_OPCOES} opções.`;
    if (preenchidas.length > MAXIMO_DE_OPCOES) return `Use no máximo ${MAXIMO_DE_OPCOES} opções.`;
    if (new Set(preenchidas).size !== preenchidas.length) return "Há opções repetidas.";
  }

  if (descricao.usaEscala) {
    const escala = pergunta.escala;
    if (!escala) return "Defina o intervalo da escala.";
    if (!Number.isInteger(escala.minimo) || !Number.isInteger(escala.maximo)) {
      return "A escala precisa usar números inteiros.";
    }
    if (escala.maximo - escala.minimo < 1) return "O maior valor da escala precisa ser maior que o menor.";
    if (escala.maximo - escala.minimo > 10) return "Uma escala com mais de 11 pontos cansa quem responde.";
  }

  return null;
}

/** Verdadeiro quando nada precisa ser corrigido. */
export function formularioEstaValido(erros: ErrosDoFormulario): boolean {
  return (
    !erros.nome &&
    !erros.descricao &&
    !erros.perguntas &&
    !erros.modulos &&
    Object.keys(erros.porPergunta).length === 0
  );
}

/** Tira espaços e opções em branco antes de gravar. */
export function limparDadosDoFormulario(dados: DadosDoFormulario): DadosDoFormulario {
  return {
    nome: dados.nome.trim(),
    descricao: dados.descricao?.trim() || null,
    perguntas: dados.perguntas.map((pergunta) => ({
      ...pergunta,
      enunciado: pergunta.enunciado.trim(),
      ajuda: pergunta.ajuda?.trim() || null,
      opcoes: pergunta.opcoes.map((o) => o.trim()).filter(Boolean),
    })),
    ...(dados.modulos ? { modulos: dados.modulos } : {}),
  };
}

/* ------------------------------------------------------------------ *
 * Configuração da loja (D3): brinde, obrigatoriedades e destino da   *
 * indicação. Não gera versão do formulário, mas tem travas — e elas  *
 * valem no servidor, não só na tela.                                 *
 * ------------------------------------------------------------------ */

/** O que a validação precisa saber além da própria configuração. */
export type ContextoDaConfiguracao = {
  /** Situação do formulário que está sendo configurado. */
  situacao: SituacaoDoFormulario;
  /** Módulos da versão atual (o brinde só é obrigatório com o cupom ligado). */
  modulos: ModulosDoFormulario;
  /**
   * O formulário escolhido como destino da indicação, já resolvido pelo
   * serviço; nulo quando o id não corresponde a nenhum formulário.
   * Ignorado quando `formularioDeIndicacaoId` é nulo (o próprio formulário).
   */
  destino: { situacao: SituacaoDoFormulario; temWhatsapp: boolean } | null;
  /**
   * O destino da indicação que já está gravado (nulo = o próprio formulário).
   * O destino só é conferido quando muda: se o formulário escolhido saiu do ar
   * depois, as outras configurações ainda podem ser salvas. Sem este campo, o
   * destino é sempre conferido.
   */
  destinoGravadoId?: string | null;
};

export type ErrosDaConfiguracao = {
  /** Erro geral: formulário inativo ou arquivado fica em leitura. */
  situacao?: string;
  textoDoBrinde?: string;
  whatsappObrigatorio?: string;
  nomeObrigatorio?: string;
  formularioDeIndicacaoId?: string;
};

export function validarConfiguracaoDaLoja(
  configuracao: ConfiguracaoDaLoja,
  contexto: ContextoDaConfiguracao,
): ErrosDaConfiguracao {
  const erros: ErrosDaConfiguracao = {};

  if (contexto.situacao !== "ATIVO" && contexto.situacao !== "RASCUNHO") {
    erros.situacao = "Só dá para ajustar um formulário ativo ou em preparação.";
  }

  const brinde = configuracao.textoDoBrinde?.trim() ?? "";
  if (brinde.length > MAIOR_TEXTO_DO_BRINDE) {
    erros.textoDoBrinde = `O brinde precisa ter até ${MAIOR_TEXTO_DO_BRINDE} caracteres.`;
  } else if (contexto.modulos.cupom && brinde.length === 0) {
    erros.textoDoBrinde = "Escreva o brinde que o cupom dá direito.";
  }

  // Pedir o nome de quem pode não deixar contato coletaria um nome que seria descartado.
  if (configuracao.nomeObrigatorio && !configuracao.whatsappObrigatorio) {
    erros.nomeObrigatorio = "O nome só pode ser obrigatório se o WhatsApp também for.";
  }

  const destinoMudou = configuracao.formularioDeIndicacaoId !== (contexto.destinoGravadoId ?? null);
  if (configuracao.formularioDeIndicacaoId !== null && destinoMudou) {
    const destino = contexto.destino;
    if (!destino) {
      erros.formularioDeIndicacaoId = "Escolha um formulário que exista.";
    } else if (destino.situacao !== "ATIVO") {
      erros.formularioDeIndicacaoId = "O destino da indicação precisa ser um formulário ativo.";
    } else if (!destino.temWhatsapp) {
      erros.formularioDeIndicacaoId = "O destino da indicação precisa pedir o WhatsApp.";
    }
  }

  return erros;
}

export function configuracaoEstaValida(erros: ErrosDaConfiguracao): boolean {
  return Object.keys(erros).length === 0;
}

/** Tira espaços do brinde e transforma o vazio em nulo antes de gravar. */
export function limparConfiguracaoDaLoja(configuracao: ConfiguracaoDaLoja): ConfiguracaoDaLoja {
  return { ...configuracao, textoDoBrinde: configuracao.textoDoBrinde?.trim() || null };
}
