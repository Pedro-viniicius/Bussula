/**
 * Testes de caracterização dos serviços do painel.
 *
 * Rodam contra os dados fictícios do modo de teste (quatro formulários e 135
 * respostas sorteadas com semente fixa: 123 dos três primeiros, que não mudam,
 * e 12 do "Cadastro no balcão", gerados depois com semente própria) e fixam o comportamento que já
 * existia antes da reorganização do painel: a listagem de formulários, os
 * números da visão geral, as respostas e a coleta pública. Se algum destes
 * testes quebrar, alguma coisa que funcionava deixou de funcionar.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import { carregarResumoDoDashboard, carregarSerieDeRespostas, detectarSinais } from "./dashboard";
import { buscarFormularioPorId, listarFormularios } from "./formularios";
import { buscarRespostasRecentes, comPerguntas, listarRespostas, registrarResposta } from "./respostas";
import { analisarResultados, buscarResultadosDoFormulario } from "./resultados";
import { MODULOS_DESLIGADOS } from "../dominio/formularios/modulos";
import { CONFIGURACAO_DA_LOJA_PADRAO, type FormularioNaLista } from "../dominio/formularios/tipos";

/** As 123 respostas dos três formulários originais, que o quarto formulário não altera. */
const RESPOSTAS_DOS_TRES_FORMULARIOS_ORIGINAIS = 123;
/** As respostas do "Cadastro no balcão" (soma de `BALCAO_POR_DIA`). */
const RESPOSTAS_DO_CADASTRO_NO_BALCAO = 12;
const TOTAL_DE_RESPOSTAS_FICTICIAS =
  RESPOSTAS_DOS_TRES_FORMULARIOS_ORIGINAIS + RESPOSTAS_DO_CADASTRO_NO_BALCAO;
const FORMULARIOS_ATIVOS_FICTICIOS = 3;
const EXPERIENCIA_NA_LOJA = "form-experiencia-na-loja";
const INTERESSE_EM_SUPLEMENTOS = "form-interesse-suplementos";
const POS_VENDA = "form-pos-venda";
const CADASTRO_NO_BALCAO = "form-cadastro-no-balcao";

describe("formulários disponíveis", () => {
  it("lista os quatro formulários, do mais recente para o mais antigo", async () => {
    const formularios = await listarFormularios();
    const identificadores = formularios.map((formulario) => formulario.id);
    assert.deepEqual(identificadores, [POS_VENDA, CADASTRO_NO_BALCAO, INTERESSE_EM_SUPLEMENTOS, EXPERIENCIA_NA_LOJA]);
  });

  it("mantém as respostas dos três formulários originais exatamente como eram", async () => {
    const formularios = await listarFormularios();
    const dosOriginais = formularios
      .filter((formulario) => formulario.id !== CADASTRO_NO_BALCAO)
      .reduce((soma, formulario) => soma + formulario.totalDeRespostas, 0);
    assert.equal(dosOriginais, RESPOSTAS_DOS_TRES_FORMULARIOS_ORIGINAIS);
    const balcao = formularios.find((formulario) => formulario.id === CADASTRO_NO_BALCAO);
    assert.equal(balcao?.totalDeRespostas, RESPOSTAS_DO_CADASTRO_NO_BALCAO);
  });

  it("soma as respostas de cada formulário sem perder nenhuma", async () => {
    const formularios = await listarFormularios();
    const somaDasRespostas = formularios.reduce((soma, formulario) => soma + formulario.totalDeRespostas, 0);
    assert.equal(somaDasRespostas, TOTAL_DE_RESPOSTAS_FICTICIAS);

    const posVenda = formularios.find((formulario) => formulario.id === POS_VENDA);
    assert.equal(posVenda?.totalDeRespostas, 0);
    assert.equal(posVenda?.ultimaRespostaEm, null);
  });

  it("devolve o formulário com as perguntas da versão atual", async () => {
    const experiencia = await buscarFormularioPorId(EXPERIENCIA_NA_LOJA);
    assert.equal(experiencia?.versaoAtual, 2);
    assert.equal(experiencia?.perguntas.length, 5);
  });

  it("devolve nulo para um formulário que não existe", async () => {
    assert.equal(await buscarFormularioPorId("nao-existe"), null);
  });
});

