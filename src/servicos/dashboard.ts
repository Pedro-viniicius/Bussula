/**
 * Transforma respostas guardadas em informação para quem administra.
 *
 * Nenhum número daqui é gravado no banco: tudo é contado a partir das
 * respostas cruas no momento da consulta. É mais uma consulta, e em troca não
 * existe indicador que possa discordar do que os clientes responderam.
 *
 * Os números de um formulário só (para a tela de resultados) moram em
 * `src/dominio/resultados`; aqui ficam os números do painel inteiro.
 */
import { DIAS_PERIODO_PADRAO } from "@/dominio/constantes";
import type { PontoDaSerie, ResumoDaColeta, SinalRelevante } from "@/dominio/dashboard/tipos";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import { calcularVariacao, mudancaMereceAtencao } from "@/dominio/resultados/variacao";
import { formulariosGravados, respostasGravadas } from "@/repositorios";
import { formatarPorcentagem } from "@/utilitarios/numeros";
import { inicioDeDiasAtras, inicioDeHoje } from "@/utilitarios/tempo";

/** Dias sem resposta a partir dos quais um formulário ativo vira um sinal. */
const DIAS_DE_SILENCIO_QUE_PREOCUPAM = 7;

/** Com menos respostas que isto no período anterior, uma queda em porcentagem engana. */
const MINIMO_DE_RESPOSTAS_PARA_COMPARAR_PERIODOS = 10;

const UM_DIA_MS = 86_400_000;

export async function carregarResumoDoDashboard(agora: Date = new Date()): Promise<ResumoDaColeta> {
  const inicioDoPeriodo = inicioDeDiasAtras(DIAS_PERIODO_PADRAO - 1, agora);
  const inicioDoPeriodoAnterior = inicioDeDiasAtras(2 * DIAS_PERIODO_PADRAO - 1, agora);

  const [
    formularios,
    totaisPorFormulario,
    totalDeRespostas,
    respostasHoje,
    respostasNoPeriodo,
    respostasNosDoisPeriodos,
    ultimaRespostaEm,
  ] = await Promise.all([
    formulariosGravados.listar(),
    respostasGravadas.totaisPorFormulario(),
    respostasGravadas.contarTudo(),
    respostasGravadas.contarDesde(inicioDeHoje(agora)),
    respostasGravadas.contarDesde(inicioDoPeriodo),
    respostasGravadas.contarDesde(inicioDoPeriodoAnterior),
    respostasGravadas.ultimaEm(),
  ]);

  let maisRespondido: ResumoDaColeta["formularioMaisRespondido"] = null;
  for (const formulario of formularios) {
    const total = totaisPorFormulario.get(formulario.id)?.total ?? 0;
    if (total > (maisRespondido?.total ?? 0)) {
      maisRespondido = { id: formulario.id, nome: formulario.nome, total };
    }
  }

  return {
    totalDeRespostas,
    respostasHoje,
    respostasNoPeriodo,
    respostasNoPeriodoAnterior: respostasNosDoisPeriodos - respostasNoPeriodo,
    formulariosAtivos: formularios.filter((formulario) => formulario.situacao === "ATIVO").length,
    ultimaRespostaEm,
    formularioMaisRespondido: maisRespondido,
  };
}

/** Respostas por dia na janela padrão, com os dias vazios preenchidos com zero. */
export async function carregarSerieDeRespostas(
  dias: number = DIAS_PERIODO_PADRAO,
  agora: Date = new Date(),
): Promise<PontoDaSerie[]> {
  const desde = inicioDeDiasAtras(dias - 1, agora);
  const recebidas = await respostasGravadas.porDia(desde);
  const porDia = new Map(recebidas.map((ponto) => [ponto.dia.toDateString(), ponto.total]));

  const serie: PontoDaSerie[] = [];
  for (let posicao = 0; posicao < dias; posicao++) {
    const dia = inicioDeDiasAtras(dias - 1 - posicao, agora);
    serie.push({ dia, total: porDia.get(dia.toDateString()) ?? 0 });
  }
  return serie;
}

