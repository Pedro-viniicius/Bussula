/**
 * Interruptor único do modo de teste.
 *
 * Ligado, o projeto sobe sem .env e sem depender de serviço externo nenhum:
 * banco, sessão do admin e gravações passam a ser atendidos em memória por
 * `src/lib/mock/loja.ts`. O código de integração real continua exatamente
 * onde estava — só é desviado enquanto esta flag estiver ligada.
 *
 * Para voltar aos serviços reais: troque PADRAO para false (ou exporte
 * USAR_MOCKS=false) e preencha o .env.local. Ver MOCKS.md.
 */

/** ↓↓↓ É AQUI QUE SE LIGA E DESLIGA O MODO DE TESTE ↓↓↓ */
const PADRAO = true;

function ligado(valor: string): boolean {
  return valor !== "false" && valor !== "0" && valor !== "off";
}

/** Variáveis de ambiente lidas para decidir o modo de teste. */
export type AmbienteMocks = Record<string, string | undefined>;

/**
 * Decide se o modo de teste fica ligado. Pura: recebe o ambiente e não lê
 * `process.env` por conta própria.
 *
 * - `VERCEL_ENV=production`: sempre false. Se USAR_MOCKS vier ligado, registra
 *   erro (o build também recusa, ver scripts/vercel-build.sh).
 * - USAR_MOCKS definido: manda mais que o padrão.
 * - Sem variável: vale PADRAO, exceto em qualquer deploy na Vercel (preview),
 *   onde os mocks ficam desligados para um deploy distraído nunca abrir o
 *   /admin sem senha, e com NODE_ENV=production fora da Vercel (`next start`
 *   em servidor próprio), onde só um USAR_MOCKS explícito liga os mocks.
 */
export function resolverUsarMocks(env: AmbienteMocks): boolean {
  const escolha = env.USAR_MOCKS;
  const definida = escolha !== undefined && escolha !== "";

  if (env.VERCEL_ENV === "production") {
    if (definida && ligado(escolha)) {
      console.error(
        "USAR_MOCKS está ligado em produção (VERCEL_ENV=production): ignorado, os mocks ficam desligados.",
      );
    }
    return false;
  }

  if (definida) return ligado(escolha);
  return PADRAO && !env.VERCEL && env.NODE_ENV !== "production";
}

/** Vale em `dev`, `build` e `start`; ver `resolverUsarMocks`. */
export const USAR_MOCKS = resolverUsarMocks(process.env);

/**
 * O mínimo que o app exige para subir. Não são segredos: são marcadores de
 * desenvolvimento, usados só com o modo de teste ligado. Com a flag desligada
 * nada aqui é lido e tudo volta a vir do .env.
 */
const PADROES: Record<string, string> = {
  IP_HASH_SALT: "modo-de-teste-sem-segredo-0000000000000000000000",
  SESSION_SECRET: "modo-de-teste-sem-segredo-0000000000000000000000",
  ADMIN_PASSWORD: "modo-de-teste-sem-senha-real",
  ADMIN_TOTP_SECRET: "MODODETESTE234567MODODETESTE",
};

let aplicado = false;

/**
 * Preenche o que falta em process.env. Nunca sobrescreve o que já existe, então
 * um .env.local parcial continua mandando naquilo que ele definiu.
 */
export function aplicarAmbienteDeTeste(): void {
  if (!USAR_MOCKS || aplicado) return;
  aplicado = true;
  for (const [chave, valor] of Object.entries(PADROES)) {
    if (!process.env[chave]) process.env[chave] = valor;
  }
}

aplicarAmbienteDeTeste();
