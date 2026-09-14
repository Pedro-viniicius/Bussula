/**
 * Domain constants shared by client and server.
 * Kept free of any drizzle import so the client bundle never pulls the ORM.
 */
export const ORIGENS = ["nfc", "qr", "manual", "direto"] as const;
export type Origem = (typeof ORIGENS)[number];

export const FINALIDADES = ["contato_comercial", "promocao", "marketing"] as const;
export type Finalidade = (typeof FINALIDADES)[number];
