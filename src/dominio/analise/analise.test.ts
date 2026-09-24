import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pergunta, repetir, resposta, respostasComValores, UM_DIA_MS } from "../../testes/construtores";
import type { Pergunta, ValorDaResposta } from "../formularios/perguntas";
import type { Resposta } from "../respostas/tipos";
import { calcularResultados } from "../resultados/metricas";
import { analisarPorRegras, juntarAcoesRepetidas, MINIMO_DE_RESPOSTAS_PARA_ANALISE } from "./analista-por-regras";
import { ACAO_DE_CONFERIR_OS_CANAIS, lerCanais, lerRitmoDaColeta, lerSilencio } from "./regras-da-coleta";
import { lerPergunta } from "./regras-das-perguntas";
import { encontrarRelacoes } from "./relacoes";
import type { AnaliseDosResultados, EntradaDaAnalise, Evidencia } from "./tipos";
import { estaSustentado, manterSoOSustentado } from "./validacao";

const AGORA = new Date("2026-09-23T15:00:00-03:00");
const ONTEM = new Date(AGORA.getTime() - UM_DIA_MS);

const NOTA = pergunta({ id: "nota", tipo: "avaliacao", enunciado: "Como foi o atendimento?" });
const MOTIVO = pergunta({
  id: "motivo",
  tipo: "escolha_unica",
  enunciado: "O que trouxe você?",
  opcoes: ["Comprar", "Dúvida", "Conhecer"],
});
const COMENTARIO = pergunta({ id: "comentario", tipo: "texto_livre", enunciado: "Algo a melhorar?" });

function entrada(perguntas: Pergunta[], respostas: Resposta[]): EntradaDaAnalise {
  return {
    formulario: { id: "formulario-de-teste", nome: "Teste", objetivo: null, versao: 1 },
    perguntas,
    resultados: calcularResultados(perguntas, respostas, AGORA),
    respostas,
  };
}

function valoresRepetidos(valores: Record<string, ValorDaResposta>, vezes: number) {
  return repetir(valores, vezes);
}

function analisePronta(analise: AnaliseDosResultados) {
  assert.equal(analise.situacao, "pronta");
  if (analise.situacao !== "pronta") throw new Error("a análise deveria estar pronta");
  return analise;
}

describe("análise com poucas respostas", () => {
  it("não diz nada abaixo do mínimo e informa quantas faltam", () => {
    const respostas = respostasComValores(valoresRepetidos({ nota: 5 }, MINIMO_DE_RESPOSTAS_PARA_ANALISE - 1), ONTEM);
    const analise = analisarPorRegras(entrada([NOTA], respostas));
    assert.deepEqual(analise, {
      situacao: "dados-insuficientes",
      totalDeRespostas: MINIMO_DE_RESPOSTAS_PARA_ANALISE - 1,
      minimoDeRespostas: MINIMO_DE_RESPOSTAS_PARA_ANALISE,
    });
  });

  it("declara como limite a pergunta que teve poucas respostas", () => {
    const respostas = [
      ...respostasComValores(valoresRepetidos({ nota: 5 }, 20), ONTEM),
      ...respostasComValores(valoresRepetidos({ nota: 5, motivo: "Comprar" }, 3), ONTEM),
    ];
    const analise = analisePronta(analisarPorRegras(entrada([NOTA, MOTIVO], respostas)));
    assert.ok(analise.limites.some((limite) => limite.includes('"O que trouxe você?" teve só 3 respostas')));
    assert.ok(analise.limites.some((limite) => limite.startsWith("Com 23 respostas")));
  });
});

