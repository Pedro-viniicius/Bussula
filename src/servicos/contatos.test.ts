/**
 * Testes do serviço de contatos do painel, contra os dados fictícios em
 * memória: máscara na origem, revelar com auditoria, links do WhatsApp,
 * exportação em CSV e a conferência de origem da exportação.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { CONTATOS_POR_PAGINA } from "../dominio/constantes";
import type { ContatoParaGravar } from "../dominio/contatos/tipos";
import type { SessaoAdmin } from "../lib/admin/session-token";
import { VERSAO_ATUAL } from "../lib/texts/consentimento";
import { repositorioDeRespostasEmMemoria as respostas } from "../repositorios/em-memoria/respostas";
import {
  exportarContatosCsv,
  lerFiltrosDeContatos,
  listarContatos,
  neutralizarCelula,
  origemConfiavel,
  resumoDosContatos,
  revelarContato,
} from "./contatos";
import { auditoriaEmMemoria } from "../repositorios/auditoria";

const BALCAO = "form-cadastro-no-balcao";
const SESSAO: SessaoAdmin = { id: "sessao-de-teste", exp: Math.floor(Date.now() / 1000) + 3600 };
const DIA = 24 * 60 * 60_000;

type Trilha = { acao: string; usuarioId?: string | null; metadados?: Record<string, unknown> }[];
const trilha = () => (globalThis as unknown as { trilhaEmMemoria?: Trilha }).trilhaEmMemoria ?? [];

let sequencia = 0;

/** Grava um contato novo, com telefone próprio, e devolve o id e o telefone. */
async function novoContato(parcial: Partial<ContatoParaGravar> = {}) {
  sequencia += 1;
  const telefone = `+55359${String(80000000 + sequencia)}`;
  const contato: ContatoParaGravar = {
    nome: "Marcos Antunes Silva",
    telefone,
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
  const gravado = await respostas.gravar({
    formularioId: BALCAO,
    versaoFormulario: 1,
    chaveEnvio: randomUUID(),
    valores: {},
    origem: "qr",
    ipHash: null,
    contato,
  });
  return { id: gravado.contato!.id, telefone };
}

function cupomDe(diasDeValidade: number) {
  sequencia += 1;
  return {
    codigo: `ESS-TT${String(sequencia).padStart(2, "0")}-KK`,
    brinde: "Uma coqueteleira de brinde",
    expiraEm: new Date(Date.now() + diasDeValidade * DIA),
  };
}

const TELEFONE_COMPLETO = /\+?55\d{10,11}|\(\d{2}\) 9\d{4}-\d{4}|\d{5}-?\d{4}/;

/** JSON sem ids (UUID) nem datas ISO, que podem conter sequências de dígitos parecidas com telefone. */
function semIdsNemDatas(valor: unknown): string {
  return JSON.stringify(valor)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z/g, "<data>");
}