/** O ritmo da coleta: quantas respostas no período atual e no anterior, de mesmo tamanho. */
export type RitmoDaColeta = { respostasNoPeriodo: number; respostasNoPeriodoAnterior: number; dias: number };

/**
 * O que merece atenção agora. Só entra na lista o que os dados sustentam —
 * sem sinal inventado para a tela não ficar vazia.
 */
export function detectarSinais(
  formularios: FormularioNaLista[],
  agora: Date = new Date(),
  ritmo?: RitmoDaColeta,
): SinalRelevante[] {
  const sinais: SinalRelevante[] = [];
  const ativos = formularios.filter((formulario) => formulario.situacao === "ATIVO");

  if (formularios.length > 0 && ativos.length === 0) {
    sinais.push({
      chave: "sem-formulario-ativo",
      tom: "atencao",
      titulo: "Nenhum formulário ativo",
      texto: "Nenhum cartão NFC ou QR Code está recebendo respostas neste momento.",
      href: "/admin/formularios",
      acao: "Ver formulários",
    });
  }

  for (const formulario of ativos) {
    if (formulario.totalDeRespostas === 0) {
      sinais.push({
        chave: `sem-resposta-${formulario.id}`,
        tom: "atencao",
        titulo: `"${formulario.nome}" ainda não recebeu respostas`,
        texto: "Confira se o link certo foi gravado no cartão NFC ou no QR Code.",
        href: enderecoDoFormularioNaLista(formulario.id),
        acao: "Ver formulário",
      });
      continue;
    }

    const diasEmSilencio = formulario.ultimaRespostaEm
      ? Math.floor((agora.getTime() - formulario.ultimaRespostaEm.getTime()) / UM_DIA_MS)
      : 0;
    if (diasEmSilencio >= DIAS_DE_SILENCIO_QUE_PREOCUPAM) {
      sinais.push({
        chave: `silencio-${formulario.id}`,
        tom: "atencao",
        titulo: `"${formulario.nome}" está sem respostas há ${diasEmSilencio} dias`,
        texto: "O formulário está ativo, mas ninguém respondeu na última semana.",
        href: enderecoDoFormularioNaLista(formulario.id),
        acao: "Ver formulário",
      });
    }
  }

  const queda = ritmo ? detectarQuedaDaColeta(ritmo) : null;
  if (queda) sinais.push(queda);

  return sinais;
}

/** Uma queda de verdade no número de respostas — não a oscilação normal de uma semana para outra. */
function detectarQuedaDaColeta(ritmo: RitmoDaColeta): SinalRelevante | null {
  const { respostasNoPeriodo, respostasNoPeriodoAnterior, dias } = ritmo;
  if (respostasNoPeriodoAnterior < MINIMO_DE_RESPOSTAS_PARA_COMPARAR_PERIODOS) return null;

  const variacao = calcularVariacao(respostasNoPeriodo, respostasNoPeriodoAnterior);
  if (variacao.tipo !== "queda") return null;
  if (!mudancaMereceAtencao(respostasNoPeriodo, respostasNoPeriodoAnterior)) return null;

  return {
    chave: "queda-da-coleta",
    tom: "atencao",
    titulo: `A coleta caiu ${formatarPorcentagem(variacao.fracao)} em relação aos ${dias} dias anteriores`,
    texto: `Foram ${respostasNoPeriodo} respostas nos últimos ${dias} dias, contra ${respostasNoPeriodoAnterior} nos ${dias} dias anteriores. Vale conferir se o cartão NFC e o QR Code continuam à vista.`,
    href: "/admin/resultados",
    acao: "Ver resultados",
  };
}

/** O cartão do formulário na lista, onde estão o endereço público e a situação. */
function enderecoDoFormularioNaLista(formularioId: string): string {
  return `/admin/formularios#formulario-${formularioId}`;
}
