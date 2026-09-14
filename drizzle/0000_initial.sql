CREATE TABLE "auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" uuid,
	"acao" text NOT NULL,
	"entidade" text,
	"entidade_id" text,
	"metadados" jsonb,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "consentimentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" uuid NOT NULL,
	"finalidade" text NOT NULL,
	"concedido" boolean NOT NULL,
	"texto_versao" text NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"inicio" timestamp with time zone NOT NULL,
	"fim" timestamp with time zone NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"politica_versao" text NOT NULL,
	"retencao_meses" integer DEFAULT 12 NOT NULL,
	"modelos" jsonb DEFAULT '[]'::jsonb NOT NULL,
	CONSTRAINT "eventos_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "leads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"evento_id" uuid NOT NULL,
	"vendedor_id" uuid,
	"origem" text NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text,
	"modelo_interesse" text,
	"prazo_compra" text,
	"cupom" text NOT NULL,
	"ip_hash" text,
	"user_agent" text,
	"chave_idempotencia" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"anonimizado_em" timestamp with time zone,
	CONSTRAINT "leads_cupom_unique" UNIQUE("cupom"),
	CONSTRAINT "leads_chave_idempotencia_unique" UNIQUE("chave_idempotencia"),
	CONSTRAINT "leads_origem_check" CHECK ("leads"."origem" IN ('nfc','qr','manual','direto'))
);
--> statement-breakpoint
CREATE TABLE "vendedores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "vendedores_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
ALTER TABLE "consentimentos" ADD CONSTRAINT "consentimentos_lead_id_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_evento_id_eventos_id_fk" FOREIGN KEY ("evento_id") REFERENCES "public"."eventos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leads" ADD CONSTRAINT "leads_vendedor_id_vendedores_id_fk" FOREIGN KEY ("vendedor_id") REFERENCES "public"."vendedores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "leads_evento_telefone_uk" ON "leads" USING btree ("evento_id","telefone") WHERE "leads"."anonimizado_em" IS NULL;--> statement-breakpoint
CREATE INDEX "leads_evento_criado_idx" ON "leads" USING btree ("evento_id","criado_em" DESC NULLS LAST);