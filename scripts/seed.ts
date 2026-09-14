/**
 * Seed: one event + N salespeople.
 *
 * Idempotent: re-running updates the event definition and adds missing
 * salespeople without touching leads. Refuses to run against a database that
 * already contains leads unless --force is passed, so the wrong terminal on
 * event day cannot do damage.
 *
 *   pnpm db:seed            # normal
 *   pnpm db:seed --force    # database already has leads and you know it
 */
import { scriptDatabaseUrl } from "./lib/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { count, sql } from "drizzle-orm";
import { createPool } from "../src/lib/db/pool";
import { eventos, leads, vendedores } from "../src/lib/db/schema";
import { POLITICA_VERSAO } from "../src/lib/texts/privacy";

const EVENTO = {
  slug: "fiat19",
  nome: "Fiat Day — 19 de setembro",
  // Deliberately wide window in America/Sao_Paulo (UTC-3, no DST in 2026).
  inicio: new Date("2026-09-19T07:00:00-03:00"),
  fim: new Date("2026-09-19T23:59:59-03:00"),
  politicaVersao: POLITICA_VERSAO,
  retencaoMeses: 12,
  modelos: ["Strada", "Toro", "Pulse", "Fastback", "Argo", "Mobi"],
};

const QTD_VENDEDORES = 8;

async function main() {
  const force = process.argv.includes("--force");
  const pool = createPool(scriptDatabaseUrl());
  const db = drizzle(pool);

  try {
    const [{ total }] = await db.select({ total: count() }).from(leads);
    if (total > 0 && !force) {
      console.error(
        `Este banco já tem ${total} lead(s). Recusando o seed. ` +
          `Se tem certeza, rode novamente com --force.`,
      );
      process.exitCode = 1;
      return;
    }
    if (total > 0) {
      console.warn(`--force: banco tem ${total} lead(s); leads não serão alterados.`);
    }

    await db.transaction(async (tx) => {
      // The event definition lives here; `ativo` is operational and left alone.
      const [evento] = await tx
        .insert(eventos)
        .values(EVENTO)
        .onConflictDoUpdate({
          target: eventos.slug,
          set: {
            nome: sql`excluded.nome`,
            inicio: sql`excluded.inicio`,
            fim: sql`excluded.fim`,
            politicaVersao: sql`excluded.politica_versao`,
            retencaoMeses: sql`excluded.retencao_meses`,
            modelos: sql`excluded.modelos`,
          },
        })
        .returning({ id: eventos.id, slug: eventos.slug });
      console.log(`Evento "${evento.slug}" pronto (${evento.id}).`);

      // Names are edited by hand after seeding, so existing rows are kept as-is.
      const codigos = Array.from({ length: QTD_VENDEDORES }, (_, i) =>
        String(i + 1).padStart(2, "0"),
      );
      const inseridos = await tx
        .insert(vendedores)
        .values(codigos.map((codigo) => ({ codigo, nome: `Vendedor ${codigo}` })))
        .onConflictDoNothing({ target: vendedores.codigo })
        .returning({ codigo: vendedores.codigo });
      console.log(
        `Vendedores: ${inseridos.length} novo(s), ${codigos.length - inseridos.length} já existiam.`,
      );
    });
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Seed falhou:", err);
  process.exit(1);
});
