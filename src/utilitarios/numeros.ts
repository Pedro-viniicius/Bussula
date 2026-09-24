/**
 * Números do jeito que se leem em voz alta: "62%", "62% (18 de 29)", "4,2".
 *
 * Um lugar só para a formatação, porque a mesma proporção aparece na tela de
 * resultados e dentro das frases da análise — e "62%" num canto não pode
 * virar "0.62" no outro.
 */
const PORCENTAGEM = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const UMA_CASA = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const INTEIRO = new Intl.NumberFormat("pt-BR");

/** Quanto `parte` representa de `total`, de 0 a 1. Com total zero devolve 0, nunca uma divisão por zero. */
export function fracaoDe(parte: number, total: number): number {
  if (total === 0) return 0;
  return parte / total;
}

/** 0,62 → "62%" */
export function formatarPorcentagem(fracao: number): string {
  return PORCENTAGEM.format(fracao);
}

/**
 * "62% (18 de 29)" — a porcentagem com os números crus ao lado, para ninguém
 * precisar confiar só na porcentagem quando a amostra é pequena.
 */
export function formatarProporcao(parte: number, total: number): string {
  return `${formatarPorcentagem(fracaoDe(parte, total))} (${parte} de ${total})`;
}

/** 4.25 → "4,3" */
export function formatarComUmaCasa(valor: number): string {
  return UMA_CASA.format(valor);
}

/** 1284 → "1.284" */
export function formatarInteiro(valor: number): string {
  return INTEIRO.format(valor);
}
