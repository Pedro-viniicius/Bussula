/**
 * Masks for the lead list: enough to recognise a row, never enough to
 * contact the person. Pure functions, no I/O.
 */
const PONTO = "•";

/** "Marcos Antunes Silva" → "Marcos A." */
export function mascararNome(nome: string): string {
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[1][0].toUpperCase()}.`;
}

/** "+5516912345632" → "(16) 9••••-••32" */
export function mascararTelefone(e164: string): string {
  const d = e164.replace(/^\+55/, "").replace(/\D/g, "");
  if (d.length !== 11) return PONTO.repeat(4);
  return `(${d.slice(0, 2)}) ${d[2]}${PONTO.repeat(4)}-${PONTO.repeat(2)}${d.slice(9)}`;
}

/** "marcos.antunes@gmail.com" → "m•••@gmail.com" */
export function mascararEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, dominio] = email.split("@");
  if (!dominio) return PONTO.repeat(3);
  return `${local[0]}${PONTO.repeat(3)}@${dominio}`;
}
