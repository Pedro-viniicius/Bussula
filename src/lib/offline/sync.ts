import type { ResultadoEnvio } from "@/lib/leads/resultado";
import { fila, type ItemFila } from "./queue";

/**
 * Replays queued leads. Runs on page load, on `online`, and with exponential
 * backoff while a page is open. The service worker does the same job under
 * Background Sync once the tab is gone (sw.js).
 *
 * An item leaves the queue when the server answers at all with a semantic
 * result (saved, duplicate, closed, invalid): those must not be retried.
 * Network errors, timeouts, 5xx and the rate limit keep it for later.
 */
export const TIMEOUT_MS = 15_000;
const IDADE_MAXIMA_MS = 24 * 60 * 60_000;
const BACKOFF_BASE_MS = 5_000;
const BACKOFF_MAX_MS = 5 * 60_000;
export const TAG_SYNC = "fila-leads";

export function urlEnvio(slug: string) {
  return `/api/f/${encodeURIComponent(slug)}/leads`;
}

export async function postarLead(slug: string, input: unknown, replay = false): Promise<ResultadoEnvio> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(urlEnvio(slug), {
      method: "POST",
      headers: { "content-type": "application/json", ...(replay ? { "x-fila-offline": "1" } : {}) },
      body: JSON.stringify(input),
      signal: controller.signal,
      cache: "no-store",
    });
    if (res.status >= 500) throw new Error(`servidor respondeu ${res.status}`);
    return (await res.json()) as ResultadoEnvio;
  } finally {
    clearTimeout(timer);
  }
}

let rodando: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;

/** Replays everything once; safe to call repeatedly (single flight). */
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
      const r = await postarLead(item.slug, item.input, true);
      // A rate-limited replay is the only semantic answer worth retrying.
      if (!r.ok && r.motivo === "limitado") throw new Error("limitado");
      await fila.remover(item.chave);
    } catch {
      pendentes++;
      await fila.atualizar({ ...item, tentativas: item.tentativas + 1 }).catch(() => {});
    }
  }
  if (pendentes > 0) agendar(Math.max(...itens.map((i) => i.tentativas)) + 1);
}

function agendar(tentativa: number) {
  if (timer) clearTimeout(timer);
  const espera = Math.min(BACKOFF_BASE_MS * 2 ** Math.min(tentativa, 10), BACKOFF_MAX_MS);
  timer = setTimeout(() => {
    timer = null;
    void sincronizar();
  }, espera);
}

/** Asks the service worker to retry even after the tab is closed (Chrome). */
export async function pedirSyncEmSegundoPlano() {
  try {
    const reg = await navigator.serviceWorker?.ready;
    const sync = (reg as ServiceWorkerRegistration & { sync?: { register(tag: string): Promise<void> } }).sync;
    await sync?.register(TAG_SYNC);
  } catch {
    /* no Background Sync: the page-side retry above still runs */
  }
}
