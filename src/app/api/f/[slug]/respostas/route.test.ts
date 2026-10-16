/**
 * Rota pública de envio: corpo malformado, 429 com `Retry-After` (chave nova
 * recusada, chave existente devolvida) e o que o corpo da resposta nunca traz.
 * Contra o modo de teste (repositórios em memória), tudo fictício.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, it } from "node:test";
import { MODULOS_DESLIGADOS } from "../../../../../dominio/formularios/modulos";
import type { Pergunta } from "../../../../../dominio/formularios/perguntas";
import { CONFIGURACAO_DA_LOJA_PADRAO } from "../../../../../dominio/formularios/tipos";
import { VERSAO_ATUAL } from "../../../../../lib/texts/consentimento";
import { formulariosGravados, respostasGravadas } from "../../../../../repositorios";
import { loja } from "../../../../../repositorios/em-memoria/loja";
import { criarFormulario, publicarFormulario } from "../../../../../servicos/formularios";
import { POST } from "./route";

const PERGUNTAS: Pergunta[] = [
  { id: "r-nome", tipo: "nome", enunciado: "Nome?", ajuda: null, obrigatoria: false, opcoes: [], escala: null },
  { id: "r-whats", tipo: "whatsapp", enunciado: "WhatsApp?", ajuda: null, obrigatoria: true, opcoes: [], escala: null },
];

const ambiente = { sal: process.env.IP_HASH_SALT, minuto: process.env.LIMITE_POR_MINUTO, hora: process.env.LIMITE_POR_HORA };

function restaurar(nome: string, valor: string | undefined) {
  if (valor === undefined) delete process.env[nome];
  else process.env[nome] = valor;
}

beforeEach(() => {
  process.env.IP_HASH_SALT = "sal-de-teste";
});
afterEach(() => {
  restaurar("IP_HASH_SALT", ambiente.sal);
  restaurar("LIMITE_POR_MINUTO", ambiente.minuto);
  restaurar("LIMITE_POR_HORA", ambiente.hora);
});

async function novoFormulario(comCupom = true) {
  const criado = await criarFormulario({
    nome: `Rota ${randomUUID().slice(0, 8)}`,
    descricao: null,
    perguntas: PERGUNTAS,
    modulos: comCupom ? { recompra: true, ofertas: false, cupom: { prefixo: "RTA" }, indicacao: true } : MODULOS_DESLIGADOS,
  });
  assert.ok(criado.ok);
  await formulariosGravados.salvarConfiguracaoDaLoja(criado.valor.id, {
    ...CONFIGURACAO_DA_LOJA_PADRAO,
    textoDoBrinde: "Brinde da rota",
  });
  assert.ok((await publicarFormulario(criado.valor.id)).ok);
  return { id: criado.valor.id, slug: criado.valor.slug };
}

function chamar(slug: string, corpo: unknown, ip = `203.0.113.${Math.floor(Math.random() * 200)}`) {
  const bruto = typeof corpo === "string" ? corpo : JSON.stringify(corpo);
  const request = new Request(`http://localhost/api/f/${slug}/respostas`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: bruto,
  });
  return POST(request, { params: Promise.resolve({ slug }) } as never);
}

function corpoValido(whats: string, extra: Record<string, unknown> = {}) {
  return {
    chaveEnvio: randomUUID(),
    origem: "nfc",
    valores: { "r-nome": "Teste Rota", "r-whats": whats },
    consentimento: { versao: VERSAO_ATUAL, aceites: { recompra: true } },
    ...extra,
  };
}

describe("corpo malformado", () => {
  it("responde 400 sem gravar nada", async () => {
    const { slug, id } = await novoFormulario();
    const ruins: unknown[] = [
      "{não é json",
      "null",
      "[]",
      { valores: {} },
      { chaveEnvio: "", valores: {} },
      { chaveEnvio: 7, valores: {} },
      { chaveEnvio: randomUUID(), valores: [] },
      { chaveEnvio: randomUUID(), valores: null },
      { chaveEnvio: randomUUID(), valores: {}, consentimento: "sim" },
      { chaveEnvio: randomUUID(), valores: {}, consentimento: { versao: 1, aceites: {} } },
      { chaveEnvio: randomUUID(), valores: {}, consentimento: { versao: VERSAO_ATUAL, aceites: [] } },
    ];
    for (const corpo of ruins) {
      const resposta = await chamar(slug, corpo);
      assert.equal(resposta.status, 400, JSON.stringify(corpo));
      const json = (await resposta.json()) as { ok: boolean };
      assert.equal(json.ok, false);
    }
    assert.equal(loja().respostas.filter((r) => r.formularioId === id).length, 0);
  });

  it("formulário inexistente é recusa prevista (200 com ok:false), nunca 5xx", async () => {
    const resposta = await chamar("nao-existe-mesmo", corpoValido("35999997701"));
    assert.equal(resposta.status, 200);
    assert.equal(((await resposta.json()) as { ok: boolean }).ok, false);
  });

  it("validação por pergunta volta com 200 e o erro da pergunta", async () => {
    const { slug } = await novoFormulario();
    const resposta = await chamar(slug, corpoValido("12345"));
    assert.equal(resposta.status, 200);
    const json = (await resposta.json()) as { ok: boolean; porPergunta?: Record<string, string> };
    assert.equal(json.ok, false);
    assert.ok(json.porPergunta?.["r-whats"]);
  });
});

describe("limite por IP na rota", () => {
  it("chave nova acima do limite: 429 com Retry-After e sem gravar; chave existente: 200", async () => {
    process.env.LIMITE_POR_MINUTO = "2";
    const { slug, id } = await novoFormulario(false);
    const ip = "198.51.100.7";

    const primeiro = corpoValido("35999997711");
    assert.equal((await chamar(slug, primeiro, ip)).status, 200);
    assert.equal((await chamar(slug, corpoValido("35999997712"), ip)).status, 200);

    const barrada = await chamar(slug, corpoValido("35999997713"), ip);
    assert.equal(barrada.status, 429);
    const espera = Number(barrada.headers.get("retry-after"));
    assert.ok(Number.isInteger(espera) && espera >= 1 && espera <= 60, `Retry-After ${espera}`);
    const json = (await barrada.json()) as { ok: boolean; erro: string; tenteDeNovoEmSegundos: number };
    assert.equal(json.ok, false);
    assert.equal(json.erro, "LIMITE_EXCEDIDO");
    assert.equal(json.tenteDeNovoEmSegundos, espera);
    assert.equal(loja().respostas.filter((r) => r.formularioId === id).length, 2);

    // A mesma chave de um envio que já entrou continua devolvendo o original, mesmo no limite.
    const reenvio = await chamar(slug, primeiro, ip);
    assert.equal(reenvio.status, 200);
    assert.equal(((await reenvio.json()) as { jaEstavaRegistrada: boolean }).jaEstavaRegistrada, true);

    // Outro IP (outro cliente fora do Wi-Fi da loja) não é afetado.
    assert.equal((await chamar(slug, corpoValido("35999997714"), "198.51.100.8")).status, 200);
  });

  it("uso normal no mesmo Wi-Fi (15 envios seguidos) não bloqueia com os limites padrão", async () => {
    delete process.env.LIMITE_POR_MINUTO;
    delete process.env.LIMITE_POR_HORA;
    const { slug } = await novoFormulario(false);
    for (let i = 0; i < 15; i++) {
      const r = await chamar(slug, corpoValido(`3599999${String(7720 + i)}`), "192.0.2.50");
      assert.equal(r.status, 200, `envio ${i + 1}`);
    }
  });

  it("sem IP_HASH_SALT não há limite nem IP gravado", async () => {
    delete process.env.IP_HASH_SALT;
    process.env.LIMITE_POR_MINUTO = "1";
    const { slug } = await novoFormulario(false);
    assert.equal((await chamar(slug, corpoValido("35999997741"), "192.0.2.60")).status, 200);
    assert.equal((await chamar(slug, corpoValido("35999997742"), "192.0.2.60")).status, 200);
  });
});

describe("o que a resposta da rota entrega", () => {
  it("1º envio traz o cupom com no-store; reenvio da chave e 2º envio do telefone não trazem o código", async () => {
    const { slug } = await novoFormulario();
    const corpo = corpoValido("35999997751");

    const primeira = await chamar(slug, corpo);
    assert.equal(primeira.status, 200);
    assert.equal(primeira.headers.get("cache-control"), "no-store");
    const dados = (await primeira.json()) as { beneficios: { cupom: { status: string; codigo?: string } } };
    assert.equal(dados.beneficios.cupom.status, "emitido");
    assert.match(dados.beneficios.cupom.codigo ?? "", /^RTA-[A-Z0-9]{4}-[A-Z0-9]{2}$/);

    for (const reenvio of [corpo, corpoValido("+55 (35) 99999-7751")]) {
      const texto = await (await chamar(slug, reenvio)).text();
      assert.ok(!texto.includes("RTA-"), "o código não pode voltar");
      assert.ok(texto.includes("ja_emitido"));
      assert.ok(!/validoAte/.test(texto), "ja_emitido não leva validade");
    }
  });

  it("o slug do corpo é ignorado: vale o do endereço", async () => {
    const a = await novoFormulario(false);
    const b = await novoFormulario(false);
    const resposta = await chamar(a.slug, { ...corpoValido("35999997761"), slug: b.slug, formularioId: b.id });
    assert.equal(resposta.status, 200);
    assert.equal(loja().respostas.filter((r) => r.formularioId === a.id).length, 1);
    assert.equal(loja().respostas.filter((r) => r.formularioId === b.id).length, 0);
  });

  it("origem desconhecida vira link direto, sem erro", async () => {
    const { slug, id } = await novoFormulario(false);
    assert.equal((await chamar(slug, { ...corpoValido("35999997771"), origem: "<script>" })).status, 200);
    const gravada = loja().respostas.find((r) => r.formularioId === id)!;
    assert.ok(["nfc", "qr", "link", "direto"].includes(gravada.origem));
    assert.notEqual(gravada.origem, "<script>");
  });
});

describe("falha de gravação no banco", () => {
  /**
   * A fila offline (página e service worker) só guarda o envio para depois
   * quando a rota responde 5xx; qualquer 200 encerra o item. Uma queda do
   * banco no momento do reenvio tem que ser 5xx, ou o cadastro se perde.
   */
  it("responde 5xx (e não 200) quando a gravação falha, para a fila manter o envio", async () => {
    const { slug } = await novoFormulario();
    const original = respostasGravadas.gravar;
    respostasGravadas.gravar = async () => {
      throw new Error("conexão com o banco caiu");
    };
    const silenciado = { error: console.error, log: console.log, warn: console.warn };
    console.error = console.log = console.warn = () => {};
    let resposta: Response;
    try {
      resposta = await chamar(slug, corpoValido("35999990101"));
    } finally {
      respostasGravadas.gravar = original;
      Object.assign(console, silenciado);
    }
    assert.ok(resposta.status >= 500, `esperava 5xx, veio ${resposta.status}`);
  });
});
