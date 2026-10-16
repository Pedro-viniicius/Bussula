/**
 * Structured JSON logs to stdout (Vercel collects them).
 * Personal fields are scrubbed by key name at every depth so a careless
 * `log.info("lead", lead)` can never leak a name, phone or e-mail.
 */
const CHAVES_PESSOAIS = new Set(["nome", "telefone", "whatsapp", "email", "ip", "user_agent", "userAgent"]);

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

/**
 * O que é seguro registrar de um erro que passou perto de uma consulta.
 *
 * O drizzle embrulha a falha do driver em `DrizzleQueryError`, cuja `message`
 * traz o SQL e os `params:` (nome, telefone, cupom, código de indicação), e o
 * `stack` repete a mensagem. Por isso o log leva só o nome da classe e, se
 * houver, o `code` e a `constraint` do erro de baixo (`cause`). Nunca a
 * mensagem, nunca o stack.
 */
/**
 * `constructor.name` vira "e" depois da minificação; `name` sobrevive, mas só
 * informa quando alguém o definiu (o padrão "Error" não diz nada de novo).
 */
function nomeDoErro(erro: unknown): string {
  if (!(erro instanceof Error)) return typeof erro;
  return typeof erro.name === "string" && erro.name !== "" ? erro.name : "Error";
}

export function resumoDoErro(erro: unknown): { classe: string; codigo?: string; constraint?: string } {
  const classe = nomeDoErro(erro);
  const causa = erro instanceof Error ? (erro as { cause?: unknown }).cause : undefined;
  const dados = (typeof causa === "object" && causa !== null ? causa : erro) as { code?: unknown; constraint?: unknown };
  return {
    classe,
    ...(typeof dados?.code === "string" ? { codigo: dados.code } : {}),
    ...(typeof dados?.constraint === "string" ? { constraint: dados.constraint } : {}),
  };
}
