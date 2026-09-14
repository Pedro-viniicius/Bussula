import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * TOTP (RFC 6238) on node:crypto only: SHA-1, 6 digits, 30 s step, ±1 step
 * of tolerance for clock drift between the phone and the server.
 */
const ALFABETO_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PASSO_S = 30;
const DIGITOS = 6;

export function gerarSegredoBase32(bytes = 20): string {
  return base32Encode(randomBytes(bytes));
}

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let valor = 0;
  let saida = "";
  for (const b of buf) {
    valor = (valor << 8) | b;
    bits += 8;
    while (bits >= 5) {
      saida += ALFABETO_BASE32[(valor >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) saida += ALFABETO_BASE32[(valor << (5 - bits)) & 31];
  return saida;
}

export function base32Decode(texto: string): Buffer {
  const limpo = texto.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let valor = 0;
  const bytes: number[] = [];
  for (const c of limpo) {
    valor = (valor << 5) | ALFABETO_BASE32.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      bytes.push((valor >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function codigoTotp(segredoBase32: string, agoraMs = Date.now(), deslocamento = 0): string {
  const contador = Math.floor(agoraMs / 1000 / PASSO_S) + deslocamento;
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(contador));
  const hmac = createHmac("sha1", base32Decode(segredoBase32)).update(msg).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(bin % 10 ** DIGITOS).padStart(DIGITOS, "0");
}

/** Constant-time check of a 6-digit code against the current, previous and next step. */
export function verificarTotp(segredoBase32: string, codigo: string, agoraMs = Date.now()): boolean {
  const digitado = codigo.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(digitado)) return false;
  let ok = false;
  for (const d of [0, -1, 1]) {
    // Every candidate is compared so timing does not reveal which one matched.
    if (timingSafeEqual(Buffer.from(codigoTotp(segredoBase32, agoraMs, d)), Buffer.from(digitado))) ok = true;
  }
  return ok;
}

/** Seconds left in the current 30 s step (for the operator's test script). */
export function segundosRestantes(agoraMs = Date.now()): number {
  return PASSO_S - (Math.floor(agoraMs / 1000) % PASSO_S);
}

export function uriOtpauth(segredoBase32: string, conta: string, emissor: string): string {
  const rotulo = encodeURIComponent(`${emissor}:${conta}`);
  return `otpauth://totp/${rotulo}?secret=${segredoBase32}&issuer=${encodeURIComponent(emissor)}&algorithm=SHA1&digits=${DIGITOS}&period=${PASSO_S}`;
}
