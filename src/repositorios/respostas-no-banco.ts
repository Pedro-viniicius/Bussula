/**
 * Respostas guardadas no Postgres.
 *
 * Nenhum número do painel é gravado: tudo que o dashboard mostra é contado a
 * partir destas linhas na hora da consulta. Assim não existe indicador que
 * possa ficar defasado em relação ao que os clientes responderam.
 */
import { and, count, desc, eq, gte, isNotNull, lt, max, min, sql } from "drizzle-orm";
import { FUSO_HORARIO } from "@/dominio/constantes";
import { ConflitoDeContato } from "@/dominio/contatos/repositorio";
import type { ContatoGravado } from "@/dominio/contatos/tipos";
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import type { ValorDaResposta } from "@/dominio/formularios/perguntas";
import type { RepositorioDeRespostas, TotalDoFormulario } from "@/dominio/respostas/repositorio";
import type { OrigemDaResposta, Resposta } from "@/dominio/respostas/tipos";
import { db } from "@/lib/db";
import {
  consentimentosContato,
  contatos,
  respostas,
  type ContatoGravadoNoBanco,
  type RespostaGravada,
} from "@/lib/db/schema";

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

function paraContatoGravado(linha: ContatoGravadoNoBanco | undefined): ContatoGravado | null {
  if (!linha) return null;
  return {
    id: linha.id,
    cupom: linha.cupom,
    cupomExpiraEm: linha.cupomExpiraEm,
    codigoIndicacao: linha.codigoIndicacao,
  };
}

/**
 * Traduz a violação de unicidade do Postgres (23505) na que o serviço
 * entende. Qualquer outro erro segue como está (vira 5xx e a fila tenta de novo).
 */
function traduzirConflito(erro: unknown): unknown {
  // O drizzle embrulha o erro do driver; o código e a restrição ficam em `cause`.
  const original = (erro as { cause?: unknown })?.cause ?? erro;
  const { code, constraint } = (original ?? {}) as { code?: string; constraint?: string };
  if (code !== "23505") return erro;
  if (constraint === "contatos_cupom_por_telefone_uk") return new ConflitoDeContato("cupom_do_telefone");
  if (constraint === "contatos_cupom_unique" || constraint === "contatos_codigo_indicacao_unique") {
    return new ConflitoDeContato("codigo");
  }
  return erro;
}

export const repositorioDeRespostasNoBanco: RepositorioDeRespostas = {
  async gravar(entrada) {
    try {
      // Resposta, contato e consentimentos na mesma transação: ou entra tudo ou nada.
      return await db.transaction(async (tx) => {
        // O índice único em chave_envio é quem garante a idempotência: duas
        // requisições iguais disputam a mesma linha e só uma vence.
        const [gravada] = await tx
          .insert(respostas)
          .values({
            formularioId: entrada.formularioId,
            versaoFormulario: entrada.versaoFormulario,
            chaveEnvio: entrada.chaveEnvio,
            valores: entrada.valores,
            origem: entrada.origem,
            ipHash: entrada.ipHash,
          })
          .onConflictDoNothing({ target: respostas.chaveEnvio })
          .returning();

        if (!gravada) {
          const [existente] = await tx
            .select()
            .from(respostas)
            .where(eq(respostas.chaveEnvio, entrada.chaveEnvio))
            .limit(1);
          const [contatoExistente] = await tx
            .select()
            .from(contatos)
            .where(eq(contatos.respostaId, existente.id))
            .limit(1);
          return {
            resposta: paraDominio(existente),
            duplicada: true,
            contato: paraContatoGravado(contatoExistente),
          };
        }

        let contato: ContatoGravado | null = null;
        if (entrada.contato) {
          const c = entrada.contato;
          const [linha] = await tx
            .insert(contatos)
            .values({
              respostaId: gravada.id,
              formularioId: entrada.formularioId,
              nome: c.nome,
              telefone: c.telefone,
              cupom: c.cupom?.codigo ?? null,
              cupomBrinde: c.cupom?.brinde ?? null,
              cupomExpiraEm: c.cupom?.expiraEm ?? null,
              codigoIndicacao: c.codigoIndicacao,
              indicadoPor: c.indicadoPor,
            })
            .returning();
          if (c.versaoDoConsentimento && c.consentimentos.length > 0) {
            await tx.insert(consentimentosContato).values(
              c.consentimentos.map((item) => ({
                contatoId: linha.id,
                finalidade: item.finalidade,
                concedido: item.concedido,
                textoVersao: c.versaoDoConsentimento!,
              })),
            );
          }
          contato = paraContatoGravado(linha);
        }

        return { resposta: paraDominio(gravada), duplicada: false, contato };
      });
    } catch (erro) {
      throw traduzirConflito(erro);
    }
  },

  async buscarPorChave(chaveEnvio) {
    const [linha] = await db.select().from(respostas).where(eq(respostas.chaveEnvio, chaveEnvio)).limit(1);
    if (!linha) return null;
    const [contato] = await db.select().from(contatos).where(eq(contatos.respostaId, linha.id)).limit(1);
    return {
      resposta: paraDominio(linha),
      contato: paraContatoGravado(contato),
      telefoneDoContato: contato?.telefone ?? null,
    };
  },

  async contarPorIp(ipHash, desde) {
    const [linha] = await db
      .select({ total: count(), maisAntigaEm: min(respostas.criadoEm) })
      .from(respostas)
      .where(and(eq(respostas.ipHash, ipHash), gte(respostas.criadoEm, desde)));
    return { total: linha?.total ?? 0, maisAntigaEm: linha?.maisAntigaEm ?? null };
  },

  async limparIpsAntigos(antesDe) {
    const limpas = await db
      .update(respostas)
      .set({ ipHash: null })
      .where(and(isNotNull(respostas.ipHash), lt(respostas.criadoEm, antesDe)))
      .returning({ id: respostas.id });
    return limpas.length;
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
