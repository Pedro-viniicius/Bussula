import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pergunta, resposta, respostasComValores, UM_DIA_MS } from "../../testes/construtores";
import { formatarProporcao } from "../../utilitarios/numeros";
import { diasEntre, inicioDeDiasAtras, inicioDoDia } from "../../utilitarios/tempo";
import { calcularDistribuicoes, calcularResultados, contarOrigens, montarSeriePorDia, resumirColeta } from "./metricas";
import { escolherFormularioPadrao } from "./selecao";
import { calcularVariacao, mudancaMereceAtencao } from "./variacao";

// Uma quarta-feira às 15h em São Paulo.
const AGORA = new Date("2026-09-23T15:00:00-03:00");

function diasAntes(dias: number, horaLocal = "12:00"): Date {
  const dia = new Date(AGORA.getTime() - dias * UM_DIA_MS);
  const diaLocal = dia.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  return new Date(`${diaLocal}T${horaLocal}:00-03:00`);
}

describe("resumo da coleta de um formulário", () => {
  it("separa hoje, os últimos 7 dias e os 7 dias anteriores", () => {
    const respostas = [
      resposta({}, diasAntes(0, "09:00")),
      resposta({}, diasAntes(0, "14:59")),
      resposta({}, diasAntes(3)),
      resposta({}, diasAntes(6, "00:01")),
      resposta({}, diasAntes(7, "23:59")),
      resposta({}, diasAntes(13)),
      resposta({}, diasAntes(14)),
    ];
    const resumo = resumirColeta(respostas, AGORA, 7);
    assert.equal(resumo.totalDeRespostas, 7);
    assert.equal(resumo.respostasHoje, 2);
    assert.equal(resumo.respostasNoPeriodo, 4);
    assert.equal(resumo.respostasNoPeriodoAnterior, 2);
    assert.equal(resumo.ultimaRespostaEm?.getTime(), diasAntes(0, "14:59").getTime());
    assert.equal(resumo.diasSemResposta, 0);
  });

  it("conta os dias de silêncio desde a última resposta", () => {
    const resumo = resumirColeta([resposta({}, diasAntes(4, "23:30"))], AGORA, 7);
    assert.equal(resumo.diasSemResposta, 4);
  });

  it("devolve zeros e nulos quando ninguém respondeu", () => {
    const resumo = resumirColeta([], AGORA, 7);
    assert.deepEqual(resumo, {
      totalDeRespostas: 0,
      respostasHoje: 0,
      respostasNoPeriodo: 0,
      respostasNoPeriodoAnterior: 0,
      ultimaRespostaEm: null,
      diasSemResposta: null,
    });
  });
});

describe("série de respostas por dia", () => {
  it("tem um ponto por dia, com zero nos dias vazios", () => {
    const serie = montarSeriePorDia([resposta({}, diasAntes(0)), resposta({}, diasAntes(2))], AGORA, 7);
    assert.equal(serie.length, 7);
    assert.deepEqual(
      serie.map((ponto) => ponto.total),
      [0, 0, 0, 0, 1, 0, 1],
    );
  });

  it("agrupa pelo dia de São Paulo, e não pelo dia do servidor", () => {
    // 23h30 em São Paulo já é o dia seguinte em UTC.
    const tardeDaNoite = diasAntes(1, "23:30");
    const serie = montarSeriePorDia([resposta({}, tardeDaNoite)], AGORA, 7);
    assert.equal(serie[5].total, 1);
    assert.equal(serie[6].total, 0);
  });
});

describe("datas no fuso da loja", () => {
  it("volta dias inteiros a partir do início de hoje", () => {
    for (const dias of [0, 1, 6, 13, 40]) {
      const esperado = inicioDoDia(new Date(AGORA.getTime() - dias * UM_DIA_MS));
      assert.equal(inicioDeDiasAtras(dias, AGORA).getTime(), esperado.getTime());
    }
  });

  it("conta dias de calendário, não períodos de 24 horas", () => {
    const ontemTarde = diasAntes(1, "23:50");
    const hojeCedo = diasAntes(0, "00:10");
    assert.equal(diasEntre(ontemTarde, hojeCedo), 1);
    assert.equal(diasEntre(hojeCedo, AGORA), 0);
  });
});

describe("canais de chegada", () => {
  it("conta cada origem, da mais usada para a menos usada, incluindo as vazias", () => {
    const origens = contarOrigens([
      resposta({}, AGORA, "qr"),
      resposta({}, AGORA, "qr"),
      resposta({}, AGORA, "nfc"),
    ]);
    assert.deepEqual(
      origens.map((origem) => [origem.origem, origem.total]),
      [
        ["qr", 2],
        ["nfc", 1],
        ["link", 0],
      ],
    );
  });
});

