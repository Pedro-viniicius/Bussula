import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lerModulos, MODULOS_DESLIGADOS, usaNumero } from "./modulos";

describe("leitura dos módulos do jsonb", () => {
  it("jsonb vazio vale como tudo desligado (versões antigas)", () => {
    assert.deepEqual(lerModulos({}), MODULOS_DESLIGADOS);
  });

  it("lixo vale como tudo desligado, sem lançar erro", () => {
    for (const lixo of [null, undefined, "texto", 42, true, [], [1, 2], () => 1]) {
      assert.deepEqual(lerModulos(lixo), MODULOS_DESLIGADOS);
    }
  });

  it("só liga com true de verdade, campo a campo", () => {
    const lido = lerModulos({ recompra: "sim", ofertas: 1, indicacao: true, cupom: "ESS" });
    assert.deepEqual(lido, { recompra: false, ofertas: false, cupom: null, indicacao: true });
  });

  it("lê um cadastro completo", () => {
    const completo = { recompra: true, ofertas: true, cupom: { prefixo: "BAL" }, indicacao: true };
    assert.deepEqual(lerModulos(completo), completo);
  });

  it("cupom sem prefixo usa o padrão; com prefixo inválido fica desligado", () => {
    assert.deepEqual(lerModulos({ cupom: {} }).cupom, { prefixo: "ESS" });
    assert.equal(lerModulos({ cupom: { prefixo: "ab" } }).cupom, null);
    assert.equal(lerModulos({ cupom: { prefixo: "TOOLONGX" } }).cupom, null);
    assert.equal(lerModulos({ cupom: { prefixo: 12 } }).cupom, null);
    assert.equal(lerModulos({ cupom: null }).cupom, null);
    assert.equal(lerModulos({ cupom: [] }).cupom, null);
  });

  it("devolve uma cópia: alterar o resultado não altera o padrão", () => {
    const lido = lerModulos({});
    lido.recompra = true;
    assert.equal(MODULOS_DESLIGADOS.recompra, false);
    assert.equal(lerModulos({}).recompra, false);
  });
});

describe("módulos que usam o número", () => {
  it("nenhum módulo ligado não usa o número", () => {
    assert.equal(usaNumero(MODULOS_DESLIGADOS), false);
  });

  it("qualquer módulo ligado usa o número", () => {
    assert.equal(usaNumero({ ...MODULOS_DESLIGADOS, recompra: true }), true);
    assert.equal(usaNumero({ ...MODULOS_DESLIGADOS, ofertas: true }), true);
    assert.equal(usaNumero({ ...MODULOS_DESLIGADOS, cupom: { prefixo: "ESS" } }), true);
    assert.equal(usaNumero({ ...MODULOS_DESLIGADOS, indicacao: true }), true);
  });
});
