/**
 * O analista com modelo de linguagem, testado com um modelo de mentira: a
 * "chamada" devolve o texto que cada teste quiser. Nenhum teste fala com
 * serviço externo.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { analisarPorRegras } from "../../dominio/analise/analista-por-regras";
import type { EntradaDaAnalise } from "../../dominio/analise/tipos";
import { calcularResultados } from "../../dominio/resultados/metricas";
import { pergunta, repetir, respostasComValores, UM_DIA_MS } from "../../testes/construtores";
import { criarAnalistaComModelo, montarPedido } from "./analista-com-modelo";
import type { ChamadaAoModelo, PedidoAoModelo } from "./gateway-de-ia";
import { escolherAnalista } from "./index";

const AGORA = new Date("2026-09-23T15:00:00-03:00");
const ONTEM = new Date(AGORA.getTime() - UM_DIA_MS);
const NOTA = pergunta({ id: "nota", tipo: "avaliacao", enunciado: "Como foi o atendimento?" });
const COMENTARIO = pergunta({ id: "comentario", tipo: "texto_livre", enunciado: "Algo a melhorar?" });

const RESPOSTAS = respostasComValores(
  [
    ...repetir({ nota: 5, comentario: "Maria, do caixa, foi ótima" }, 14),
    ...repetir({ nota: 1 }, 6),
  ],
  ONTEM,
);

const ENTRADA: EntradaDaAnalise = {
  formulario: { id: "f1", nome: "Experiência", objetivo: null, versao: 1 },
  perguntas: [NOTA, COMENTARIO],
  resultados: calcularResultados([NOTA, COMENTARIO], RESPOSTAS, AGORA),
  respostas: RESPOSTAS,
};

function modeloQueResponde(resposta: unknown): { chamar: ChamadaAoModelo; pedidos: PedidoAoModelo[] } {
  const pedidos: PedidoAoModelo[] = [];
  const chamar: ChamadaAoModelo = async (pedido) => {
    pedidos.push(pedido);
    return typeof resposta === "string" ? resposta : JSON.stringify(resposta);
  };
  return { chamar, pedidos };
}

describe("analista com modelo de linguagem", () => {
  it("mantém os fatos das regras e usa o que o modelo escreveu com base", async () => {
    const { chamar } = modeloQueResponde({
      interpretacoes: [{ texto: "A maior parte dos clientes sai satisfeita.", evidencias: ["notas:nota:altas"] }],
      hipoteses: [{ texto: "Uma hipótese é que o horário de pico pese nas notas baixas.", evidencias: ["notas:nota:baixas"] }],
      acoes: [{ texto: "Pode valer a pena observar o atendimento no horário de pico.", evidencias: ["notas:nota:baixas"] }],
    });
    const analise = await criarAnalistaComModelo(chamar).analisar(ENTRADA);
    assert.equal(analise.situacao, "pronta");
    if (analise.situacao !== "pronta") return;

    const regras = analisarPorRegras(ENTRADA);
    assert.equal(regras.situacao, "pronta");
    if (regras.situacao !== "pronta") return;

    const fatosDasRegras = regras.achados.filter((achado) => achado.natureza === "fato");
    const fatos = analise.achados.filter((achado) => achado.natureza === "fato");
    assert.deepEqual(fatos, fatosDasRegras);
    assert.ok(analise.achados.some((achado) => achado.texto === "A maior parte dos clientes sai satisfeita."));
    assert.deepEqual(
      analise.acoes.map((acao) => acao.texto),
      ["Pode valer a pena observar o atendimento no horário de pico."],
    );
  });

  it("descarta o que cita evidência inexistente, inventa número ou fala com certeza", async () => {
    const { chamar } = modeloQueResponde({
      interpretacoes: [
        { texto: "90% dos clientes adoram a loja.", evidencias: ["notas:nota:altas"] },
        { texto: "Os clientes estão certamente satisfeitos.", evidencias: ["notas:nota:altas"] },
        { texto: "O estoque está baixo.", evidencias: ["estoque"] },
        { texto: "A percepção geral é positiva.", evidencias: ["notas:nota:altas"] },
      ],
      hipoteses: [],
      acoes: [],
    });
    const analise = await criarAnalistaComModelo(chamar).analisar(ENTRADA);
    if (analise.situacao !== "pronta") throw new Error("deveria estar pronta");
    const interpretacoes = analise.achados.filter((achado) => achado.natureza === "interpretacao");
    assert.deepEqual(
      interpretacoes.map((achado) => achado.texto),
      ["A percepção geral é positiva."],
    );
  });

  it("falha quando nada do que o modelo escreveu se sustenta", async () => {
    const { chamar } = modeloQueResponde({
      interpretacoes: [{ texto: "Tudo ótimo.", evidencias: [] }],
      hipoteses: [],
      acoes: [],
    });
    await assert.rejects(criarAnalistaComModelo(chamar).analisar(ENTRADA), /nada do que o modelo escreveu/);
  });

  it("falha com resposta fora do formato, em vez de tentar adivinhar", async () => {
    const { chamar } = modeloQueResponde("isto não é JSON");
    await assert.rejects(criarAnalistaComModelo(chamar).analisar(ENTRADA));
  });

  it("não chama o modelo de novo para os mesmos números", async () => {
    const { chamar, pedidos } = modeloQueResponde({
      interpretacoes: [{ texto: "A percepção geral é positiva.", evidencias: ["notas:nota:altas"] }],
      hipoteses: [],
      acoes: [],
    });
    const analista = criarAnalistaComModelo(chamar);
    await analista.analisar(ENTRADA);
    await analista.analisar(ENTRADA);
    assert.equal(pedidos.length, 1);
  });

  it("não chama o modelo quando ainda não há respostas suficientes", async () => {
    const { chamar, pedidos } = modeloQueResponde({ interpretacoes: [], hipoteses: [], acoes: [] });
    const poucas = respostasComValores(repetir({ nota: 5 }, 3), ONTEM);
    const entrada = { ...ENTRADA, resultados: calcularResultados([NOTA], poucas, AGORA), respostas: poucas };
    const analise = await criarAnalistaComModelo(chamar).analisar(entrada);
    assert.equal(analise.situacao, "dados-insuficientes");
    assert.equal(pedidos.length, 0);
  });

  it("nunca envia ao modelo o que um cliente escreveu", () => {
    const regras = analisarPorRegras(ENTRADA);
    if (regras.situacao !== "pronta") throw new Error("deveria estar pronta");
    const pedido = montarPedido(ENTRADA, regras);
    assert.doesNotMatch(pedido.conteudo, /Maria/);
    assert.doesNotMatch(pedido.instrucoes, /Maria/);
  });
});

describe("escolha do analista", () => {
  it("usa as regras no modo de teste, mesmo com modelo configurado", () => {
    const analista = escolherAnalista({ ANALISE_IA_MODELO: "fornecedor/modelo", AI_GATEWAY_API_KEY: "chave" });
    assert.equal(typeof analista.analisar, "function");
    // No modo de teste (o padrão desta máquina), nenhum serviço externo é usado.
    assert.equal(analista, escolherAnalista({}));
  });
});
