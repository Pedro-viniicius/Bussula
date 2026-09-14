"use server";

import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/admin/audit";
import { sessaoAtual } from "@/lib/admin/session";
import { DEMO_SLUG } from "@/lib/demo/constantes";
import { buscarCompleto, eventoDemo } from "@/lib/demo/queries";
import { formatarE164 } from "@/lib/validation/phone";

export type Revelado = { nome: string; telefone: string; email: string | null };

/**
 * Shows the full name/phone/e-mail of one demo lead and leaves a trace:
 * every reveal is an `auditoria` row tied to the admin session.
 */
export async function revelarAction(leadId: string): Promise<Revelado | null> {
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  const evento = await eventoDemo();
  if (!evento) return null;
  const lead = await buscarCompleto(evento.id, leadId);
  if (!lead) return null;
  await registrarAuditoria(db, {
    acao: "dado_revelado",
    entidade: "lead",
    entidadeId: lead.id,
    usuarioId: sessao.id,
    metadados: { evento: DEMO_SLUG, campos: ["nome", "telefone", "email"] },
  });
  return { nome: lead.nome, telefone: formatarE164(lead.telefone), email: lead.email };
}
