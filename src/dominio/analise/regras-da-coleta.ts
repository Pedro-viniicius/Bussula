/**
 * O que a análise diz sobre a coleta em si: o ritmo das respostas, o silêncio
 * e os canais por onde elas chegam.
 *
 * São leituras sobre o comportamento de quem responde, não sobre o conteúdo
 * das respostas — e é por isso que as hipóteses daqui falam do cartão NFC, do
 * QR Code e do movimento da loja.
 */
import type { OrigemDaResposta } from "@/dominio/respostas/tipos";
import type { ResultadosDoFormulario } from "@/dominio/resultados/tipos";
import { calcularVariacao, mudancaMereceAtencao } from "@/dominio/resultados/variacao";
import { formatarPorcentagem, formatarProporcao, fracaoDe } from "@/utilitarios/numeros";
import { apenasLimite, leituraVazia, type Leitura } from "./leitura";

/** Com menos respostas que isto no período anterior, comparar em porcentagem engana. */
const MINIMO_DE_RESPOSTAS_PARA_COMPARAR_PERIODOS = 10;

/** A partir de quantos dias sem nenhuma resposta o silêncio merece ser dito. */
const DIAS_SEM_RESPOSTA_QUE_CHAMAM_ATENCAO = 3;

/** Acima desta parcela, um canal é o caminho principal das respostas. */
const PARCELA_DE_CANAL_PRINCIPAL = 0.7;

/** Até esta parcela, um canal físico é considerado pouco usado. */
const PARCELA_DE_CANAL_POUCO_USADO = 0.1;

/** Abaixo disto, qualquer diferença pequena entre números pode ser acaso. */
const AMOSTRA_PEQUENA = 30;

const FONTE_DA_COLETA = "Coleta";

const CHEGOU_POR: Record<OrigemDaResposta, string> = {
  nfc: "pelo cartão NFC",
  qr: "pelo QR Code",
  link: "por link direto",
};

/** Só o cartão e o QR Code ficam na loja; o link direto não tem onde ser "mal posicionado". */
const CANAL_FISICO: Partial<Record<OrigemDaResposta, string>> = {
  nfc: "o cartão NFC",
  qr: "o QR Code",
};

/** Uma ação comum a mais de uma regra: repetida, ela aparece uma vez só com as evidências somadas. */
export const ACAO_DE_CONFERIR_OS_CANAIS =
  "Pode valer a pena conferir se o cartão NFC e o QR Code continuam à vista e funcionando.";

/** Os últimos dias contra os anteriores — só quando a diferença vai além da oscilação natural. */
export function lerRitmoDaColeta(resultados: ResultadosDoFormulario): Leitura {
  const leitura = leituraVazia();
  const atual = resultados.resumo.respostasNoPeriodo;
  const anterior = resultados.resumo.respostasNoPeriodoAnterior;
  const dias = resultados.diasDoPeriodo;

  if (anterior < MINIMO_DE_RESPOSTAS_PARA_COMPARAR_PERIODOS) return leitura;
  if (!mudancaMereceAtencao(atual, anterior)) return leitura;

  const variacao = calcularVariacao(atual, anterior);
  if (variacao.tipo !== "alta" && variacao.tipo !== "queda") return leitura;

  const diferencaEscrita = formatarPorcentagem(variacao.fracao);
  const sentido = variacao.tipo === "alta" ? "a mais" : "a menos";
  const id = "coleta:ritmo";

  leitura.evidencias.push({
    id,
    fonte: FONTE_DA_COLETA,
    texto: `${atual} respostas nos últimos ${dias} dias, contra ${anterior} nos ${dias} dias anteriores — ${diferencaEscrita} ${sentido}.`,
  });
  leitura.achados.push({
    natureza: "fato",
    texto: `Chegaram ${atual} respostas nos últimos ${dias} dias, ${diferencaEscrita} ${sentido} que nos ${dias} dias anteriores (${anterior}).`,
    evidencias: [id],
  });

  if (variacao.tipo === "queda") {
    leitura.achados.push({
      natureza: "hipotese",
      texto:
        "Uma hipótese é que menos clientes estejam encontrando o cartão NFC ou o QR Code — ou que o movimento da loja tenha diminuído no período.",
      evidencias: [id],
    });
    leitura.acoes.push({ texto: ACAO_DE_CONFERIR_OS_CANAIS, evidencias: [id] });
  } else {
    leitura.achados.push({
      natureza: "interpretacao",
      texto:
        "Mais pessoas estão respondendo do que no período anterior, o que pode indicar mais movimento na loja ou mais visibilidade do formulário.",
      evidencias: [id],
    });
    leitura.acoes.push({
      texto: "Acompanhar se o novo ritmo de respostas se mantém nas próximas semanas.",
      evidencias: [id],
    });
  }

  return leitura;
}

