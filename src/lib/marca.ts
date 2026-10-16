/**
 * Empresa controladora dos dados pessoais (LGPD). Deve ser preenchida pelo
 * dono antes de publicar formulários que coletam contato; vazio trava a
 * abertura desses formulários em produção (`situacaoDoControlador`).
 */
export const CONTROLADOR: {
  razaoSocial: string;
  cnpj: string;
  endereco: string;
  emailPrivacidade: string;
} = {
  razaoSocial: "",
  cnpj: "",
  endereco: "",
  emailPrivacidade: "",
};

/**
 * Identidade da instalação.
 *
 * A tecnologia de captura continua reutilizável, mas toda experiência visível
 * parte deste objeto. Para personalizar a próxima empresa, este é o primeiro
 * arquivo a alterar; cores ficam nos tokens de `app/globals.css`.
 */
export const MARCA = {
  nome: "Essencial Fit",
  nomeCurto: "Essencial",
  assinatura: "Saúde, performance e escolhas mais conscientes.",
  descricao:
    "Experiências rápidas por NFC e QR Code que ajudam a Essencial Fit a ouvir melhor seus clientes e tomar decisões com dados.",
  unidade: "Loja Centro · Lavras, MG",
  /** O único canal do titular (LGPD): vem do controlador. Vazio até o dono preencher; quem usa precisa tratar o vazio. */
  contatoPrivacidade: CONTROLADOR.emailPrivacidade,
  tecnologia: "Experiência inteligente por NFC + QR Code",
} as const;
