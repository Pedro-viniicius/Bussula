import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Pergunta } from "../dominio/formularios/perguntas";
import { validarResposta } from "./resposta";

function pergunta(tipo: Pergunta["tipo"], opcoes: string[] = []): Pergunta {
  return { id: "q", tipo, enunciado: "?", ajuda: null, obrigatoria: false, opcoes, escala: null };
}

describe("caracteres que o banco não aceita", () => {
  for (const tipo of ["nome", "texto_curto", "texto_livre"] as const) {
    it(`${tipo}: U+0000 e outros controles são recusados`, () => {
      assert.ok(validarResposta(pergunta(tipo), "Maria\u0000 Silva"));
      assert.ok(validarResposta(pergunta(tipo), "a\u0001b"));
      assert.ok(validarResposta(pergunta(tipo), "a\u007Fb"));
    });
  }

  it("substituto solto (que o jsonb recusa) é recusado; emoji inteiro passa", () => {
    assert.ok(validarResposta(pergunta("texto_livre"), "oi \uD83D"));
    assert.ok(validarResposta(pergunta("texto_livre"), "oi \uDE00"));
    assert.equal(validarResposta(pergunta("texto_livre"), "oi \u{1F600}"), null);
  });

  it("tabulação e quebra de linha continuam valendo no texto livre", () => {
    assert.equal(validarResposta(pergunta("texto_livre"), "linha 1\nlinha 2\tfim"), null);
  });

  it("opção de múltipla escolha com controle é recusada", () => {
    assert.ok(validarResposta(pergunta("multipla_escolha", ["a"]), ["a", "b\u0000"]));
  });

  it("texto comum com acento passa", () => {
    assert.equal(validarResposta(pergunta("nome"), "José d'Ávila"), null);
  });
});
