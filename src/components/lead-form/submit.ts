import type { LeadInput } from "@/lib/validation/lead";
import { enviarLeadAction } from "@/app/f/[slug]/actions";

export type ResultadoEnvio =
  | { ok: true; cupom: string; enfileirado?: boolean }
  | {
      ok: false;
      erro: string;
      campo?: "nome" | "telefone" | "email" | "consentimentos";
      /** Set when the phone is already registered: the person's existing coupon. */
      cupom?: string | null;
    };

/**
 * Sends the lead. The form only ever talks to this function; the offline
 * queue (step 6) plugs in here.
 */
export async function enviarLead(slug: string, input: LeadInput): Promise<ResultadoEnvio> {
  return enviarLeadAction(slug, input);
}