describe("números da visão geral", () => {
  it("conta todas as respostas, os formulários ativos e o mais respondido", async () => {
    const resumo = await carregarResumoDoDashboard();
    assert.equal(resumo.totalDeRespostas, TOTAL_DE_RESPOSTAS_FICTICIAS);
    assert.equal(resumo.formulariosAtivos, FORMULARIOS_ATIVOS_FICTICIOS);
    assert.ok(resumo.ultimaRespostaEm instanceof Date);
    assert.equal(resumo.formularioMaisRespondido?.id, EXPERIENCIA_NA_LOJA);
    assert.ok(resumo.respostasHoje <= resumo.respostasNoPeriodo);
  });

  it("monta sete dias de série que somam as respostas do período", async () => {
    const [resumo, serie] = await Promise.all([carregarResumoDoDashboard(), carregarSerieDeRespostas()]);
    assert.equal(serie.length, 7);
    const somaDaSerie = serie.reduce((soma, ponto) => soma + ponto.total, 0);
    assert.equal(somaDaSerie, resumo.respostasNoPeriodo);
    assert.equal(serie[serie.length - 1].total, resumo.respostasHoje);
  });
});

describe("sinais da visão geral", () => {
  const agora = new Date("2026-09-20T15:00:00-03:00");

  function formulario(parcial: Partial<FormularioNaLista>): FormularioNaLista {
    return {
      id: "f1",
      slug: "f1",
      nome: "Formulário",
      descricao: null,
      situacao: "ATIVO",
      versaoAtual: 1,
      criadoEm: agora,
      atualizadoEm: agora,
      configuracaoDaLoja: { ...CONFIGURACAO_DA_LOJA_PADRAO },
      totalDeRespostas: 10,
      ultimaRespostaEm: agora,
      modulos: { ...MODULOS_DESLIGADOS },
      pedeDadosPessoais: false,
      travado: false,
      ...parcial,
    };
  }

  it("não inventa sinal quando está tudo andando", () => {
    assert.deepEqual(detectarSinais([formulario({})], agora), []);
  });

  it("avisa quando nenhum formulário está ativo", () => {
    const sinais = detectarSinais([formulario({ situacao: "INATIVO" })], agora);
    assert.deepEqual(
      sinais.map((sinal) => sinal.chave),
      ["sem-formulario-ativo"],
    );
  });

  it("avisa sobre formulário ativo que nunca recebeu resposta", () => {
    const sinais = detectarSinais([formulario({ totalDeRespostas: 0, ultimaRespostaEm: null })], agora);
    assert.deepEqual(
      sinais.map((sinal) => sinal.chave),
      ["sem-resposta-f1"],
    );
  });

  it("avisa sobre formulário ativo em silêncio há uma semana ou mais", () => {
    const oitoDiasAntes = new Date(agora.getTime() - 8 * 24 * 60 * 60 * 1000);
    const sinais = detectarSinais([formulario({ ultimaRespostaEm: oitoDiasAntes })], agora);
    assert.deepEqual(
      sinais.map((sinal) => sinal.chave),
      ["silencio-f1"],
    );
  });
});

describe("respostas recebidas", () => {
  it("traz as mais recentes com as perguntas da versão em que foram dadas", async () => {
    const recentes = await buscarRespostasRecentes(5);
    const detalhadas = await comPerguntas(recentes);
    assert.equal(detalhadas.length, 5);
    for (const { perguntas, nomeDoFormulario } of detalhadas) {
      assert.ok(perguntas.length > 0);
      assert.notEqual(nomeDoFormulario, "Formulário removido");
    }
  });

  it("pagina as respostas de um formulário, da mais recente para a mais antiga", async () => {
    const pagina = await listarRespostas({ formularioId: INTERESSE_EM_SUPLEMENTOS, pagina: 1 });
    assert.ok(pagina.itens.length > 0 && pagina.itens.length <= 20);
    assert.equal(pagina.paginas, Math.max(1, Math.ceil(pagina.total / 20)));
    for (const resposta of pagina.itens) assert.equal(resposta.formularioId, INTERESSE_EM_SUPLEMENTOS);
    for (let posicao = 1; posicao < pagina.itens.length; posicao++) {
      assert.ok(pagina.itens[posicao - 1].criadoEm >= pagina.itens[posicao].criadoEm);
    }
  });
});

describe("coleta pública de respostas", () => {
  const respostaValida = { "p-objetivo": "Emagrecer", "p-orientacao": true };

  it("grava uma resposta válida e reconhece o reenvio da mesma chave", async () => {
    const chaveEnvio = randomUUID();
    const envio = { slug: "interesse-em-suplementos", chaveEnvio, valores: respostaValida, origem: "nfc" as const };

    const primeiro = await registrarResposta(envio);
    assert.deepEqual(primeiro, { ok: true, valor: { jaEstavaRegistrada: false, beneficios: { cupom: null, indicacao: null } } });

    const repetido = await registrarResposta(envio);
    assert.deepEqual(repetido, { ok: true, valor: { jaEstavaRegistrada: true, beneficios: { cupom: null, indicacao: null } } });
  });

  it("recusa formulário que ainda não está no ar", async () => {
    const resultado = await registrarResposta({
      slug: "pos-venda",
      chaveEnvio: randomUUID(),
      valores: { "p-chegou-bem": true },
      origem: "link",
    });
    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.equal(resultado.erro, "FORMULARIO_INATIVO");
  });

  it("recusa resposta sem a pergunta obrigatória", async () => {
    const resultado = await registrarResposta({
      slug: "interesse-em-suplementos",
      chaveEnvio: randomUUID(),
      valores: { "p-objetivo": "Emagrecer" },
      origem: "qr",
    });
    assert.equal(resultado.ok, false);
    if (!resultado.ok) assert.equal(resultado.erro, "VALIDACAO_FALHOU");
  });
});

