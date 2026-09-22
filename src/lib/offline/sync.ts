import {
  ESPERA_INICIAL_ENTRE_TENTATIVAS_MS,
  MAXIMO_TENTATIVAS_ENVIO,
  TEMPO_LIMITE_ENVIO_MS,
} from "@/dominio/constantes";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import type { EnvioDeResposta } from "@/servicos/respostas";
import { fila, type ItemFila } from "./queue";

/**
 * Reenvia o que ficou na fila. Roda ao abrir a página, quando a conexão
 * volta e, enquanto a aba estiver aberta, com espera crescente. Com a aba
 * fechada, o service worker faz o mesmo trabalho (public/sw.js).
 *
 * Um item sai da fila assim que o servidor responde alguma coisa com
 * sentido — gravado, repetido, formulário fora do ar, resposta inválida —
 * porque nenhuma dessas mudaria se tentasse de novo. Só erro de rede,
 * tempo esgotado e 5xx mantêm o item guardado.
 */
export const TAG_SYNC = "fila-respostas";

/** Um item mais velho que isto é descartado: a pessoa já saiu da loja. */
const IDADE_MAXIMA_MS = 24 * 60 * 60_000;
const MAIOR_ESPERA_MS = 5 * 60_000;

export function urlEnvio(slug: string) {
  return `/api/f/${encodeURIComponent(slug)}/respostas`;
}

/** Uma tentativa de envio, com tempo limite. Lança em falha de rede ou 5xx. */
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
    return (await resposta.json()) as ResultadoDoEnvio;
  } finally {
    clearTimeout(relogio);
  }
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
  for (const item of itens) {
    if (Date.now() - item.criadoEm > IDADE_MAXIMA_MS) {
      await fila.remover(item.chave).catch(() => {});
      continue;
    }
    try {
      await postarResposta(item.slug, item.envio, true);
      await fila.remover(item.chave);
    } catch {
      pendentes++;
      await fila.atualizar({ ...item, tentativas: item.tentativas + 1 }).catch(() => {});
    }
  }

  if (pendentes > 0) agendarNovaTentativa(Math.max(...itens.map((i) => i.tentativas)) + 1);
}

/** Espera crescente: 1 s, 2 s, 4 s, 8 s… até o teto. Nunca um laço apertado. */
function agendarNovaTentativa(tentativa: number) {
  if (relogio) clearTimeout(relogio);
  const expoente = Math.min(tentativa, MAXIMO_TENTATIVAS_ENVIO + 6);
  const espera = Math.min(ESPERA_INICIAL_ENTRE_TENTATIVAS_MS * 2 ** expoente, MAIOR_ESPERA_MS);
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
