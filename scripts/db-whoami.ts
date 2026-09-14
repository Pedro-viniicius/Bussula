/**
 * Read-only: which database does this env file point to, and what is in it?
 *
 *   pnpm db:whoami          # .env (local / Neon dev branch)
 *   pnpm db:whoami:prod     # pulls production env, prints, deletes the file
 *
 * Use it on event day to confirm the terminal and the live site agree
 * (the site logs its host at boot — see README, "Qual banco está no ar?").
 */
import { scriptDatabaseUrl } from "./lib/env";
import { anunciarAlvo } from "./lib/alvo";
import { drizzle } from "drizzle-orm/node-postgres";
import { count, desc } from "drizzle-orm";
import { createPool } from "../src/lib/db/pool";
import { eventos, leads, vendedores } from "../src/lib/db/schema";

async function main() {
  const url = scriptDatabaseUrl();
  anunciarAlvo(url, "lendo de");
  const pool = createPool(url);
  const db = drizzle(pool);
  try {
    const lista = await db
      .select({ slug: eventos.slug, ativo: eventos.ativo })
      .from(eventos)
      .orderBy(desc(eventos.inicio));
    const [{ totalLeads }] = await db.select({ totalLeads: count() }).from(leads);
    const [{ totalVendedores }] = await db.select({ totalVendedores: count() }).from(vendedores);
    const [ultimo] = await db
      .select({ criadoEm: leads.criadoEm })
      .from(leads)
      .orderBy(desc(leads.criadoEm))
      .limit(1);

    console.log(
      `Eventos: ${lista.length ? lista.map((e) => `${e.slug}${e.ativo ? "" : " (inativo)"}`).join(", ") : "nenhum"}`,
    );
    console.log(`Vendedores: ${totalVendedores}`);
    console.log(
      `Leads: ${totalLeads}${ultimo ? ` (último em ${ultimo.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })})` : ""}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
