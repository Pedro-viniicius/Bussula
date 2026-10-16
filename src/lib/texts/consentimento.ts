import { createHash } from "node:crypto";

/**
 * Textos de consentimento, versionados (D5).
 *
 * ATENÇÃO, TEXTO PROVISÓRIO: a redação final depende de revisão do advogado.
 *
 * A versão gravada em cada aceite é a prova do que a pessoa leu. Por isso:
 * - NUNCA edite o texto de uma versão que já existe; crie uma versão nova
 *   em `TEXTOS_POR_VERSAO` e aponte `VERSAO_ATUAL` para ela;
 * - NUNCA apague versões antigas: uma página guardada offline pode enviar
 *   uma versão anterior.
 * O teste `consentimento.test.ts` guarda o hash de cada versão e quebra se
 * o texto mudar sem versão nova.
 */
export const FINALIDADES_DE_CONSENTIMENTO = ["recompra", "ofertas"] as const;
export type FinalidadeDeConsentimento = (typeof FINALIDADES_DE_CONSENTIMENTO)[number];

export const VERSAO_ATUAL = "2026-10-15.v1";

export const TEXTOS_POR_VERSAO: Record<string, Partial<Record<FinalidadeDeConsentimento, string>>> = {
  "2026-10-15.v1": {
    recompra: "Mensagens no WhatsApp sobre reposição dos produtos que comprei.",
    ofertas: "Ofertas e novidades da loja no WhatsApp.",
  },
};

/** Nenhuma finalidade é obrigatória (decisão do dono). */
export const FINALIDADE_OBRIGATORIA: Record<FinalidadeDeConsentimento, boolean> = {
  recompra: false,
  ofertas: false,
};

export function versaoConhecida(versao: string): boolean {
  return Object.hasOwn(TEXTOS_POR_VERSAO, versao);
}

export function textoDaFinalidade(versao: string, finalidade: FinalidadeDeConsentimento): string | null {
  if (!versaoConhecida(versao)) return null;
  return TEXTOS_POR_VERSAO[versao][finalidade] ?? null;
}

/** SHA-256 estável dos textos de uma versão (finalidades em ordem fixa). */
export function hashDaVersao(versao: string): string | null {
  if (!versaoConhecida(versao)) return null;
  const textos = TEXTOS_POR_VERSAO[versao];
  const corpo = FINALIDADES_DE_CONSENTIMENTO.map((f) => `${f}=${textos[f] ?? ""}`).join("\n");
  return createHash("sha256").update(corpo).digest("hex");
}
