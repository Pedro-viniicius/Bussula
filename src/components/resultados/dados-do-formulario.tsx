import { SerieDeRespostas } from "@/components/dashboard/serie-de-respostas";
import { Cartao, EstadoVazio, Metrica } from "@/components/interface/primitivos";
import { MetricaDeTempo } from "@/components/interface/tempo";
import type { ResultadosDoFormulario } from "@/dominio/resultados/tipos";
import { calcularVariacao } from "@/dominio/resultados/variacao";
import { A } from "@/lib/texts/admin";
import { formatarInteiro } from "@/utilitarios/numeros";
import { BarrasDeContagem, Distribuicao } from "./distribuicao";

/**
 * A parte "Dados" dos resultados: só o que foi contado nas respostas.
 *
 * Nada aqui é interpretação. A ordem vai do geral ao detalhe — quanto chegou,
 * como chegou ao longo dos dias, por onde chegou e, por fim, o que cada
 * pergunta recebeu.
 */
export function DadosDoFormulario({ resultados }: { resultados: ResultadosDoFormulario }) {
  const R = A.resultados;
  const { resumo, diasDoPeriodo } = resultados;

  if (resumo.totalDeRespostas === 0) {
    return <EstadoVazio titulo={R.dados.semRespostas.titulo} descricao={R.dados.semRespostas.descricao} />;
  }

  const variacao = calcularVariacao(resumo.respostasNoPeriodo, resumo.respostasNoPeriodoAnterior);
  const canais = resultados.origens.map((origem) => ({ rotulo: origem.rotulo, total: origem.total }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Metrica valor={formatarInteiro(resumo.totalDeRespostas)} rotulo={R.dados.total} />
        <Metrica
          destaque
          valor={formatarInteiro(resumo.respostasNoPeriodo)}
          rotulo={R.dados.noPeriodo(diasDoPeriodo)}
          contexto={A.comparacao.variacao(variacao, resumo.respostasNoPeriodoAnterior, diasDoPeriodo)}
        />
        <Metrica valor={formatarInteiro(resumo.respostasHoje)} rotulo={R.dados.hoje} />
        <MetricaDeTempo quando={resumo.ultimaRespostaEm} rotulo={R.dados.ultima} vazio={R.dados.ultimaVazio} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Cartao
          nivel={3}
          titulo={R.evolucao.titulo}
          descricao={R.evolucao.descricao(diasDoPeriodo)}
          className="lg:col-span-2"
        >
          <SerieDeRespostas serie={resultados.serie} />
        </Cartao>
        <Cartao nivel={3} titulo={R.origens.titulo} descricao={R.origens.descricao}>
          <BarrasDeContagem opcoes={canais} total={resumo.totalDeRespostas} />
        </Cartao>
      </div>

      <section aria-labelledby="por-pergunta-titulo">
        <h3 id="por-pergunta-titulo" className="text-lg font-semibold tracking-tight">
          {R.porPergunta.titulo}
        </h3>
        <p className="mt-0.5 text-sm text-muted-foreground">{R.porPergunta.descricao}</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {resultados.distribuicoes.map((distribuicao) => (
            <Cartao key={distribuicao.perguntaId} nivel={4} titulo={distribuicao.enunciado}>
              <Distribuicao distribuicao={distribuicao} />
            </Cartao>
          ))}
        </div>
      </section>
    </div>
  );
}
