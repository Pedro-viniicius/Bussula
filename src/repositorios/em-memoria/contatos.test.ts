/**
 * Testes dos repositórios em memória de respostas e contatos.
 *
 * A versão em Postgres tem o mesmo contrato mas não tem teste automatizado
 * (o projeto não sobe banco nos testes): estes testes fixam o comportamento
 * que o roteiro manual no Neon precisa reproduzir.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { cupomComFormatoValido } from "../../dominio/contatos/codigos";
import { ConflitoDeContato } from "../../dominio/contatos/repositorio";
import type { ContatoParaGravar } from "../../dominio/contatos/tipos";
import { VERSAO_ATUAL } from "../../lib/texts/consentimento";
import { repositorioDeContatosEmMemoria as contatos } from "./contatos";
import { repositorioDeRespostasEmMemoria as respostas } from "./respostas";
import { loja } from "./loja";

const BALCAO = "form-cadastro-no-balcao";
const EXPERIENCIA = "form-experiencia-na-loja";
const DEPOIS_DE_TUDO = 60_000;

let sequencia = 0;
/** Telefone novo a cada chamada, fora da faixa dos dados fictícios (+55 11 9 0000-00NN). */
function telefoneNovo(): string {
  sequencia += 1;
  return `+55219${String(70000000 + sequencia)}`;
}
/** Código novo e válido a cada chamada. */
function codigo(prefixo: string): string {
  sequencia += 1;
  const letras = Array.from({ length: 4 }, (_, i) => String.fromCharCode(65 + (Math.floor(sequencia / 26 ** i) % 26)));
  return `${prefixo}-${letras.reverse().join("")}-KK`;
}

function contato(parcial: Partial<ContatoParaGravar> & Pick<ContatoParaGravar, "telefone">): ContatoParaGravar {
  return {
    nome: "Teste Fictício",
    versaoDoConsentimento: VERSAO_ATUAL,
    consentimentos: [
      { finalidade: "recompra", concedido: true },
      { finalidade: "ofertas", concedido: false },
    ],
    cupom: null,
    codigoIndicacao: null,
    indicadoPor: null,
    ...parcial,
  };
}

function cupom(brinde: string | null = "Brinde de teste") {
  return { codigo: codigo("ESS"), brinde, expiraEm: new Date(Date.now() + 30 * 24 * 60 * 60_000) };
}

function envio(formularioId: string, c: ContatoParaGravar | null, ipHash: string | null = null) {
  return {
    formularioId,
    versaoFormulario: 1,
    chaveEnvio: randomUUID(),
    valores: { "p-conheceu": "Redes sociais" },
    origem: "nfc" as const,
    ipHash,
    contato: c,
  };
}

