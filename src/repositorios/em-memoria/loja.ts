/**
 * O depósito do modo de teste: três listas na memória do servidor.
 *
 * Guardado no globalThis para o recarregamento automático do `next dev` não
 * apagar, a cada arquivo salvo, o que foi criado durante o teste. Ao reiniciar
 * o servidor tudo volta ao estado inicial — é um ambiente de conferência, não
 * um banco de dados.
 */
import { log } from "@/lib/logger";
import { gerarDadosIniciais, type DadosIniciais } from "./dados-iniciais";

const globalParaLoja = globalThis as unknown as { lojaEmMemoria?: DadosIniciais };

export function loja(): DadosIniciais {
  if (!globalParaLoja.lojaEmMemoria) {
    globalParaLoja.lojaEmMemoria = gerarDadosIniciais();
    log.info("modo de teste: formulários e respostas fictícios em memória", {
      formularios: globalParaLoja.lojaEmMemoria.formularios.length,
      respostas: globalParaLoja.lojaEmMemoria.respostas.length,
    });
  }
  return globalParaLoja.lojaEmMemoria;
}
