"use server";

import { headers } from "next/headers";
import { buscarEventoPorSlug } from "@/lib/db/queries";
import { criarLead } from "@/lib/leads/criar-lead";
import { log } from "@/lib/logger";
import { extrairIp, hashIp } from "@/lib/security/ip-hash";
import { M } from "@/lib/texts/messages";
import { leadSchema } from "@/lib/validation/lead";
import type { ResultadoEnvio } from "@/components/lead-form/submit";

/**
 * Server action behind the form. Never trusts the client: re-validates with
 * the shared schema, resolves the seller server-side, hashes the IP.
 */
export async function enviarLeadAction(slug: string, input: unknown): Promise<ResultadoEnvio> {
  const parsed = leadSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const campo = issue?.path[0];
    log.warn("lead inválido", { slug, campo: String(campo), codigo: issue?.code });
    return {
      ok: false,
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
    return { ok: false, erro: M.encerrado.texto };
  }

  const h = await headers();
  const contexto = {
    ipHash: hashIp(extrairIp(h)),
    userAgent: h.get("user-agent")?.slice(0, 256) ?? null,
    turnstileOk: true, // step 5 wires the real verification
  };

  try {
    const resultado = await criarLead(evento, dados, contexto);
    if (resultado.status === "duplicado") {
      return { ok: false, campo: "telefone", erro: M.erros.telefoneDuplicado, cupom: resultado.cupom };
    }
    log.info("lead gravado", {
      slug,
      leadId: resultado.leadId,
      status: resultado.status,
      origem: dados.origem,
      vendedor: dados.vendedorCodigo,
    });
    return { ok: true, cupom: resultado.cupom };
  } catch (err) {
    log.error("falha ao gravar lead", { slug, erro: err instanceof Error ? err.message : String(err) });
    return { ok: false, erro: M.erros.generico };
  }
}

type CampoFormulario = "nome" | "telefone" | "email" | "consentimentos";

function campoDeFormulario(campo: unknown): CampoFormulario | undefined {
  return campo === "nome" || campo === "telefone" || campo === "email" || campo === "consentimentos"
    ? campo
    : undefined;
}
