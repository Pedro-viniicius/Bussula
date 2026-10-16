/**
 * Destino da indicação que saiu do ar não impede salvar as outras mudanças
 * da configuração da loja (só é conferido quando muda).
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import type { Pergunta } from "../dominio/formularios/perguntas";
import { CONFIGURACAO_DA_LOJA_PADRAO } from "../dominio/formularios/tipos";
import { formulariosGravados } from "../repositorios";
import { criarFormulario, mudarSituacaoDoFormulario, publicarFormulario, salvarConfiguracaoDaLoja } from "./formularios";

const SESSAO = { id: randomUUID(), exp: Math.floor(Date.now() / 1000) + 3600 };

const PERGUNTAS: Pergunta[] = [
  { id: "p-conheceu", tipo: "escolha_unica", enunciado: "Como conheceu a loja?", ajuda: null, obrigatoria: false, opcoes: ["Rua", "Amigo"], escala: null },
  { id: "p-whatsapp", tipo: "whatsapp", enunciado: "Qual é o seu WhatsApp?", ajuda: null, obrigatoria: false, opcoes: [], escala: null },
];

async function novoAtivo() {
  const criado = await criarFormulario({
    nome: `Config ${randomUUID().slice(0, 8)}`,
    descricao: null,
    perguntas: PERGUNTAS,
    modulos: { recompra: true, ofertas: false, cupom: null, indicacao: true },
  });
  assert.ok(criado.ok);
  assert.ok((await publicarFormulario(criado.valor.id)).ok);
  return criado.valor.id;
}

describe("configuração da loja: destino que saiu do ar", () => {
  it("mudar outro campo continua possível; trocar para um destino fora do ar não", async () => {
    const id = await novoAtivo();
    const destino = await novoAtivo();
    const base = { ...CONFIGURACAO_DA_LOJA_PADRAO, formularioDeIndicacaoId: destino };
    assert.ok((await salvarConfiguracaoDaLoja(id, base, SESSAO)).ok);

    assert.ok((await mudarSituacaoDoFormulario(destino, "INATIVO")).ok);

    const outroCampo = await salvarConfiguracaoDaLoja(id, { ...base, whatsappObrigatorio: false }, SESSAO);
    assert.ok(outroCampo.ok, JSON.stringify(outroCampo));
    assert.equal((await formulariosGravados.buscarPorId(id))?.configuracaoDaLoja.formularioDeIndicacaoId, destino);

    const outroDestino = await novoAtivo();
    assert.ok((await mudarSituacaoDoFormulario(outroDestino, "INATIVO")).ok);
    const trocou = await salvarConfiguracaoDaLoja(id, { ...base, formularioDeIndicacaoId: outroDestino }, SESSAO);
    assert.equal(trocou.ok, false);
  });
});
