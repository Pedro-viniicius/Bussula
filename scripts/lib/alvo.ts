import { ENV_FILE } from "./env";
import { hostDoBanco } from "../../src/lib/db/host";

/**
 * Every script that writes announces WHERE before doing anything, so the
 * wrong terminal is caught by eye. Hostname only, never credentials.
 *
 *   → escrevendo em ep-xxx.sa-east-1.aws.neon.tech (arquivo: .env.producao)
 *
 * Neon does not put the branch name in the URL; the endpoint id (ep-xxx) is
 * what identifies it. `pnpm db:whoami` prints the same line plus row counts.
 */
export function anunciarAlvo(connectionString: string, verbo = "escrevendo em") {
  console.log(`→ ${verbo} ${hostDoBanco(connectionString)} (arquivo: ${ENV_FILE})`);
}
