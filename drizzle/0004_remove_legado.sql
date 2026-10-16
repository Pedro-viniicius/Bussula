-- Trava: esta migração apaga as tabelas do produto antigo. Se houver qualquer
-- linha em alguma delas, aborta antes de apagar (tabela ausente é tolerada).
DO $$
DECLARE
  tabela text;
  tem_linha boolean;
BEGIN
  FOREACH tabela IN ARRAY ARRAY['consentimentos', 'leads', 'vendedores', 'eventos', 'solicitacoes_contato']
  LOOP
    IF to_regclass('public.' || tabela) IS NOT NULL THEN
      EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I)', tabela) INTO tem_linha;
      IF tem_linha THEN
        RAISE EXCEPTION 'Migração 0004 abortada: a tabela % tem linhas. Nada foi apagado.', tabela;
      END IF;
    END IF;
  END LOOP;
END $$;--> statement-breakpoint
DROP TABLE IF EXISTS "consentimentos";--> statement-breakpoint
DROP TABLE IF EXISTS "leads";--> statement-breakpoint
DROP TABLE IF EXISTS "vendedores";--> statement-breakpoint
DROP TABLE IF EXISTS "eventos";--> statement-breakpoint
DROP TABLE IF EXISTS "solicitacoes_contato";
