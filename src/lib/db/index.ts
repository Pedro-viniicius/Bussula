import { drizzle } from "drizzle-orm/node-postgres";
import type { Pool } from "pg";
import { log } from "@/lib/logger";
import { hostDoBanco } from "./host";
import { createPool } from "./pool";
import * as schema from "./schema";

// The app talks to Neon's pooled endpoint (PgBouncer, transaction mode):
// one connection per function instance, no session-level prepared statements.
// Scripts and migrations use DATABASE_URL_UNPOOLED (see drizzle.config.ts).
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida");
}

const globalForDb = globalThis as unknown as { pgPool?: Pool };

const pool = globalForDb.pgPool ?? createPool(connectionString);

// Logged once per instance so "which database is the live site on?" can be
// answered from the Vercel logs (hostname only, never credentials).
if (!globalForDb.pgPool) {
  log.info("banco de dados", { host: hostDoBanco(connectionString) });
}

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = pool;
}

export const db = drizzle(pool, { schema });
export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];
export { schema };
