import * as z from "zod/mini";
import { M } from "@/lib/texts/messages";
import { ORIGENS } from "@/lib/domain";
import { normalizarTelefone } from "./phone";

/**
 * Shared by the client (inline validation) and the server action.
 * The server never trusts the client: it re-runs exactly this schema.
 *
 * zod/mini instead of the classic API: same engine, same types, but
 * tree-shakable — the classic build drags ~100 KB gz of locales and JSON
 * Schema into the phone's first load.
 */
export const leadSchema = z.object({
  nome: z.string().check(
    z.trim(),
    z.minLength(3, M.erros.nome),
    z.maxLength(120, M.erros.nome),
    z.refine((v) => /\S+\s+\S+/.test(v), M.erros.nome),
  ),
  telefone: z.pipe(
    z.string(),
    z.transform((v, ctx) => {
      const e164 = normalizarTelefone(v);
      if (!e164) {
        ctx.issues.push({ code: "custom", message: M.erros.whatsapp, input: v });
        return z.NEVER;
      }
      return e164;
    }),
  ),
  email: z.pipe(
    z.pipe(
      z.string().check(z.trim(), z.toLowerCase(), z.maxLength(160, M.erros.email)),
      z.union([z.literal(""), z.email(M.erros.email)]),
    ),
    z.transform((v) => (v === "" ? null : v)),
  ),
  modeloInteresse: z.nullable(z.string().check(z.trim(), z.maxLength(60))),
  prazoCompra: z.nullable(z.enum(M.prazos)),
  consentimentos: z.object({
    contato_comercial: z.literal(true, M.erros.consentimentoObrigatorio),
    promocao: z.boolean(),
    marketing: z.boolean(),
  }),
  origem: z.enum(ORIGENS),
  vendedorCodigo: z.nullable(z.string().check(z.trim(), z.maxLength(10))),
  cupom: z.string().check(z.regex(/^[A-Z0-9]{2,12}-[A-Z0-9]{5}$/)),
  chaveIdempotencia: z.uuid(),
  turnstileToken: z.nullable(z.string().check(z.maxLength(4096))),
  // Honeypot: real users never fill this.
  site: z.optional(z.string().check(z.maxLength(0))),
});

export type LeadInput = z.input<typeof leadSchema>;
export type LeadParsed = z.output<typeof leadSchema>;
