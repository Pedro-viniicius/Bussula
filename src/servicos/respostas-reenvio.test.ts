/**
 * Chave de envio reenviada e cupom sem brinde cadastrado.
 * Contra o modo de teste (repositórios em memória), tudo fictício.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import type { ModulosDoFormulario } from "../dominio/formularios/modulos";
import type { Pergunta } from "../dominio/formularios/perguntas";
import { CONFIGURACAO_DA_LOJA_PADRAO } from "../dominio/formularios/tipos";
import { VERSAO_ATUAL } from "../lib/texts/consentimento";
import { formulariosGravados } from "../repositorios";
import { loja } from "../repositorios/em-memoria/loja";
import { criarFormulario, publicarFormulario } from "./formularios";
import { registrarResposta, type EnvioDeResposta } from "./respostas";

const AGORA = new Date("2026-10-15T12:00:00-03:00");

const PERGUNTAS: Pergunta[] = [
  { id: "q-nome", tipo: "nome", enunciado: "Como você se chama?", ajuda: null, obrigatoria: false, opcoes: [], escala: null },
  { id: "q-whats", tipo: "whatsapp", enunciado: "Qual é o seu WhatsApp?", ajuda: null, obrigatoria: true, opcoes: [], escala: null },
];

const TUDO_LIGADO: ModulosDoFormulario = { recompra: true, ofertas: true, cupom: { prefixo: "QAR" }, indicacao: true };

async function novoFormulario(textoDoBrinde: string | null = "Brinde de teste") {
  const criado = await criarFormulario({
    nome: `Reenvio ${randomUUID().slice(0, 8)}`,
    descricao: null,
    perguntas: PERGUNTAS,
    modulos: TUDO_LIGADO,
  });
  assert.ok(criado.ok);
  await formulariosGravados.salvarConfiguracaoDaLoja(criado.valor.id, { ...CONFIGURACAO_DA_LOJA_PADRAO, textoDoBrinde });
  assert.ok((await publicarFormulario(criado.valor.id)).ok);
  return { id: criado.valor.id, slug: criado.valor.slug };
}

function envio(slug: string, whats: string, parcial: Partial<EnvioDeResposta> = {}): EnvioDeResposta {
  return {
    slug,
    chaveEnvio: randomUUID(),
    origem: "nfc",
    valores: { "q-nome": "Teste", "q-whats": whats },
    consentimento: { versao: VERSAO_ATUAL, aceites: { recompra: true, ofertas: false } },
    ...parcial,
  };
}

async function enviar(e: EnvioDeResposta) {
  const r = await registrarResposta(e, { agora: AGORA });
  assert.ok(r.ok, `esperava sucesso, veio ${JSON.stringify(r)}`);
  return r.valor;
}

describe("reenvio da mesma chave", () => {
  it("o telefone do payload novo não serve de oráculo: vale o do cadastro original", async () => {
    const { slug } = await novoFormulario();
    await enviar(envio(slug, "35999997701")); // este telefone leva o cupom
    const segundo = envio(slug, "35999997701"); // mesma pessoa de novo: sem cupom, ja_emitido
    assert.deepEqual((await enviar(segundo)).beneficios.cupom, { status: "ja_emitido" });

    // Reenvia a chave do segundo com um telefone que nunca recebeu cupom:
    // a resposta tem que continuar sendo a do original, não "falhou" nem diferente.
    const reenvio = await enviar({ ...segundo, valores: { "q-nome": "X", "q-whats": "35999997702" } });
    assert.equal(reenvio.jaEstavaRegistrada, true);
    assert.deepEqual(reenvio.beneficios.cupom, { status: "ja_emitido" });
  });

  it("chave de OUTRO formulário não revela cupom nem código de indicação", async () => {
    const a = await novoFormulario();
    const b = await novoFormulario();
    const original = envio(a.slug, "35999997711");
    const primeiro = await enviar(original);
    assert.ok(primeiro.beneficios.indicacao);

    const noOutro = await enviar({ ...original, slug: b.slug });
    assert.equal(noOutro.jaEstavaRegistrada, true);
    assert.deepEqual(noOutro.beneficios, { cupom: null, indicacao: null });
  });
});

describe("cupom ligado sem brinde cadastrado", () => {
  for (const texto of [null, "", "   "]) {
    it(`textoDoBrinde ${JSON.stringify(texto)}: não emite cupom, mas o contato e a indicação seguem`, async () => {
      const { slug, id } = await novoFormulario(texto);
      const r = await enviar(envio(slug, "35999997721"));
      assert.equal(r.beneficios.cupom, null);
      assert.ok(r.beneficios.indicacao);
      const contato = loja().contatos.find((c) => c.formularioId === id)!;
      assert.equal(contato.cupom, null);
    });
  }

  it("reenviar a chave também não diz que o cupom falhou", async () => {
    const { slug } = await novoFormulario(null);
    const original = envio(slug, "35999997722");
    await enviar(original);
    assert.equal((await enviar(original)).beneficios.cupom, null);
  });

  it("com brinde cadastrado o cupom é emitido", async () => {
    const { slug } = await novoFormulario("Brinde");
    assert.equal((await enviar(envio(slug, "35999997723"))).beneficios.cupom?.status, "emitido");
  });
});
