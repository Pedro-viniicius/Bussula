/**
 * Structured JSON logs to stdout (Vercel collects them).
 * Personal fields are scrubbed by key name at every depth so a careless
 * `log.info("lead", lead)` can never leak a name, phone or e-mail.
 */
const CHAVES_PESSOAIS = new Set(["nome", "telefone", "email", "ip", "user_agent", "userAgent"]);

function scrub(valor: unknown, profundidade = 0): unknown {
  if (profundidade > 6 || valor === null || typeof valor !== "object") return valor;
  if (Array.isArray(valor)) return valor.map((v) => scrub(v, profundidade + 1));
  const saida: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(valor as Record<string, unknown>)) {
    saida[k] = CHAVES_PESSOAIS.has(k) ? "[redacted]" : scrub(v, profundidade + 1);
  }
  return saida;
}

type Nivel = "info" | "warn" | "error";

function emitir(nivel: Nivel, msg: string, dados?: Record<string, unknown>) {
  const linha = JSON.stringify({
    nivel,
    msg,
    ...(dados ? (scrub(dados) as Record<string, unknown>) : {}),
    ts: new Date().toISOString(),
  });
  if (nivel === "error") console.error(linha);
  else if (nivel === "warn") console.warn(linha);
  else console.log(linha);
}

export const log = {
  info: (msg: string, dados?: Record<string, unknown>) => emitir("info", msg, dados),
  warn: (msg: string, dados?: Record<string, unknown>) => emitir("warn", msg, dados),
  error: (msg: string, dados?: Record<string, unknown>) => emitir("error", msg, dados),
};
