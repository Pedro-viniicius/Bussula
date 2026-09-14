import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Stateless admin session: an HMAC-SHA256 signed cookie carrying only an
 * expiry and a random id (the id goes to `auditoria.usuario_id` so actions
 * can be tied to a login). Nothing to store, nothing to clean up; rotating
 * SESSION_SECRET logs everyone out.
 */
export const COOKIE_SESSAO = "sessao_admin";
const DURACAO_S = 12 * 60 * 60;

export type SessaoAdmin = { id: string; exp: number };

function segredo(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou curto demais (mínimo 32 caracteres)");
  return s;
}

function assinar(payload: string): string {
  return createHmac("sha256", segredo()).update(payload).digest("base64url");
}

export function criarTokenSessao(): { token: string; sessao: SessaoAdmin } {
  const sessao: SessaoAdmin = { id: randomUUID(), exp: Math.floor(Date.now() / 1000) + DURACAO_S };
  const payload = Buffer.from(JSON.stringify(sessao)).toString("base64url");
  return { token: `${payload}.${assinar(payload)}`, sessao };
}

export function lerTokenSessao(token: string | undefined): SessaoAdmin | null {
  if (!token) return null;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  const esperada = Buffer.from(assinar(payload));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;
  try {
    const sessao = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessaoAdmin;
    if (typeof sessao.exp !== "number" || sessao.exp < Date.now() / 1000) return null;
    if (typeof sessao.id !== "string") return null;
    return sessao;
  } catch {
    return null;
  }
}

export async function gravarCookieSessao(token: string) {
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_S,
  });
}

export async function apagarCookieSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function sessaoAtual(): Promise<SessaoAdmin | null> {
  return lerTokenSessao((await cookies()).get(COOKIE_SESSAO)?.value);
}

/** For pages and actions: returns the session or sends the visitor to the login. */
export async function exigirAdmin(voltarPara = "/admin"): Promise<SessaoAdmin> {
  const sessao = await sessaoAtual();
  if (!sessao) redirect(`/admin/login?next=${encodeURIComponent(voltarPara)}`);
  return sessao;
}

/** Only same-site relative paths may be used as a post-login destination. */
export function destinoSeguro(next: string | undefined | null): string {
  return next && /^\/[A-Za-z0-9/_\-?=&%.]*$/.test(next) && !next.startsWith("//") ? next : "/admin";
}
