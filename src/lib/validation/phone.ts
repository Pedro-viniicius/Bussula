/** Brazilian mobile numbers: mask for typing, E.164 for storage. */

export function somenteDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

/**
 * Tira o código do país (55) de um número colado com 13 dígitos (55 + 11).
 * Com 11 dígitos o 55 é o DDD do Rio Grande do Sul e fica; com 12, é um dígito
 * a mais digitado por engano, e a máscara apenas o ignora.
 */
function semCodigoDoPais(digitos: string): string {
  return digitos.length === 13 && digitos.startsWith("55") ? digitos.slice(2) : digitos;
}

/** Live mask: (00) 00000-0000 — never blocks typing, only formats. */
export function mascararTelefone(valor: string): string {
  const d = semCodigoDoPais(somenteDigitos(valor)).slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Por que um número não serve; cada motivo tem a sua mensagem em `FORMULARIO_PUBLICO.whatsapp.erros`. */
export type MotivoDoTelefoneInvalido = "vazio" | "incompleto" | "ddd" | "naoCelular" | "repetido";

/**
 * Nulo quando o número serve. A ordem dos testes é a ordem em que a pessoa
 * corrige: primeiro falta de dígitos, depois DDD, celular e teclado batido.
 * Dígitos a mais também são "incompleto": a mensagem manda conferir o número.
 */
export function motivoTelefoneInvalido(valor: string): MotivoDoTelefoneInvalido | null {
  const bruto = somenteDigitos(valor);
  if (bruto.length === 0) return "vazio";
  const d = semCodigoDoPais(bruto);
  if (d.length !== 11) return "incompleto";
  if (Number(d.slice(0, 2)) < 11 || d[1] === "0") return "ddd";
  if (d[2] !== "9") return "naoCelular";
  // 9 followed by eight identical digits is a keyboard mash, not a number.
  if (/^(\d)\1{7}$/.test(d.slice(3))) return "repetido";
  return null;
}

/**
 * A plausible Brazilian mobile: 2-digit DDD (11–99, no zero) + 9 + 8 digits.
 * Accepts a leading 55 (with or without "+") so pasted E.164 numbers also work.
 */
export function normalizarTelefone(valor: string): string | null {
  if (motivoTelefoneInvalido(valor) !== null) return null;
  return `+55${semCodigoDoPais(somenteDigitos(valor))}`;
}

export function telefoneValido(valor: string): boolean {
  return normalizarTelefone(valor) !== null;
}

/** +5531999998888 -> (31) 99999-8888, for display. */
export function formatarE164(e164: string): string {
  return mascararTelefone(e164.replace(/^\+55/, ""));
}
