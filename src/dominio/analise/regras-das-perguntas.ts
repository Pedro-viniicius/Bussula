/**
 * O que a análise diz sobre cada pergunta, olhando para ela sozinha.
 *
 * Uma regra por tipo de pergunta. Cada uma só fala quando o número passa de
 * um limite com nome — abaixo dele, o número continua na tela de dados, mas a
 * análise não o transforma em frase. Pergunta com poucas respostas vira um
 * limite declarado, não uma conclusão.
 */
import type { DistribuicaoDaPergunta, OpcaoContada } from "@/dominio/resultados/tipos";
import { formatarComUmaCasa, formatarProporcao, fracaoDe } from "@/utilitarios/numeros";
import { apenasLimite, descreverFaixa, leituraVazia, type Leitura } from "./leitura";

/** Abaixo disto, uma pergunta tem respostas de menos para sustentar qualquer frase. */
const MINIMO_DE_RESPOSTAS_POR_PERGUNTA = 10;

/**
 * Onde uma nota cai na escala, de 0 (a menor possível) a 1 (a maior).
 * Na avaliação de 1 a 5, "alta" é 4 ou 5 e "baixa" é 1 ou 2; numa escala de
 * 0 a 10, "alta" é de 8 a 10 e "baixa" é de 0 a 2.
 */
const POSICAO_DE_NOTA_ALTA = 0.75;
const POSICAO_DE_NOTA_BAIXA = 0.25;

/** A partir desta parcela de notas altas, a percepção é tratada como majoritariamente positiva. */
const PARCELA_DE_NOTAS_ALTAS_QUE_E_MAIORIA_AMPLA = 0.7;

/** A partir desta parcela de notas baixas, a insatisfação merece investigação. */
const PARCELA_DE_NOTAS_BAIXAS_QUE_PREOCUPA = 0.2;

/** Acima da metade, uma opção é a escolha da maioria. */
const MAIORIA = 0.5;

/** Diferença entre as duas opções mais escolhidas abaixo da qual nenhuma delas se destaca. */
const DIFERENCA_SEM_DESTAQUE = 0.1;

/** Escolhe a regra certa para o tipo da pergunta. */
export function lerPergunta(distribuicao: DistribuicaoDaPergunta): Leitura {
  const totalDeRespostas = distribuicao.totalDeRespostas;
  if (totalDeRespostas === 0) return leituraVazia();

  if (totalDeRespostas < MINIMO_DE_RESPOSTAS_POR_PERGUNTA) {
    return apenasLimite(
      `A pergunta "${distribuicao.enunciado}" teve só ${totalDeRespostas} respostas — ainda não dá para tirar conclusão sobre ela.`,
    );
  }

  switch (distribuicao.tipo) {
    case "avaliacao":
    case "escala":
      return lerNotas(distribuicao);
    case "escolha_unica":
      return lerEscolhaUnica(distribuicao);
    case "multipla_escolha":
      return lerMultiplaEscolha(distribuicao);
    case "sim_nao":
      return lerSimOuNao(distribuicao);
    case "texto_curto":
    case "texto_livre":
      return lerComentarios(distribuicao);
  }
}

