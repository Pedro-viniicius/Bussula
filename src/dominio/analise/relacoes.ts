/**
 * Relações entre duas perguntas: "quem escolheu X dá notas diferentes?".
 *
 * Para cada pergunta de nota, as pessoas são separadas pelo que responderam
 * numa pergunta de escolha única ou de sim/não, e a média de cada grupo é
 * comparada com a média de todos.
 *
 * Comparar grupos é onde é mais fácil enxergar padrão no acaso. Por isso uma
 * diferença só é dita quando passa em três travas ao mesmo tempo:
 *
 *   1. o grupo tem gente suficiente;
 *   2. a diferença é grande em relação ao tamanho da escala;
 *   3. a diferença é grande em relação à variação normal das notas
 *      (várias vezes o erro esperado para um grupo daquele tamanho).
 *
 * E mesmo assim ela vira hipótese, nunca conclusão: duas respostas andarem
 * juntas não diz que uma causa a outra.
 */
import {
  familiaDoTipo,
  limitesDaNota,
  semDadosPessoais,
  type Pergunta,
  type ValorDaResposta,
} from "@/dominio/formularios/perguntas";
import type { Resposta } from "@/dominio/respostas/tipos";
import { formatarComUmaCasa } from "@/utilitarios/numeros";
import { leituraVazia, type Leitura } from "./leitura";

/** Menos gente que isto num grupo, e a média do grupo oscila demais para comparar. */
const MINIMO_DE_PESSOAS_NO_GRUPO = 10;

/** A diferença de médias precisa ser ao menos esta fração do tamanho da escala (0,4 ponto numa nota de 1 a 5). */
const DIFERENCA_MINIMA_NA_ESCALA = 0.1;

/**
 * A diferença precisa ser ao menos este múltiplo do erro esperado para a
 * média de um grupo daquele tamanho. Com vários grupos comparados de uma vez,
 * uma trava frouxa acharia "relação" em puro acaso.
 */
const DIFERENCA_MINIMA_EM_ERROS_PADRAO = 2.5;

/** Quantas relações a análise mostra, no máximo — as de maior diferença. */
const MAXIMO_DE_RELACOES = 2;

export type RelacaoEncontrada = {
  perguntaDeNota: Pergunta;
  perguntaDoGrupo: Pergunta;
  rotuloDoGrupo: string;
  pessoasNoGrupo: number;
  mediaDoGrupo: number;
  pessoasNoTotal: number;
  mediaGeral: number;
};

type NotaDoGrupo = { rotuloDoGrupo: string; nota: number };

export function lerRelacoes(perguntas: Pergunta[], respostas: Resposta[]): Leitura {
  const relacoes = encontrarRelacoes(perguntas, respostas);
  const leitura = leituraVazia();
  if (relacoes.length === 0) return leitura;

  for (const relacao of relacoes) {
    descreverRelacao(relacao, leitura);
  }
  leitura.limites.push("Quando duas perguntas andam juntas, isso mostra uma associação — não que uma cause a outra.");
  return leitura;
}

/** Todas as combinações de nota × grupo que passam nas três travas, da maior diferença para a menor. */
export function encontrarRelacoes(todasAsPerguntas: Pergunta[], respostas: Resposta[]): RelacaoEncontrada[] {
  const perguntas = semDadosPessoais(todasAsPerguntas);
  const perguntasDeNota = perguntas.filter((pergunta) => familiaDoTipo(pergunta.tipo) === "nota");
  const perguntasQueFormamGrupos = perguntas.filter(
    (pergunta) => pergunta.tipo === "escolha_unica" || pergunta.tipo === "sim_nao",
  );

  const encontradas: RelacaoEncontrada[] = [];
  for (const perguntaDeNota of perguntasDeNota) {
    for (const perguntaDoGrupo of perguntasQueFormamGrupos) {
      const relacao = compararGrupos(perguntaDeNota, perguntaDoGrupo, respostas);
      if (relacao) encontradas.push(relacao);
    }
  }

  encontradas.sort((a, b) => distanciaDaMedia(b) - distanciaDaMedia(a));
  return encontradas.slice(0, MAXIMO_DE_RELACOES);
}

/** O grupo que mais se afasta da média geral, se algum passar nas três travas. */
function compararGrupos(
  perguntaDeNota: Pergunta,
  perguntaDoGrupo: Pergunta,
  respostas: Resposta[],
): RelacaoEncontrada | null {
  const notasComGrupo = juntarNotaEGrupo(perguntaDeNota, perguntaDoGrupo, respostas);
  const todasAsNotas = notasComGrupo.map((item) => item.nota);
  if (todasAsNotas.length === 0) return null;

  const mediaGeral = media(todasAsNotas);
  const desvioDasNotas = desvioPadrao(todasAsNotas, mediaGeral);
  if (desvioDasNotas === 0) return null;

  const { menor, maior } = limitesDaNota(perguntaDeNota);
  const tamanhoDaEscala = maior - menor;

  let maisDistante: RelacaoEncontrada | null = null;
  for (const [rotuloDoGrupo, notasDoGrupo] of separarPorGrupo(notasComGrupo)) {
    const pessoasNoGrupo = notasDoGrupo.length;
    if (pessoasNoGrupo < MINIMO_DE_PESSOAS_NO_GRUPO) continue;

    const mediaDoGrupo = media(notasDoGrupo);
    const diferenca = Math.abs(mediaDoGrupo - mediaGeral);
    const erroEsperado = desvioDasNotas / Math.sqrt(pessoasNoGrupo);

    const grandeParaAEscala = diferenca >= DIFERENCA_MINIMA_NA_ESCALA * tamanhoDaEscala;
    const grandeParaOAcaso = diferenca >= DIFERENCA_MINIMA_EM_ERROS_PADRAO * erroEsperado;
    if (!grandeParaAEscala || !grandeParaOAcaso) continue;

    const candidata: RelacaoEncontrada = {
      perguntaDeNota,
      perguntaDoGrupo,
      rotuloDoGrupo,
      pessoasNoGrupo,
      mediaDoGrupo,
      pessoasNoTotal: todasAsNotas.length,
      mediaGeral,
    };
    if (!maisDistante || distanciaDaMedia(candidata) > distanciaDaMedia(maisDistante)) maisDistante = candidata;
  }
  return maisDistante;
}