describe("leitura das notas", () => {
  it("separa o fato da interpretação quando a maioria dá nota alta", () => {
    const respostas = respostasComValores(
      [...valoresRepetidos({ nota: 5 }, 16), ...valoresRepetidos({ nota: 3 }, 4)],
      ONTEM,
    );
    const leitura = lerPergunta(calcularResultados([NOTA], respostas, AGORA).distribuicoes[0]);
    const [fato, interpretacao] = leitura.achados;

    assert.equal(fato.natureza, "fato");
    assert.equal(
      fato.texto,
      '80% (16 de 20) deram nota 4 ou 5 em "Como foi o atendimento?". A média ficou em 4,6, numa escala de 1 a 5.',
    );
    assert.equal(interpretacao.natureza, "interpretacao");
    assert.ok(interpretacao.texto.includes("majoritariamente positiva"));
  });

  it("levanta hipótese e sugere conversa quando uma parcela relevante dá nota baixa", () => {
    const respostas = respostasComValores(
      [...valoresRepetidos({ nota: 5 }, 13), ...valoresRepetidos({ nota: 3 }, 1), ...valoresRepetidos({ nota: 1 }, 6)],
      ONTEM,
    );
    const leitura = lerPergunta(calcularResultados([NOTA], respostas, AGORA).distribuicoes[0]);
    const naturezas = leitura.achados.map((achado) => achado.natureza);

    assert.deepEqual(naturezas, ["fato", "fato", "hipotese"]);
    assert.ok(leitura.achados[1].texto.startsWith("30% (6 de 20) deram nota 1 ou 2"));
    assert.ok(leitura.achados[2].texto.startsWith("Uma hipótese a investigar"));
    assert.ok(leitura.acoes[0].texto.startsWith("Pode valer a pena conversar"));
  });

  it("descreve a escala de 0 a 10 pelos pontos de cada ponta", () => {
    const indica = pergunta({
      id: "indica",
      tipo: "escala",
      enunciado: "Indicaria?",
      escala: { minimo: 0, maximo: 10, rotuloMinimo: null, rotuloMaximo: null },
    });
    const respostas = respostasComValores(valoresRepetidos({ indica: 9 }, 12), ONTEM);
    const leitura = lerPergunta(calcularResultados([indica], respostas, AGORA).distribuicoes[0]);
    assert.ok(leitura.achados[0].texto.startsWith("100% (12 de 12) deram nota de 8 a 10"));
  });
});

describe("leitura das escolhas", () => {
  it("aponta a opção da maioria e as opções que ninguém escolheu", () => {
    const respostas = respostasComValores(
      [...valoresRepetidos({ motivo: "Comprar" }, 8), ...valoresRepetidos({ motivo: "Dúvida" }, 4)],
      ONTEM,
    );
    const leitura = lerPergunta(calcularResultados([MOTIVO], respostas, AGORA).distribuicoes[0]);
    const textos = leitura.achados.map((achado) => achado.texto);

    assert.ok(textos[0].startsWith('67% (8 de 12) escolheram "Comprar"'));
    assert.equal(leitura.achados[1].natureza, "interpretacao");
    assert.equal(textos[2], 'Em "O que trouxe você?", ninguém escolheu "Conhecer".');
  });

  it("diz que não há preferência clara quando as duas primeiras ficam próximas", () => {
    const respostas = respostasComValores(
      [
        ...valoresRepetidos({ motivo: "Comprar" }, 5),
        ...valoresRepetidos({ motivo: "Dúvida" }, 5),
        ...valoresRepetidos({ motivo: "Conhecer" }, 2),
      ],
      ONTEM,
    );
    const leitura = lerPergunta(calcularResultados([MOTIVO], respostas, AGORA).distribuicoes[0]);
    assert.ok(leitura.achados[0].texto.includes('"Comprar" e "Dúvida" — ficaram próximas'));
    assert.ok(leitura.achados[1].texto.startsWith("Não há uma preferência clara"));
  });
});

