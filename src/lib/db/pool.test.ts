import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPool } from "./pool";

describe("createPool", () => {
  it("registra um listener de erro: conexão ociosa derrubada não lança", async () => {
    const pool = createPool("postgres://u:s@127.0.0.1:1/inexistente");
    try {
      assert.ok(pool.listenerCount("error") >= 1);
      const avisos: string[] = [];
      const original = console.warn;
      console.warn = (linha: string) => avisos.push(linha);
      try {
        assert.doesNotThrow(() => pool.emit("error", new Error("segredo +5535999998851")));
      } finally {
        console.warn = original;
      }
      assert.equal(avisos.length, 1);
      assert.ok(!avisos[0].includes("segredo"));
    } finally {
      await pool.end();
    }
  });

  it("permite até 3 conexões", async () => {
    const pool = createPool("postgres://u:s@127.0.0.1:1/inexistente");
    try {
      assert.equal(pool.options.max, 3);
    } finally {
      await pool.end();
    }
  });
});