describe("lista de contatos", () => {
  it("não entrega nenhum telefone completo nem nome completo", async () => {
    await novoContato();
    const pagina = await listarContatos(lerFiltrosDeContatos({}));
    assert.ok(pagina.itens.length > 0);
    assert.equal(pagina.itens.length <= CONTATOS_POR_PAGINA, true);
    assert.doesNotMatch(semIdsNemDatas(pagina), TELEFONE_COMPLETO);
    assert.doesNotMatch(JSON.stringify(pagina), /Antunes Silva/);
    assert.ok(pagina.itens.every((i) => /^\(\d{2}\) \d•{4}-•{2}\d{2}$/.test(i.telefoneOculto)));
  });

  it("mascara o nome e deixa nulo o contato sem nome", async () => {
    const { id } = await novoContato();
    const { id: semNome } = await novoContato({ nome: null });
    const pagina = await listarContatos(lerFiltrosDeContatos({}));
    assert.equal(pagina.itens.find((i) => i.id === id)?.nomeOculto, "Marcos A.");
    assert.equal(pagina.itens.find((i) => i.id === semNome)?.nomeOculto, null);
  });

  it("informa a situação do cupom: válido, vencido e sem cupom", async () => {
    const valido = await novoContato({ cupom: cupomDe(10) });
    const vencido = await novoContato({ cupom: cupomDe(-1) });
    const sem = await novoContato();
    const pagina = await listarContatos(lerFiltrosDeContatos({ formulario: BALCAO }));
    const por = (id: string) => pagina.itens.find((i) => i.id === id)!;
    assert.deepEqual([por(valido.id).cupom.emitido, por(valido.id).cupom.expirado], [true, false]);
    assert.deepEqual([por(vencido.id).cupom.emitido, por(vencido.id).cupom.expirado], [true, true]);
    assert.match(por(valido.id).cupom.validoAte ?? "", /^\d{4}-\d{2}-\d{2}$/);
    assert.equal(por(sem.id).cupom.emitido, false);
    assert.equal(por(sem.id).formularioTemCupom, true);
  });

  it("distingue cupom que falhou de número que já tinha cupom em outro cadastro", async () => {
    const primeiro = await novoContato({ cupom: cupomDe(10) });
    const repetido = await novoContato({ telefone: primeiro.telefone });
    const falhou = await novoContato();
    const pagina = await listarContatos(lerFiltrosDeContatos({ formulario: BALCAO }));
    const por = (id: string) => pagina.itens.find((i) => i.id === id)!;
    assert.equal(por(primeiro.id).cupom.situacao, "emitido");
    assert.equal(por(repetido.id).cupom.situacao, "ja_tinha");
    assert.equal(por(repetido.id).cupom.emitido, false);
    assert.equal(por(falhou.id).cupom.situacao, "nenhum");
  });

  it("aceita a lista de formulários já carregada pela página", async () => {
    const { listarFormularios } = await import("./formularios");
    const formularios = await listarFormularios();
    const sem = await novoContato();
    const pagina = await listarContatos(lerFiltrosDeContatos({ formulario: BALCAO }), new Date(), formularios);
    assert.equal(pagina.itens.find((i) => i.id === sem.id)?.formularioTemCupom, true);
    const resumo = await resumoDosContatos(formularios);
    assert.equal(resumo.haCupons, true);
  });

  it("filtra por formulário e por quem aceita mensagens", async () => {
    const pagina = await listarContatos(lerFiltrosDeContatos({ formulario: BALCAO, mostrar: "aceitam" }));
    assert.ok(pagina.itens.length > 0);
    assert.ok(pagina.itens.every((i) => i.aceitaMensagens));
  });

  it("uma página além da última mostra a última", async () => {
    const pagina = await listarContatos(lerFiltrosDeContatos({ pagina: "999" }));
    assert.equal(pagina.pagina, pagina.paginas);
    assert.ok(pagina.itens.length > 0);
  });

  it("resumo conta o total e liga as métricas de cupom e indicação", async () => {
    const resumo = await resumoDosContatos();
    assert.ok(resumo.contatos > 0);
    assert.equal(resumo.haCupons, true);
    assert.equal(resumo.haIndicacoes, true);
  });
});

describe("filtros pela URL", () => {
  it("lê os cinco parâmetros", () => {
    assert.deepEqual(
      lerFiltrosDeContatos({ formulario: "f1", origem: "nfc", mostrar: "aceitam", ordem: "indicacoes", pagina: "3" }),
      { formularioId: "f1", origem: "nfc", somenteQueAceitam: true, ordem: "indicacoes", pagina: 3 },
    );
  });

  it("valor desconhecido vira 'sem filtro'", () => {
    assert.deepEqual(lerFiltrosDeContatos({ origem: "x", mostrar: "y", ordem: "z", pagina: "-4" }), {
      formularioId: undefined,
      origem: undefined,
      somenteQueAceitam: undefined,
      ordem: "recentes",
      pagina: 1,
    });
  });

  it("ignora formulário fora da lista de conhecidos", () => {
    assert.equal(lerFiltrosDeContatos({ formulario: "estranho" }, ["f1"]).formularioId, undefined);
    assert.equal(lerFiltrosDeContatos({ formulario: "f1" }, ["f1"]).formularioId, "f1");
  });
});

