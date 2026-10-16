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
  | {
      ok: true;
      jaEstavaRegistrada: boolean;
      /**
       * A rota sempre envia o objeto (com os dois campos nulos quando nada foi
       * rendido). Ausente ou nulo vale como nenhum benefício: itens antigos da fila.
       */
      beneficios?: BeneficiosDoEnvio | null;
    }
  | {
      ok: false;
      erro: string;
      mensagem: string;
      /** Erro por pergunta, quando a recusa foi de validação. */
      porPergunta?: Record<string, string>;
      /** No limite por IP (HTTP 429): quanto esperar antes de tentar de novo. */
      tenteDeNovoEmSegundos?: number;
    };

/**
 * O que o envio rendeu à pessoa. O código do cupom sai UMA vez, em `emitido`:
 * nunca em `ja_emitido` nem quando a mesma chave é reenviada.
 */
export type BeneficiosDoEnvio = {
  cupom:
    | {
        status: "emitido";
        codigo: string;
        textoDoBrinde: string | null;
        /** Data `AAAA-MM-DD` no fuso da loja. */
        validoAte: string;
      }
    /** Sem código e sem validade, sempre. */
    | { status: "ja_emitido" }
    | { status: "falhou" }
    /** Módulo desligado, ou a pessoa pulou o WhatsApp. */
    | null;
  indicacao: { codigo: string; slugDestino: string } | null;
};
