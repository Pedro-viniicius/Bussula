import type { ResultadoEnvio } from "@/lib/leads/resultado";
import { fila } from "@/lib/offline/queue";
import { pedirSyncEmSegundoPlano, postarLead } from "@/lib/offline/sync";
import type { LeadInput } from "@/lib/validation/lead";

export type { ResultadoEnvio };

/**
 * Sends the lead. When the server cannot be reached (no signal, timeout,
 * 5xx) the lead is queued locally and the visitor still leaves with their
 * coupon: it was generated on the phone and the queue replays the exact
 * same request with the same idempotency key.
 */
export async function enviarLead(slug: string, input: LeadInput): Promise<ResultadoEnvio> {
  try {
    return await postarLead(slug, input);
  } catch (erro) {
    if (!fila.disponivel()) throw erro;
    await fila.enfileirar({
      chave: input.chaveIdempotencia,
      slug,
      input,
      criadoEm: Date.now(),
      tentativas: 1,
    });
    void pedirSyncEmSegundoPlano();
    return { ok: true, cupom: input.cupom, enfileirado: true };
  }
}
