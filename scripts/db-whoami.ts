/**
 * Read-only: which database does this env file point to, and what is in it?
 *
 *   pnpm db:whoami          # .env (local / Neon dev branch)
 *   pnpm db:whoami:prod     # pulls production env, prints, deletes the file
 *
 * Use it to confirm the terminal and the live site agree
 * (the site logs its host at boot — see README, "Qual banco está no ar?").
 */
import { scriptDatabaseUrl } from "./lib/env";
import { anunciarAlvo } from "./lib/alvo";
import { drizzle } from "drizzle-orm/node-postgres";
import { count, desc } from "drizzle-orm";
import { createPool } from "../src/lib/db/pool";
import { contatos, formularios, respostas } from "../src/lib/db/schema";

async function main() {
  const url = scriptDatabaseUrl();
  anunciarAlvo(url, "lendo de");
  const pool = createPool(url);
  const db = drizzle(pool);
  try {
    const [{ totalFormularios }] = await db.select({ totalFormularios: count() }).from(formularios);
    const [{ totalRespostas }] = await db.select({ totalRespostas: count() }).from(respostas);
    const [{ totalContatos }] = await db.select({ totalContatos: count() }).from(contatos);
    const [ultima] = await db
      .select({ criadoEm: respostas.criadoEm })
      .from(respostas)
      .orderBy(desc(respostas.criadoEm))
      .limit(1);

    console.log(`Formulários: ${totalFormularios}`);
    console.log(`Contatos: ${totalContatos}`);
    console.log(
      `Respostas: ${totalRespostas}${ultima ? ` (última em ${ultima.criadoEm.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })})` : ""}`,
    );
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
