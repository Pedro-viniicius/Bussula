import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { SITUACOES_DO_FORMULARIO } from "@/dominio/formularios/status";
import type { Pergunta, ValorDaResposta } from "@/dominio/formularios/perguntas";
import { ORIGENS_DA_RESPOSTA } from "@/dominio/respostas/tipos";
import { FINALIDADES, ORIGENS } from "@/lib/domain";

export { FINALIDADES, ORIGENS, type Finalidade, type Origem } from "@/lib/domain";

export const eventos = pgTable("eventos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").unique().notNull(),
  nome: text("nome").notNull(),
  inicio: timestamp("inicio", { withTimezone: true }).notNull(),
  fim: timestamp("fim", { withTimezone: true }).notNull(),
  ativo: boolean("ativo").notNull().default(true),
  politicaVersao: text("politica_versao").notNull(),
  retencaoMeses: integer("retencao_meses").notNull().default(12),
  // Model chips are data, not code: the dealership changes the list without a deploy.
  modelos: jsonb("modelos").$type<string[]>().notNull().default([]),
});

export const vendedores = pgTable("vendedores", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  codigo: text("codigo").unique().notNull(),
  nome: text("nome").notNull(),
  ativo: boolean("ativo").notNull().default(true),
});

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    eventoId: uuid("evento_id")
      .notNull()
      .references(() => eventos.id),
    vendedorId: uuid("vendedor_id").references(() => vendedores.id),
    origem: text("origem", { enum: ORIGENS }).notNull(),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(), // normalized E.164
    email: text("email"),
    modeloInteresse: text("modelo_interesse"),
    prazoCompra: text("prazo_compra"),
    cupom: text("cupom").unique().notNull(),
    ipHash: text("ip_hash"), // salted SHA-256, never the raw IP
    userAgent: text("user_agent"),
    // Client-generated request key; a retry with the same key returns the original lead.
    chaveIdempotencia: uuid("chave_idempotencia").unique(),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    anonimizadoEm: timestamp("anonimizado_em", { withTimezone: true }),
  },
  (t) => [
    check("leads_origem_check", sql`${t.origem} IN ('nfc','qr','manual','direto')`),
    uniqueIndex("leads_evento_telefone_uk")
      .on(t.eventoId, t.telefone)
      .where(sql`${t.anonimizadoEm} IS NULL`),
    index("leads_evento_criado_idx").on(t.eventoId, t.criadoEm.desc()),
    // Rate limit counts recent leads per hashed IP.
    index("leads_ip_hash_criado_idx").on(t.ipHash, t.criadoEm.desc()),
  ],
);

export const consentimentos = pgTable("consentimentos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  finalidade: text("finalidade", { enum: FINALIDADES }).notNull(),
  concedido: boolean("concedido").notNull(),
  textoVersao: text("texto_versao").notNull(), // exact version of the text the user accepted
  registradoEm: timestamp("registrado_em", { withTimezone: true }).notNull().defaultNow(),
});

export const auditoria = pgTable("auditoria", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  usuarioId: uuid("usuario_id"),
  acao: text("acao").notNull(),
  entidade: text("entidade"),
  entidadeId: text("entidade_id"),
  metadados: jsonb("metadados").$type<Record<string, unknown>>(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

/** Pedidos de demonstração enviados pelo formulário da landing. */
export const solicitacoesContato = pgTable(
  "solicitacoes_contato",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    nome: text("nome").notNull(),
    empresa: text("empresa").notNull(),
    contato: text("contato").notNull(), // E.164 phone or lower-cased e-mail
    mensagem: text("mensagem").notNull(),
    consentimentoVersao: text("consentimento_versao").notNull(),
    ipHash: text("ip_hash"),
    userAgent: text("user_agent"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atendidoEm: timestamp("atendido_em", { withTimezone: true }),
  },
  (t) => [index("solicitacoes_contato_ip_hash_criado_idx").on(t.ipHash, t.criadoEm.desc())],
);

/* ------------------------------------------------------------------ *
 * Formulários: o centro do produto.                                   *
 *                                                                     *
 * `formularios` guarda a identidade (nome, link, situação) e          *
 * `versoes_formulario` guarda as perguntas de cada publicação. Uma    *
 * resposta aponta para a versão em que foi dada, então mudar uma      *
 * pergunta hoje não reescreve o sentido do que foi respondido ontem.  *
 * ------------------------------------------------------------------ */

export const formularios = pgTable(
  "formularios",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    // Vai na URL pública e, por isso, no cartão NFC e no QR Code.
    slug: text("slug").unique().notNull(),
    nome: text("nome").notNull(),
    descricao: text("descricao"),
    situacao: text("situacao", { enum: SITUACOES_DO_FORMULARIO }).notNull().default("RASCUNHO"),
    versaoAtual: integer("versao_atual").notNull().default(1),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
    atualizadoEm: timestamp("atualizado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("formularios_situacao_idx").on(t.situacao)],
);

export const versoesFormulario = pgTable(
  "versoes_formulario",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    formularioId: uuid("formulario_id")
      .notNull()
      .references(() => formularios.id, { onDelete: "cascade" }),
    versao: integer("versao").notNull(),
    // As perguntas congeladas desta publicação; o formato vive em src/dominio.
    perguntas: jsonb("perguntas").$type<Pergunta[]>().notNull().default([]),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("versoes_formulario_uk").on(t.formularioId, t.versao)],
);

export const respostas = pgTable(
  "respostas",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    formularioId: uuid("formulario_id")
      .notNull()
      .references(() => formularios.id, { onDelete: "cascade" }),
    versaoFormulario: integer("versao_formulario").notNull(),
    // Gerada no navegador. O índice único é o que impede que uma retentativa
    // de rede vire uma segunda resposta.
    chaveEnvio: uuid("chave_envio").unique().notNull(),
    valores: jsonb("valores").$type<Record<string, ValorDaResposta>>().notNull().default({}),
    origem: text("origem", { enum: ORIGENS_DA_RESPOSTA }).notNull().default("link"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("respostas_formulario_criado_idx").on(t.formularioId, t.criadoEm.desc())],
);

export type FormularioGravado = typeof formularios.$inferSelect;
export type VersaoFormularioGravada = typeof versoesFormulario.$inferSelect;
export type RespostaGravada = typeof respostas.$inferSelect;

export type Evento = typeof eventos.$inferSelect;
export type Vendedor = typeof vendedores.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type NovoLead = typeof leads.$inferInsert;
export type Consentimento = typeof consentimentos.$inferSelect;
export type SolicitacaoContato = typeof solicitacoesContato.$inferSelect;
