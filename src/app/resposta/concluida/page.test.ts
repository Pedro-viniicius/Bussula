/**
 * /resposta/concluida precisa ser renderizada por requisição.
 *
 * O `proxy.ts` põe um CSP com `script-src 'nonce-…' 'strict-dynamic'`: só roda
 * script que leve o nonce daquela requisição. Uma página estática (pré-
 * renderizada no build) sai sem nonce, então numa carga direta (atualizar a
 * página, abrir o link, ou o recarregamento que o Next faz quando a navegação
 * por RSC falha sem internet) o navegador bloqueia TODOS os scripts e a tela,
 * que é renderizada no cliente, fica em branco: o cliente nem vê o cupom.
 * Verificado com `next build && next start`: 24 violações de CSP e corpo vazio.
 *
 * Teste de regressão: a página tem que optar por renderização dinâmica.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

describe("/resposta/concluida", () => {
  it("opta por renderização dinâmica (senão o CSP com nonce bloqueia os scripts e a tela fica em branco)", () => {
    const fonte = readFileSync(join(import.meta.dirname, "page.tsx"), "utf8");
    const dinamica =
      /export const dynamic\s*=\s*["']force-dynamic["']/.test(fonte) || /\b(await\s+connection\(\)|await\s+headers\(\)|await\s+cookies\(\))/.test(fonte);
    assert.ok(dinamica, "a página é estática: sem nonce no HTML, o CSP do proxy bloqueia todos os scripts");
  });
});