describe("distribuição das respostas por pergunta", () => {
  const perguntas = [
    pergunta({ id: "nota", tipo: "avaliacao" }),
    pergunta({ id: "motivo", tipo: "escolha_unica", opcoes: ["A", "B", "C"] }),
    pergunta({ id: "itens", tipo: "multipla_escolha", opcoes: ["X", "Y"] }),
    pergunta({ id: "volta", tipo: "sim_nao" }),
    pergunta({
      id: "indica",
      tipo: "escala",
      escala: { minimo: 0, maximo: 10, rotuloMinimo: null, rotuloMaximo: null },
    }),
    pergunta({ id: "comentario", tipo: "texto_livre" }),
  ];
  const respostas = respostasComValores(
    [
      { nota: 5, motivo: "A", itens: ["X", "Y"], volta: true, indica: 10, comentario: "Ótimo" },
      { nota: 4, motivo: "A", itens: ["X"], volta: false, indica: 7 },
      { nota: 2, motivo: "B", volta: true, comentario: "   " },
    ],
    AGORA,
  );
  const [nota, motivo, itens, volta, indica, comentario] = calcularDistribuicoes(perguntas, respostas);

  it("conta cada ponto da avaliação e calcula a média", () => {
    assert.deepEqual(
      nota.opcoes.map((opcao) => opcao.total),
      [0, 1, 0, 1, 1],
    );
    assert.equal(nota.media, 11 / 3);
  });

  it("conta a escolha única na ordem em que as opções foram escritas", () => {
    assert.deepEqual(motivo.opcoes, [
      { rotulo: "A", total: 2 },
      { rotulo: "B", total: 1 },
      { rotulo: "C", total: 0 },
    ]);
  });

  it("conta cada item marcado na múltipla escolha, sobre quem respondeu", () => {
    assert.equal(itens.totalDeRespostas, 2);
    assert.deepEqual(itens.opcoes, [
      { rotulo: "X", total: 2 },
      { rotulo: "Y", total: 1 },
    ]);
  });

  it("separa sim e não", () => {
    assert.deepEqual(volta.opcoes, [
      { rotulo: "Sim", total: 2 },
      { rotulo: "Não", total: 1 },
    ]);
  });

  it("usa o intervalo configurado na escala", () => {
    assert.equal(indica.opcoes.length, 11);
    assert.equal(indica.opcoes[0].rotulo, "0");
    assert.equal(indica.media, 8.5);
  });

  it("guarda os textos, sem os que ficaram em branco", () => {
    assert.deepEqual(comentario.textos, ["Ótimo"]);
  });
});

describe("resultados completos", () => {
  it("junta resumo, série, canais e distribuições com o mesmo período", () => {
    const resultados = calcularResultados(
      [pergunta({ id: "volta", tipo: "sim_nao" })],
      [resposta({ volta: true }, diasAntes(0))],
      AGORA,
    );
    assert.equal(resultados.diasDoPeriodo, 7);
    assert.equal(resultados.serie.length, 7);
    assert.equal(resultados.resumo.totalDeRespostas, 1);
    assert.equal(resultados.distribuicoes.length, 1);
    assert.equal(resultados.origens[0].origem, "nfc");
  });
});

describe("formulário aberto por padrão nos resultados", () => {
  it("abre o que tem mais respostas", () => {
    const escolhido = escolherFormularioPadrao([
      { id: "a", totalDeRespostas: 3 },
      { id: "b", totalDeRespostas: 9 },
      { id: "c", totalDeRespostas: 9 },
    ]);
    assert.equal(escolhido?.id, "b");
  });

  it("abre o primeiro quando ninguém respondeu, e nada quando não há formulário", () => {
    assert.equal(escolherFormularioPadrao([{ id: "a", totalDeRespostas: 0 }])?.id, "a");
    assert.equal(escolherFormularioPadrao([]), null);
  });
});

describe("comparação entre períodos", () => {
  it("diz alta, queda ou estável", () => {
    assert.deepEqual(calcularVariacao(12, 10), { tipo: "alta", fracao: 0.2 });
    assert.deepEqual(calcularVariacao(5, 10), { tipo: "queda", fracao: 0.5 });
    assert.equal(calcularVariacao(10, 10).tipo, "estavel");
    assert.equal(calcularVariacao(105, 100).tipo, "estavel");
  });

  it("não inventa porcentagem quando o período anterior está vazio", () => {
    assert.deepEqual(calcularVariacao(8, 0), { tipo: "sem-base" });
  });

  it("só chama atenção para mudança além da oscilação natural", () => {
    assert.equal(mudancaMereceAtencao(21, 24), false, "13% a menos é ruído");
    assert.equal(mudancaMereceAtencao(13, 10), false, "30% a mais, mas com números pequenos");
    assert.equal(mudancaMereceAtencao(5, 20), true);
    assert.equal(mudancaMereceAtencao(80, 50), true);
    assert.equal(mudancaMereceAtencao(5, 0), false);
  });
});

describe("números por extenso", () => {
  it("mantém a proporção e os números crus juntos", () => {
    assert.equal(formatarProporcao(18, 29), "62% (18 de 29)");
    assert.equal(formatarProporcao(0, 0), "0% (0 de 0)");
  });
});