/** Dias seguidos sem nenhuma resposta. */
export function lerSilencio(resultados: ResultadosDoFormulario): Leitura {
  const leitura = leituraVazia();
  const diasSemResposta = resultados.resumo.diasSemResposta;
  if (diasSemResposta === null || diasSemResposta < DIAS_SEM_RESPOSTA_QUE_CHAMAM_ATENCAO) return leitura;

  const id = "coleta:silencio";
  leitura.evidencias.push({
    id,
    fonte: FONTE_DA_COLETA,
    texto: `A última resposta chegou há ${diasSemResposta} dias.`,
  });
  leitura.achados.push({
    natureza: "fato",
    texto: `Este formulário não recebe resposta há ${diasSemResposta} dias.`,
    evidencias: [id],
  });
  leitura.acoes.push({ texto: ACAO_DE_CONFERIR_OS_CANAIS, evidencias: [id] });
  return leitura;
}

/** Um canal que concentra quase tudo — e, quando é o caso, o canal físico que quase ninguém usa. */
export function lerCanais(resultados: ResultadosDoFormulario): Leitura {
  const leitura = leituraVazia();
  const totalDeRespostas = resultados.resumo.totalDeRespostas;
  const principal = resultados.origens[0];

  if (!principal || fracaoDe(principal.total, totalDeRespostas) < PARCELA_DE_CANAL_PRINCIPAL) return leitura;

  const idDoPrincipal = "coleta:canal-principal";
  leitura.evidencias.push({
    id: idDoPrincipal,
    fonte: FONTE_DA_COLETA,
    texto: `${formatarProporcao(principal.total, totalDeRespostas)} chegaram ${CHEGOU_POR[principal.origem]}.`,
  });
  leitura.achados.push({
    natureza: "fato",
    texto: `${formatarProporcao(principal.total, totalDeRespostas)} das respostas chegaram ${CHEGOU_POR[principal.origem]}.`,
    evidencias: [idDoPrincipal],
  });

  const poucoUsado = resultados.origens.find((contagem) => {
    const ehCanalFisico = CANAL_FISICO[contagem.origem] !== undefined;
    const ehOutroCanal = contagem.origem !== principal.origem;
    return ehCanalFisico && ehOutroCanal && fracaoDe(contagem.total, totalDeRespostas) <= PARCELA_DE_CANAL_POUCO_USADO;
  });
  if (!poucoUsado) return leitura;

  const nomeDoCanal = CANAL_FISICO[poucoUsado.origem];
  const idDoPoucoUsado = `coleta:canal-pouco-usado:${poucoUsado.origem}`;
  leitura.evidencias.push({
    id: idDoPoucoUsado,
    fonte: FONTE_DA_COLETA,
    texto: `${formatarProporcao(poucoUsado.total, totalDeRespostas)} chegaram ${CHEGOU_POR[poucoUsado.origem]}.`,
  });
  leitura.achados.push({
    natureza: "hipotese",
    texto: `Uma hipótese é que ${nomeDoCanal} esteja pouco visível ou pouco prático para quem está na loja.`,
    evidencias: [idDoPrincipal, idDoPoucoUsado],
  });
  leitura.acoes.push({
    texto: `Pode valer a pena conferir onde ${nomeDoCanal} está posicionado na loja.`,
    evidencias: [idDoPoucoUsado],
  });
  return leitura;
}

/** Com poucas respostas no total, o aviso vale para a análise inteira. */
export function lerTamanhoDaAmostra(totalDeRespostas: number): Leitura {
  if (totalDeRespostas >= AMOSTRA_PEQUENA) return leituraVazia();
  return apenasLimite(
    `Com ${totalDeRespostas} respostas, diferenças de poucos pontos percentuais podem ser acaso. Vale olhar de novo quando houver mais respostas.`,
  );
}
