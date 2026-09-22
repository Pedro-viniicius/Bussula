import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { perguntaEmBranco, trocarTipo, type Pergunta } from "../dominio/formularios/perguntas";
import { gerarSlug } from "../utilitarios/slug";
import { formularioEstaValido, validarFormulario, validarPergunta } from "./formulario";
import { limparValores, respostasEstaoValidas, validarResposta, validarRespostas } from "./resposta";

function pergunta(parcial: Partial<Pergunta> & Pick<Pergunta, "id" | "tipo">): Pergunta {
  return {
    enunciado: "Uma pergunta",
    ajuda: null,
    obrigatoria: false,
    opcoes: [],
    escala: null,
    ...parcial,
  };
}

describe("endereço público do formulário", () => {
  it("tira acento, espaço e pontuação", () => {
    assert.equal(gerarSlug("Experiência na loja"), "experiencia-na-loja");
    assert.equal(gerarSlug("  Pós-venda!!  "), "pos-venda");
  });
  it("nunca devolve vazio", () => {
    assert.equal(gerarSlug("!!!"), "formulario");
    assert.equal(gerarSlug(""), "formulario");
  });
});

describe("validação da pergunta", () => {
  it("exige enunciado", () => {
    assert.equal(validarPergunta(pergunta({ id: "a", tipo: "texto_curto", enunciado: "  " })), "Escreva a pergunta.");
  });
  it("exige ao menos duas opções onde o tipo usa opções", () => {
    const uma = pergunta({ id: "a", tipo: "escolha_unica", opcoes: ["Só uma"] });
    assert.equal(validarPergunta(uma), "Escreva ao menos 2 opções.");
  });
  it("recusa opções repetidas", () => {
    const repetidas = pergunta({ id: "a", tipo: "escolha_unica", opcoes: ["Sim", "Sim"] });
    assert.equal(validarPergunta(repetidas), "Há opções repetidas.");
  });
  it("recusa escala invertida", () => {
    const invertida = pergunta({
      id: "a",
      tipo: "escala",
      escala: { minimo: 5, maximo: 1, rotuloMinimo: null, rotuloMaximo: null },
    });
    assert.equal(validarPergunta(invertida), "O maior valor da escala precisa ser maior que o menor.");
  });
  it("aceita uma pergunta completa", () => {
    assert.equal(validarPergunta(pergunta({ id: "a", tipo: "escolha_unica", opcoes: ["Sim", "Não"] })), null);
  });
});

describe("troca de tipo da pergunta", () => {
  it("dá opções ao virar escolha e as tira ao voltar para texto", () => {
    const texto = perguntaEmBranco("a", "texto_curto");
    assert.deepEqual(texto.opcoes, []);
    const escolha = trocarTipo(texto, "escolha_unica");
    assert.equal(escolha.opcoes.length, 2);
    const escala = trocarTipo(escolha, "escala");
    assert.deepEqual(escala.opcoes, []);
    assert.ok(escala.escala);
    assert.deepEqual(trocarTipo(escala, "sim_nao").escala, null);
  });
});

describe("validação do formulário", () => {
  it("exige nome e ao menos uma pergunta", () => {
    const erros = validarFormulario({ nome: "", descricao: null, perguntas: [] });
    assert.equal(erros.nome, "Dê um nome ao formulário.");
    assert.equal(erros.perguntas, "Crie ao menos uma pergunta.");
    assert.equal(formularioEstaValido(erros), false);
  });
  it("aponta o erro na pergunta certa", () => {
    const erros = validarFormulario({
      nome: "Experiência na loja",
      descricao: null,
      perguntas: [pergunta({ id: "boa", tipo: "sim_nao" }), pergunta({ id: "ruim", tipo: "escolha_unica" })],
    });
    assert.equal(erros.porPergunta.boa, undefined);
    assert.ok(erros.porPergunta.ruim);
  });
});

describe("validação da resposta", () => {
  const obrigatoria = pergunta({ id: "nota", tipo: "avaliacao", obrigatoria: true });

  it("cobra o que é obrigatório e deixa passar o que é opcional", () => {
    assert.ok(validarResposta(obrigatoria, null));
    assert.equal(validarResposta(pergunta({ id: "livre", tipo: "texto_livre" }), null), null);
  });
  it("recusa nota fora de 1 a 5", () => {
    assert.equal(validarResposta(obrigatoria, 5), null);
    assert.ok(validarResposta(obrigatoria, 6));
    assert.ok(validarResposta(obrigatoria, 0));
  });
  it("recusa opção que não existe no formulário", () => {
    const escolha = pergunta({ id: "opcao", tipo: "escolha_unica", opcoes: ["Sim", "Não"] });
    assert.equal(validarResposta(escolha, "Sim"), null);
    assert.ok(validarResposta(escolha, "Talvez"));
  });
  it("recusa múltipla escolha com item inventado", () => {
    const multipla = pergunta({ id: "m", tipo: "multipla_escolha", opcoes: ["A", "B"] });
    assert.equal(validarResposta(multipla, ["A", "B"]), null);
    assert.ok(validarResposta(multipla, ["A", "C"]));
  });
  it("respeita o intervalo da escala", () => {
    const escala = pergunta({
      id: "e",
      tipo: "escala",
      escala: { minimo: 0, maximo: 10, rotuloMinimo: null, rotuloMaximo: null },
    });
    assert.equal(validarResposta(escala, 0), null);
    assert.equal(validarResposta(escala, 10), null);
    assert.ok(validarResposta(escala, 11));
  });
  it("junta os erros por pergunta", () => {
    const erros = validarRespostas([obrigatoria, pergunta({ id: "opcional", tipo: "texto_curto" })], {});
    assert.deepEqual(Object.keys(erros), ["nota"]);
    assert.equal(respostasEstaoValidas(erros), false);
  });
});

describe("limpeza antes de gravar", () => {
  it("descarta o que não pertence ao formulário e o que ficou em branco", () => {
    const perguntas = [pergunta({ id: "a", tipo: "texto_curto" }), pergunta({ id: "b", tipo: "texto_curto" })];
    const limpos = limparValores(perguntas, { a: "  oi  ", b: "   ", intruso: "não deveria entrar" });
    assert.deepEqual(limpos, { a: "oi" });
  });
});
