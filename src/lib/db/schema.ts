import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { FINALIDADES } from "@/dominio/contatos/tipos";
import type { ModulosDoFormulario } from "@/dominio/formularios/modulos";
import { SITUACOES_DO_FORMULARIO } from "@/dominio/formularios/status";
import type { Pergunta, ValorDaResposta } from "@/dominio/formularios/perguntas";
import { ORIGENS_DA_RESPOSTA } from "@/dominio/respostas/tipos";

export const auditoria = pgTable("auditoria", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  usuarioId: uuid("usuario_id"),
  acao: text("acao").notNull(),
  entidade: text("entidade"),
  entidadeId: text("entidade_id"),
  metadados: jsonb("metadados").$type<Record<string, unknown>>(),
  criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
});

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
    // Configuração da loja (D3): editável pelo gerente, não gera versão, é auditada.
    textoDoBrinde: text("texto_do_brinde"),
    nomeObrigatorio: boolean("nome_obrigatorio").notNull().default(false),
    whatsappObrigatorio: boolean("whatsapp_obrigatorio").notNull().default(true),
    // Nulo = o próprio formulário.
    formularioDeIndicacaoId: uuid("formulario_de_indicacao_id").references((): AnyPgColumn => formularios.id, {
      onDelete: "set null",
    }),
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
    // Módulos desta publicação (cupom, indicação…). `{}` = tudo desligado; ler com `lerModulos`.
    modulos: jsonb("modulos").$type<Partial<ModulosDoFormulario>>().notNull().default({}),
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
    // Hash (com sal) do IP de quem enviou; só serve para o limite anti-abuso.
    ipHash: text("ip_hash"),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("respostas_formulario_criado_idx").on(t.formularioId, t.criadoEm.desc()),
    index("respostas_ip_hash_criado_idx").on(t.ipHash, t.criadoEm.desc()),
  ],
);

/* ------------------------------------------------------------------ *
 * Contatos: o dado pessoal fica aqui, nunca em `respostas.valores`.   *
 * ------------------------------------------------------------------ */

export const contatos = pgTable(
  "contatos",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    respostaId: uuid("resposta_id")
      .notNull()
      .unique()
      .references(() => respostas.id, { onDelete: "cascade" }),
    formularioId: uuid("formulario_id")
      .notNull()
      .references(() => formularios.id, { onDelete: "cascade" }),
    // Nulo quando o formulário não pede nome.
    nome: text("nome"),
    // E.164.
    telefone: text("telefone").notNull(),
    // Nulo = cupom não emitido.
    cupom: text("cupom").unique(),
    // Cópia do texto do brinde no momento da emissão: a prova do que foi oferecido.
    cupomBrinde: text("cupom_brinde"),
    cupomExpiraEm: timestamp("cupom_expira_em", { withTimezone: true }),
    // Nulo = indicação desligada.
    codigoIndicacao: text("codigo_indicacao").unique(),
    indicadoPor: uuid("indicado_por").references((): AnyPgColumn => contatos.id, { onDelete: "set null" }),
    criadoEm: timestamp("criado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Um cupom por telefone por formulário, para sempre (mesmo vencido).
    uniqueIndex("contatos_cupom_por_telefone_uk")
      .on(t.formularioId, t.telefone)
      .where(sql`${t.cupom} is not null`),
    index("contatos_telefone_criado_idx").on(t.telefone, t.criadoEm.desc()),
    index("contatos_indicado_por_idx").on(t.indicadoPor),
    index("contatos_criado_idx").on(t.criadoEm.desc()),
  ],
);

export const consentimentosContato = pgTable(
  "consentimentos_contato",
  {
    contatoId: uuid("contato_id")
      .notNull()
      .references(() => contatos.id, { onDelete: "cascade" }),
    finalidade: text("finalidade", { enum: FINALIDADES }).notNull(),
    concedido: boolean("concedido").notNull(),
    // Versão do texto exibido (`src/lib/texts/consentimento.ts`).
    textoVersao: text("texto_versao").notNull(),
    registradoEm: timestamp("registrado_em", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.contatoId, t.finalidade] })],
);

export type FormularioGravado = typeof formularios.$inferSelect;
export type VersaoFormularioGravada = typeof versoesFormulario.$inferSelect;
export type RespostaGravada = typeof respostas.$inferSelect;
export type ContatoGravadoNoBanco = typeof contatos.$inferSelect;
export type ConsentimentoDeContatoGravado = typeof consentimentosContato.$inferSelect;
