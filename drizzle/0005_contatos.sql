CREATE TABLE "consentimentos_contato" (
	"contato_id" uuid NOT NULL,
	"finalidade" text NOT NULL,
	"concedido" boolean NOT NULL,
	"texto_versao" text NOT NULL,
	"registrado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "consentimentos_contato_contato_id_finalidade_pk" PRIMARY KEY("contato_id","finalidade")
);
--> statement-breakpoint
CREATE TABLE "contatos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resposta_id" uuid NOT NULL,
	"formulario_id" uuid NOT NULL,
	"nome" text,
	"telefone" text NOT NULL,
	"cupom" text,
	"cupom_brinde" text,
	"cupom_expira_em" timestamp with time zone,
	"codigo_indicacao" text,
	"indicado_por" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "contatos_resposta_id_unique" UNIQUE("resposta_id"),
	CONSTRAINT "contatos_cupom_unique" UNIQUE("cupom"),
	CONSTRAINT "contatos_codigo_indicacao_unique" UNIQUE("codigo_indicacao")
);
--> statement-breakpoint
ALTER TABLE "formularios" ADD COLUMN "texto_do_brinde" text;--> statement-breakpoint
ALTER TABLE "formularios" ADD COLUMN "nome_obrigatorio" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "formularios" ADD COLUMN "whatsapp_obrigatorio" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "formularios" ADD COLUMN "formulario_de_indicacao_id" uuid;--> statement-breakpoint
ALTER TABLE "respostas" ADD COLUMN "ip_hash" text;--> statement-breakpoint
ALTER TABLE "versoes_formulario" ADD COLUMN "modulos" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "consentimentos_contato" ADD CONSTRAINT "consentimentos_contato_contato_id_contatos_id_fk" FOREIGN KEY ("contato_id") REFERENCES "public"."contatos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_resposta_id_respostas_id_fk" FOREIGN KEY ("resposta_id") REFERENCES "public"."respostas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contatos" ADD CONSTRAINT "contatos_indicado_por_contatos_id_fk" FOREIGN KEY ("indicado_por") REFERENCES "public"."contatos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "contatos_cupom_por_telefone_uk" ON "contatos" USING btree ("formulario_id","telefone") WHERE "contatos"."cupom" is not null;--> statement-breakpoint
CREATE INDEX "contatos_telefone_criado_idx" ON "contatos" USING btree ("telefone","criado_em" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "contatos_indicado_por_idx" ON "contatos" USING btree ("indicado_por");--> statement-breakpoint
CREATE INDEX "contatos_criado_idx" ON "contatos" USING btree ("criado_em" DESC NULLS LAST);--> statement-breakpoint
ALTER TABLE "formularios" ADD CONSTRAINT "formularios_formulario_de_indicacao_id_formularios_id_fk" FOREIGN KEY ("formulario_de_indicacao_id") REFERENCES "public"."formularios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "respostas_ip_hash_criado_idx" ON "respostas" USING btree ("ip_hash","criado_em" DESC NULLS LAST);