/** Só entra quem respondeu às duas perguntas. */
function juntarNotaEGrupo(perguntaDeNota: Pergunta, perguntaDoGrupo: Pergunta, respostas: Resposta[]): NotaDoGrupo[] {
  const juntas: NotaDoGrupo[] = [];
  for (const resposta of respostas) {
    const nota = resposta.valores[perguntaDeNota.id];
    const rotuloDoGrupo = rotuloDaResposta(perguntaDoGrupo, resposta.valores[perguntaDoGrupo.id]);
    if (typeof nota === "number" && rotuloDoGrupo !== null) juntas.push({ rotuloDoGrupo, nota });
  }
  return juntas;
}

function rotuloDaResposta(pergunta: Pergunta, valor: ValorDaResposta | undefined): string | null {
  if (pergunta.tipo === "sim_nao" && typeof valor === "boolean") return valor ? "Sim" : "Não";
  if (pergunta.tipo === "escolha_unica" && typeof valor === "string" && pergunta.opcoes.includes(valor)) return valor;
  return null;
}

function separarPorGrupo(notasComGrupo: NotaDoGrupo[]): Map<string, number[]> {
  const grupos = new Map<string, number[]>();
  for (const { rotuloDoGrupo, nota } of notasComGrupo) {
    const notasDoGrupo = grupos.get(rotuloDoGrupo) ?? [];
    notasDoGrupo.push(nota);
    grupos.set(rotuloDoGrupo, notasDoGrupo);
  }
  return grupos;
}

function descreverRelacao(relacao: RelacaoEncontrada, leitura: Leitura): void {
  const { perguntaDeNota, perguntaDoGrupo, rotuloDoGrupo } = relacao;
  const mediaDoGrupo = formatarComUmaCasa(relacao.mediaDoGrupo);
  const mediaGeral = formatarComUmaCasa(relacao.mediaGeral);
  const acimaOuAbaixo = relacao.mediaDoGrupo > relacao.mediaGeral ? "acima" : "abaixo";
  const paraCimaOuParaBaixo = relacao.mediaDoGrupo > relacao.mediaGeral ? "para cima" : "para baixo";

  const id = `relacao:${perguntaDeNota.id}:${perguntaDoGrupo.id}`;
  leitura.evidencias.push({
    id,
    fonte: `"${perguntaDeNota.enunciado}" × "${perguntaDoGrupo.enunciado}"`,
    texto: `Média ${mediaDoGrupo} entre as ${relacao.pessoasNoGrupo} pessoas que responderam "${rotuloDoGrupo}", contra ${mediaGeral} entre as ${relacao.pessoasNoTotal} que responderam às duas perguntas.`,
  });
  leitura.achados.push(
    {
      natureza: "fato",
      texto: `Quem respondeu "${rotuloDoGrupo}" em "${perguntaDoGrupo.enunciado}" deu nota média ${mediaDoGrupo} em "${perguntaDeNota.enunciado}" — ${acimaOuAbaixo} da média geral, de ${mediaGeral}.`,
      evidencias: [id],
    },
    {
      natureza: "hipotese",
      texto: `Uma hipótese a investigar é se quem responde "${rotuloDoGrupo}" vive uma situação diferente dos demais clientes, que puxa a nota de "${perguntaDeNota.enunciado}" ${paraCimaOuParaBaixo}.`,
      evidencias: [id],
    },
  );
  leitura.acoes.push({
    texto: `Pode valer a pena conversar com clientes que responderam "${rotuloDoGrupo}" para entender o que explica essa diferença.`,
    evidencias: [id],
  });
}

function distanciaDaMedia(relacao: RelacaoEncontrada): number {
  return Math.abs(relacao.mediaDoGrupo - relacao.mediaGeral);
}

function media(valores: number[]): number {
  const soma = valores.reduce((acumulado, valor) => acumulado + valor, 0);
  return soma / valores.length;
}

function desvioPadrao(valores: number[], mediaDosValores: number): number {
  const somaDosQuadrados = valores.reduce((acumulado, valor) => acumulado + (valor - mediaDosValores) ** 2, 0);
  return Math.sqrt(somaDosQuadrados / valores.length);
}
