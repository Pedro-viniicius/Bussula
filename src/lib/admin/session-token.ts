import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { TAMANHO_MINIMO_SESSAO } from "./config";

/**
 * Pure part of the admin session (no Next.js imports, so it is testable):
 * an HMAC-SHA256 signed token carrying only an expiry and a random id.
 */
export const DURACAO_SESSAO_S = 12 * 60 * 60;

export type SessaoAdmin = { id: string; exp: number };

/** null when SESSION_SECRET is missing or short: no session can be created or read. */
function segredo(env: Record<string, string | undefined>): string | null {
  const s = env.SESSION_SECRET;
  return s && s.length >= TAMANHO_MINIMO_SESSAO ? s : null;
}

function assinar(payload: string, chave: string): string {
  return createHmac("sha256", chave).update(payload).digest("base64url");
}

export function criarTokenSessao(agoraMs = Date.now(), env: Record<string, string | undefined> = process.env): { token: string; sessao: SessaoAdmin } {
  const chave = segredo(env);
  if (!chave) throw new Error("SESSION_SECRET ausente ou curto demais");
  const sessao: SessaoAdmin = { id: randomUUID(), exp: Math.floor(agoraMs / 1000) + DURACAO_SESSAO_S };
  const payload = Buffer.from(JSON.stringify(sessao)).toString("base64url");
  return { token: `${payload}.${assinar(payload, chave)}`, sessao };
}

export function lerTokenSessao(token: string | undefined, agoraMs = Date.now(), env: Record<string, string | undefined> = process.env): SessaoAdmin | null {
  const chave = segredo(env);
  if (!token || !chave) return null;
  const [payload, assinatura] = token.split(".");
  if (!payload || !assinatura) return null;
  const esperada = Buffer.from(assinar(payload, chave));
  const recebida = Buffer.from(assinatura);
  if (esperada.length !== recebida.length || !timingSafeEqual(esperada, recebida)) return null;
  try {
    const sessao = JSON.parse(Buffer.from(payload, "base64url").toString()) as SessaoAdmin;
    if (typeof sessao.exp !== "number" || sessao.exp < agoraMs / 1000) return null;
    if (typeof sessao.id !== "string") return null;
    return sessao;
  } catch {
    return null;
  }
}

/** Only same-site relative paths may be used as a post-login destination. */
export function destinoSeguro(next: string | undefined | null): string {
  return next && /^\/[A-Za-z0-9/_\-?=&%.]*$/.test(next) && !next.startsWith("//") ? next : "/admin";
}
