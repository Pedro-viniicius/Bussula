/** Shape returned by POST /api/f/[slug]/leads. Shared by client and server. */
export type ResultadoEnvio =
  | { ok: true; cupom: string; enfileirado?: boolean }
  | {
      ok: false;
      erro: string;
      /** Machine-readable reason; the offline queue retries only `limitado`. */
      motivo: "invalido" | "encerrado" | "duplicado" | "limitado" | "falha";
      campo?: "nome" | "telefone" | "email" | "consentimentos";
      /** Set when the phone is already registered: the person's existing coupon. */
      cupom?: string | null;
    };