describe("queda da coleta na visão geral", () => {
  const agora = new Date("2026-09-20T15:00:00-03:00");
  const ativo: FormularioNaLista = {
    id: "f1",
    slug: "f1",
    nome: "Formulário",
    descricao: null,
    situacao: "ATIVO",
    versaoAtual: 1,
    criadoEm: agora,
    atualizadoEm: agora,
    configuracaoDaLoja: { ...CONFIGURACAO_DA_LOJA_PADRAO },
    totalDeRespostas: 50,
    ultimaRespostaEm: agora,
    modulos: { ...MODULOS_DESLIGADOS },
    pedeDadosPessoais: false,
    travado: false,
  };

  it("avisa quando a coleta cai de verdade", () => {
    const sinais = detectarSinais([ativo], agora, { respostasNoPeriodo: 5, respostasNoPeriodoAnterior: 20, dias: 7 });
    assert.deepEqual(
      sinais.map((sinal) => sinal.chave),
      ["queda-da-coleta"],
    );
    assert.equal(sinais[0].titulo, "A coleta caiu 75% em relação aos 7 dias anteriores");
  });

  it("não trata a oscilação normal como queda", () => {
    const sinais = detectarSinais([ativo], agora, { respostasNoPeriodo: 21, respostasNoPeriodoAnterior: 24, dias: 7 });
    assert.deepEqual(sinais, []);
  });

  it("conta as respostas do período anterior da visão geral", async () => {
    const resumo = await carregarResumoDoDashboard();
    const formularios = await listarFormularios();
    const respostasDasDuasSemanas = resumo.respostasNoPeriodo + resumo.respostasNoPeriodoAnterior;
    assert.ok(respostasDasDuasSemanas <= resumo.totalDeRespostas);
    assert.ok(formularios.length > 0);
    // Os dados fictícios cobrem 14 dias: as duas janelas de 7 dias somam tudo, menos o que chegou depois.
    assert.ok(respostasDasDuasSemanas >= TOTAL_DE_RESPOSTAS_FICTICIAS);
  });
});

describe("resultados de um formulário", () => {
  it("recebem o formulário, todas as respostas dele e os números calculados sobre elas", async () => {
    const dados = await buscarResultadosDoFormulario(EXPERIENCIA_NA_LOJA);
    assert.ok(dados);
    const lista = await listarFormularios();
    const naLista = lista.find((formulario) => formulario.id === EXPERIENCIA_NA_LOJA);

    assert.equal(dados.formulario.nome, "Experiência na loja");
    assert.equal(dados.respostas.length, naLista?.totalDeRespostas);
    assert.equal(dados.resultados.resumo.totalDeRespostas, dados.respostas.length);
    assert.equal(dados.resultados.distribuicoes.length, dados.formulario.perguntas.length);
    for (const resposta of dados.respostas) assert.equal(resposta.formularioId, EXPERIENCIA_NA_LOJA);
  });

  it("devolvem nulo para um formulário que não existe", async () => {
    assert.equal(await buscarResultadosDoFormulario("nao-existe"), null);
  });

  it("trazem uma análise pronta, com fatos sustentados, quando há respostas suficientes", async () => {
    const dados = await buscarResultadosDoFormulario(EXPERIENCIA_NA_LOJA);
    assert.ok(dados);
    const analise = await analisarResultados(dados);
    assert.equal(analise.situacao, "pronta");
    if (analise.situacao === "pronta") {
      assert.ok(analise.achados.some((achado) => achado.natureza === "fato"));
      const ids = new Set(analise.evidencias.map((evidencia) => evidencia.id));
      for (const achado of analise.achados) for (const id of achado.evidencias) assert.ok(ids.has(id));
    }
  });

  it("dizem que ainda não há respostas suficientes para um formulário sem respostas", async () => {
    const dados = await buscarResultadosDoFormulario(POS_VENDA);
    assert.ok(dados);
    assert.equal(dados.resultados.resumo.totalDeRespostas, 0);
    const analise = await analisarResultados(dados);
    assert.equal(analise.situacao, "dados-insuficientes");
  });
});
