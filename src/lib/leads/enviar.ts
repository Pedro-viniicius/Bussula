import { buscarEventoPorSlug } from "@/lib/db/queries";
import { criarLead } from "@/lib/leads/criar-lead";
import type { ResultadoEnvio } from "@/lib/leads/resultado";
import { log } from "@/lib/logger";
import { extrairIp, hashIp } from "@/lib/security/ip-hash";
import { M } from "@/lib/texts/messages";
import { leadSchema } from "@/lib/validation/lead";

/**
 * Behind POST /api/f/[slug]/leads. Never trusts the client: re-validates with
 * the shared schema, resolves the seller server-side, hashes the IP.
 * Bot defence is honeypot + per-IP rate limit only (no captcha by decision).
 *
 * A plain route instead of a server action so the offline queue (page or
 * service worker) can replay the exact same request later.
 */
export async function processarEnvio(slug: string, input: unknown, h: Headers): Promise<ResultadoEnvio> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const campo = issue?.path[0];
    log.warn("lead inválido", { slug, campo: String(campo), codigo: issue?.code });
    return {
      ok: false,
      motivo: "invalido",
      erro: issue?.message ?? M.erros.generico,
      campo: campoDeFormulario(campo),
    };
  }
  const dados = parsed.data;

  // Honeypot filled in: pretend it worked, store nothing.
  if (dados.site) {
    log.warn("honeypot preenchido", { slug, origem: dados.origem });
    return { ok: true, cupom: dados.cupom };
  }

  const evento = await buscarEventoPorSlug(slug);
  if (!evento || !evento.ativo) {
    return { ok: false, motivo: "encerrado", erro: M.encerrado.texto };
  }

  const contexto = {
    ipHash: hashIp(extrairIp(h)),
    userAgent: h.get("user-agent")?.slice(0, 256) ?? null,
  };

  const resultado = await criarLead(evento, dados, contexto);
  if (resultado.status === "duplicado") {
    return { ok: false, motivo: "duplicado", campo: "telefone", erro: M.erros.telefoneDuplicado, cupom: resultado.cupom };
  }
  if (resultado.status === "limitado") {
    return { ok: false, motivo: "limitado", erro: M.erros.limite };
  }
  log.info("lead gravado", {
    slug,
    leadId: resultado.leadId,
    status: resultado.status,
    origem: dados.origem,
    vendedor: dados.vendedorCodigo,
    replay: h.get("x-fila-offline") === "1",
  });
  return { ok: true, cupom: resultado.cupom };
}

type CampoFormulario = "nome" | "telefone" | "email" | "consentimentos";

function campoDeFormulario(campo: unknown): CampoFormulario | undefined {
  return campo === "nome" || campo === "telefone" || campo === "email" || campo === "consentimentos"
    ? campo
    : undefined;
}
