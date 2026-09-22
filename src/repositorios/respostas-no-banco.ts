/**
 * Respostas guardadas no Postgres.
 *
 * Nenhum número do painel é gravado: tudo que o dashboard mostra é contado a
 * partir destas linhas na hora da consulta. Assim não existe indicador que
 * possa ficar defasado em relação ao que os clientes responderam.
 */
import { count, desc, eq, gte, max, sql } from "drizzle-orm";
import { FUSO_HORARIO } from "@/dominio/constantes";
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import type { ValorDaResposta } from "@/dominio/formularios/perguntas";
import type { RepositorioDeRespostas, TotalDoFormulario } from "@/dominio/respostas/repositorio";
import type { OrigemDaResposta, Resposta } from "@/dominio/respostas/tipos";
import { db } from "@/lib/db";
import { respostas, type RespostaGravada } from "@/lib/db/schema";

function paraDominio(linha: RespostaGravada): Resposta {
  return {
    id: linha.id,
    formularioId: linha.formularioId,
    versaoFormulario: linha.versaoFormulario,
    valores: linha.valores as Record<string, ValorDaResposta>,
    origem: linha.origem as OrigemDaResposta,
    criadoEm: linha.criadoEm,
  };
}

export const repositorioDeRespostasNoBanco: RepositorioDeRespostas = {
  async gravar(entrada) {
    // O índice único em chave_envio é quem garante a idempotência: duas
    // requisições iguais disputam a mesma linha e só uma vence.
    const [gravada] = await db
      .insert(respostas)
      .values({
        formularioId: entrada.formularioId,
        versaoFormulario: entrada.versaoFormulario,
        chaveEnvio: entrada.chaveEnvio,
        valores: entrada.valores,
        origem: entrada.origem,
      })
      .onConflictDoNothing({ target: respostas.chaveEnvio })
      .returning();

    if (gravada) return { resposta: paraDominio(gravada), duplicada: false };

    const [existente] = await db
      .select()
      .from(respostas)
      .where(eq(respostas.chaveEnvio, entrada.chaveEnvio))
      .limit(1);
    return { resposta: paraDominio(existente), duplicada: true };
  },

  async listar({ formularioId, pagina, porPagina }) {
    const onde = formularioId ? eq(respostas.formularioId, formularioId) : undefined;
    const [{ total }] = await db.select({ total: count() }).from(respostas).where(onde);
    const linhas = await db
      .select()
      .from(respostas)
      .where(onde)
      .orderBy(desc(respostas.criadoEm))
      .limit(porPagina)
      .offset((pagina - 1) * porPagina);
    return {
      itens: linhas.map(paraDominio),
      total,
      paginas: Math.max(1, Math.ceil(total / porPagina)),
    };
  },

  async recentes(limite) {
    const linhas = await db.select().from(respostas).orderBy(desc(respostas.criadoEm)).limit(limite);
    return linhas.map(paraDominio);
  },

  async doFormulario(formularioId) {
    const linhas = await db
      .select()
      .from(respostas)
      .where(eq(respostas.formularioId, formularioId))
      .orderBy(desc(respostas.criadoEm));
    return linhas.map(paraDominio);
  },

  async contarTudo() {
    const [{ total }] = await db.select({ total: count() }).from(respostas);
    return total;
  },

  async contarDesde(data) {
    const [{ total }] = await db.select({ total: count() }).from(respostas).where(gte(respostas.criadoEm, data));
    return total;
  },

  async ultimaEm() {
    const [linha] = await db.select({ quando: max(respostas.criadoEm) }).from(respostas);
    return linha?.quando ?? null;
  },

  async porDia(desde) {
    // Fuso escrito literalmente: um parâmetro faria o GROUP BY e o SELECT
    // divergirem ($1 contra $2) e o Postgres recusaria a consulta.
    const dia = sql<Date>`date_trunc('day', ${respostas.criadoEm} at time zone ${sql.raw(`'${FUSO_HORARIO}'`)})`;
    const linhas = await db
      .select({ dia, total: count() })
      .from(respostas)
      .where(gte(respostas.criadoEm, desde))
      .groupBy(dia)
      .orderBy(dia);
    return linhas.map((l): PontoDaSerie => ({ dia: new Date(l.dia), total: l.total }));
  },

  async totaisPorFormulario() {
    const linhas = await db
      .select({
        formularioId: respostas.formularioId,
        total: count(),
        ultimaEm: max(respostas.criadoEm),
      })
      .from(respostas)
      .groupBy(respostas.formularioId);
    const mapa = new Map<string, TotalDoFormulario>();
    for (const l of linhas) mapa.set(l.formularioId, { total: l.total, ultimaEm: l.ultimaEm ?? null });
    return mapa;
  },
};
