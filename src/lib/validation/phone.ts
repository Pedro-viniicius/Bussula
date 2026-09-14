/** Brazilian mobile numbers: mask for typing, E.164 for storage. */

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** Live mask: (00) 00000-0000 — never blocks typing, only formats. */
export function mascararTelefone(valor: string): string {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/**
 * A plausible Brazilian mobile: 2-digit DDD (11–99, no zero) + 9 + 8 digits.
 * Accepts an optional leading 55 so pasted E.164 numbers also work.
 */
export function normalizarTelefone(valor: string): string | null {
  let d = somenteDigitos(valor);
  if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
  if (d.length !== 11) return null;
  const ddd = Number(d.slice(0, 2));
  if (ddd < 11 || d[1] === "0") return null;
  if (d[2] !== "9") return null;
  // 9 followed by eight identical digits is a keyboard mash, not a number.
  if (/^(\d)\1{7}$/.test(d.slice(3))) return null;
  return `+55${d}`;
}

export function telefoneValido(valor: string): boolean {
  return normalizarTelefone(valor) !== null;
}

/** +5531999998888 -> (31) 99999-8888, for display. */
export function formatarE164(e164: string): string {
  return mascararTelefone(e164.replace(/^\+55/, ""));
}
