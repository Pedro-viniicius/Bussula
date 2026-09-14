// Scripts run outside Next.js, so load the env file by hand (Node >= 20.12).
// ENV_FILE selects another file (e.g. ENV_FILE=.env.producao for production).
// Missing file is fine: on Vercel the variables come from the environment.
export const ENV_FILE = process.env.ENV_FILE ?? ".env";
try {
  process.loadEnvFile(ENV_FILE);
} catch {
  /* no env file */
}

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Variável de ambiente ${name} não definida.`);
    process.exit(1);
  }
  return value;
}

/** Direct (unpooled) connection for scripts; falls back to the pooled one. */
export function scriptDatabaseUrl(): string {
  return process.env.DATABASE_URL_UNPOOLED ?? requireEnv("DATABASE_URL");
}
