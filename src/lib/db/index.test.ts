/**
 * A conexão preguiçosa (`db`) em produção. Sem nenhum banco: o Pool do `pg`
 * só conecta na primeira consulta, e aqui só se monta a consulta.
 */
import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";

const original = { url: process.env.DATABASE_URL, env: process.env.NODE_ENV };
const globais = globalThis as unknown as { pgPool?: unknown; drizzleDb?: unknown };

function restaurar(nome: string, valor: string | undefined) {
  if (valor === undefined) delete process.env[nome];
  else process.env[nome] = valor;
}

beforeEach(() => {
  process.env.DATABASE_URL = "postgres://u:s@127.0.0.1:1/inexistente";
  delete globais.pgPool;
  delete globais.drizzleDb;
});
afterEach(() => {
  restaurar("DATABASE_URL", original.url);
  (process.env as Record<string, string | undefined>).NODE_ENV = original.env;
  delete globais.pgPool;
  delete globais.drizzleDb;
});

describe("conexão preguiçosa com o banco em produção", () => {
  it("reaproveita a mesma conexão entre usos (não abre um Pool novo a cada consulta)", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const { db } = await import("./index");
    const registros: string[] = [];
    const guardado = console.log;
    console.log = (linha: unknown) => void registros.push(String(linha));
    try {
      for (let i = 0; i < 5; i++) void db.select;
    } finally {
      console.log = guardado;
    }
    const aberturas = registros.filter((l) => l.includes("banco de dados")).length;
    assert.equal(aberturas, 1, `esperava 1 Pool aberto em 5 usos, abriu ${aberturas}`);
  });
});
