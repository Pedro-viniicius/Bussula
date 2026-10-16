import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import {
  assinarConclusao,
  guardarConclusao,
  interpretarConclusao,
  lerConclusaoBruta,
  limparConclusao,
  registrarResultadoDaFila,
  type RegistroDaConclusao,
} from "./conclusao-guardada";

const base: RegistroDaConclusao = {
  chaveEnvio: "k1",
  slug: "s",
  modulos: { recompra: true, ofertas: false, cupom: true, indicacao: true },
  pediuContato: true,
  pulouContato: false,
  resultado: null,
};

const resultado: ResultadoDoEnvio = {
  ok: true,
  jaEstavaRegistrada: false,
  beneficios: { cupom: { status: "ja_emitido" }, indicacao: null },
};

describe("conclusão guardada", () => {
  const original = (globalThis as { sessionStorage?: unknown }).sessionStorage;
  beforeEach(() => {
    const dados = new Map<string, string>();
    (globalThis as { sessionStorage?: unknown }).sessionStorage = {
      getItem: (k: string) => dados.get(k) ?? null,
      setItem: (k: string, v: string) => void dados.set(k, v),
      removeItem: (k: string) => void dados.delete(k),
    };
  });
  afterEach(() => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = original;
  });

  test("grava e lê de volta", () => {
    guardarConclusao(base);
    assert.deepEqual(interpretarConclusao(lerConclusaoBruta()), base);
  });

  test("lixo, JSON quebrado e registro sem chave viram nulo", () => {
    assert.equal(interpretarConclusao(null), null);
    assert.equal(interpretarConclusao("{quebrado"), null);
    assert.equal(interpretarConclusao("42"), null);
    assert.equal(interpretarConclusao(JSON.stringify({ slug: "s" })), null);
  });

  test("módulos ausentes valem como desligados", () => {
    const r = interpretarConclusao(JSON.stringify({ chaveEnvio: "k", slug: "s" }));
    assert.deepEqual(r?.modulos, { recompra: false, ofertas: false, cupom: false, indicacao: false });
  });

  test("sem sessionStorage nada lança", () => {
    (globalThis as { sessionStorage?: unknown }).sessionStorage = undefined;
    assert.doesNotThrow(() => guardarConclusao(base));
    assert.equal(lerConclusaoBruta(), null);
  });

  test("resultado da fila com a mesma chave atualiza o registro e avisa a tela", () => {
    guardarConclusao(base);
    let avisos = 0;
    const parar = assinarConclusao(() => avisos++);
    registrarResultadoDaFila("k1", resultado);
    parar();
    assert.equal(avisos, 1);
    assert.deepEqual(interpretarConclusao(lerConclusaoBruta())?.resultado, resultado);
  });

  test("o primeiro resultado vence: o segundo (ja_emitido do reenvio) não apaga o cupom", () => {
    guardarConclusao(base);
    const emitido: ResultadoDoEnvio = {
      ok: true,
      jaEstavaRegistrada: false,
      beneficios: {
        cupom: { status: "emitido", codigo: "ESS-ABCD-23", textoDoBrinde: null, validoAte: "2026-11-14" },
        indicacao: null,
      },
    };
    registrarResultadoDaFila("k1", emitido);
    registrarResultadoDaFila("k1", resultado);
    assert.deepEqual(interpretarConclusao(lerConclusaoBruta())?.resultado, emitido);
  });

  test("um resultado com cupom emitido substitui o ja_emitido que chegou antes", () => {
    guardarConclusao(base);
    const emitido: ResultadoDoEnvio = {
      ok: true,
      jaEstavaRegistrada: false,
      beneficios: {
        cupom: { status: "emitido", codigo: "ESS-ABCD-23", textoDoBrinde: null, validoAte: "2026-11-14" },
        indicacao: null,
      },
    };
    registrarResultadoDaFila("k1", resultado);
    registrarResultadoDaFila("k1", emitido);
    assert.deepEqual(interpretarConclusao(lerConclusaoBruta())?.resultado, emitido);
  });

  test("um resultado com cupom emitido também substitui um limite de envios guardado", () => {
    guardarConclusao({
      ...base,
      resultado: { ok: false, erro: "LIMITE_EXCEDIDO", mensagem: "x", tenteDeNovoEmSegundos: 5 },
    });
    const emitido: ResultadoDoEnvio = {
      ok: true,
      jaEstavaRegistrada: false,
      beneficios: {
        cupom: { status: "emitido", codigo: "ESS-ABCD-23", textoDoBrinde: null, validoAte: "2026-11-14" },
        indicacao: null,
      },
    };
    registrarResultadoDaFila("k1", emitido);
    assert.deepEqual(interpretarConclusao(lerConclusaoBruta())?.resultado, emitido);
  });

  test("limparConclusao apaga o registro e avisa a tela", () => {
    guardarConclusao(base);
    let avisos = 0;
    const parar = assinarConclusao(() => avisos++);
    limparConclusao();
    parar();
    assert.equal(lerConclusaoBruta(), null);
    assert.equal(avisos, 1);
  });

  test("resultado de outra chave é ignorado", () => {
    guardarConclusao(base);
    let avisos = 0;
    const parar = assinarConclusao(() => avisos++);
    registrarResultadoDaFila("outra", resultado);
    parar();
    assert.equal(avisos, 0);
    assert.equal(interpretarConclusao(lerConclusaoBruta())?.resultado, null);
  });
});
