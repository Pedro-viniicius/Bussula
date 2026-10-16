import {
  ESPERA_INICIAL_ENTRE_TENTATIVAS_MS,
  MAXIMO_TENTATIVAS_ENVIO,
  TEMPO_LIMITE_ENVIO_MS,
} from "@/dominio/constantes";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import type { EnvioDeResposta } from "@/servicos/respostas";
import { LIMITE } from "@/lib/texts/publico";
import { fila, type ItemFila } from "./queue";

/**
 * Reenvia o que ficou na fila. Roda ao abrir a página, quando a conexão
 * volta e, enquanto a aba estiver aberta, com espera crescente. Com a aba
 * fechada, o service worker faz o mesmo trabalho (public/sw.js).
 *
 * Um item sai da fila assim que o servidor responde alguma coisa com
 * sentido — gravado, repetido, formulário fora do ar, resposta inválida —
 * porque nenhuma dessas mudaria se tentasse de novo. Erro de rede, tempo
 * esgotado, 5xx e o limite de envios (429) mantêm o item guardado: no limite
 * o cadastro ainda não chegou ao servidor e a pessoa já foi embora, então
 * descartá-lo perderia o cadastro. O 429 não emite `fila:enviada` e a nova
 * tentativa espera pelo menos o `Retry-After` (`tenteDeNovoEmSegundos`).
 *
 * A cada item resolvido a página recebe o evento `fila:enviada` com a chave
 * e o resultado, para a tela de conclusão trocar "Gerando seu cupom…" pelo
 * cupom. O service worker faz o equivalente com `postMessage`.
 */
export const TAG_SYNC = "fila-respostas";

/** Nome do evento (na janela) e do tipo de mensagem (do service worker). */
export const EVENTO_FILA_ENVIADA = "fila:enviada";

export type DetalheFilaEnviada = { chave: string; resultado: ResultadoDoEnvio };

/** Um item mais velho que isto é descartado: a pessoa já saiu da loja. */
const IDADE_MAXIMA_MS = 24 * 60 * 60_000;
const MAIOR_ESPERA_MS = 5 * 60_000;

export function urlEnvio(slug: string) {
  return `/api/f/${encodeURIComponent(slug)}/respostas`;
}

/**
 * Uma tentativa de envio, com tempo limite. Lança em falha de rede ou 5xx.
 *
 * O limite por IP (429) NÃO lança: devolve o resultado com `ok: false` para a
 * tela mostrar a mensagem e manter as respostas, e para ninguém enfileirar
 * um envio barrado.
 */
export async function postarResposta(
  slug: string,
  envio: EnvioDeResposta,
  reenvio = false,
): Promise<ResultadoDoEnvio> {
  const controle = new AbortController();
  const relogio = setTimeout(() => controle.abort(), TEMPO_LIMITE_ENVIO_MS);
  try {
    const resposta = await fetch(urlEnvio(slug), {
      method: "POST",
      headers: { "content-type": "application/json", ...(reenvio ? { "x-fila-offline": "1" } : {}) },
      body: JSON.stringify(envio),
      signal: controle.signal,
      cache: "no-store",
    });
    if (resposta.status >= 500) throw new Error(`servidor respondeu ${resposta.status}`);
    if (resposta.status === 429) return await resultadoDoLimite(resposta);
    return (await resposta.json()) as ResultadoDoEnvio;
  } finally {
    clearTimeout(relogio);
  }
}

/** O corpo do 429 é nosso, mas um proxy no meio pode trocá-lo: nunca deixar isso virar fila. */
async function resultadoDoLimite(resposta: Response): Promise<ResultadoDoEnvio> {
  const doCabecalho = Number(resposta.headers.get("Retry-After"));
  const padrao = Number.isFinite(doCabecalho) && doCabecalho > 0 ? doCabecalho : 60;
  try {
    const corpo = (await resposta.json()) as ResultadoDoEnvio;
    if (!corpo.ok && corpo.erro === "LIMITE_EXCEDIDO") {
      return { ...corpo, tenteDeNovoEmSegundos: corpo.tenteDeNovoEmSegundos ?? padrao };
    }
  } catch {
    /* corpo que não é JSON: cai no resultado padrão abaixo */
  }
  return { ok: false, erro: "LIMITE_EXCEDIDO", mensagem: LIMITE.texto, tenteDeNovoEmSegundos: padrao };
}

/** Avisa a página aberta (se houver) de que um item da fila foi resolvido. */
function emitirFilaEnviada(detalhe: DetalheFilaEnviada) {
  if (typeof window === "undefined" || typeof CustomEvent === "undefined") return;
  window.dispatchEvent(new CustomEvent<DetalheFilaEnviada>(EVENTO_FILA_ENVIADA, { detail: detalhe }));
}

let rodando: Promise<void> | null = null;
let relogio: ReturnType<typeof setTimeout> | null = null;

/** Reprocessa a fila uma vez. Chamar várias vezes é seguro. */
export function sincronizar(): Promise<void> {
  if (!fila.disponivel()) return Promise.resolve();
  if (!rodando) {
    rodando = executar().finally(() => {
      rodando = null;
    });
  }
  return rodando;
}

async function executar() {
  let itens: ItemFila[];
  try {
    itens = await fila.listar();
  } catch {
    return;
  }

  let pendentes = 0;
  let esperaDoLimiteMs = 0;
  for (const item of itens) {
    if (Date.now() - item.criadoEm > IDADE_MAXIMA_MS) {
      await fila.remover(item.chave).catch(() => {});
      continue;
    }
    try {
      const resultado = await postarResposta(item.slug, item.envio, true);
      if (!resultado.ok && resultado.erro === "LIMITE_EXCEDIDO") {
        // Barrado por excesso de envios do IP: o item fica e volta depois da espera.
        pendentes++;
        esperaDoLimiteMs = Math.max(esperaDoLimiteMs, (resultado.tenteDeNovoEmSegundos ?? 60) * 1000);
        // O limite é do IP, não do item: mandar os outros agora só gastaria mais envios barrados.
        break;
      }
      await fila.remover(item.chave);
      emitirFilaEnviada({ chave: item.chave, resultado });
    } catch {
      pendentes++;
      await fila.atualizar({ ...item, tentativas: item.tentativas + 1 }).catch(() => {});
    }
  }

  if (pendentes > 0) agendarNovaTentativa(Math.max(...itens.map((i) => i.tentativas)) + 1, esperaDoLimiteMs);
}

/** Espera crescente: 1 s, 2 s, 4 s, 8 s… até o teto, nunca menos que `esperaMinimaMs`. Nunca um laço apertado. */
function agendarNovaTentativa(tentativa: number, esperaMinimaMs = 0) {
  if (relogio) clearTimeout(relogio);
  const expoente = Math.min(tentativa, MAXIMO_TENTATIVAS_ENVIO + 6);
  const espera = Math.max(Math.min(ESPERA_INICIAL_ENTRE_TENTATIVAS_MS * 2 ** expoente, MAIOR_ESPERA_MS), esperaMinimaMs);
  relogio = setTimeout(() => {
    relogio = null;
    void sincronizar();
  }, espera);
}

/** Pede ao service worker que tente de novo mesmo com a aba fechada (Chrome). */
export async function pedirSyncEmSegundoPlano() {
  try {
    const registro = await navigator.serviceWorker?.ready;
    const sync = (registro as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    await sync?.register(TAG_SYNC);
  } catch {
    /* sem Background Sync: a repetição feita pela própria página continua valendo */
  }
}
