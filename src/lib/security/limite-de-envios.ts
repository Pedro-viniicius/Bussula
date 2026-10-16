/**
 * Limite de envios por IP (D8). Parte pura: leitura das variáveis e decisão.
 * A contagem (`contarPorIp`) vem do repositório de respostas.
 *
 * Padrões: 20 por minuto e 200 por hora. Um Wi-Fi de loja divide o mesmo IP
 * entre muitos clientes, então o teto não pode ser baixo.
 */
export const LIMITE_POR_MINUTO_PADRAO = 20;
export const LIMITE_POR_HORA_PADRAO = 200;

export type Janela = "minuto" | "hora";

export type LimitesDeEnvio = { porMinuto: number; porHora: number };
export type ContagemNaJanela = { total: number; maisAntigaEm: Date | null };
export type LimiteAtingido = { janela: Janela; total: number; maximo: number; tenteDeNovoEmSegundos: number };

const MS_DA_JANELA: Record<Janela, number> = { minuto: 60_000, hora: 3_600_000 };

function inteiroPositivo(valor: string | undefined, padrao: number): number {
  if (valor === undefined || !/^\s*\d+\s*$/.test(valor)) return padrao;
  const n = Number.parseInt(valor, 10);
  return Number.isSafeInteger(n) && n > 0 ? n : padrao;
}

/** Valor ausente, vazio, não numérico, zero ou negativo cai no padrão. */
export function lerLimitesDeEnvio(
  env: Record<string, string | undefined> = process.env,
): LimitesDeEnvio {
  return {
    porMinuto: inteiroPositivo(env.LIMITE_POR_MINUTO, LIMITE_POR_MINUTO_PADRAO),
    porHora: inteiroPositivo(env.LIMITE_POR_HORA, LIMITE_POR_HORA_PADRAO),
  };
}

/** Segundos até a contagem mais antiga sair da janela. Nunca menos que 1. */
export function tenteDeNovoEmSegundos(janela: Janela, maisAntigaEm: Date | null, agora: Date): number {
  const ms = MS_DA_JANELA[janela];
  if (!maisAntigaEm) return Math.ceil(ms / 1000);
  const liberaEm = maisAntigaEm.getTime() + ms;
  return Math.max(1, Math.ceil((liberaEm - agora.getTime()) / 1000));
}

/**
 * Devolve o limite estourado (o de espera maior, se forem os dois) ou null.
 * A espera usa a contagem mais antiga da janela: é exata quando o total é
 * igual ao máximo e uma estimativa curta se já passou dele.
 */
export function avaliarLimiteDeEnvio(
  contagem: Record<Janela, ContagemNaJanela>,
  limites: LimitesDeEnvio,
  agora: Date,
): LimiteAtingido | null {
  const maximos: Record<Janela, number> = { minuto: limites.porMinuto, hora: limites.porHora };
  let pior: LimiteAtingido | null = null;
  for (const janela of ["minuto", "hora"] as const) {
    const { total, maisAntigaEm } = contagem[janela];
    if (total < maximos[janela]) continue;
    const espera = tenteDeNovoEmSegundos(janela, maisAntigaEm, agora);
    if (!pior || espera > pior.tenteDeNovoEmSegundos) {
      pior = { janela, total, maximo: maximos[janela], tenteDeNovoEmSegundos: espera };
    }
  }
  return pior;
}
