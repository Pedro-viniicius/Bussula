/**
 * QA do cadastro: casos de borda que os testes do passo 6 não cobrem.
 *
 * Telefone colado em formatos diferentes, chave reenviada com dados
 * diferentes, consentimento malformado, chaves extras no corpo e o que
 * o servidor escreve nos logs quando a gravação falha.
 * Contra o modo de teste (repositórios em memória), tudo fictício.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { MODULOS_DESLIGADOS, type ModulosDoFormulario } from "../dominio/formularios/modulos";
import type { Pergunta } from "../dominio/formularios/perguntas";
import { CONFIGURACAO_DA_LOJA_PADRAO } from "../dominio/formularios/tipos";
import { VERSAO_ATUAL } from "../lib/texts/consentimento";
import { formulariosGravados, respostasGravadas } from "../repositorios";
import { loja } from "../repositorios/em-memoria/loja";
import { criarFormulario, publicarFormulario } from "./formularios";
import { registrarResposta, type EnvioDeResposta } from "./respostas";

const AGORA = new Date("2026-10-15T12:00:00-03:00");

const PERGUNTAS: Pergunta[] = [
  { id: "q-nome", tipo: "nome", enunciado: "Como você se chama?", ajuda: null, obrigatoria: false, opcoes: [], escala: null },
  { id: "q-whats", tipo: "whatsapp", enunciado: "Qual é o seu WhatsApp?", ajuda: null, obrigatoria: true, opcoes: [], escala: null },
];

const TUDO_LIGADO: ModulosDoFormulario = { recompra: true, ofertas: true, cupom: { prefixo: "QAB" }, indicacao: true };

async function novoFormulario(modulos: ModulosDoFormulario = TUDO_LIGADO) {
  const criado = await criarFormulario({
    nome: `Borda ${randomUUID().slice(0, 8)}`,
    descricao: null,
    perguntas: PERGUNTAS,
    modulos,
  });
  assert.ok(criado.ok);
  await formulariosGravados.salvarConfiguracaoDaLoja(criado.valor.id, {
    ...CONFIGURACAO_DA_LOJA_PADRAO,
    textoDoBrinde: "Brinde de borda",
  });
  assert.ok((await publicarFormulario(criado.valor.id)).ok);
  return { id: criado.valor.id, slug: criado.valor.slug };
}

function envio(slug: string, whats: string, parcial: Partial<EnvioDeResposta> = {}): EnvioDeResposta {
  return {
    slug,
    chaveEnvio: randomUUID(),
    origem: "nfc",
    valores: { "q-nome": "Teste Borda", "q-whats": whats },
    consentimento: { versao: VERSAO_ATUAL, aceites: { recompra: true, ofertas: false } },
    ...parcial,
  };
}

async function enviar(e: EnvioDeResposta) {
  const r = await registrarResposta(e, { agora: AGORA });
  assert.ok(r.ok, `esperava sucesso, veio ${JSON.stringify(r)}`);
  return r.valor;
}

describe("telefone colado em formatos diferentes", () => {
  it("+55, 55, máscara e só o número resultam no mesmo telefone: o segundo não ganha outro cupom", async () => {
    const { slug, id } = await novoFormulario();
    const formatos = ["+55 35 99999-8801", "5535999998801", "(35) 99999-8801", "35999998801", " 35 9 9999 8801 "];

    const primeiro = await enviar(envio(slug, formatos[0]));
    assert.equal(primeiro.beneficios.cupom?.status, "emitido");
    for (const formato of formatos.slice(1)) {
      const outro = await enviar(envio(slug, formato));
      assert.deepEqual(outro.beneficios.cupom, { status: "ja_emitido" }, `formato ${formato}`);
    }

    const telefones = new Set(loja().contatos.filter((c) => c.formularioId === id).map((c) => c.telefone));
    assert.deepEqual([...telefones], ["+5535999998801"]);
  });

  it("DDD 55 (Rio Grande do Sul) não é confundido com o código do país", async () => {
    const { slug, id } = await novoFormulario();
    await enviar(envio(slug, "55999998802"));
    await enviar(envio(slug, "+55 55 99999-8803"));
    const telefones = loja().contatos.filter((c) => c.formularioId === id).map((c) => c.telefone).sort();
    assert.deepEqual(telefones, ["+5555999998802", "+5555999998803"]);
  });

  it("número que não é celular brasileiro é recusado e nada é gravado", async () => {
    const { slug, id } = await novoFormulario();
    for (const ruim of ["3533334444", "+1 415 555 0100", "35 99999-99", "(00) 99999-8804", "abc"]) {
      const r = await registrarResposta(envio(slug, ruim), { agora: AGORA });
      assert.equal(r.ok, false, `aceitou ${ruim}`);
    }
    assert.equal(loja().contatos.filter((c) => c.formularioId === id).length, 0);
    assert.equal(loja().respostas.filter((x) => x.formularioId === id).length, 0);
  });
});

describe("chave reenviada", () => {
  it("com outro telefone no corpo, devolve o cadastro original: sem segundo contato nem segundo cupom", async () => {
    const { slug, id } = await novoFormulario();
    const original = envio(slug, "35999998811");
    await enviar(original);

    const reenvio = await enviar({ ...original, valores: { "q-nome": "Outro", "q-whats": "35999998812" } });
    assert.equal(reenvio.jaEstavaRegistrada, true);
    assert.deepEqual(reenvio.beneficios.cupom, { status: "ja_emitido" });

    const contatos = loja().contatos.filter((c) => c.formularioId === id);
    assert.equal(contatos.length, 1);
    assert.equal(contatos[0].telefone, "+5535999998811");
    assert.equal(contatos[0].nome, "Teste Borda");
  });

  it("repetida muitas vezes em paralelo grava uma só resposta e nunca expõe o código", async () => {
    const { slug, id } = await novoFormulario();
    const original = envio(slug, "35999998813");
    const resultados = await Promise.all(Array.from({ length: 8 }, () => registrarResposta(original, { agora: AGORA })));

    assert.ok(resultados.every((r) => r.ok));
    assert.equal(loja().respostas.filter((r) => r.formularioId === id).length, 1);
    assert.equal(loja().contatos.filter((c) => c.formularioId === id).length, 1);
    assert.equal(resultados.filter((r) => r.ok && r.valor.beneficios.cupom?.status === "emitido").length, 1);
  });

  it("telefones iguais em chaves diferentes e simultâneas: só uma chave leva o cupom", async () => {
    const { slug, id } = await novoFormulario();
    const resultados = await Promise.all(
      Array.from({ length: 8 }, () => registrarResposta(envio(slug, "35999998814"), { agora: AGORA })),
    );
    assert.ok(resultados.every((r) => r.ok));
    const emitidos = resultados.filter((r) => r.ok && r.valor.beneficios.cupom?.status === "emitido");
    assert.equal(emitidos.length, 1);
    assert.equal(loja().contatos.filter((c) => c.formularioId === id && c.cupom).length, 1);
  });
});

describe("indicação (ref)", () => {
  it("ref em minúsculas, com espaço, longo demais ou com símbolo é ignorado sem erro", async () => {
    const { slug, id } = await novoFormulario();
    const dono = await enviar(envio(slug, "35999998821"));
    const codigo = dono.beneficios.indicacao!.codigo;

    const refs = [codigo.toLowerCase(), ` ${codigo}`, `${codigo}X`, `${codigo.slice(0, 7)}!`, "", "0O1IL000"];
    for (const [i, ref] of refs.entries()) {
      const amigo = await enviar(envio(slug, `359999989${String(10 + i)}`, { ref }));
      assert.equal(amigo.beneficios.cupom?.status, "emitido", `ref "${ref}"`);
    }
    assert.equal(loja().contatos.filter((c) => c.formularioId === id && c.indicadoPor).length, 0);
  });

  it("o próprio telefone com formato diferente também é auto-indicação", async () => {
    const { slug, id } = await novoFormulario();
    const dono = await enviar(envio(slug, "35999998822"));
    await enviar(envio(slug, "+55 (35) 99999-8822", { ref: dono.beneficios.indicacao!.codigo }));
    assert.equal(loja().contatos.filter((c) => c.formularioId === id && c.indicadoPor).length, 0);
  });

  it("ref de outro formulário vale (o link pode apontar para um formulário de destino)", async () => {
    const a = await novoFormulario();
    const b = await novoFormulario();
    const dono = await enviar(envio(a.slug, "35999998823"));
    await enviar(envio(b.slug, "35999998824", { ref: dono.beneficios.indicacao!.codigo }));
    const indicado = loja().contatos.find((c) => c.telefone === "+5535999998824" && c.formularioId === b.id);
    const quemIndicou = loja().contatos.find((c) => c.telefone === "+5535999998823");
    assert.equal(indicado?.indicadoPor, quemIndicou?.id);
  });
});

describe("consentimento malformado", () => {
  it("valor que não é booleano true conta como não; finalidade desligada no formulário é ignorada", async () => {
    const { slug, id } = await novoFormulario({ ...TUDO_LIGADO, ofertas: false });
    const r = await enviar(
      envio(slug, "35999998831", {
        consentimento: {
          versao: VERSAO_ATUAL,
          aceites: { recompra: "true" as unknown as boolean, ofertas: true, marketing: true, "__proto__": true },
        },
      }),
    );
    assert.equal(r.beneficios.cupom?.status, "emitido");
    const contato = loja().contatos.find((c) => c.formularioId === id)!;
    const consentimentos = loja().consentimentos.filter((c) => c.contatoId === contato.id);
    assert.deepEqual(
      consentimentos.map((c) => [c.finalidade, c.concedido]),
      [["recompra", false]],
    );
  });

  it("versão desconhecida, aceites como lista ou texto: recusa e nada é gravado", async () => {
    const { slug, id } = await novoFormulario();
    const ruins = [
      { versao: "1999-01-01.v0", aceites: { recompra: true } },
      { versao: VERSAO_ATUAL, aceites: [] as unknown as Record<string, boolean> },
      { versao: VERSAO_ATUAL, aceites: "sim" as unknown as Record<string, boolean> },
      { versao: 7 as unknown as string, aceites: {} },
    ];
    for (const consentimento of ruins) {
      const r = await registrarResposta(envio(slug, "35999998832", { consentimento }), { agora: AGORA });
      assert.equal(r.ok, false);
    }
    assert.equal(loja().respostas.filter((x) => x.formularioId === id).length, 0);
  });
});

describe("corpo com chaves que o formulário não tem", () => {
  it("chave extra com telefone, nome ou e-mail não vai para `valores`", async () => {
    const { slug, id } = await novoFormulario(MODULOS_DESLIGADOS);
    await enviar(
      envio(slug, "35999998841", {
        consentimento: null,
        valores: {
          "q-nome": "Fulano Extra",
          "q-whats": "35999998841",
          telefone: "+5535999998841",
          nome: "Fulano Extra",
          email: "a@b.com",
          whatsapp: "35999998841",
        },
      }),
    );
    const resposta = loja().respostas.find((r) => r.formularioId === id)!;
    const dump = JSON.stringify(resposta.valores);
    assert.equal(dump, "{}");
    assert.ok(!dump.includes("99998841"));
  });
});

describe("logs quando a gravação falha", () => {
  /**
   * O driver do Postgres (drizzle) escreve a consulta e os PARÂMETROS na
   * mensagem do erro: nome, telefone, cupom e código de indicação. O serviço
   * não pode repassar essa mensagem ao log.
   */
  it("o erro do banco não leva nome, telefone nem código para o log", async () => {
    const { slug } = await novoFormulario();
    const original = respostasGravadas.gravar;
    respostasGravadas.gravar = async () => {
      throw new Error(
        'Failed query: insert into "contatos" ("nome", "telefone", "cupom") values ($1, $2, $3)\n' +
          "params: Maria Segredo,+5535999998851,QAB-ABCD-EF,ZXCVBNMK",
      );
    };
    const saida: string[] = [];
    const guardados = { log: console.log, warn: console.warn, error: console.error };
    const capturar = (linha: unknown) => void saida.push(String(linha));
    console.log = capturar;
    console.warn = capturar;
    console.error = capturar;
    let resultado;
    try {
      resultado = await registrarResposta(envio(slug, "35999998851", { valores: { "q-nome": "Maria Segredo", "q-whats": "35999998851" } }), {
        agora: AGORA,
      });
    } finally {
      respostasGravadas.gravar = original;
      Object.assign(console, guardados);
    }

    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.equal(resultado.erro, "FALHA_DE_PERSISTENCIA");
    const tudo = saida.join("\n");
    assert.ok(tudo.includes("falha ao gravar resposta"), "deve registrar a falha");
    assert.ok(!tudo.includes("Maria Segredo"), "nome vazou no log");
    assert.ok(!tudo.includes("5535999998851"), "telefone vazou no log");
    assert.ok(!tudo.includes("QAB-ABCD-EF"), "cupom vazou no log");
    assert.ok(!tudo.includes("ZXCVBNMK"), "código de indicação vazou no log");
  });
});

describe("caractere nulo (U+0000) no texto", () => {
  /**
   * O Postgres recusa U+0000 em `text` e em `jsonb`: a gravação falharia com
   * erro de banco, a rota responderia 5xx e a fila offline tentaria de novo
   * para sempre. Tem que ser recusa de validação (200, ok:false), como
   * qualquer outro texto inválido.
   */
  it("nome com U+0000 é recusado na validação, não chega ao banco", async () => {
    const { slug, id } = await novoFormulario();
    const r = await registrarResposta(envio(slug, "35999998861", { valores: { "q-nome": "Maria\u0000 Silva", "q-whats": "35999998861" } }), {
      agora: AGORA,
    });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.erro, "VALIDACAO_FALHOU");
    assert.equal(loja().contatos.filter((c) => c.formularioId === id).length, 0);
  });
});