describe("revelar contato", () => {
  it("sem sessão devolve nulo e não audita", async () => {
    const { id } = await novoContato();
    const antes = trilha().length;
    assert.equal(await revelarContato(id, null), null);
    assert.equal(trilha().length, antes);
  });

  it("contato inexistente devolve nulo e não audita", async () => {
    const antes = trilha().length;
    assert.equal(await revelarContato("nao-existe", SESSAO), null);
    assert.equal(trilha().length, antes);
  });

  it("com sessão audita e devolve nome e telefone completos, sem dado pessoal na trilha", async () => {
    const { id, telefone } = await novoContato();
    const antes = trilha().length;
    const revelado = await revelarContato(id, SESSAO);
    assert.equal(revelado?.nome, "Marcos Antunes Silva");
    assert.match(revelado!.telefone, /^\(35\) 9\d{4}-\d{4}$/);
    const nova = trilha().slice(antes);
    assert.equal(nova.length, 1);
    assert.equal(nova[0].acao, "contato_revelado");
    assert.equal(nova[0].usuarioId, SESSAO.id);
    assert.doesNotMatch(semIdsNemDatas(nova), /Antunes|\d{8}/);
    assert.ok(!JSON.stringify(nova).includes(telefone));
  });

  it("audita ANTES de devolver: se a auditoria falha, não revela", async () => {
    const { id } = await novoContato();
    const original = auditoriaEmMemoria.registrar;
    auditoriaEmMemoria.registrar = async () => {
      throw new Error("auditoria fora do ar");
    };
    try {
      await assert.rejects(() => revelarContato(id, SESSAO), /auditoria fora do ar/);
    } finally {
      auditoriaEmMemoria.registrar = original;
    }
  });

  it("linkWhatsapp só para quem aceita mensagens", async () => {
    const aceita = await novoContato();
    const recusa = await novoContato({
      consentimentos: [
        { finalidade: "recompra", concedido: false },
        { finalidade: "ofertas", concedido: false },
      ],
    });
    const a = await revelarContato(aceita.id, SESSAO);
    const r = await revelarContato(recusa.id, SESSAO);
    assert.match(a!.linkWhatsapp ?? "", new RegExp(`^https://wa\\.me/${aceita.telefone.slice(1)}\\?text=Oi%2C%20Marcos`));
    assert.equal(r!.linkWhatsapp, null);
  });

  it("linkEnvioDoCupom só com cupom válido, mesmo para quem não aceitou", async () => {
    const recusou = [
      { finalidade: "recompra" as const, concedido: false },
      { finalidade: "ofertas" as const, concedido: false },
    ];
    const valido = await novoContato({ consentimentos: recusou, cupom: cupomDe(5) });
    const vencido = await novoContato({ cupom: cupomDe(-2) });
    const sem = await novoContato();

    const v = await revelarContato(valido.id, SESSAO);
    assert.equal(v!.linkWhatsapp, null);
    const texto = decodeURIComponent(v!.linkEnvioDoCupom ?? "");
    assert.match(texto, /Seu cupom: ESS-TT\d+-KK\./);
    assert.match(texto, /Uma coqueteleira de brinde\./);
    assert.match(texto, /Válido até \d{2}\/\d{2}\/\d{4}\./);
    assert.equal(v!.cupom?.expirado, false);

    const e = await revelarContato(vencido.id, SESSAO);
    assert.equal(e!.linkEnvioDoCupom, null);
    assert.equal(e!.cupom?.expirado, true);
    assert.ok(e!.cupom?.codigo);

    assert.equal((await revelarContato(sem.id, SESSAO))!.linkEnvioDoCupom, null);
  });

  it("a constante de desligar o envio do cupom zera o link", async () => {
    const { id } = await novoContato({ cupom: cupomDe(5) });
    const r = await revelarContato(id, SESSAO, { enviarCupom: false });
    assert.equal(r!.linkEnvioDoCupom, null);
    assert.ok(r!.cupom);
  });

  it("contato sem nome: mensagem sem nome", async () => {
    const { id } = await novoContato({ nome: null });
    const r = await revelarContato(id, SESSAO);
    assert.equal(r!.nome, null);
    assert.match(decodeURIComponent(r!.linkWhatsapp ?? ""), /text=Oi! Aqui é da Essencial Fit/);
  });
});

