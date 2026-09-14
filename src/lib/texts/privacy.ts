/**
 * Consent texts, versioned.
 *
 * `POLITICA_VERSAO` is stored on every consent row (texto_versao). Any change
 * to the wording below MUST bump the version: it is the legal proof of what
 * the person actually agreed to, not merely that they clicked.
 */
export const POLITICA_VERSAO = "2026-09-19.v1";

export const CONSENTIMENTOS = {
  contato_comercial: {
    rotulo:
      "Autorizo o contato da concessionária por WhatsApp, telefone ou e-mail sobre o veículo do meu interesse.",
    obrigatorio: true,
  },
  promocao: {
    rotulo:
      "Quero participar do sorteio do evento e aceito o regulamento da promoção.",
    obrigatorio: false,
  },
  marketing: {
    rotulo:
      "Aceito receber novidades, ofertas e convites da concessionária.",
    obrigatorio: false,
  },
} as const;
