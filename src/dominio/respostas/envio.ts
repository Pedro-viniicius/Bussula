/**
 * Em que pé está o envio de uma resposta.
 *
 * Um estado só, em vez de meia dúzia de booleanos (`enviando`, `enviou`,
 * `falhou`, `tentandoDeNovo`): estados impossíveis deixam de existir e a tela
 * tem sempre exatamente uma coisa para mostrar.
 */
export const ESTADOS_DO_ENVIO = ["PREENCHENDO", "ENVIANDO", "ENVIADO", "ERRO"] as const;

export type EstadoDoEnvio = (typeof ESTADOS_DO_ENVIO)[number];

/** Só faz sentido tentar enviar quando não há envio em andamento. */
export function podeEnviar(estado: EstadoDoEnvio): boolean {
  return estado === "PREENCHENDO" || estado === "ERRO";
}
