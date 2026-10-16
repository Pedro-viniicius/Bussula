import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { avaliarLimiteDeEnvio, lerLimitesDeEnvio, tenteDeNovoEmSegundos } from "./limite-de-envios";

const agora = new Date("2026-10-15T12:00:00Z");
const antes = (s: number) => new Date(agora.getTime() - s * 1000);
const vazia = { total: 0, maisAntigaEm: null };

describe("variáveis do limite de envios", () => {
  it("usa 20 por minuto e 200 por hora por padrão", () => {
    assert.deepEqual(lerLimitesDeEnvio({}), { porMinuto: 20, porHora: 200 });
  });

  it("lê valores válidos", () => {
    assert.deepEqual(lerLimitesDeEnvio({ LIMITE_POR_MINUTO: "5", LIMITE_POR_HORA: "50" }), {
      porMinuto: 5,
      porHora: 50,
    });
  });

  it("valor inválido cai no padrão", () => {
    for (const v of ["", "abc", "0", "-3", "1.5", "5x", "NaN"]) {
      assert.deepEqual(lerLimitesDeEnvio({ LIMITE_POR_MINUTO: v, LIMITE_POR_HORA: v }), {
        porMinuto: 20,
        porHora: 200,
      });
    }
  });
});

describe("tenteDeNovoEmSegundos", () => {
  it("é o tempo até a mais antiga sair da janela, arredondado para cima", () => {
    assert.equal(tenteDeNovoEmSegundos("minuto", antes(45), agora), 15);
    assert.equal(tenteDeNovoEmSegundos("minuto", new Date(agora.getTime() - 44_500), agora), 16);
    assert.equal(tenteDeNovoEmSegundos("hora", antes(3000), agora), 600);
  });

  it("nunca é menor que 1", () => {
    assert.equal(tenteDeNovoEmSegundos("minuto", antes(61), agora), 1);
  });

  it("sem data usa a janela inteira", () => {
    assert.equal(tenteDeNovoEmSegundos("minuto", null, agora), 60);
    assert.equal(tenteDeNovoEmSegundos("hora", null, agora), 3600);
  });
});

describe("avaliação do limite", () => {
  const limites = { porMinuto: 20, porHora: 200 };

  it("deixa passar abaixo dos limites", () => {
    const c = { minuto: { total: 19, maisAntigaEm: antes(10) }, hora: { total: 199, maisAntigaEm: antes(100) } };
    assert.equal(avaliarLimiteDeEnvio(c, limites, agora), null);
  });

  it("recusa ao atingir o limite do minuto", () => {
    const r = avaliarLimiteDeEnvio(
      { minuto: { total: 20, maisAntigaEm: antes(50) }, hora: { total: 20, maisAntigaEm: antes(50) } },
      limites,
      agora,
    );
    assert.deepEqual(r, { janela: "minuto", total: 20, maximo: 20, tenteDeNovoEmSegundos: 10 });
  });

  it("recusa pelo limite da hora", () => {
    const r = avaliarLimiteDeEnvio(
      { minuto: vazia, hora: { total: 200, maisAntigaEm: antes(3500) } },
      limites,
      agora,
    );
    assert.equal(r?.janela, "hora");
    assert.equal(r?.tenteDeNovoEmSegundos, 100);
  });

  it("estourando os dois, devolve a espera maior", () => {
    const r = avaliarLimiteDeEnvio(
      { minuto: { total: 20, maisAntigaEm: antes(30) }, hora: { total: 200, maisAntigaEm: antes(3000) } },
      limites,
      agora,
    );
    assert.equal(r?.janela, "hora");
    assert.equal(r?.tenteDeNovoEmSegundos, 600);
  });
});