describe("gravação de resposta com contato", () => {
  it("grava a resposta, o contato e os consentimentos juntos", async () => {
    const telefone = telefoneNovo();
    const entrada = envio(BALCAO, contato({ telefone, cupom: cupom(), codigoIndicacao: "ABCDEFGH" }));
    const antes = loja().consentimentos.length;

    const gravado = await respostas.gravar(entrada);
    assert.equal(gravado.duplicada, false);
    assert.ok(gravado.contato);
    assert.equal(gravado.contato.codigoIndicacao, "ABCDEFGH");
    assert.ok(gravado.contato.cupomExpiraEm);
    assert.equal(loja().consentimentos.length, antes + 2);
    assert.equal(loja().contatos.find((c) => c.id === gravado.contato!.id)?.respostaId, gravado.resposta.id);
  });

  it("sem contato, grava só a resposta", async () => {
    const gravado = await respostas.gravar(envio(BALCAO, null));
    assert.equal(gravado.contato, null);
    assert.equal(loja().contatos.some((c) => c.respostaId === gravado.resposta.id), false);
  });

  it("sem versão de consentimento não grava linha de consentimento", async () => {
    const antes = loja().consentimentos.length;
    await respostas.gravar(
      envio(BALCAO, contato({ telefone: telefoneNovo(), versaoDoConsentimento: null, consentimentos: [] })),
    );
    assert.equal(loja().consentimentos.length, antes);
  });

  it("é atômica: se o contato conflita, nem a resposta fica gravada", async () => {
    const existente = cupom();
    await respostas.gravar(envio(BALCAO, contato({ telefone: telefoneNovo(), cupom: existente })));

    const respostasAntes = loja().respostas.length;
    const contatosAntes = loja().contatos.length;
    const consentimentosAntes = loja().consentimentos.length;
    const ipsAntes = loja().ipsDeEnvio.length;
    const repetida = envio(BALCAO, contato({ telefone: telefoneNovo(), cupom: { ...cupom(), codigo: existente.codigo } }), "ip-x");

    await assert.rejects(
      () => respostas.gravar(repetida),
      (erro) => erro instanceof ConflitoDeContato && erro.tipo === "codigo",
    );

    assert.equal(loja().respostas.length, respostasAntes);
    assert.equal(loja().contatos.length, contatosAntes);
    assert.equal(loja().consentimentos.length, consentimentosAntes);
    assert.equal(loja().ipsDeEnvio.length, ipsAntes);
    assert.equal(await respostas.buscarPorChave(repetida.chaveEnvio), null);
  });

  it("código de indicação repetido também é conflito de código", async () => {
    await respostas.gravar(envio(BALCAO, contato({ telefone: telefoneNovo(), codigoIndicacao: "QQQQ2222" })));
    await assert.rejects(
      () => respostas.gravar(envio(BALCAO, contato({ telefone: telefoneNovo(), codigoIndicacao: "QQQQ2222" }))),
      (erro) => erro instanceof ConflitoDeContato && erro.tipo === "codigo",
    );
  });

  it("a mesma chave devolve a resposta e o contato originais, sem gravar de novo", async () => {
    const entrada = envio(BALCAO, contato({ telefone: telefoneNovo(), cupom: cupom() }));
    const primeiro = await respostas.gravar(entrada);
    const total = loja().contatos.length;

    const repetido = await respostas.gravar({ ...entrada, contato: contato({ telefone: telefoneNovo(), cupom: cupom() }) });
    assert.equal(repetido.duplicada, true);
    assert.equal(repetido.resposta.id, primeiro.resposta.id);
    assert.equal(repetido.contato?.id, primeiro.contato?.id);
    assert.equal(repetido.contato?.cupom, primeiro.contato?.cupom);
    assert.equal(loja().contatos.length, total);
  });

  it("buscarPorChave devolve a resposta e o contato; chave desconhecida, nulo", async () => {
    const entrada = envio(BALCAO, contato({ telefone: telefoneNovo() }));
    const gravado = await respostas.gravar(entrada);
    const achado = await respostas.buscarPorChave(entrada.chaveEnvio);
    assert.equal(achado?.resposta.id, gravado.resposta.id);
    assert.equal(achado?.contato?.id, gravado.contato?.id);
    assert.equal(await respostas.buscarPorChave(randomUUID()), null);
  });
});

describe("um cupom por telefone por formulário, para sempre", () => {
  it("bloqueia o segundo cupom do mesmo telefone no mesmo formulário", async () => {
    const telefone = telefoneNovo();
    assert.equal(await contatos.jaRecebeuCupom(BALCAO, telefone), false);
    await respostas.gravar(envio(BALCAO, contato({ telefone, cupom: cupom() })));
    assert.equal(await contatos.jaRecebeuCupom(BALCAO, telefone), true);

    await assert.rejects(
      () => respostas.gravar(envio(BALCAO, contato({ telefone, cupom: cupom() }))),
      (erro) => erro instanceof ConflitoDeContato && erro.tipo === "cupom_do_telefone",
    );
  });

  it("vale mesmo com o primeiro cupom vencido", async () => {
    const telefone = telefoneNovo();
    await respostas.gravar(
      envio(BALCAO, contato({ telefone, cupom: { ...cupom(), expiraEm: new Date(Date.now() - DEPOIS_DE_TUDO) } })),
    );
    assert.equal(await contatos.jaRecebeuCupom(BALCAO, telefone), true);
    await assert.rejects(
      () => respostas.gravar(envio(BALCAO, contato({ telefone, cupom: cupom() }))),
      ConflitoDeContato,
    );
  });

  it("outro formulário libera o cupom para o mesmo telefone", async () => {
    const telefone = telefoneNovo();
    await respostas.gravar(envio(BALCAO, contato({ telefone, cupom: cupom() })));
    assert.equal(await contatos.jaRecebeuCupom(EXPERIENCIA, telefone), false);
    const outro = await respostas.gravar(envio(EXPERIENCIA, contato({ telefone, cupom: cupom() })));
    assert.ok(outro.contato?.cupom);
  });

  it("cadastrar de novo SEM cupom no mesmo formulário é permitido", async () => {
    const telefone = telefoneNovo();
    await respostas.gravar(envio(BALCAO, contato({ telefone, cupom: cupom() })));
    const segundo = await respostas.gravar(envio(BALCAO, contato({ telefone, cupom: null })));
    assert.equal(segundo.contato?.cupom, null);
  });
});