describe("leitura dos textos", () => {
  it("conta os comentários, sugere lê-los e avisa que não os interpreta", () => {
    const respostas = respostasComValores(valoresRepetidos({ comentario: "Faltou whey" }, 11), ONTEM);
    const leitura = lerPergunta(calcularResultados([COMENTARIO], respostas, AGORA).distribuicoes[0]);
    assert.equal(leitura.achados[0].texto, '11 pessoas escreveram uma resposta em "Algo a melhorar?".');
    assert.ok(leitura.acoes[0].texto.startsWith("Ler as respostas escritas"));
    assert.deepEqual(leitura.limites, ["As respostas escritas não são interpretadas automaticamente — só contadas."]);
  });
});

describe("leitura da coleta", () => {
  function respostasEmDias(quantidadePorDiaAtras: Record<number, number>, origem: "nfc" | "qr" = "nfc"): Resposta[] {
    const respostas: Resposta[] = [];
    for (const [diasAtras, quantidade] of Object.entries(quantidadePorDiaAtras)) {
      const quando = new Date(AGORA.getTime() - Number(diasAtras) * UM_DIA_MS);
      for (let contador = 0; contador < quantidade; contador++) respostas.push(resposta({}, quando, origem));
    }
    return respostas;
  }

  it("aponta a queda do ritmo como fato e a causa como hipótese", () => {
    const resultados = calcularResultados([], respostasEmDias({ 2: 5, 9: 20 }), AGORA);
    const leitura = lerRitmoDaColeta(resultados);
    assert.deepEqual(
      leitura.achados.map((achado) => achado.natureza),
      ["fato", "hipotese"],
    );
    assert.equal(
      leitura.achados[0].texto,
      "Chegaram 5 respostas nos últimos 7 dias, 75% a menos que nos 7 dias anteriores (20).",
    );
  });

  it("não compara períodos quando o anterior teve poucas respostas", () => {
    const resultados = calcularResultados([], respostasEmDias({ 1: 30, 9: 4 }), AGORA);
    assert.equal(lerRitmoDaColeta(resultados).achados.length, 0);
  });

  it("junta numa ação só o conselho repetido pela queda e pelo silêncio", () => {
    const resultados = calcularResultados([], respostasEmDias({ 5: 4, 9: 20 }), AGORA);
    const acoes = juntarAcoesRepetidas([...lerRitmoDaColeta(resultados).acoes, ...lerSilencio(resultados).acoes]);
    assert.deepEqual(acoes, [{ texto: ACAO_DE_CONFERIR_OS_CANAIS, evidencias: ["coleta:ritmo", "coleta:silencio"] }]);
  });

  it("aponta o canal físico quase sem uso ao lado do canal principal", () => {
    const respostas = [...respostasEmDias({ 1: 19 }, "nfc"), ...respostasEmDias({ 1: 1 }, "qr")];
    const leitura = lerCanais(calcularResultados([], respostas, AGORA));
    assert.equal(leitura.achados[0].texto, "95% (19 de 20) das respostas chegaram pelo cartão NFC.");
    assert.equal(leitura.achados[1].texto, "Uma hipótese é que o QR Code esteja pouco visível ou pouco prático para quem está na loja.");
  });
});

describe("relações entre perguntas", () => {
  it("encontra o grupo que dá notas bem diferentes das demais", () => {
    const respostas = respostasComValores(
      [
        ...valoresRepetidos({ motivo: "Comprar", nota: 5 }, 12),
        ...valoresRepetidos({ motivo: "Comprar", nota: 4 }, 8),
        ...valoresRepetidos({ motivo: "Dúvida", nota: 2 }, 10),
        ...valoresRepetidos({ motivo: "Dúvida", nota: 3 }, 2),
      ],
      ONTEM,
    );
    const [relacao] = encontrarRelacoes([NOTA, MOTIVO], respostas);
    assert.equal(relacao.rotuloDoGrupo, "Dúvida");
    assert.equal(relacao.pessoasNoGrupo, 12);
  });

  it("não enxerga relação quando os grupos dão as mesmas notas", () => {
    const respostas = respostasComValores(
      [
        ...valoresRepetidos({ motivo: "Comprar", nota: 5 }, 10),
        ...valoresRepetidos({ motivo: "Comprar", nota: 3 }, 10),
        ...valoresRepetidos({ motivo: "Dúvida", nota: 5 }, 10),
        ...valoresRepetidos({ motivo: "Dúvida", nota: 3 }, 10),
      ],
      ONTEM,
    );
    assert.deepEqual(encontrarRelacoes([NOTA, MOTIVO], respostas), []);
  });

  it("ignora grupos pequenos demais, por maior que seja a diferença", () => {
    const respostas = respostasComValores(
      [...valoresRepetidos({ motivo: "Comprar", nota: 5 }, 30), ...valoresRepetidos({ motivo: "Dúvida", nota: 1 }, 5)],
      ONTEM,
    );
    assert.deepEqual(encontrarRelacoes([NOTA, MOTIVO], respostas), []);
  });
});

