/**
 * A conversa com o serviço de modelos de linguagem, e nada além dela.
 *
 * É o único arquivo que sabe o endereço, a forma de autenticar e o formato do
 * pedido. O resto do sistema enxerga só uma função que recebe instruções e
 * devolve texto — trocar de serviço é trocar este arquivo.
 *
 * O pedido segue o formato "Chat Completions" do AI Gateway da Vercel, que
 * atende modelos de vários fornecedores com a mesma chamada: trocar de modelo
 * é trocar o valor de ANALISE_IA_MODELO, sem mexer em código.
 */
const ENDERECO_DO_GATEWAY = "https://ai-gateway.vercel.sh/v1/chat/completions";

/** Quanto esperar pela resposta do modelo antes de desistir e cair nas regras fixas. */
const TEMPO_LIMITE_DA_ANALISE_MS = 25_000;

/** Teto de tamanho da resposta. A análise pedida cabe com folga. */
const MAXIMO_DE_TOKENS_NA_RESPOSTA = 4_000;

/** As variáveis de ambiente lidas aqui. Recebidas como parâmetro para poderem ser testadas. */
export type Ambiente = Record<string, string | undefined>;

export type PedidoAoModelo = {
  /** O que o modelo deve e não deve fazer. */
  instrucoes: string;
  /** O material a analisar. */
  conteudo: string;
  /** Nome curto do formato pedido, exigido pelo serviço. */
  nomeDoFormato: string;
  /** O formato exato da resposta, em JSON Schema. */
  formato: Record<string, unknown>;
};

/** Recebe um pedido e devolve o texto que o modelo escreveu. Falha com erro em qualquer problema. */
export type ChamadaAoModelo = (pedido: PedidoAoModelo) => Promise<string>;

/** O modelo escolhido para a análise, ou nulo quando nenhum foi configurado. */
export function modeloConfigurado(ambiente: Ambiente = process.env): string | null {
  const modelo = ambiente.ANALISE_IA_MODELO?.trim();
  return modelo ? modelo : null;
}

/**
 * A credencial do gateway: uma chave própria ou, num deploy da Vercel, o
 * token que a plataforma entrega sozinha ao projeto.
 */
export function credencialDoGateway(ambiente: Ambiente = process.env): string | null {
  return ambiente.AI_GATEWAY_API_KEY || ambiente.VERCEL_OIDC_TOKEN || null;
}

export function criarChamadaAoGateway(modelo: string): ChamadaAoModelo {
  return async function chamarGateway(pedido) {
    // Lida a cada chamada: o token da Vercel é renovado de tempos em tempos.
    const credencial = credencialDoGateway();
    if (!credencial) throw new Error("credencial do gateway ausente");

    const resposta = await fetch(ENDERECO_DO_GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${credencial}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: modelo,
        stream: false,
        max_tokens: MAXIMO_DE_TOKENS_NA_RESPOSTA,
        messages: [
          { role: "system", content: pedido.instrucoes },
          { role: "user", content: pedido.conteudo },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: pedido.nomeDoFormato, schema: pedido.formato },
        },
      }),
      signal: AbortSignal.timeout(TEMPO_LIMITE_DA_ANALISE_MS),
      cache: "no-store",
    });

    // Só o código de status segue adiante: o corpo de um erro pode trazer
    // detalhe interno do serviço, que não tem por que chegar a log nenhum.
    if (!resposta.ok) throw new Error(`o gateway respondeu ${resposta.status}`);

    const corpo = (await resposta.json()) as { choices?: { message?: { content?: unknown } }[] };
    const texto = corpo.choices?.[0]?.message?.content;
    if (typeof texto !== "string" || texto.trim() === "") throw new Error("o gateway respondeu sem conteúdo");
    return texto;
  };
}
