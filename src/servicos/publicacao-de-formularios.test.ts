import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { formulariosGravados } from "@/repositorios";
import { CONFIGURACAO_DA_LOJA_PADRAO } from "@/dominio/formularios/tipos";
import { publicarDoTexto } from "./publicacao-de-formularios";

function definicao(slug: string, extra: Record<string, unknown> = {}, enunciado = "Como conheceu a loja?") {
  return {
    slug,
    nome: "Cadastro",
    modulos: { recompra: true },
    perguntas: [
      { id: "whats", tipo: "whatsapp", enunciado: "Qual é o seu WhatsApp?" },
      { id: "origem", tipo: "escolha_unica", enunciado, opcoes: ["Amigo", "Redes sociais"] },
    ],
    ...extra,
  };
}

const texto = (...formularios: unknown[]) => JSON.stringify({ formularios });
const novoSlug = () => `teste-${randomUUID().slice(0, 8)}`;

async function executar(corpo: string, aplicar: boolean) {
  const relatorio = await publicarDoTexto(corpo, { aplicar });
  assert.equal(relatorio.ok, true, JSON.stringify(relatorio));
  if (!relatorio.ok) throw new Error("inalcançável");
  return relatorio;
}

describe("publicação dos formulários", () => {
  it("simulação (padrão) não grava nada", async () => {
    const slug = novoSlug();
    const r = await executar(texto(definicao(slug, { publicar: true })), false);
    assert.equal(r.resultados[0].acao, "CRIAR");
    assert.equal(r.resultados[0].aplicado, false);
    assert.equal(await formulariosGravados.buscarPorSlug(slug), null);
  });

  it("--aplicar cria com slug explícito, módulos e, com publicar, fica ATIVO", async () => {
    const slug = novoSlug();
    await executar(texto(definicao(slug, { publicar: true })), true);
    const f = await formulariosGravados.buscarPorSlug(slug);
    assert.ok(f);
    assert.equal(f.situacao, "ATIVO");
    assert.equal(f.versaoAtual, 1);
    const completo = await formulariosGravados.buscarPorId(f.id);
    assert.equal(completo?.modulos.recompra, true);
    assert.equal(completo?.perguntas[0].obrigatoria, false);
  });

  it("sem publicar, o formulário novo fica em preparação", async () => {
    const slug = novoSlug();
    await executar(texto(definicao(slug)), true);
    assert.equal((await formulariosGravados.buscarPorSlug(slug))?.situacao, "RASCUNHO");
  });

  it("rodar duas vezes não cria versão nova", async () => {
    const slug = novoSlug();
    const corpo = texto(definicao(slug, { publicar: true }));
    await executar(corpo, true);
    const segunda = await executar(corpo, true);
    assert.equal(segunda.resultados[0].acao, "SEM_MUDANCA");
    assert.equal(segunda.resultados[0].poeNoAr, false);
    assert.equal((await formulariosGravados.buscarPorSlug(slug))?.versaoAtual, 1);
  });

  it("mudar uma pergunta gera versão nova e preserva a anterior", async () => {
    const slug = novoSlug();
    await executar(texto(definicao(slug)), true);
    const r = await executar(texto(definicao(slug, {}, "Como você nos achou?")), true);
    assert.equal(r.resultados[0].acao, "NOVA_VERSAO");
    const f = await formulariosGravados.buscarPorSlug(slug);
    assert.equal(f?.versaoAtual, 2);
    const v1 = await formulariosGravados.perguntasDaVersao(f!.id, 1);
    assert.equal(v1?.[1].enunciado, "Como conheceu a loja?");
  });

  it("mudar só os módulos também gera versão nova", async () => {
    const slug = novoSlug();
    await executar(texto(definicao(slug)), true);
    const r = await executar(texto(definicao(slug, { modulos: { recompra: true, indicacao: true } })), true);
    assert.equal(r.resultados[0].acao, "NOVA_VERSAO");
  });

  it("publicar num formulário existente em preparação o põe no ar", async () => {
    const slug = novoSlug();
    await executar(texto(definicao(slug)), true);
    const r = await executar(texto(definicao(slug, { publicar: true })), true);
    assert.equal(r.resultados[0].acao, "SEM_MUDANCA");
    assert.equal(r.resultados[0].poeNoAr, true);
    assert.equal((await formulariosGravados.buscarPorSlug(slug))?.situacao, "ATIVO");
  });

  it("não mexe na configuração da loja", async () => {
    const slug = novoSlug();
    await executar(texto(definicao(slug, { modulos: { cupom: {} } })), true);
    const f = await formulariosGravados.buscarPorSlug(slug);
    const configurada = { ...CONFIGURACAO_DA_LOJA_PADRAO, textoDoBrinde: "Shaker grátis", nomeObrigatorio: true };
    await formulariosGravados.salvarConfiguracaoDaLoja(f!.id, configurada);
    await executar(texto(definicao(slug, { modulos: { cupom: {} } }, "Outra pergunta?")), true);
    assert.deepEqual((await formulariosGravados.buscarPorSlug(slug))?.configuracaoDaLoja, configurada);
  });

  it("formulário arquivado é recusado e nada do arquivo é gravado", async () => {
    const arquivado = novoSlug();
    const outro = novoSlug();
    await executar(texto(definicao(arquivado)), true);
    const f = await formulariosGravados.buscarPorSlug(arquivado);
    await formulariosGravados.mudarSituacao(f!.id, "ARQUIVADO");

    const r = await executar(texto(definicao(outro), definicao(arquivado, {}, "Mudou?")), true);
    assert.equal(r.recusado, true);
    assert.equal(r.resultados[1].acao, "RECUSADO");
    assert.equal(await formulariosGravados.buscarPorSlug(outro), null);
    const depois = await formulariosGravados.buscarPorSlug(arquivado);
    assert.equal(depois?.situacao, "ARQUIVADO");
    assert.equal(depois?.versaoAtual, 1);
  });

  it("formulário INATIVO não é reativado: grava a versão nova, avisa e segue pausado", async () => {
    const slug = novoSlug();
    await executar(texto(definicao(slug, { publicar: true })), true);
    const f = await formulariosGravados.buscarPorSlug(slug);
    await formulariosGravados.mudarSituacao(f!.id, "INATIVO");

    const r = await executar(texto(definicao(slug, { publicar: true }, "Mudou?")), true);
    assert.equal(r.resultados[0].acao, "NOVA_VERSAO");
    assert.equal(r.resultados[0].poeNoAr, false);
    assert.equal(r.resultados[0].naoReativado, true);
    const depois = await formulariosGravados.buscarPorSlug(slug);
    assert.equal(depois?.situacao, "INATIVO");
    assert.equal(depois?.versaoAtual, 2);
  });

  it("nunca arquiva o que não está no arquivo", async () => {
    const fora = novoSlug();
    await executar(texto(definicao(fora, { publicar: true })), true);
    await executar(texto(definicao(novoSlug())), true);
    assert.equal((await formulariosGravados.buscarPorSlug(fora))?.situacao, "ATIVO");
  });

  it("termo de saúde junto de pergunta pessoal: recusa e não grava", async () => {
    const slug = novoSlug();
    const saude = definicao(slug);
    saude.perguntas.push({ id: "obj", tipo: "texto_curto", enunciado: "Qual o seu objetivo?" } as never);
    const r = await publicarDoTexto(texto(saude), { aplicar: true });
    assert.equal(r.ok, false);
    assert.equal(await formulariosGravados.buscarPorSlug(slug), null);
  });

  it("WhatsApp sem módulo que use o número: recusa e não grava", async () => {
    const slug = novoSlug();
    const r = await publicarDoTexto(texto(definicao(slug, { modulos: {} })), { aplicar: true });
    assert.equal(r.ok, false);
    assert.equal(await formulariosGravados.buscarPorSlug(slug), null);
  });

  it("JSON inválido não grava nada, nem os formulários bons do mesmo arquivo", async () => {
    const bom = novoSlug();
    const ruim = { ...definicao(novoSlug()), perguntas: [] };
    const r = await publicarDoTexto(texto(definicao(bom), ruim), { aplicar: true });
    assert.equal(r.ok, false);
    assert.equal(await formulariosGravados.buscarPorSlug(bom), null);
    const quebrado = await publicarDoTexto("{ não é json", { aplicar: true });
    assert.equal(quebrado.ok, false);
  });
});