/** Avaliação e escala: quantos deram nota alta, quantos deram nota baixa e a média. */
function lerNotas(distribuicao: DistribuicaoDaPergunta): Leitura {
  const leitura = leituraVazia();
  const { perguntaId, enunciado, totalDeRespostas } = distribuicao;

  const pontos = distribuicao.opcoes.map((opcao) => ({ valor: Number(opcao.rotulo), total: opcao.total }));
  const menorValor = pontos[0].valor;
  const maiorValor = pontos[pontos.length - 1].valor;
  const amplitude = maiorValor - menorValor;

  const pontosAltos = pontos.filter((ponto) => (ponto.valor - menorValor) / amplitude >= POSICAO_DE_NOTA_ALTA);
  const pontosBaixos = pontos.filter((ponto) => (ponto.valor - menorValor) / amplitude <= POSICAO_DE_NOTA_BAIXA);
  const notasAltas = somarTotais(pontosAltos);
  const notasBaixas = somarTotais(pontosBaixos);
  const faixaAlta = descreverFaixa(pontosAltos.map((ponto) => ponto.valor));
  const faixaBaixa = descreverFaixa(pontosBaixos.map((ponto) => ponto.valor));

  const idDasAltas = `notas:${perguntaId}:altas`;
  const idDaMedia = `notas:${perguntaId}:media`;
  const idDasBaixas = `notas:${perguntaId}:baixas`;
  const mediaEscrita = distribuicao.media === null ? "—" : formatarComUmaCasa(distribuicao.media);

  leitura.evidencias.push(
    { id: idDasAltas, fonte: enunciado, texto: `${formatarProporcao(notasAltas, totalDeRespostas)} deram nota ${faixaAlta}.` },
    { id: idDaMedia, fonte: enunciado, texto: `Média ${mediaEscrita}, numa escala de ${menorValor} a ${maiorValor}.` },
    { id: idDasBaixas, fonte: enunciado, texto: `${formatarProporcao(notasBaixas, totalDeRespostas)} deram nota ${faixaBaixa}.` },
  );

  leitura.achados.push({
    natureza: "fato",
    texto: `${formatarProporcao(notasAltas, totalDeRespostas)} deram nota ${faixaAlta} em "${enunciado}". A média ficou em ${mediaEscrita}, numa escala de ${menorValor} a ${maiorValor}.`,
    evidencias: [idDasAltas, idDaMedia],
  });

  const parcelaDeNotasAltas = fracaoDe(notasAltas, totalDeRespostas);
  if (parcelaDeNotasAltas >= PARCELA_DE_NOTAS_ALTAS_QUE_E_MAIORIA_AMPLA) {
    leitura.achados.push({
      natureza: "interpretacao",
      texto: `A percepção sobre "${enunciado}" é majoritariamente positiva: a maior parte das pessoas escolheu as notas mais altas da escala.`,
      evidencias: [idDasAltas],
    });
    leitura.acoes.push({
      texto: `Acompanhar "${enunciado}" nas próximas semanas, para perceber cedo se a nota começar a cair.`,
      evidencias: [idDasAltas, idDaMedia],
    });
  }

  const parcelaDeNotasBaixas = fracaoDe(notasBaixas, totalDeRespostas);
  if (parcelaDeNotasBaixas >= PARCELA_DE_NOTAS_BAIXAS_QUE_PREOCUPA) {
    leitura.achados.push(
      {
        natureza: "fato",
        texto: `${formatarProporcao(notasBaixas, totalDeRespostas)} deram nota ${faixaBaixa} em "${enunciado}".`,
        evidencias: [idDasBaixas],
      },
      {
        natureza: "hipotese",
        texto: `Uma hipótese a investigar é se existe um ponto específico que incomoda a parcela que deu nota ${faixaBaixa} em "${enunciado}", em vez de uma insatisfação geral.`,
        evidencias: [idDasBaixas],
      },
    );
    leitura.acoes.push({
      texto: `Pode valer a pena conversar com clientes que deram nota baixa em "${enunciado}" — ou ler os comentários, quando houver — para entender o que pesou.`,
      evidencias: [idDasBaixas],
    });
  }

  return leitura;
}

/** Escolha única: uma opção da maioria, duas opções próximas no topo, ou opções que ninguém escolheu. */
function lerEscolhaUnica(distribuicao: DistribuicaoDaPergunta): Leitura {
  const leitura = leituraVazia();
  const { perguntaId, enunciado, totalDeRespostas } = distribuicao;
  const ordenadas = ordenarDaMaisEscolhida(distribuicao.opcoes);
  const primeira = ordenadas[0];
  const segunda = ordenadas[1];

  const parcelaDaPrimeira = fracaoDe(primeira.total, totalDeRespostas);
  const parcelaDaSegunda = segunda ? fracaoDe(segunda.total, totalDeRespostas) : 0;

  if (parcelaDaPrimeira > MAIORIA) {
    const id = `escolha:${perguntaId}:maioria`;
    leitura.evidencias.push({
      id,
      fonte: enunciado,
      texto: `${formatarProporcao(primeira.total, totalDeRespostas)} escolheram "${primeira.rotulo}".`,
    });
    leitura.achados.push(
      {
        natureza: "fato",
        texto: `${formatarProporcao(primeira.total, totalDeRespostas)} escolheram "${primeira.rotulo}" em "${enunciado}".`,
        evidencias: [id],
      },
      {
        natureza: "interpretacao",
        texto: `Os dados sugerem um padrão claro em "${enunciado}": a maioria de quem respondeu se reconhece em "${primeira.rotulo}".`,
        evidencias: [id],
      },
    );
  } else if (segunda && parcelaDaPrimeira - parcelaDaSegunda < DIFERENCA_SEM_DESTAQUE) {
    const id = `escolha:${perguntaId}:proximas`;
    leitura.evidencias.push({
      id,
      fonte: enunciado,
      texto: `"${primeira.rotulo}" teve ${formatarProporcao(primeira.total, totalDeRespostas)} e "${segunda.rotulo}" teve ${formatarProporcao(segunda.total, totalDeRespostas)}.`,
    });
    leitura.achados.push(
      {
        natureza: "fato",
        texto: `Em "${enunciado}", as duas opções mais escolhidas — "${primeira.rotulo}" e "${segunda.rotulo}" — ficaram próximas.`,
        evidencias: [id],
      },
      {
        natureza: "interpretacao",
        texto: `Não há uma preferência clara em "${enunciado}": as respostas se dividem entre mais de uma opção.`,
        evidencias: [id],
      },
    );
  }

  const nuncaEscolhidas = distribuicao.opcoes.filter((opcao) => opcao.total === 0);
  if (nuncaEscolhidas.length > 0) {
    const id = `escolha:${perguntaId}:nunca-escolhidas`;
    const lista = nuncaEscolhidas.map((opcao) => `"${opcao.rotulo}"`).join(", ");
    leitura.evidencias.push({
      id,
      fonte: enunciado,
      texto: `Ninguém escolheu ${lista} entre ${totalDeRespostas} respostas.`,
    });
    leitura.achados.push({
      natureza: "fato",
      texto: `Em "${enunciado}", ninguém escolheu ${lista}.`,
      evidencias: [id],
    });
  }

  return leitura;
}

