import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { resolverUsarMocks } from "./config";

describe("resolverUsarMocks", () => {
  it("produção com USAR_MOCKS=true devolve false e registra erro", () => {
    const erro = mock.method(console, "error", () => {});
    try {
      assert.equal(
        resolverUsarMocks({ VERCEL: "1", VERCEL_ENV: "production", USAR_MOCKS: "true" }),
        false,
      );
      assert.equal(erro.mock.callCount(), 1);
    } finally {
      erro.mock.restore();
    }
  });

  it("produção sem variável ou com USAR_MOCKS=false devolve false sem erro", () => {
    const erro = mock.method(console, "error", () => {});
    try {
      assert.equal(resolverUsarMocks({ VERCEL: "1", VERCEL_ENV: "production" }), false);
      assert.equal(
        resolverUsarMocks({ VERCEL_ENV: "production", USAR_MOCKS: "false" }),
        false,
      );
      assert.equal(erro.mock.callCount(), 0);
    } finally {
      erro.mock.restore();
    }
  });

  it("desenvolvimento sem variável mantém true", () => {
    assert.equal(resolverUsarMocks({}), true);
    assert.equal(resolverUsarMocks({ USAR_MOCKS: "" }), true);
  });

  it("NODE_ENV=production fora da Vercel, sem USAR_MOCKS explícito, desliga os mocks", () => {
    assert.equal(resolverUsarMocks({ NODE_ENV: "production" }), false);
    assert.equal(resolverUsarMocks({ NODE_ENV: "production", USAR_MOCKS: "" }), false);
  });

  it("NODE_ENV=production fora da Vercel com USAR_MOCKS explícito obedece à variável", () => {
    assert.equal(resolverUsarMocks({ NODE_ENV: "production", USAR_MOCKS: "true" }), true);
    assert.equal(resolverUsarMocks({ NODE_ENV: "production", USAR_MOCKS: "false" }), false);
  });

  it("desenvolvimento e teste (NODE_ENV diferente de production) mantêm o padrão ligado", () => {
    assert.equal(resolverUsarMocks({ NODE_ENV: "development" }), true);
    assert.equal(resolverUsarMocks({ NODE_ENV: "test" }), true);
  });

  it("USAR_MOCKS definido fora de produção manda mais que o padrão", () => {
    assert.equal(resolverUsarMocks({ USAR_MOCKS: "false" }), false);
    assert.equal(resolverUsarMocks({ USAR_MOCKS: "0" }), false);
    assert.equal(resolverUsarMocks({ USAR_MOCKS: "true" }), true);
  });

  it("VERCEL sem VERCEL_ENV=production mantém o comportamento atual", () => {
    assert.equal(resolverUsarMocks({ VERCEL: "1" }), false);
    assert.equal(resolverUsarMocks({ VERCEL: "1", VERCEL_ENV: "preview" }), false);
    assert.equal(
      resolverUsarMocks({ VERCEL: "1", VERCEL_ENV: "preview", USAR_MOCKS: "true" }),
      true,
    );
  });
});
