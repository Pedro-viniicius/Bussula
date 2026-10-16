import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { resumoDoErro } from "./logger";

describe("resumoDoErro", () => {
  it("leva só a classe, o code e a constraint da causa: nunca a mensagem nem os params", () => {
    // O drizzle de verdade herda `name = "DrizzleError"`; o nome da classe não é usado (minificado vira "e").
    class DrizzleQueryError extends Error {
      override name = "DrizzleError";
    }
    const causa = Object.assign(new Error("duplicate key (Maria, +5535999998851)"), {
      code: "23505",
      constraint: "contatos_cupom_unico",
    });
    const erro = new DrizzleQueryError('Failed query: insert ...\nparams: Maria,+5535999998851', { cause: causa });
    const resumo = resumoDoErro(erro);
    assert.deepEqual(resumo, { classe: "DrizzleError", codigo: "23505", constraint: "contatos_cupom_unico" });
    assert.ok(!JSON.stringify(resumo).includes("Maria"));
  });

  it("não depende do nome do construtor (que a minificação troca por uma letra)", () => {
    const e = function e() {} as unknown as new (m: string) => Error;
    e.prototype = Object.create(Error.prototype);
    const erro = new e("x");
    Object.defineProperty(erro, "name", { value: "ErroDoBanco" });
    assert.equal(resumoDoErro(erro).classe, "ErroDoBanco");
  });

  it("erro simples e valor que não é erro não vazam texto", () => {
    assert.deepEqual(resumoDoErro(new Error("segredo +5535999998851")), { classe: "Error" });
    assert.deepEqual(resumoDoErro("segredo"), { classe: "string" });
    assert.deepEqual(resumoDoErro(undefined), { classe: "undefined" });
  });
});
