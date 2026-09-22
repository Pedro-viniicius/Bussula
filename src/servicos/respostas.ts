/**
 * O caminho de uma resposta de cliente, do toque no cartão até o painel.
 *
 * `registrarResposta` é a composição dos passos, em ordem, cada um com uma
 * saída previsível:
 *
 *   carregar o formulário → validar as respostas → limpar o que veio a mais
 *   → gravar (ou reconhecer que já estava gravado) → confirmar
 */
import { RESPOSTAS_POR_PAGINA } from "@/dominio/constantes";
import { deuCerto, deuErrado, type Resultado } from "@/dominio/erros";
import type { Pergunta, ValorDaResposta } from "@/dominio/formularios/perguntas";
import type { OrigemDaResposta, Resposta } from "@/dominio/respostas/tipos";
import { formulariosGravados, respostasGravadas } from "@/repositorios";
import { log } from "@/lib/logger";
import { buscarFormularioPublicoPorSlug } from "./formularios";
import { limparValores, respostasEstaoValidas, validarRespostas } from "@/validacoes/resposta";

export type EnvioDeResposta = {
  slug: string;
  /** Gerada no navegador; reenviar a mesma chave não cria uma segunda resposta. */
  chaveEnvio: string;
  valores: Record<string, ValorDaResposta>;
  origem: OrigemDaResposta;
};

export type ConfirmacaoDoEnvio = {
  /** Verdadeiro quando esta chave já tinha sido recebida antes. */
  jaEstavaRegistrada: boolean;
};

export async function registrarResposta(envio: EnvioDeResposta): Promise<Resultado<ConfirmacaoDoEnvio>> {
  const formulario = await buscarFormularioPublicoPorSlug(envio.slug);
  if (!formulario.ok) {
    log.warn("resposta recusada", { slug: envio.slug, motivo: formulario.erro });
    return formulario;
  }

  const { perguntas, id, versao } = formulario.valor;

  // Mesma validação que rodou no celular. O que chega pela rede não é confiável.
  const erros = validarRespostas(perguntas, envio.valores);
  if (!respostasEstaoValidas(erros)) {
    log.warn("resposta inválida", { slug: envio.slug, perguntas: Object.keys(erros).join(",") });
    return deuErrado("VALIDACAO_FALHOU", Object.keys(erros).join(","));
  }

  try {
    const { duplicada } = await respostasGravadas.gravar({
      formularioId: id,
      versaoFormulario: versao,
      chaveEnvio: envio.chaveEnvio,
      valores: limparValores(perguntas, envio.valores),
      origem: envio.origem,
    });
    log.info("resposta registrada", { slug: envio.slug, versao, origem: envio.origem, duplicada });
    return deuCerto({ jaEstavaRegistrada: duplicada });
  } catch (erro) {
    log.error("falha ao gravar resposta", { slug: envio.slug, erro: String(erro) });
    return deuErrado("FALHA_DE_PERSISTENCIA");
  }
}

export async function listarRespostas(filtros: { formularioId?: string; pagina: number }) {
  return respostasGravadas.listar({
    formularioId: filtros.formularioId,
    pagina: Math.max(1, filtros.pagina),
    porPagina: RESPOSTAS_POR_PAGINA,
  });
}

export async function buscarRespostasRecentes(limite: number): Promise<Resposta[]> {
  return respostasGravadas.recentes(limite);
}

export type RespostaComPerguntas = {
  resposta: Resposta;
  /** As perguntas da versão em que esta resposta foi dada. */
  perguntas: Pergunta[];
  nomeDoFormulario: string;
};

/**
 * Junta cada resposta com as perguntas da versão em que foi dada.
 *
 * Busca cada versão uma vez só, mesmo que vinte respostas venham da mesma —
 * senão uma página de vinte linhas faria vinte consultas iguais.
 */
export async function comPerguntas(respostas: Resposta[]): Promise<RespostaComPerguntas[]> {
  const formularios = await formulariosGravados.listar();
  const nomePorId = new Map(formularios.map((f) => [f.id, f.nome]));

  const versoesNecessarias = new Map<string, { formularioId: string; versao: number }>();
  for (const resposta of respostas) {
    versoesNecessarias.set(`${resposta.formularioId}:${resposta.versaoFormulario}`, {
      formularioId: resposta.formularioId,
      versao: resposta.versaoFormulario,
    });
  }

  const perguntasPorVersao = new Map<string, Pergunta[]>();
  await Promise.all(
    [...versoesNecessarias.entries()].map(async ([chave, { formularioId, versao }]) => {
      perguntasPorVersao.set(chave, (await formulariosGravados.perguntasDaVersao(formularioId, versao)) ?? []);
    }),
  );

  return respostas.map((resposta) => ({
    resposta,
    perguntas: perguntasPorVersao.get(`${resposta.formularioId}:${resposta.versaoFormulario}`) ?? [],
    nomeDoFormulario: nomePorId.get(resposta.formularioId) ?? "Formulário removido",
  }));
}
