CREATE TABLE "formularios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"situacao" text DEFAULT 'RASCUNHO' NOT NULL,
	"versao_atual" integer DEFAULT 1 NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "formularios_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "respostas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulario_id" uuid NOT NULL,
	"versao_formulario" integer NOT NULL,
	"chave_envio" uuid NOT NULL,
	"valores" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"origem" text DEFAULT 'link' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "respostas_chave_envio_unique" UNIQUE("chave_envio")
);
--> statement-breakpoint
CREATE TABLE "versoes_formulario" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"formulario_id" uuid NOT NULL,
	"versao" integer NOT NULL,
	"perguntas" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "respostas" ADD CONSTRAINT "respostas_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "versoes_formulario" ADD CONSTRAINT "versoes_formulario_formulario_id_formularios_id_fk" FOREIGN KEY ("formulario_id") REFERENCES "public"."formularios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "formularios_situacao_idx" ON "formularios" USING btree ("situacao");--> statement-breakpoint
CREATE INDEX "respostas_formulario_criado_idx" ON "respostas" USING btree ("formulario_id","criado_em" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "versoes_formulario_uk" ON "versoes_formulario" USING btree ("formulario_id","versao");