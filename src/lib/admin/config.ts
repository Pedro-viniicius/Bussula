/**
 * Admin configuration, validated in one place.
 *
 * Nothing here is ever sent to the browser: the login action and the
 * scripts call `configAdmin()` on the server and get either a typed object
 * or a list of what is missing. There are no defaults and nothing is
 * generated at startup — a missing variable means the login stays closed.
 */
export const TAMANHO_MINIMO_SENHA = 16;
export const TAMANHO_MINIMO_SESSAO = 32;
const BASE32 = /^[A-Z2-7]{16,}$/;

export type ConfigAdmin = { senha: string; segredoTotp: string; segredoSessao: string };
export type Problema = { variavel: string; motivo: string };

export function validarConfigAdmin(env: Record<string, string | undefined> = process.env): { ok: true; config: ConfigAdmin } | { ok: false; problemas: Problema[] } {
  const problemas: Problema[] = [];
  const senha = env.ADMIN_PASSWORD ?? "";
  const segredoTotp = (env.ADMIN_TOTP_SECRET ?? "").replace(/\s+/g, "").toUpperCase();
  const segredoSessao = env.SESSION_SECRET ?? "";

  if (!senha) problemas.push({ variavel: "ADMIN_PASSWORD", motivo: "ausente" });
  else if (senha.length < TAMANHO_MINIMO_SENHA) problemas.push({ variavel: "ADMIN_PASSWORD", motivo: `curta demais (mínimo ${TAMANHO_MINIMO_SENHA} caracteres)` });

  if (!segredoTotp) problemas.push({ variavel: "ADMIN_TOTP_SECRET", motivo: "ausente — gere com `pnpm totp:enroll`" });
  else if (!BASE32.test(segredoTotp)) problemas.push({ variavel: "ADMIN_TOTP_SECRET", motivo: "inválida — precisa ser base32 (A–Z, 2–7) com 16+ caracteres" });

  if (!segredoSessao) problemas.push({ variavel: "SESSION_SECRET", motivo: "ausente — gere com `openssl rand -hex 32`" });
  else if (segredoSessao.length < TAMANHO_MINIMO_SESSAO) problemas.push({ variavel: "SESSION_SECRET", motivo: `curta demais (mínimo ${TAMANHO_MINIMO_SESSAO} caracteres)` });

  return problemas.length ? { ok: false, problemas } : { ok: true, config: { senha, segredoTotp, segredoSessao } };
}

let avisouIncompleta = false;

/**
 * Validates and, when something is missing, logs it once per instance so a
 * bad deploy is visible in the Vercel logs without flooding them.
 */
export function configAdminOuAviso(): ReturnType<typeof validarConfigAdmin> {
  const validacao = validarConfigAdmin();
  if (!validacao.ok && !avisouIncompleta) {
    console.error(JSON.stringify({ nivel: "error", msg: "painel admin sem configuração", problemas: descreverProblemas(validacao.problemas), ts: new Date().toISOString() }));
    avisouIncompleta = true;
  }
  return validacao;
}

/** One line for logs and scripts; names and reasons only, never values. */
export function descreverProblemas(problemas: Problema[]): string {
  return problemas.map((p) => `${p.variavel}: ${p.motivo}`).join("; ");
}
