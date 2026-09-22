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

/**
 * O que a rota de envio responde ao navegador — o contrato entre os dois
 * lados.
 *
 * Falha prevista (pergunta em branco, formulário fora do ar, envio repetido)
 * vem com status 200 e `ok: false`: são coisas para a tela mostrar, nunca
 * para a fila tentar de novo. Só uma falha real de servidor responde 5xx, e é
 * nisso que a fila offline se apoia para decidir o que guardar.
 */
export type ResultadoDoEnvio =
  | { ok: true; jaEstavaRegistrada: boolean }
  | {
      ok: false;
      erro: string;
      mensagem: string;
      /** Erro por pergunta, quando a recusa foi de validação. */
      porPergunta?: Record<string, string>;
    };
