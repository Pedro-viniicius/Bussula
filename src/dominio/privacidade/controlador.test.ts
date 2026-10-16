import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cnpjValido, situacaoDoControlador, type Controlador } from "./controlador";

const completo: Controlador = {
  razaoSocial: "Essencial Fit Ltda",
  cnpj: "11.222.333/0001-81",
  endereco: "Rua Tal, 10, Centro, Lavras, MG",
  emailPrivacidade: "privacidade@essencialfit.com.br",
};

describe("situação do controlador", () => {
  it("tudo vazio deixa os quatro campos pendentes", () => {
    const s = situacaoDoControlador({ razaoSocial: "", cnpj: "", endereco: "", emailPrivacidade: "" });
    assert.equal(s.completo, false);
    assert.deepEqual(s.pendentes, ["razaoSocial", "cnpj", "endereco", "emailPrivacidade"]);
  });

  it("espaços contam como vazio", () => {
    assert.deepEqual(situacaoDoControlador({ ...completo, endereco: "   " }).pendentes, ["endereco"]);
  });

  it("placeholder é pendente", () => {
    const s = situacaoDoControlador({
      ...completo,
      razaoSocial: "PREENCHER razão social",
      endereco: "Rua Exemplo, 1",
    });
    assert.deepEqual(s.pendentes, ["razaoSocial", "endereco"]);
  });

  it("CNPJ com dígito verificador inválido é pendente", () => {
    assert.deepEqual(situacaoDoControlador({ ...completo, cnpj: "11.222.333/0001-82" }).pendentes, ["cnpj"]);
    assert.deepEqual(situacaoDoControlador({ ...completo, cnpj: "11111111111111" }).pendentes, ["cnpj"]);
  });

  it("e-mail mal formado é pendente", () => {
    assert.deepEqual(situacaoDoControlador({ ...completo, emailPrivacidade: "privacidade" }).pendentes, [
      "emailPrivacidade",
    ]);
  });

  it("controlador completo não tem pendência", () => {
    assert.deepEqual(situacaoDoControlador(completo), { completo: true, pendentes: [] });
  });

  it("valida CNPJ com e sem máscara", () => {
    assert.equal(cnpjValido("11222333000181"), true);
    assert.equal(cnpjValido("11.222.333/0001-81"), true);
    assert.equal(cnpjValido("1122233300018"), false);
  });
});
