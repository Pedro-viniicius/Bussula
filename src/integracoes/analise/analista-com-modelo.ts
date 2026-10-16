/**
 * O analista que usa um modelo de linguagem para escrever interpretações,
 * hipóteses e possíveis ações.
 *
 * O modelo não calcula nada e não afirma fato nenhum. Os números, as
 * evidências e os fatos vêm do analista por regras; o modelo recebe esse
 * catálogo e só pode escrever apontando para ele. O que ele devolve passa pela
 * trava de sustentação (`src/dominio/analise/validacao.ts`): texto com
 * evidência inexistente, número que não está na evidência ou tom de certeza é
 * descartado. Se nada se sustentar, a chamada falha e as regras respondem.
 *
 * Privacidade: o modelo recebe só números agregados e os enunciados das
 * perguntas. Nenhuma resposta individual e nenhum texto escrito por cliente
 * sai do servidor.
 *
 * Custo: a mesma análise não é pedida duas vezes. O resultado fica guardado
 * até chegar uma resposta nova (ou o dia virar), porque só isso muda os
 * números.
 */
import { z } from "zod";
import {
  analisarPorRegras,
  juntarAcoesRepetidas,
  limitarPorNatureza,
  MAXIMO_DE_ACOES,
} from "@/dominio/analise/analista-por-regras";
import type {
  Achado,
  AnalistaDeResultados,
  AnaliseDosResultados,
  EntradaDaAnalise,
  NaturezaDoAchado,
  PossivelAcao,
} from "@/dominio/analise/tipos";
import { manterSoOSustentado } from "@/dominio/analise/validacao";
import { DESCRICAO_DO_TIPO, semDadosPessoais } from "@/dominio/formularios/perguntas";
import { MARCA } from "@/lib/marca";
import type { ChamadaAoModelo, PedidoAoModelo } from "./gateway-de-ia";

/** Quantas análises ficam guardadas por instância do servidor. */
const MAXIMO_DE_ANALISES_GUARDADAS = 50;

const ITEM_COM_EVIDENCIAS = z.object({
  texto: z.string().describe("Uma ou duas frases curtas, em português do Brasil."),
  evidencias: z.array(z.string()).describe("Ids das evidências que sustentam o item. Pelo menos um."),
});

const FORMATO_DA_RESPOSTA = z.object({
  interpretacoes: z.array(ITEM_COM_EVIDENCIAS).describe("O que os fatos podem indicar."),
  hipoteses: z.array(ITEM_COM_EVIDENCIAS).describe("Explicações possíveis que ainda precisam ser investigadas."),
  acoes: z.array(ITEM_COM_EVIDENCIAS).describe("Sugestões práticas, escritas como possibilidade."),
});

type RespostaDoModelo = z.infer<typeof FORMATO_DA_RESPOSTA>;

const INSTRUCOES = `Você ajuda a equipe da loja ${MARCA.nome} a entender os resultados de um formulário respondido por clientes.
Escreva em português do Brasil, para um gestor sem formação técnica, com frases curtas.

Regras obrigatórias:
1. Use apenas as evidências fornecidas. Cada item precisa citar, no campo "evidencias", os ids das evidências que o sustentam.
2. Não escreva número nenhum que não apareça nas evidências citadas. Prefira não repetir números: a tela já mostra cada evidência ao lado do texto.
3. Separe as naturezas. "interpretacoes" dizem o que os fatos podem indicar. "hipoteses" são explicações possíveis, ainda não confirmadas, e começam com "Uma hipótese". "acoes" são sugestões práticas, escritas como possibilidade: "Pode valer a pena…", "Uma possível ação seria…".
4. Nunca apresente hipótese como fato. Não use "certamente", "com certeza", "definitivamente" nem "sem dúvida".
5. Não invente comportamento de cliente nem causas que os dados não sugerem. Se os dados não sustentam um ponto, não escreva o item.
6. Considere os limites informados: não conclua nada sobre o que eles dizem que ainda não dá para concluir.
7. No máximo 4 interpretações, 3 hipóteses e 4 ações.
8. Não mencione inteligência artificial, modelo, fornecedor, tecnologia nem custos.`;

export function criarAnalistaComModelo(chamarModelo: ChamadaAoModelo): AnalistaDeResultados {
  const analisesGuardadas = new Map<string, AnaliseDosResultados>();

  return {
    async analisar(entrada) {
      const analiseDasRegras = analisarPorRegras(entrada);
      // Sem respostas suficientes não há o que interpretar — e nada a pagar por isso.
      if (analiseDasRegras.situacao !== "pronta") return analiseDasRegras;

      const chave = chaveDaEntrada(entrada);
      const guardada = analisesGuardadas.get(chave);
      if (guardada) return guardada;

      const pedido = montarPedido(entrada, analiseDasRegras);
      const textoDoModelo = await chamarModelo(pedido);
      const respostaDoModelo = lerRespostaDoModelo(textoDoModelo);
      const analise = combinarComAsRegras(analiseDasRegras, respostaDoModelo);

      guardar(analisesGuardadas, chave, analise);
      return analise;
    },
  };
}