describe("contagem de envios por IP", () => {
  it("conta só o IP pedido, desde a data, e informa o mais antigo", async () => {
    const ip = `ip-${randomUUID()}`;
    assert.deepEqual(await respostas.contarPorIp(ip, new Date(0)), { total: 0, maisAntigaEm: null });

    const primeira = await respostas.gravar(envio(BALCAO, null, ip));
    await respostas.gravar(envio(BALCAO, null, ip));
    await respostas.gravar(envio(BALCAO, null, `outro-${ip}`));
    await respostas.gravar(envio(BALCAO, null, null));

    const contagem = await respostas.contarPorIp(ip, new Date(Date.now() - DEPOIS_DE_TUDO));
    assert.equal(contagem.total, 2);
    assert.deepEqual(contagem.maisAntigaEm, primeira.resposta.criadoEm);

    const futuro = await respostas.contarPorIp(ip, new Date(Date.now() + DEPOIS_DE_TUDO));
    assert.deepEqual(futuro, { total: 0, maisAntigaEm: null });
  });

  it("uma chave repetida não conta de novo", async () => {
    const ip = `ip-${randomUUID()}`;
    const entrada = envio(BALCAO, null, ip);
    await respostas.gravar(entrada);
    await respostas.gravar(entrada);
    assert.equal((await respostas.contarPorIp(ip, new Date(0))).total, 1);
  });
});

describe("aceita mensagens, por telefone", () => {
  const aceita = async (id: string) => (await contatos.buscarCompleto(id))?.aceitaMensagens;

  it("vale a última resposta explícita por finalidade: sem finalidades não muda, recusa explícita revoga", async () => {
    const telefone = telefoneNovo();
    const a = await respostas.gravar(envio(BALCAO, contato({ telefone })));
    assert.equal(await aceita(a.contato!.id), true);

    // B não exibiu nenhuma finalidade: continua aceitando.
    const b = await respostas.gravar(
      envio(EXPERIENCIA, contato({ telefone, versaoDoConsentimento: null, consentimentos: [] })),
    );
    assert.equal(await aceita(a.contato!.id), true);
    assert.equal(await aceita(b.contato!.id), true);

    // C desmarcou recompra explicitamente: deixa de aceitar (vale para todas as linhas do número).
    const c = await respostas.gravar(
      envio(BALCAO, contato({ telefone, consentimentos: [{ finalidade: "recompra", concedido: false }] })),
    );
    assert.equal(await aceita(a.contato!.id), false);
    assert.equal(await aceita(c.contato!.id), false);
    const lista = await contatos.listar({ ordem: "recentes", pagina: 1, somenteQueAceitam: true }, 1000);
    assert.equal(lista.itens.some((l) => l.telefone === telefone), false);
  });

  it("ofertas é independente de recompra", async () => {
    const telefone = telefoneNovo();
    await respostas.gravar(envio(BALCAO, contato({ telefone })));
    const depois = await respostas.gravar(
      envio(
        BALCAO,
        contato({
          telefone,
          consentimentos: [
            { finalidade: "recompra", concedido: false },
            { finalidade: "ofertas", concedido: true },
          ],
        }),
      ),
    );
    assert.equal(await aceita(depois.contato!.id), true);
    const meu = (await contatos.paraExportacao({})).find((l) => l.telefone === telefone)!;
    assert.equal(meu.aceitaRecompra, false);
    assert.equal(meu.aceitaOfertas, true);

    // Recusar só ofertas depois não mexe em recompra (que já estava recusada): ninguém aceita.
    const ultimo = await respostas.gravar(
      envio(BALCAO, contato({ telefone, consentimentos: [{ finalidade: "ofertas", concedido: false }] })),
    );
    assert.equal(await aceita(ultimo.contato!.id), false);
  });

  it("um 'sim' posterior reativa o número", async () => {
    const telefone = telefoneNovo();
    await respostas.gravar(
      envio(BALCAO, contato({ telefone, consentimentos: [{ finalidade: "recompra", concedido: false }] })),
    );
    const depois = await respostas.gravar(envio(BALCAO, contato({ telefone })));
    assert.equal(await aceita(depois.contato!.id), true);
  });

  it("quem nunca respondeu a nenhuma finalidade não aceita", async () => {
    const telefone = telefoneNovo();
    const unico = await respostas.gravar(
      envio(BALCAO, contato({ telefone, versaoDoConsentimento: null, consentimentos: [] })),
    );
    assert.equal(await aceita(unico.contato!.id), false);
  });
});

