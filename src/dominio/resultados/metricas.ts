/**
 * Como as respostas de um formulário viram números.
 *
 * Tudo aqui é conta pura sobre a lista de respostas: nada busca no banco,
 * nada desenha tela. É o que permite testar cada número sem subir
 * infraestrutura — e é a garantia de que a análise (`src/dominio/analise`)
 * só recebe o que saiu das respostas de verdade.
 *
 * A sequência é sempre a mesma:
 *
 *   respostas → resumo da coleta → série por dia → origens → distribuições
 */
import { DIAS_PERIODO_PADRAO } from "@/dominio/constantes";
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import { limitesDaNota, type Pergunta, type ValorDaResposta } from "@/dominio/formularios/perguntas";
import { ORIGENS_DA_RESPOSTA, ROTULO_DA_ORIGEM, type Resposta } from "@/dominio/respostas/tipos";
import { diasEntre, inicioDeDiasAtras, inicioDeHoje, inicioDoDia } from "@/utilitarios/tempo";
import type {
  DistribuicaoDaPergunta,
  OpcaoContada,
  OrigemContada,
  ResultadosDoFormulario,
  ResumoDoFormulario,
} from "./tipos";

/** Quantos textos abertos a tela mostra por pergunta. */
const TEXTOS_MOSTRADOS_POR_PERGUNTA = 8;

export function calcularResultados(
  perguntas: Pergunta[],
  respostas: Resposta[],
  agora: Date = new Date(),
  diasDoPeriodo: number = DIAS_PERIODO_PADRAO,
): ResultadosDoFormulario {
  return {
    diasDoPeriodo,
    resumo: resumirColeta(respostas, agora, diasDoPeriodo),
    serie: montarSeriePorDia(respostas, agora, diasDoPeriodo),
    origens: contarOrigens(respostas),
    distribuicoes: calcularDistribuicoes(perguntas, respostas),
  };
}

/** Quantas respostas hoje, na janela atual e na janela anterior — e há quantos dias foi a última. */
export function resumirColeta(respostas: Resposta[], agora: Date, dias: number): ResumoDoFormulario {
  const inicioDeHojeNaLoja = inicioDeHoje(agora);
  const inicioDoPeriodo = inicioDeDiasAtras(dias - 1, agora);
  const inicioDoPeriodoAnterior = inicioDeDiasAtras(2 * dias - 1, agora);

  let respostasHoje = 0;
  let respostasNoPeriodo = 0;
  let respostasNoPeriodoAnterior = 0;
  let ultimaRespostaEm: Date | null = null;

  for (const resposta of respostas) {
    if (resposta.criadoEm >= inicioDeHojeNaLoja) respostasHoje += 1;

    if (resposta.criadoEm >= inicioDoPeriodo) respostasNoPeriodo += 1;
    else if (resposta.criadoEm >= inicioDoPeriodoAnterior) respostasNoPeriodoAnterior += 1;

    if (!ultimaRespostaEm || resposta.criadoEm > ultimaRespostaEm) ultimaRespostaEm = resposta.criadoEm;
  }

  return {
    totalDeRespostas: respostas.length,
    respostasHoje,
    respostasNoPeriodo,
    respostasNoPeriodoAnterior,
    ultimaRespostaEm,
    diasSemResposta: ultimaRespostaEm ? diasEntre(ultimaRespostaEm, agora) : null,
  };
}

/** Respostas por dia na janela, do dia mais antigo para hoje, com zeros nos dias vazios. */
export function montarSeriePorDia(respostas: Resposta[], agora: Date, dias: number): PontoDaSerie[] {
  const totalPorDia = new Map<number, number>();
  for (const resposta of respostas) {
    const chaveDoDia = inicioDoDia(resposta.criadoEm).getTime();
    totalPorDia.set(chaveDoDia, (totalPorDia.get(chaveDoDia) ?? 0) + 1);
  }

  const serie: PontoDaSerie[] = [];
  for (let posicao = 0; posicao < dias; posicao++) {
    const dia = inicioDeDiasAtras(dias - 1 - posicao, agora);
    serie.push({ dia, total: totalPorDia.get(dia.getTime()) ?? 0 });
  }
  return serie;
}

