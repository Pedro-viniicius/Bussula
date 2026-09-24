/**
 * O analista por regras: a leitura dos resultados feita por regras fixas.
 *
 * É determinístico — os mesmos números produzem sempre as mesmas frases — e
 * não depende de serviço nenhum. É ele que responde quando nenhum modelo de
 * linguagem está configurado, e é sobre os fatos e limites dele que o modelo
 * escreve quando está.
 *
 * A leitura segue sempre a mesma ordem, da mais importante para quem
 * administra até a mais operacional:
 *
 *   notas → relações entre perguntas → escolhas → ritmo → canais → textos
 *
 * Cada natureza tem um teto de itens: uma análise com trinta frases não é lida.
 */
import { familiaDoTipo } from "@/dominio/formularios/perguntas";
import type { DistribuicaoDaPergunta } from "@/dominio/resultados/tipos";
import { juntarLeituras, semRepeticao, type Leitura } from "./leitura";
import { lerCanais, lerRitmoDaColeta, lerSilencio, lerTamanhoDaAmostra } from "./regras-da-coleta";
import { lerPergunta } from "./regras-das-perguntas";
import { lerRelacoes } from "./relacoes";
import type {
  Achado,
  AnalistaDeResultados,
  AnaliseDosResultados,
  EntradaDaAnalise,
  NaturezaDoAchado,
  PossivelAcao,
} from "./tipos";
import { manterSoOSustentado } from "./validacao";

/** Abaixo disto, a análise não diz nada além dos próprios números. */
export const MINIMO_DE_RESPOSTAS_PARA_ANALISE = 10;

const MAXIMO_POR_NATUREZA: Record<NaturezaDoAchado, number> = {
  fato: 6,
  interpretacao: 4,
  hipotese: 3,
};

export const MAXIMO_DE_ACOES = 4;

export function analisarPorRegras(entrada: EntradaDaAnalise): AnaliseDosResultados {
  const { resultados } = entrada;
  const totalDeRespostas = resultados.resumo.totalDeRespostas;

  if (totalDeRespostas < MINIMO_DE_RESPOSTAS_PARA_ANALISE) {
    return { situacao: "dados-insuficientes", totalDeRespostas, minimoDeRespostas: MINIMO_DE_RESPOSTAS_PARA_ANALISE };
  }

  const leitura = juntarLeituras([
    ...lerPerguntasDaFamilia(resultados.distribuicoes, "nota"),
    lerRelacoes(entrada.perguntas, entrada.respostas),
    ...lerPerguntasDaFamilia(resultados.distribuicoes, "escolha"),
    lerRitmoDaColeta(resultados),
    lerSilencio(resultados),
    lerCanais(resultados),
    ...lerPerguntasDaFamilia(resultados.distribuicoes, "texto"),
    lerTamanhoDaAmostra(totalDeRespostas),
  ]);

  return montarAnalise(leitura);
}

/** O mesmo analista, no formato do contrato que as telas conhecem. */
export const analistaPorRegras: AnalistaDeResultados = {
  async analisar(entrada) {
    return analisarPorRegras(entrada);
  },
};

function lerPerguntasDaFamilia(
  distribuicoes: DistribuicaoDaPergunta[],
  familia: "nota" | "escolha" | "texto",
): Leitura[] {
  const daFamilia = distribuicoes.filter((distribuicao) => familiaDoTipo(distribuicao.tipo) === familia);
  return daFamilia.map(lerPergunta);
}

/**
 * Aplica os tetos e a trava de sustentação. A trava não deveria descartar
 * nada vindo das regras — se descartar, é defeito numa regra, e os testes
 * existem para pegar isso.
 */
function montarAnalise(leitura: Leitura): AnaliseDosResultados {
  const achadosSustentados = manterSoOSustentado(leitura.achados, leitura.evidencias);
  const acoesSustentadas = manterSoOSustentado(juntarAcoesRepetidas(leitura.acoes), leitura.evidencias);

  return {
    situacao: "pronta",
    evidencias: leitura.evidencias,
    achados: limitarPorNatureza(achadosSustentados),
    acoes: acoesSustentadas.slice(0, MAXIMO_DE_ACOES),
    limites: semRepeticao(leitura.limites),
  };
}

/** Mantém os primeiros de cada natureza até o teto, sem mudar a ordem. */
export function limitarPorNatureza(achados: Achado[]): Achado[] {
  const contagem: Record<NaturezaDoAchado, number> = { fato: 0, interpretacao: 0, hipotese: 0 };
  const mantidos: Achado[] = [];
  for (const achado of achados) {
    if (contagem[achado.natureza] >= MAXIMO_POR_NATUREZA[achado.natureza]) continue;
    contagem[achado.natureza] += 1;
    mantidos.push(achado);
  }
  return mantidos;
}

/** Duas regras que sugerem a mesma ação viram uma ação só, apoiada nas evidências das duas. */
export function juntarAcoesRepetidas(acoes: PossivelAcao[]): PossivelAcao[] {
  const porTexto = new Map<string, PossivelAcao>();
  for (const acao of acoes) {
    const existente = porTexto.get(acao.texto);
    if (existente) {
      existente.evidencias = semRepeticao([...existente.evidencias, ...acao.evidencias]);
    } else {
      porTexto.set(acao.texto, { texto: acao.texto, evidencias: [...acao.evidencias] });
    }
  }
  return [...porTexto.values()];
}
