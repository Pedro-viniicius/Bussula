import type { LeadInput } from "@/lib/validation/lead";

export type ResultadoEnvio =
  | { ok: true; cupom: string; enfileirado?: boolean }
  | { ok: false; erro: string; campo?: "nome" | "telefone" | "email" | "consentimentos" };

/**
 * Sends the lead. Step 3 stub: the server action lands in step 4 and the
 * offline queue in step 6; the form only ever talks to this function.
 */
export async function enviarLead(input: LeadInput): Promise<ResultadoEnvio> {
  await new Promise((r) => setTimeout(r, 300));
  return { ok: true, cupom: input.cupom };
}