/** Múltipla escolha: só vira frase quando uma opção é marcada pela maioria de quem respondeu. */
function lerMultiplaEscolha(distribuicao: DistribuicaoDaPergunta): Leitura {
  const leitura = leituraVazia();
  const { perguntaId, enunciado, totalDeRespostas } = distribuicao;
  const maisMarcada = ordenarDaMaisEscolhida(distribuicao.opcoes)[0];

  if (fracaoDe(maisMarcada.total, totalDeRespostas) <= MAIORIA) return leitura;

  const id = `escolha:${perguntaId}:mais-marcada`;
  leitura.evidencias.push({
    id,
    fonte: enunciado,
    texto: `${formatarProporcao(maisMarcada.total, totalDeRespostas)} de quem respondeu marcou "${maisMarcada.rotulo}".`,
  });
  leitura.achados.push({
    natureza: "fato",
    texto: `"${maisMarcada.rotulo}" foi marcada por ${formatarProporcao(maisMarcada.total, totalDeRespostas)} de quem respondeu "${enunciado}".`,
    evidencias: [id],
  });
  return leitura;
}

/** Sim ou não: a proporção de "Sim" já é, sozinha, o número que importa. */
function lerSimOuNao(distribuicao: DistribuicaoDaPergunta): Leitura {
  const leitura = leituraVazia();
  const { perguntaId, enunciado, totalDeRespostas } = distribuicao;
  const respostasSim = distribuicao.opcoes.find((opcao) => opcao.rotulo === "Sim")?.total ?? 0;

  const id = `sim-nao:${perguntaId}`;
  leitura.evidencias.push({
    id,
    fonte: enunciado,
    texto: `${formatarProporcao(respostasSim, totalDeRespostas)} responderam "Sim".`,
  });
  leitura.achados.push({
    natureza: "fato",
    texto: `${formatarProporcao(respostasSim, totalDeRespostas)} responderam "Sim" em "${enunciado}".`,
    evidencias: [id],
  });
  return leitura;
}

/**
 * Texto aberto: conta, mas não interpreta. Resumir comentários exigiria ler o
 * que cada pessoa escreveu, e essa leitura fica com quem administra.
 */
function lerComentarios(distribuicao: DistribuicaoDaPergunta): Leitura {
  const leitura = leituraVazia();
  const { perguntaId, enunciado, totalDeRespostas } = distribuicao;

  const id = `comentarios:${perguntaId}`;
  leitura.evidencias.push({
    id,
    fonte: enunciado,
    texto: `${totalDeRespostas} pessoas escreveram uma resposta.`,
  });
  leitura.achados.push({
    natureza: "fato",
    texto: `${totalDeRespostas} pessoas escreveram uma resposta em "${enunciado}".`,
    evidencias: [id],
  });
  leitura.acoes.push({
    texto: `Ler as respostas escritas em "${enunciado}", na parte de dados: é onde aparecem motivos que os números sozinhos não mostram.`,
    evidencias: [id],
  });
  leitura.limites.push("As respostas escritas não são interpretadas automaticamente — só contadas.");
  return leitura;
}

function somarTotais(pontos: { total: number }[]): number {
  return pontos.reduce((soma, ponto) => soma + ponto.total, 0);
}

/** Da opção mais escolhida para a menos escolhida; em empate, mantém a ordem do formulário. */
function ordenarDaMaisEscolhida(opcoes: OpcaoContada[]): OpcaoContada[] {
  return [...opcoes].sort((a, b) => b.total - a.total);
}
