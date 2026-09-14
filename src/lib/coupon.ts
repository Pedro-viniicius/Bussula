/**
 * Coupons are generated on the client so the success screen never waits on
 * the server. Alphabet skips 0/O/1/I to survive being read aloud in a noisy
 * hall. 32^5 ≈ 33 million combinations; the server retries on collision.
 */
const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TAMANHO_SUFIXO = 5;

export function prefixoCupom(slug: string): string {
  return slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "EVENTO";
}

export function gerarCupom(slug: string): string {
  const bytes = new Uint8Array(TAMANHO_SUFIXO);
  crypto.getRandomValues(bytes);
  let sufixo = "";
  for (const b of bytes) sufixo += ALFABETO[b % ALFABETO.length];
  return `${prefixoCupom(slug)}-${sufixo}`;
}
