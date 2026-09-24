import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { lojaPodeMudarSituacao, mudancasPermitidasALoja, ROTULO_DA_SITUACAO } from "./status";

describe("o que a loja pode fazer com a situação de um formulário", () => {
  it("não publica um formulário em preparação", () => {
    assert.deepEqual(mudancasPermitidasALoja("RASCUNHO"), []);
    assert.equal(lojaPodeMudarSituacao("RASCUNHO", "ATIVO"), false);
  });

  it("pausa, retoma e arquiva um formulário que já está no ar", () => {
    assert.equal(lojaPodeMudarSituacao("ATIVO", "INATIVO"), true);
    assert.equal(lojaPodeMudarSituacao("INATIVO", "ATIVO"), true);
    assert.equal(lojaPodeMudarSituacao("ATIVO", "ARQUIVADO"), true);
    assert.equal(lojaPodeMudarSituacao("INATIVO", "ARQUIVADO"), true);
  });

  it("não tira um formulário do arquivo nem o devolve à preparação", () => {
    assert.deepEqual(mudancasPermitidasALoja("ARQUIVADO"), []);
    assert.equal(lojaPodeMudarSituacao("ATIVO", "RASCUNHO"), false);
  });

  it("mostra o rascunho como formulário em preparação", () => {
    assert.equal(ROTULO_DA_SITUACAO.RASCUNHO, "Em preparação");
  });
});