describe("exportação CSV", () => {
  it("sem sessão devolve nulo e não audita", async () => {
    const antes = trilha().length;
    assert.equal(await exportarContatosCsv({}, null), null);
    assert.equal(trilha().length, antes);
  });

  it("tem BOM, ';' e '\\r\\n', só quem aceita, um por telefone", async () => {
    await novoContato({ nome: "Ana Exportada" });
    await novoContato({
      nome: "Bia Recusou",
      consentimentos: [
        { finalidade: "recompra", concedido: false },
        { finalidade: "ofertas", concedido: false },
      ],
    });
    // Dois cadastros do mesmo telefone aceitando: sai um só.
    const dupla = await novoContato({ nome: "Caio Duplicado" });
    await respostas.gravar({
      formularioId: BALCAO,
      versaoFormulario: 1,
      chaveEnvio: randomUUID(),
      valores: {},
      origem: "qr",
      ipHash: null,
      contato: {
        nome: "Caio Duplicado",
        telefone: dupla.telefone,
        versaoDoConsentimento: VERSAO_ATUAL,
        consentimentos: [{ finalidade: "recompra", concedido: true }],
        cupom: null,
        codigoIndicacao: null,
        indicadoPor: null,
      },
    });

    const arquivo = await exportarContatosCsv({}, SESSAO);
    assert.ok(arquivo);
    assert.ok(arquivo.csv.startsWith("﻿Nome;WhatsApp;Formulário;Origem;Data;Aceita recompra;Aceita ofertas;Indicações\r\n"));
    const linhas = arquivo.csv.slice(1).split("\r\n").filter(Boolean);
    assert.equal(linhas.length - 1, arquivo.linhas);
    assert.ok(linhas.slice(1).every((l) => l.split(";").length === 8 || l.includes('"')));
    assert.ok(arquivo.csv.includes("Ana Exportada"));
    assert.ok(!arquivo.csv.includes("Bia Recusou"));
    assert.equal(arquivo.csv.split("Caio Duplicado").length - 1, 1);
  });

  it("o telefone sai só com dígitos e código do país, sem '+', máscara ou apóstrofo", async () => {
    const { telefone } = await novoContato({ nome: "Eva Telefone" });
    const arquivo = await exportarContatosCsv({}, SESSAO);
    const linha = arquivo!.csv.split("\r\n").find((l) => l.startsWith("Eva Telefone"))!;
    assert.equal(linha.split(";")[1], telefone.replace("+", ""));
    assert.match(linha.split(";")[1], /^55\d{10,11}$/);
  });

  it("neutraliza fórmula nas células", async () => {
    await novoContato({ nome: "=CMD()|' /C calc'!A0" });
    const arquivo = await exportarContatosCsv({ formularioId: BALCAO }, SESSAO);
    assert.ok(arquivo?.csv.includes("'=CMD()"));
    assert.ok(!/(^|;|\r\n)=CMD/.test(arquivo!.csv));
  });

  it("neutralizarCelula cobre = + - @ tab e quebra de linha", () => {
    for (const inicio of ["=", "+", "-", "@", "\t", "\r"]) {
      assert.equal(neutralizarCelula(`${inicio}x`), `'${inicio}x`);
    }
    assert.equal(neutralizarCelula("Maria"), "Maria");
  });

  it("audita antes de responder, com contagem e filtros, sem dado pessoal", async () => {
    await novoContato({ nome: "Dora Auditada" });
    const antes = trilha().length;
    const arquivo = await exportarContatosCsv({ formularioId: BALCAO, origem: "qr" }, SESSAO);
    const nova = trilha().slice(antes);
    assert.equal(nova.length, 1);
    assert.equal(nova[0].acao, "contatos_exportados");
    assert.equal(nova[0].usuarioId, SESSAO.id);
    assert.deepEqual(nova[0].metadados, {
      linhas: arquivo!.linhas,
      filtros: { formularioId: BALCAO, origem: "qr" },
    });
  });

  it("se a auditoria falha, não entrega o arquivo", async () => {
    const original = auditoriaEmMemoria.registrar;
    auditoriaEmMemoria.registrar = async () => {
      throw new Error("auditoria fora do ar");
    };
    try {
      await assert.rejects(() => exportarContatosCsv({}, SESSAO), /auditoria fora do ar/);
    } finally {
      auditoriaEmMemoria.registrar = original;
    }
  });

  it("respeita o filtro de origem", async () => {
    const nfc = await exportarContatosCsv({ origem: "nfc" }, SESSAO);
    const todos = await exportarContatosCsv({}, SESSAO);
    assert.ok(nfc!.linhas <= todos!.linhas);
    assert.ok(!nfc!.csv.includes("Ana Exportada"));
  });
});

describe("conferência de origem da exportação", () => {
  const cab = (dados: Record<string, string>) => new Headers(dados);

  it("aceita same-origin com Origin do mesmo host", () => {
    assert.equal(origemConfiavel(cab({ "sec-fetch-site": "same-origin", origin: "https://loja.exemplo", host: "loja.exemplo" })), true);
  });

  it("aceita same-origin sem Origin", () => {
    assert.equal(origemConfiavel(cab({ "sec-fetch-site": "same-origin", host: "loja.exemplo" })), true);
  });

  it("recusa cross-site, same-site e none", () => {
    for (const valor of ["cross-site", "same-site", "none"]) {
      assert.equal(origemConfiavel(cab({ "sec-fetch-site": valor, host: "loja.exemplo" })), false);
    }
  });

  it("recusa Origin de outro host, mesmo com Sec-Fetch-Site same-origin", () => {
    assert.equal(origemConfiavel(cab({ "sec-fetch-site": "same-origin", origin: "https://mal.exemplo", host: "loja.exemplo" })), false);
  });

  it("sem Sec-Fetch-Site, confere o Origin pelo host", () => {
    assert.equal(origemConfiavel(cab({ origin: "https://loja.exemplo", host: "loja.exemplo" })), true);
    assert.equal(origemConfiavel(cab({ origin: "https://mal.exemplo", host: "loja.exemplo" })), false);
  });

  it("sem nenhum cabeçalho, recusa", () => {
    assert.equal(origemConfiavel(cab({ host: "loja.exemplo" })), false);
  });

  it("Origin malformado recusa", () => {
    assert.equal(origemConfiavel(cab({ origin: "null", host: "loja.exemplo" })), false);
  });
});
