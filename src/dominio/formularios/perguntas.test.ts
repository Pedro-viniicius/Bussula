import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pergunta } from "../../testes/construtores";
import { DESCRICAO_DO_TIPO, pedeDadosPessoais, semDadosPessoais, TIPOS_DE_PERGUNTA } from "./perguntas";

describe("dado pessoal nas perguntas", () => {
  const nota = pergunta({ id: "nota", tipo: "avaliacao" });
  const whats = pergunta({ id: "whats", tipo: "whatsapp" });
  const nome = pergunta({ id: "nome", tipo: "nome" });
  const texto = pergunta({ id: "texto", tipo: "texto_curto" });

  it("só WhatsApp e nome são pessoais", () => {
    const pessoais = TIPOS_DE_PERGUNTA.filter((tipo) => DESCRICAO_DO_TIPO[tipo].pessoal);
    assert.deepEqual(pessoais, ["whatsapp", "nome"]);
  });

  it("semDadosPessoais tira as perguntas pessoais e mantém a ordem das outras", () => {
    assert.deepEqual(
      semDadosPessoais([whats, nota, nome, texto]).map((p) => p.id),
      ["nota", "texto"],
    );
  });

  it("pedeDadosPessoais enxerga qualquer pergunta pessoal", () => {
    assert.equal(pedeDadosPessoais([nota, texto]), false);
    assert.equal(pedeDadosPessoais([nota, whats]), true);
    assert.equal(pedeDadosPessoais([nome]), true);
    assert.equal(pedeDadosPessoais([]), false);
  });
});
