import { Pool, type PoolConfig } from "pg";

/**
 * Creates a pg Pool with the settings this project always wants.
 *
 * Neon hands us `sslmode=require`; pg 8 already treats that as verify-full but
 * warns about the upcoming semantic change on every boot. Spelling it out keeps
 * the strict behaviour and silences the warning.
 */
export function createPool(connectionString: string, config: PoolConfig = {}) {
  return new Pool({
    connectionString: connectionString.replace(
      /sslmode=(require|prefer|verify-ca)\b/,
      "sslmode=verify-full",
    ),
    max: 1,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...config,
  });
}