type AnaliseProntaDasRegras = Extract<AnaliseDosResultados, { situacao: "pronta" }>;

/** O que muda os números muda a chave: um formulário, uma versão, as contagens e o dia. */
function chaveDaEntrada(entrada: EntradaDaAnalise): string {
  return JSON.stringify({
    formulario: entrada.formulario.id,
    versao: entrada.formulario.versao,
    resumo: entrada.resultados.resumo,
    primeiroDiaDaSerie: entrada.resultados.serie[0]?.dia ?? null,
  });
}

export function montarPedido(entrada: EntradaDaAnalise, analiseDasRegras: AnaliseProntaDasRegras): PedidoAoModelo {
  const material = {
    formulario: {
      nome: entrada.formulario.nome,
      objetivo: entrada.formulario.objetivo,
      totalDeRespostas: entrada.resultados.resumo.totalDeRespostas,
    },
    perguntas: semDadosPessoais(entrada.perguntas).map((pergunta) => ({
      enunciado: pergunta.enunciado,
      tipo: DESCRICAO_DO_TIPO[pergunta.tipo].rotulo,
      opcoes: pergunta.opcoes,
    })),
    evidencias: analiseDasRegras.evidencias,
    fatosJaObservados: analiseDasRegras.achados
      .filter((achado) => achado.natureza === "fato")
      .map((achado) => achado.texto),
    limites: analiseDasRegras.limites,
  };

  const formato = z.toJSONSchema(FORMATO_DA_RESPOSTA) as Record<string, unknown>;
  delete formato.$schema;

  return {
    instrucoes: INSTRUCOES,
    conteudo: `Material para a análise, em JSON:\n${JSON.stringify(material, null, 2)}`,
    nomeDoFormato: "analise_dos_resultados",
    formato,
  };
}

/** Converte e confere o formato. Qualquer desvio é uma falha, não um palpite de conserto. */
function lerRespostaDoModelo(texto: string): RespostaDoModelo {
  const json: unknown = JSON.parse(texto);
  return FORMATO_DA_RESPOSTA.parse(json);
}

/**
 * Os fatos continuam sendo os das regras. Para interpretações, hipóteses e
 * ações, vale o que o modelo escreveu e se sustentou; numa natureza em que
 * nada do modelo se sustentou, ficam as frases das regras.
 */
function combinarComAsRegras(
  analiseDasRegras: AnaliseProntaDasRegras,
  respostaDoModelo: RespostaDoModelo,
): AnaliseDosResultados {
  const { evidencias } = analiseDasRegras;

  const interpretacoes = manterSoOSustentado(comNatureza(respostaDoModelo.interpretacoes, "interpretacao"), evidencias);
  const hipoteses = manterSoOSustentado(comNatureza(respostaDoModelo.hipoteses, "hipotese"), evidencias);
  const acoes = manterSoOSustentado<PossivelAcao>(respostaDoModelo.acoes, evidencias);

  const nadaSeSustentou = interpretacoes.length === 0 && hipoteses.length === 0 && acoes.length === 0;
  if (nadaSeSustentou) throw new Error("nada do que o modelo escreveu se sustentou nas evidências");

  const achadosDasRegras = analiseDasRegras.achados;
  const fatos = achadosDasRegras.filter((achado) => achado.natureza === "fato");
  const interpretacoesFinais = interpretacoes.length > 0 ? interpretacoes : daNatureza(achadosDasRegras, "interpretacao");
  const hipotesesFinais = hipoteses.length > 0 ? hipoteses : daNatureza(achadosDasRegras, "hipotese");
  const acoesFinais = acoes.length > 0 ? juntarAcoesRepetidas(acoes) : analiseDasRegras.acoes;

  return {
    situacao: "pronta",
    evidencias,
    achados: limitarPorNatureza([...fatos, ...interpretacoesFinais, ...hipotesesFinais]),
    acoes: acoesFinais.slice(0, MAXIMO_DE_ACOES),
    limites: analiseDasRegras.limites,
  };
}

function comNatureza(itens: RespostaDoModelo["acoes"], natureza: NaturezaDoAchado): Achado[] {
  return itens.map((item) => ({ natureza, texto: item.texto.trim(), evidencias: item.evidencias }));
}

function daNatureza(achados: Achado[], natureza: NaturezaDoAchado): Achado[] {
  return achados.filter((achado) => achado.natureza === natureza);
}

/** Guarda, e esquece a mais antiga quando passa do teto. */
function guardar(analisesGuardadas: Map<string, AnaliseDosResultados>, chave: string, analise: AnaliseDosResultados) {
  analisesGuardadas.set(chave, analise);
  if (analisesGuardadas.size > MAXIMO_DE_ANALISES_GUARDADAS) {
    const maisAntiga = analisesGuardadas.keys().next().value;
    if (maisAntiga !== undefined) analisesGuardadas.delete(maisAntiga);
  }
}
