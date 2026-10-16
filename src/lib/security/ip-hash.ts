import { createHash } from "node:crypto";
import { log } from "@/lib/logger";

let avisou = false;

/**
 * O IP do cliente, nunca guardado cru. Na Vercel, `x-vercel-forwarded-for` é
 * escrito pela borda e o cliente não consegue forjá-lo; `x-forwarded-for` pode
 * chegar com valores inventados à frente, então só entra se o anterior faltar
 * (desenvolvimento, `next start` local).
 */
export function extrairIp(headers: Headers): string | null {
  const vercel = headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (vercel) return vercel;
  const xff = headers.get("x-forwarded-for");
  const ip = xff?.split(",")[0]?.trim() || headers.get("x-real-ip")?.trim();
  return ip || null;
}

/** Salted SHA-256 of the IP. Without a salt we store nothing rather than a raw IP. */
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.IP_HASH_SALT;
  if (!salt) {
    if (!avisou) {
      // Em produção isto desliga o limite de envios por IP sem ninguém ver: é erro, não aviso.
      const emitir = process.env.NODE_ENV === "production" ? log.error : log.warn;
      emitir("IP_HASH_SALT ausente: ip_hash não será gravado e o limite por IP fica desligado");
      avisou = true;
    }
    return null;
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