describe("a análise completa", () => {
  const respostas = respostasComValores(
    [
      ...valoresRepetidos({ nota: 5, motivo: "Comprar", comentario: "Muito bom" }, 20),
      ...valoresRepetidos({ nota: 4, motivo: "Comprar" }, 10),
      ...valoresRepetidos({ nota: 1, motivo: "Dúvida", comentario: "Demorou" }, 12),
    ],
    ONTEM,
  );
  const analise = analisePronta(analisarPorRegras(entrada([NOTA, MOTIVO, COMENTARIO], respostas)));

  it("só diz o que as evidências sustentam", () => {
    const evidenciasPorId = new Map(analise.evidencias.map((evidencia) => [evidencia.id, evidencia]));
    for (const achado of analise.achados) assert.ok(estaSustentado(achado, evidenciasPorId), achado.texto);
    for (const acao of analise.acoes) assert.ok(estaSustentado(acao, evidenciasPorId), acao.texto);
  });

  it("traz fatos, interpretações, hipóteses e ações, cada um com sua natureza", () => {
    const naturezas = new Set(analise.achados.map((achado) => achado.natureza));
    assert.deepEqual([...naturezas].sort(), ["fato", "hipotese", "interpretacao"]);
    assert.ok(analise.acoes.length > 0 && analise.acoes.length <= 4);
  });

  it("fala de hipóteses e ações como possibilidades, nunca como certezas", () => {
    const textos = [...analise.achados.map((achado) => achado.texto), ...analise.acoes.map((acao) => acao.texto)];
    for (const texto of textos) {
      assert.doesNotMatch(texto, /certamente|com certeza|definitivamente|sem dúvida|deve(m)? /i, texto);
    }
    for (const hipotese of analise.achados.filter((achado) => achado.natureza === "hipotese")) {
      assert.match(hipotese.texto, /^Uma hipótese/);
    }
  });
});

describe("trava contra conclusão sem base", () => {
  const evidencias: Evidencia[] = [
    { id: "notas", fonte: "Como foi o atendimento?", texto: "62% (18 de 29) deram nota 4 ou 5. Média 4,2." },
  ];

  it("aceita texto que só usa números da evidência, com vírgula ou ponto", () => {
    const item = { texto: "A média de 4.2 e os 62% de notas altas sugerem boa percepção.", evidencias: ["notas"] };
    assert.equal(manterSoOSustentado([item], evidencias).length, 1);
  });

  it("descarta porcentagem inventada", () => {
    const item = { texto: "80% dos clientes estão satisfeitos.", evidencias: ["notas"] };
    assert.deepEqual(manterSoOSustentado([item], evidencias), []);
  });

  it("descarta evidência que não existe e item sem evidência", () => {
    const semEvidencia = { texto: "Os clientes estão satisfeitos.", evidencias: [] };
    const evidenciaInventada = { texto: "Os clientes estão satisfeitos.", evidencias: ["nao-existe"] };
    assert.deepEqual(manterSoOSustentado([semEvidencia, evidenciaInventada], evidencias), []);
  });
});