/** Quantas respostas vieram de cada origem, da mais usada para a menos usada. */
export function contarOrigens(respostas: Resposta[]): OrigemContada[] {
  const contagem: OrigemContada[] = ORIGENS_DA_RESPOSTA.map((origem) => ({
    origem,
    rotulo: ROTULO_DA_ORIGEM[origem],
    total: respostas.filter((resposta) => resposta.origem === origem).length,
  }));
  return contagem.sort((a, b) => b.total - a.total);
}

/**
 * Como as pessoas responderam a cada pergunta.
 *
 * Casa cada valor com a pergunta de mesmo id na versão atual. Pergunta que só
 * existiu numa versão antiga não aparece — o que foi respondido continua
 * guardado, só não tem onde ser mostrado aqui.
 */
export function calcularDistribuicoes(perguntas: Pergunta[], respostas: Resposta[]): DistribuicaoDaPergunta[] {
  return perguntas.map((pergunta) => resumirPergunta(pergunta, respostas));
}

function resumirPergunta(pergunta: Pergunta, respostas: Resposta[]): DistribuicaoDaPergunta {
  const valores = respostas
    .map((resposta) => resposta.valores[pergunta.id])
    .filter((valor): valor is ValorDaResposta => valor !== undefined && valor !== null);

  const distribuicao: DistribuicaoDaPergunta = {
    perguntaId: pergunta.id,
    enunciado: pergunta.enunciado,
    tipo: pergunta.tipo,
    totalDeRespostas: valores.length,
    opcoes: [],
    media: null,
    textos: [],
  };

  switch (pergunta.tipo) {
    case "escolha_unica":
      distribuicao.opcoes = contarRotulos(pergunta.opcoes, somenteTextos(valores));
      return distribuicao;

    case "multipla_escolha": {
      const marcadas = valores.flatMap((valor) => (Array.isArray(valor) ? valor : []));
      distribuicao.opcoes = contarRotulos(pergunta.opcoes, marcadas);
      return distribuicao;
    }

    case "sim_nao": {
      const booleanos = valores.filter((valor): valor is boolean => typeof valor === "boolean");
      distribuicao.opcoes = [
        { rotulo: "Sim", total: booleanos.filter((valor) => valor).length },
        { rotulo: "Não", total: booleanos.filter((valor) => !valor).length },
      ];
      return distribuicao;
    }

    case "escala":
    case "avaliacao": {
      const numeros = valores.filter((valor): valor is number => typeof valor === "number");
      const { menor, maior } = limitesDaNota(pergunta);
      distribuicao.opcoes = contarPontosDaEscala(menor, maior, numeros);
      distribuicao.media = calcularMedia(numeros);
      return distribuicao;
    }

    case "texto_curto":
    case "texto_livre":
      distribuicao.textos = somenteTextos(valores)
        .filter((texto) => texto.trim() !== "")
        .slice(0, TEXTOS_MOSTRADOS_POR_PERGUNTA);
      return distribuicao;
  }
}

function somenteTextos(valores: ValorDaResposta[]): string[] {
  return valores.filter((valor): valor is string => typeof valor === "string");
}

/** Conta quantas vezes cada opção apareceu, na ordem em que foram escritas. */
function contarRotulos(opcoes: string[], marcadas: string[]): OpcaoContada[] {
  return opcoes.map((rotulo) => ({ rotulo, total: marcadas.filter((marcada) => marcada === rotulo).length }));
}

/** Um ponto por valor possível da escala, de `menor` a `maior`, mesmo os que ninguém marcou. */
function contarPontosDaEscala(menor: number, maior: number, numeros: number[]): OpcaoContada[] {
  const pontos: OpcaoContada[] = [];
  for (let valor = menor; valor <= maior; valor++) {
    pontos.push({ rotulo: String(valor), total: numeros.filter((numero) => numero === valor).length });
  }
  return pontos;
}

function calcularMedia(numeros: number[]): number | null {
  if (numeros.length === 0) return null;
  const soma = numeros.reduce((acumulado, numero) => acumulado + numero, 0);
  return soma / numeros.length;
}
