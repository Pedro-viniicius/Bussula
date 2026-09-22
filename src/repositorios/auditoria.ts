/**
 * A trilha de auditoria do painel: quem entrou, quando e de onde.
 *
 * Serve a duas coisas: deixar rastro do acesso administrativo e alimentar o
 * freio de força bruta do login, que conta as falhas recentes em vez de
 * manter um contador à parte.
 *
 * Como o resto da persistência, tem uma versão em Postgres e uma em memória;
 * quem escolhe é `src/repositorios/index.ts`.
 */
import { and, count, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { auditoria } from "@/lib/db/schema";

export type EntradaDeAuditoria = {
  acao: string;
  entidade?: string;
  entidadeId?: string;
  usuarioId?: string | null;
  metadados?: Record<string, unknown>;
};

export type RepositorioDeAuditoria = {
  registrar(entrada: EntradaDeAuditoria): Promise<void>;
  /** Quantas falhas de login houve desde `desde`, no total ou daquele IP. */
  contarFalhasDeLogin(ipHash: string | null, desde: Date): Promise<number>;
};

export const auditoriaNoBanco: RepositorioDeAuditoria = {
  async registrar(entrada) {
    await db.insert(auditoria).values({
      acao: entrada.acao,
      entidade: entrada.entidade ?? null,
      entidadeId: entrada.entidadeId ?? null,
      usuarioId: entrada.usuarioId ?? null,
      metadados: entrada.metadados ?? null,
    });
  },

  async contarFalhasDeLogin(ipHash, desde) {
    const doMesmoIp = ipHash ? sql`${auditoria.metadados}->>'ipHash' = ${ipHash}` : sql`true`;
    const [{ total }] = await db
      .select({ total: count() })
      .from(auditoria)
      .where(and(eq(auditoria.acao, "login_falhou"), gt(auditoria.criadoEm, desde), doMesmoIp));
    return total;
  },
};

/** Guardado no globalThis para sobreviver ao recarregamento do `next dev`. */
const globalParaTrilha = globalThis as unknown as {
  trilhaEmMemoria?: (EntradaDeAuditoria & { criadoEm: Date })[];
};

export const auditoriaEmMemoria: RepositorioDeAuditoria = {
  async registrar(entrada) {
    globalParaTrilha.trilhaEmMemoria ??= [];
    globalParaTrilha.trilhaEmMemoria.push({ ...entrada, criadoEm: new Date() });
  },

  async contarFalhasDeLogin(ipHash, desde) {
    const trilha = globalParaTrilha.trilhaEmMemoria ?? [];
    return trilha.filter(
      (linha) =>
        linha.acao === "login_falhou" &&
        linha.criadoEm > desde &&
        (!ipHash || linha.metadados?.ipHash === ipHash),
    ).length;
  },
};
