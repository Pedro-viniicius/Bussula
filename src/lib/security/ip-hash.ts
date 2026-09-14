import { createHash } from "node:crypto";
import { log } from "@/lib/logger";

let avisou = false;

/** First hop of x-forwarded-for (Vercel sets it), never stored raw. */
export function extrairIp(headers: Headers): string | null {
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
      log.warn("IP_HASH_SALT ausente: ip_hash não será gravado");
      avisou = true;
    }
    return null;
  }
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}
