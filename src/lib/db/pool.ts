import { Pool, type PoolConfig } from "pg";
import { log, resumoDoErro } from "../logger";

/**
 * Creates a pg Pool with the settings this project always wants.
 *
 * Neon hands us `sslmode=require`; pg 8 already treats that as verify-full but
 * warns about the upcoming semantic change on every boot. Spelling it out keeps
 * the strict behaviour and silences the warning.
 */
export function createPool(connectionString: string, config: PoolConfig = {}) {
  const pool = new Pool({
    connectionString: connectionString.replace(
      /sslmode=(require|prefer|verify-ca)\b/,
      "sslmode=verify-full",
    ),
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...config,
  });
  // Sem listener, uma conexão ociosa derrubada pelo Neon emite "error" sem dono
  // e derruba a instância. Só a classe do erro vai para o log (nunca message/stack).
  pool.on("error", (erro) => log.warn("conexão ociosa do banco caiu", resumoDoErro(erro)));
  return pool;
}
