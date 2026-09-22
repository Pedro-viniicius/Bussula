/**
 * Regras de um formulário bem feito.
 *
 * A mesma função roda no navegador (para avisar enquanto a pessoa escreve) e
 * no servidor (porque o que vem do navegador nunca é confiável). Uma função
 * comum, e não um esquema de biblioteca, porque as regras dependem do tipo de
 * cada pergunta — e porque qualquer pessoa do time consegue ler isto aqui.
 */
import { DESCRICAO_DO_TIPO, type Pergunta } from "@/dominio/formularios/perguntas";
import type { DadosDoFormulario } from "@/dominio/formularios/tipos";

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

  return erros;
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
  return !erros.nome && !erros.descricao && !erros.perguntas && Object.keys(erros.porPergunta).length === 0;
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
  };
}
