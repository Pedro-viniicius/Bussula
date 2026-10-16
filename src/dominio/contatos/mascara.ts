/**
 * Máscaras da lista de contatos: o bastante para reconhecer a linha, nunca o
 * bastante para contatar a pessoa. Funções puras. Não confundir com
 * `mascararTelefone` de `@/lib/validation/phone`, que é a máscara de digitação.
 */
const PONTO = "•";

/** "Marcos Antunes Silva" -> "Marcos A." */
export function ocultarNome(nome: string | null): string | null {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return null;
  if (partes.length === 1) return partes[0];
  return `${partes[0]} ${partes[1][0].toUpperCase()}.`;
}

/** "+5516912345632" -> "(16) 9••••-••32". Fora do padrão -> "••••". */
export function ocultarTelefone(e164: string): string {
  const d = e164.replace(/^\+55/, "").replace(/\D/g, "");
  if (d.length !== 11) return PONTO.repeat(4);
  return `(${d.slice(0, 2)}) ${d[2]}${PONTO.repeat(4)}-${PONTO.repeat(2)}${d.slice(9)}`;
}

/**
 * Link `https://wa.me/55…?text=…` a partir de um E.164 brasileiro.
 * Devolve null se o número não for `+55` + 10 ou 11 dígitos.
 */
export function montarLinkWhatsapp(e164: string, texto: string): string | null {
  if (!/^\+55\d{10,11}$/.test(e164)) return null;
  return `https://wa.me/${e164.slice(1)}?text=${encodeURIComponent(texto)}`;
}
