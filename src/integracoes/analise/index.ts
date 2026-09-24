/**
 * Onde se escolhe quem analisa os resultados.
 *
 * Como `src/repositorios/index.ts` faz com os dados, este é o único arquivo
 * que sabe que existem dois analistas. A tela e os serviços pedem "o
 * analista" e não perguntam qual veio.
 *
 * - Com ANALISE_IA_MODELO e uma credencial do gateway configurados: o
 *   analista com modelo de linguagem, que escreve sobre os fatos das regras.
 * - Sem isso, ou no modo de teste: o analista por regras, que não depende de
 *   serviço nenhum.
 */
import { analistaPorRegras } from "@/dominio/analise/analista-por-regras";
import type { AnalistaDeResultados } from "@/dominio/analise/tipos";
import { USAR_MOCKS } from "@/lib/mock/config";
import { criarAnalistaComModelo } from "./analista-com-modelo";
import { credencialDoGateway, criarChamadaAoGateway, modeloConfigurado, type Ambiente } from "./gateway-de-ia";

/**
 * Um analista por modelo configurado, criado uma vez só: é dentro dele que
 * ficam guardadas as análises já pedidas.
 */
const analistasPorModelo = new Map<string, AnalistaDeResultados>();

export function escolherAnalista(ambiente: Ambiente = process.env): AnalistaDeResultados {
  if (USAR_MOCKS) return analistaPorRegras;

  const modelo = modeloConfigurado(ambiente);
  if (!modelo || !credencialDoGateway(ambiente)) return analistaPorRegras;

  let analista = analistasPorModelo.get(modelo);
  if (!analista) {
    analista = criarAnalistaComModelo(criarChamadaAoGateway(modelo));
    analistasPorModelo.set(modelo, analista);
  }
  return analista;
}
