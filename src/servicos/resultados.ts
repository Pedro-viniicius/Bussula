/**
 * Os resultados de um formulário, do jeito que a tela "Resultados & IA" usa.
 *
 * A sequência é sempre a mesma, e cada passo mora num lugar próprio:
 *
 *   buscar o formulário e as respostas   (repositórios)
 *   → calcular os números               (src/dominio/resultados)
 *   → analisar os números                (src/dominio/analise + src/integracoes/analise)
 *
 * A busca e as contas são rápidas e vêm primeiro. A análise é pedida à parte,
 * para a tela poder mostrar os números enquanto ela ainda está sendo feita.
 */
import { analisarPorRegras } from "@/dominio/analise/analista-por-regras";
import type { AnaliseDosResultados, EntradaDaAnalise } from "@/dominio/analise/tipos";
import type { FormularioComPerguntas } from "@/dominio/formularios/tipos";
import type { Resposta } from "@/dominio/respostas/tipos";
import { calcularResultados } from "@/dominio/resultados/metricas";
import type { ResultadosDoFormulario } from "@/dominio/resultados/tipos";
import { escolherAnalista } from "@/integracoes/analise";
import { log } from "@/lib/logger";
import { respostasGravadas } from "@/repositorios";
import { buscarFormularioPorId } from "./formularios";

export type DadosDosResultados = {
  formulario: FormularioComPerguntas;
  respostas: Resposta[];
  resultados: ResultadosDoFormulario;
};

/** O formulário, as respostas dele e os números calculados. Nulo quando o formulário não existe. */
export async function buscarResultadosDoFormulario(
  formularioId: string,
  agora: Date = new Date(),
): Promise<DadosDosResultados | null> {
  const formulario = await buscarFormularioPorId(formularioId);
  if (!formulario) return null;

  const respostas = await respostasGravadas.doFormulario(formulario.id);
  const resultados = calcularResultados(formulario.perguntas, respostas, agora);
  return { formulario, respostas, resultados };
}

/**
 * A análise dos resultados. Nunca falha para a tela: se o analista com modelo
 * de linguagem demorar, errar ou escrever algo que não se sustenta, as regras
 * fixas respondem no lugar. O motivo vai para o log do servidor — nunca para a
 * tela, que não tem por que saber de fornecedor, erro de rede ou custo.
 */
export async function analisarResultados(dados: DadosDosResultados): Promise<AnaliseDosResultados> {
  const entrada = montarEntradaDaAnalise(dados);
  try {
    return await escolherAnalista().analisar(entrada);
  } catch (erro) {
    log.warn("análise com modelo indisponível; usando as regras fixas", {
      formularioId: dados.formulario.id,
      motivo: erro instanceof Error ? erro.message : String(erro),
    });
    return analisarPorRegras(entrada);
  }
}

function montarEntradaDaAnalise(dados: DadosDosResultados): EntradaDaAnalise {
  const { formulario, respostas, resultados } = dados;
  return {
    formulario: {
      id: formulario.id,
      nome: formulario.nome,
      objetivo: formulario.descricao,
      versao: formulario.versaoAtual,
    },
    perguntas: formulario.perguntas,
    resultados,
    respostas,
  };
}
