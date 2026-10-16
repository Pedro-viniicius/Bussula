import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FINALIDADE_OBRIGATORIA,
  hashDaVersao,
  TEXTOS_POR_VERSAO,
  textoDaFinalidade,
  VERSAO_ATUAL,
  versaoConhecida,
} from "./consentimento";

/**
 * Hash de cada versão já publicada. Se este teste quebrar porque o texto
 * mudou, NÃO atualize o hash: crie uma versão nova e mantenha a antiga.
 */
const HASH_POR_VERSAO: Record<string, string> = {
  "2026-10-15.v1": "5cd2c1fb286dfbe5558d471cd7cc4217e7adff5b73460bbd226717788d606634",
};

describe("textos de consentimento", () => {
  it("cada versão publicada mantém o texto original", () => {
    for (const versao of Object.keys(TEXTOS_POR_VERSAO)) {
      assert.equal(hashDaVersao(versao), HASH_POR_VERSAO[versao], `texto da versão ${versao} mudou`);
    }
  });

  it("nenhuma versão foi apagada", () => {
    for (const versao of Object.keys(HASH_POR_VERSAO)) assert.ok(versaoConhecida(versao));
  });

  it("a versão atual existe", () => {
    assert.ok(versaoConhecida(VERSAO_ATUAL));
  });

  it("versão desconhecida não tem hash nem texto", () => {
    assert.equal(versaoConhecida("nao-existe"), false);
    assert.equal(versaoConhecida("toString"), false);
    assert.equal(hashDaVersao("nao-existe"), null);
    assert.equal(textoDaFinalidade("nao-existe", "recompra"), null);
  });

  it("devolve o texto da finalidade", () => {
    assert.equal(
      textoDaFinalidade(VERSAO_ATUAL, "recompra"),
      "Mensagens no WhatsApp sobre reposição dos produtos que comprei.",
    );
  });

  it("nenhuma finalidade é obrigatória", () => {
    assert.deepEqual(FINALIDADE_OBRIGATORIA, { recompra: false, ofertas: false });
  });
});