describe("lista, resumo e exportação", () => {
  it("o telefone dos dados fictícios que se cadastrou de novo e revogou não aceita mensagens", async () => {
    // Contatos 3 e 9 do "Cadastro no balcão" têm o mesmo telefone; o 9º revogou.
    const lista = await contatos.listar({ formularioId: BALCAO, ordem: "recentes", pagina: 1 }, 1000);
    const repetidos = lista.itens.filter((l) => l.telefone === "+5511900000003");
    assert.equal(repetidos.length, 2);
    for (const linha of repetidos) assert.equal(linha.aceitaMensagens, false);
  });

  it("filtra por formulário e por origem, e pagina", async () => {
    const todos = await contatos.listar({ formularioId: BALCAO, ordem: "recentes", pagina: 1 }, 1000);
    assert.ok(todos.total >= 12);
    for (const linha of todos.itens) assert.equal(linha.formularioId, BALCAO);

    const nfc = await contatos.listar({ formularioId: BALCAO, origem: "nfc", ordem: "recentes", pagina: 1 }, 1000);
    for (const linha of nfc.itens) assert.equal(linha.origem, "nfc");
    assert.ok(nfc.total <= todos.total);

    const pagina = await contatos.listar({ formularioId: BALCAO, ordem: "recentes", pagina: 1 }, 5);
    assert.equal(pagina.itens.length, 5);
    assert.equal(pagina.paginas, Math.ceil(todos.total / 5));
    const segunda = await contatos.listar({ formularioId: BALCAO, ordem: "recentes", pagina: 2 }, 5);
    assert.notEqual(segunda.itens[0].id, pagina.itens[0].id);
  });

  it("ordena os mais recentes primeiro, ou pelas indicações", async () => {
    const recentes = await contatos.listar({ ordem: "recentes", pagina: 1 }, 1000);
    for (let i = 1; i < recentes.itens.length; i++) {
      assert.ok(recentes.itens[i - 1].criadoEm >= recentes.itens[i].criadoEm);
    }
    const porIndicacao = await contatos.listar({ ordem: "indicacoes", pagina: 1 }, 1000);
    for (let i = 1; i < porIndicacao.itens.length; i++) {
      assert.ok(porIndicacao.itens[i - 1].indicacoes >= porIndicacao.itens[i].indicacoes);
    }
    // No dado fictício, o contato 1 indicou 3 telefones distintos e o 3, um.
    assert.equal(porIndicacao.itens[0].indicacoes >= 3, true);
  });

  it("conta indicações por telefones distintos, e indicar o mesmo telefone duas vezes conta uma", async () => {
    const quemIndica = await respostas.gravar(envio(BALCAO, contato({ telefone: telefoneNovo(), codigoIndicacao: "INDICA22" })));
    const amigo = telefoneNovo();
    for (let i = 0; i < 2; i++) {
      await respostas.gravar(envio(BALCAO, contato({ telefone: amigo, indicadoPor: quemIndica.contato!.id })));
    }
    await respostas.gravar(envio(BALCAO, contato({ telefone: telefoneNovo(), indicadoPor: quemIndica.contato!.id })));

    const lista = await contatos.listar({ formularioId: BALCAO, ordem: "recentes", pagina: 1 }, 1000);
    assert.equal(lista.itens.find((l) => l.id === quemIndica.contato!.id)?.indicacoes, 2);
    assert.deepEqual(await contatos.porCodigoDeIndicacao("INDICA22"), {
      id: quemIndica.contato!.id,
      telefone: lista.itens.find((l) => l.id === quemIndica.contato!.id)!.telefone,
    });
    assert.equal(await contatos.porCodigoDeIndicacao("NAOEXIST"), null);
  });

  it("resumo conta contatos, quem aceita, cupons e indicações", async () => {
    const resumo = await contatos.resumo();
    assert.ok(resumo.contatos >= 12);
    assert.ok(resumo.aceitamMensagens > 0 && resumo.aceitamMensagens <= resumo.contatos);
    assert.ok(resumo.cuponsEmitidos > 0);
    assert.ok(resumo.indicacoes >= 4);
  });

  it("a exportação traz um registro por telefone, só de quem aceita", async () => {
    const linhas = await contatos.paraExportacao({});
    const telefones = linhas.map((l) => l.telefone);
    assert.equal(new Set(telefones).size, telefones.length);
    for (const linha of linhas) assert.equal(linha.aceitaRecompra || linha.aceitaOfertas, true);
    assert.equal(telefones.includes("+5511900000003"), false);
  });

  it("a exportação escolhe o cadastro mais recente que passa nos filtros", async () => {
    const telefone = telefoneNovo();
    await respostas.gravar(envio(BALCAO, contato({ telefone, nome: "Antigo" })));
    await respostas.gravar(envio(BALCAO, contato({ telefone, nome: "Novo" })));
    const linhas = await contatos.paraExportacao({ formularioId: BALCAO });
    const dele = linhas.filter((l) => l.telefone === telefone);
    assert.equal(dele.length, 1);
    assert.equal(dele[0].nome, "Novo");
  });

  it("buscarCompleto devolve o cupom e o brinde; id desconhecido, nulo", async () => {
    const gravado = await respostas.gravar(envio(BALCAO, contato({ telefone: telefoneNovo(), cupom: cupom("Shaker") })));
    const completo = await contatos.buscarCompleto(gravado.contato!.id);
    assert.equal(completo?.cupom?.brinde, "Shaker");
    assert.equal(completo?.cupom?.codigo, gravado.contato!.cupom);
    assert.equal(await contatos.buscarCompleto(randomUUID()), null);
  });
});

describe("dados fictícios do cadastro no balcão", () => {
  it("são claramente fictícios e têm cupom no formato certo", () => {
    const doBalcao = loja().contatos.filter((c) => c.id.startsWith("contato-balcao-"));
    assert.equal(doBalcao.length, 12);
    for (const c of doBalcao) {
      assert.match(c.telefone, /^\+55119000000\d\d$/);
      if (c.nome) assert.match(c.nome, /^Contato Fictício \d\d$/);
      if (c.cupom) assert.ok(cupomComFormatoValido(c.cupom));
    }
  });

  it("o dado pessoal nunca está em respostas.valores", () => {
    const idsPessoais = new Set(["p-nome", "p-whatsapp"]);
    for (const resposta of loja().respostas) {
      for (const id of Object.keys(resposta.valores)) assert.equal(idsPessoais.has(id), false);
    }
    const telefones = loja().contatos.map((c) => c.telefone);
    const dump = JSON.stringify(loja().respostas.map((r) => r.valores));
    for (const telefone of telefones) assert.equal(dump.includes(telefone.slice(3)), false);
  });
});
