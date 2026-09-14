import type { Db, Tx } from "@/lib/db";
import { auditoria } from "@/lib/db/schema";

type Entrada = {
  acao: string;
  entidade?: string;
  entidadeId?: string;
  usuarioId?: string | null;
  metadados?: Record<string, unknown>;
};

/** Append-only audit trail; accepts a transaction so it commits with the change. */
export async function registrarAuditoria(exec: Db | Tx, entrada: Entrada) {
  await exec.insert(auditoria).values({
    acao: entrada.acao,
    entidade: entrada.entidade ?? null,
    entidadeId: entrada.entidadeId ?? null,
    usuarioId: entrada.usuarioId ?? null,
    metadados: entrada.metadados ?? null,
  });
}
