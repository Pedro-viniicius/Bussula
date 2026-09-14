/**
 * Generates a TOTP secret for the admin login and prints what to put where.
 *
 *   pnpm totp:enroll
 *
 * Add the secret to ADMIN_TOTP_SECRET (.env locally, Vercel for production)
 * and the account to the authenticator app: scan the QR if `qrencode` is
 * installed, otherwise choose "enter a setup key" and type the secret.
 */
import { execFileSync } from "node:child_process";
import { gerarSegredoBase32, uriOtpauth } from "../src/lib/admin/totp";

const segredo = gerarSegredoBase32();
const uri = uriOtpauth(segredo, "admin", "Fiat Day");

console.log("\nADMIN_TOTP_SECRET=" + segredo + "\n");
console.log("URI para o aplicativo autenticador:\n" + uri + "\n");
try {
  console.log(execFileSync("qrencode", ["-t", "UTF8", uri]).toString());
} catch {
  console.log("(instale `qrencode` para ver o QR aqui, ou digite a chave acima no aplicativo)\n");
}
