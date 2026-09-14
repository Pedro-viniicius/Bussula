/**
 * Prints the current 6-digit code for the local ADMIN_TOTP_SECRET — for the
 * operator to test the login without the phone. Local use only; there is
 * deliberately no HTTP endpoint for this.
 *
 *   pnpm totp:code
 */
import "./lib/env";
import { validarConfigAdmin, descreverProblemas } from "../src/lib/admin/config";
import { codigoTotp, segundosRestantes } from "../src/lib/admin/totp";

const validacao = validarConfigAdmin();
if (!validacao.ok) {
  const faltaTotp = validacao.problemas.find((p) => p.variavel === "ADMIN_TOTP_SECRET");
  if (faltaTotp) {
    console.error(`ADMIN_TOTP_SECRET ${faltaTotp.motivo} (arquivo: ${process.env.ENV_FILE ?? ".env"}).`);
    process.exit(1);
  }
  console.warn("Aviso — configuração incompleta: " + descreverProblemas(validacao.problemas));
}

const segredo = (process.env.ADMIN_TOTP_SECRET ?? "").replace(/\s+/g, "").toUpperCase();
console.log(`Código TOTP atual: ${codigoTotp(segredo)}`);
console.log(`Válido por aproximadamente: ${segundosRestantes()} segundos`);
