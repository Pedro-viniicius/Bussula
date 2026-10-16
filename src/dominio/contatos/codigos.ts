import { randomInt } from "node:crypto";

/**
 * Códigos de cupom e de indicação. Gerados só no servidor.
 *
 * O alfabeto não tem 0, O, 1, I nem L, para sobreviver a ser ditado no balcão
 * ou lido num cartão impresso (spec §3). 31 símbolos.
 */
export const ALFABETO_DOS_CODIGOS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export const PREFIXO_PADRAO_DO_CUPOM = "ESS";
export const TAMANHO_DO_CODIGO_DE_INDICACAO = 8;

const PREFIXO = /^[A-Z0-9]{2,6}$/;
const CUPOM = /^([A-Z0-9]{2,6})-([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4})-([ABCDEFGHJKMNPQRSTUVWXYZ23456789]{2})$/;
const INDICACAO = new RegExp(`^[${ALFABETO_DOS_CODIGOS}]{${TAMANHO_DO_CODIGO_DE_INDICACAO}}$`);

function sorteio(tamanho: number): string {
  let texto = "";
  for (let i = 0; i < tamanho; i++) texto += ALFABETO_DOS_CODIGOS[randomInt(ALFABETO_DOS_CODIGOS.length)];
  return texto;
}

/** Prefixo do cupom: A-Z e 0-9, de 2 a 6 caracteres. */
export function prefixoDeCupomValido(prefixo: string): boolean {
  return PREFIXO.test(prefixo);
}

/** `PREFIXO-XXXX-XX`. Prefixo inválido cai no padrão `ESS`. */
export function gerarCodigoDoCupom(prefixo: string = PREFIXO_PADRAO_DO_CUPOM): string {
  const p = prefixoDeCupomValido(prefixo) ? prefixo : PREFIXO_PADRAO_DO_CUPOM;
  return `${p}-${sorteio(4)}-${sorteio(2)}`;
}

export function cupomComFormatoValido(codigo: string): boolean {
  return CUPOM.test(codigo);
}

/** Código opaco de 8 caracteres do mesmo alfabeto, usado em `?ref=`. */
export function gerarCodigoDeIndicacao(): string {
  return sorteio(TAMANHO_DO_CODIGO_DE_INDICACAO);
}

/** Confere só o formato; o servidor ignora sem aviso o que não casar. */
export function codigoDeIndicacaoValido(codigo: string): boolean {
  return INDICACAO.test(codigo);
}
