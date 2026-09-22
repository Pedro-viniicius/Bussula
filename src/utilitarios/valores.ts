/**
 * Como uma resposta vira texto na tela.
 *
 * A mesma resposta aparece na lista, no detalhe do formulário e na visão
 * geral; formatar num lugar só evita que "Sim" num canto vire "true" no outro.
 */
import { MAIOR_NOTA_DA_AVALIACAO, type Pergunta, type ValorDaResposta } from "@/dominio/formularios/perguntas";

export function formatarValor(pergunta: Pergunta, valor: ValorDaResposta): string | null {
  if (valor === null || valor === undefined) return null;

  switch (pergunta.tipo) {
    case "sim_nao":
      return valor ? "Sim" : "Não";

    case "avaliacao":
      return typeof valor === "number" ? `${valor} de ${MAIOR_NOTA_DA_AVALIACAO}` : null;

    case "escala": {
      if (typeof valor !== "number") return null;
      const escala = pergunta.escala;
      if (!escala) return String(valor);
      const extremo =
        valor === escala.minimo ? escala.rotuloMinimo : valor === escala.maximo ? escala.rotuloMaximo : null;
      return extremo ? `${valor} — ${extremo}` : `${valor} de ${escala.maximo}`;
    }

    case "multipla_escolha":
      return Array.isArray(valor) && valor.length ? valor.join(", ") : null;

    default:
      return typeof valor === "string" && valor.trim() ? valor : null;
  }
}
