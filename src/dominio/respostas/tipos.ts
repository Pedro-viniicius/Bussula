/**
 * O que é uma resposta de cliente.
 *
 * `valores` guarda o que foi respondido, indexado pelo id da pergunta. Guardar
 * por id (e não pelo enunciado) é o que permite renomear uma pergunta sem
 * perder o sentido das respostas já recebidas.
 */
import type { ValorDaResposta } from "@/dominio/formularios/perguntas";

/** Como a pessoa chegou ao formulário. Vem da URL (`?o=`), nunca do palpite. */
export const ORIGENS_DA_RESPOSTA = ["nfc", "qr", "link"] as const;
export type OrigemDaResposta = (typeof ORIGENS_DA_RESPOSTA)[number];

export const ROTULO_DA_ORIGEM: Record<OrigemDaResposta, string> = {
  nfc: "Cartão NFC",
  qr: "QR Code",
  link: "Link direto",
};

export function origemValida(valor: string | null | undefined): OrigemDaResposta {
  return ORIGENS_DA_RESPOSTA.includes(valor as OrigemDaResposta) ? (valor as OrigemDaResposta) : "link";
}

export type Resposta = {
  id: string;
  formularioId: string;
  /** Em qual versão do formulário esta resposta foi dada. */
  versaoFormulario: number;
  valores: Record<string, ValorDaResposta>;
  origem: OrigemDaResposta;
  criadoEm: Date;
};

/** Uma resposta pronta para ser gravada, ainda sem id nem data do servidor. */
export type RespostaParaGravar = {
  formularioId: string;
  versaoFormulario: number;
  /** Gerada pelo navegador. Reenviar a mesma chave não cria uma segunda resposta. */
  chaveEnvio: string;
  valores: Record<string, ValorDaResposta>;
  origem: OrigemDaResposta;
};
