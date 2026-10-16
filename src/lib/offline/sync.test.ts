import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, mock, test } from "node:test";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import type { EnvioDeResposta } from "@/servicos/respostas";
import { fila, type ItemFila } from "./queue";
import { EVENTO_FILA_ENVIADA, postarResposta, sincronizar, type DetalheFilaEnviada } from "./sync";

const envio: EnvioDeResposta = {
  slug: "cadastro-no-balcao",
  chaveEnvio: "chave-1",
  valores: {},
  origem: "nfc",
};

function responder(corpo: unknown, init: ResponseInit = {}) {
  globalThis.fetch = (async () =>
    new Response(typeof corpo === "string" ? corpo : JSON.stringify(corpo), init)) as typeof fetch;
}

const fetchOriginal = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = fetchOriginal;
});

describe("postarResposta", () => {
  test("429 devolve o resultado em vez de lançar", async () => {
    responder(
      { ok: false, erro: "LIMITE_EXCEDIDO", mensagem: "Muitos envios", tenteDeNovoEmSegundos: 42 },
      { status: 429, headers: { "Retry-After": "42" } },
    );
    const r = await postarResposta(envio.slug, envio);
    assert.equal(r.ok, false);
    assert.equal(!r.ok && r.erro, "LIMITE_EXCEDIDO");
    assert.equal(!r.ok && r.tenteDeNovoEmSegundos, 42);
  });

  test("429 com corpo que não é JSON usa o Retry-After e continua sendo limite", async () => {
    responder("<html>bad gateway</html>", { status: 429, headers: { "Retry-After": "30" } });
    const r = await postarResposta(envio.slug, envio);
    assert.equal(!r.ok && r.erro, "LIMITE_EXCEDIDO");
    assert.equal(!r.ok && r.tenteDeNovoEmSegundos, 30);
  });

  test("429 sem cabeçalho nem corpo cai em 60 segundos", async () => {
    responder("", { status: 429 });
    const r = await postarResposta(envio.slug, envio);
    assert.equal(!r.ok && r.tenteDeNovoEmSegundos, 60);
  });

  test("503 lança, para a página enfileirar", async () => {
    responder({ ok: false }, { status: 503 });
    await assert.rejects(postarResposta(envio.slug, envio));
  });

  test("200 devolve o corpo, com os benefícios", async () => {
    const corpo: ResultadoDoEnvio = {
      ok: true,
      jaEstavaRegistrada: false,
      beneficios: { cupom: { status: "ja_emitido" }, indicacao: null },
    };
    responder(corpo, { status: 200 });
    assert.deepEqual(await postarResposta(envio.slug, envio), corpo);
  });
});

describe("sincronizar", () => {
  let itens: ItemFila[];
  let removidos: string[];
  let atualizados: ItemFila[];
  let eventos: DetalheFilaEnviada[];
  const original = { ...fila };
  const janelaOriginal = (globalThis as { window?: unknown }).window;

  function item(chave: string): ItemFila {
    return { chave, slug: envio.slug, envio: { ...envio, chaveEnvio: chave }, criadoEm: Date.now(), tentativas: 0 };
  }

  beforeEach(() => {
    mock.timers.enable({ apis: ["setTimeout"] });
    itens = [];
    removidos = [];
    atualizados = [];
    eventos = [];
    fila.disponivel = () => true;
    fila.listar = async () => itens;
    fila.remover = async (chave) => {
      removidos.push(chave);
      return undefined;
    };
    fila.atualizar = async (i) => {
      atualizados.push(i);
      return undefined as never;
    };
    const janela = new EventTarget();
    (globalThis as { window?: unknown }).window = janela;
    janela.addEventListener(EVENTO_FILA_ENVIADA, (e) => eventos.push((e as CustomEvent<DetalheFilaEnviada>).detail));
  });

  afterEach(() => {
    mock.timers.reset();
    Object.assign(fila, original);
    (globalThis as { window?: unknown }).window = janelaOriginal;
  });

  test("item enviado sai da fila e emite fila:enviada com a chave e o resultado", async () => {
    itens = [item("a")];
    const corpo: ResultadoDoEnvio = {
      ok: true,
      jaEstavaRegistrada: false,
      beneficios: {
        cupom: { status: "emitido", codigo: "ESS-ABCD-23", textoDoBrinde: "10%", validoAte: "2026-11-14" },
        indicacao: null,
      },
    };
    responder(corpo, { status: 200 });
    await sincronizar();
    assert.deepEqual(removidos, ["a"]);
    assert.deepEqual(eventos, [{ chave: "a", resultado: corpo }]);
  });

  test("429 no reenvio mantém o item na fila, não emite fila:enviada e espera o Retry-After", async () => {
    itens = [item("b")];
    responder(
      { ok: false, erro: "LIMITE_EXCEDIDO", mensagem: "x", tenteDeNovoEmSegundos: 600 },
      { status: 429, headers: { "Retry-After": "600" } },
    );
    await sincronizar();
    assert.deepEqual(removidos, []);
    assert.equal(eventos.length, 0);

    // Nova tentativa só depois da espera pedida (acima do teto da espera crescente, 5 min).
    let chamadas = 0;
    globalThis.fetch = (async () => {
      chamadas++;
      return new Response(JSON.stringify({ ok: true, jaEstavaRegistrada: false }), { status: 200 });
    }) as typeof fetch;
    mock.timers.tick(599_000);
    await new Promise((r) => setImmediate(r));
    assert.equal(chamadas, 0, "reenviou antes do Retry-After");
    mock.timers.tick(1_000);
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    assert.equal(chamadas, 1);
    assert.deepEqual(removidos, ["b"]);
    assert.equal(eventos.length, 1);
  });

  test("o primeiro 429 interrompe o laço: os itens seguintes não são enviados agora", async () => {
    itens = [item("e1"), item("e2"), item("e3")];
    let chamadas = 0;
    globalThis.fetch = (async () => {
      chamadas++;
      return new Response(
        JSON.stringify({ ok: false, erro: "LIMITE_EXCEDIDO", mensagem: "x", tenteDeNovoEmSegundos: 600 }),
        { status: 429, headers: { "Retry-After": "600" } },
      );
    }) as typeof fetch;
    await sincronizar();
    assert.equal(chamadas, 1);
    assert.deepEqual(removidos, []);
    assert.equal(eventos.length, 0);
  });

  test("503 mantém o item na fila, conta a tentativa e não emite evento", async () => {
    itens = [item("c")];
    responder({}, { status: 503 });
    await sincronizar();
    assert.deepEqual(removidos, []);
    assert.equal(atualizados.length, 1);
    assert.equal(atualizados[0].tentativas, 1);
    assert.equal(eventos.length, 0);
  });

  test("resposta de item antigo, sem beneficios, é entregue como veio", async () => {
    itens = [item("d")];
    responder({ ok: true, jaEstavaRegistrada: false }, { status: 200 });
    await sincronizar();
    assert.equal(eventos.length, 1);
    const r = eventos[0].resultado;
    assert.equal(r.ok && r.beneficios, undefined);
  });
});
