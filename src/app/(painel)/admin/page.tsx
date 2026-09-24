import Link from "next/link";
import { Cartao, Container, EstadoVazio, Metrica, Secao } from "@/components/interface/primitivos";
import { MetricaDeTempo, Quando } from "@/components/interface/tempo";
import { Situacao } from "@/components/interface/situacao";
import { RespostaRecebida } from "@/components/dashboard/resposta-recebida";
import { SerieDeRespostas } from "@/components/dashboard/serie-de-respostas";
import { Sinais } from "@/components/dashboard/sinais";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { DIAS_PERIODO_PADRAO, RESPOSTAS_RECENTES_NA_VISAO_GERAL } from "@/dominio/constantes";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import { calcularVariacao } from "@/dominio/resultados/variacao";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { carregarResumoDoDashboard, carregarSerieDeRespostas, detectarSinais } from "@/servicos/dashboard";
import { listarFormularios } from "@/servicos/formularios";
import { buscarRespostasRecentes, comPerguntas } from "@/servicos/respostas";
import { formatarInteiro } from "@/utilitarios/numeros";

export const dynamic = "force-dynamic";

/** Quantos formulários a visão geral lista antes do "Ver todos". */
const FORMULARIOS_NA_VISAO_GERAL = 4;

/**
 * Visão Geral: a primeira tela depois de entrar.
 *
 * Responde às perguntas de quem abre o painel:
 *
 *   quanto já foi coletado?            → os números da coleta
 *   tem gente respondendo agora?       → hoje, a última resposta e o ritmo dos dias
 *   quais formulários estão no ar?     → os formulários
 *   alguma coisa merece atenção?       → os sinais
 *
 * Os sinais vêm logo depois dos números, e não no fim: quando algo pede
 * atenção, isso não pode depender de rolar a página. Todo número sai das
 * respostas gravadas; não há nenhum valor de exemplo.
 */
export default async function VisaoGeralPage() {
  await exigirAdmin("/admin");

  const [resumo, formularios, serie, recentes] = await Promise.all([
    carregarResumoDoDashboard(),
    listarFormularios(),
    carregarSerieDeRespostas(),
    buscarRespostasRecentes(RESPOSTAS_RECENTES_NA_VISAO_GERAL),
  ]);

  const respostasDetalhadas = await comPerguntas(recentes);
  const sinais = detectarSinais(formularios, new Date(), {
    respostasNoPeriodo: resumo.respostasNoPeriodo,
    respostasNoPeriodoAnterior: resumo.respostasNoPeriodoAnterior,
    dias: DIAS_PERIODO_PADRAO,
  });
  const variacao = calcularVariacao(resumo.respostasNoPeriodo, resumo.respostasNoPeriodoAnterior);
  const V = A.visaoGeral;

  if (formularios.length === 0) {
    return (
      <>
        <TopoAdmin atual="visao-geral" />
        <main id="conteudo" className="flex-1 py-10">
          <Container className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{V.titulo}</h1>
            <div className="mt-8">
              <EstadoVazio titulo={V.vazio.titulo} descricao={V.vazio.descricao} />
            </div>
          </Container>
        </main>
      </>
    );
  }

  return (
    <>
      <TopoAdmin atual="visao-geral" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="space-y-8 sm:space-y-10">
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{V.titulo}</h1>
            <p className="mt-1 text-muted-foreground">{V.subtitulo}</p>
          </header>

          <Secao id="indicadores" titulo={V.indicadores.titulo}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Metrica
                valor={formatarInteiro(resumo.totalDeRespostas)}
                rotulo={V.indicadores.total}
                contexto={
                  resumo.formularioMaisRespondido
                    ? V.indicadores.maisRespondido(
                        resumo.formularioMaisRespondido.nome,
                        resumo.formularioMaisRespondido.total,
                      )
                    : undefined
                }
              />
              <Metrica
                destaque
                valor={formatarInteiro(resumo.respostasHoje)}
                rotulo={V.indicadores.hoje}
                contexto={V.indicadores.hojeContexto(resumo.respostasNoPeriodo, DIAS_PERIODO_PADRAO)}
              />
              <Metrica
                valor={formatarInteiro(resumo.formulariosAtivos)}
                rotulo={V.indicadores.ativos}
                contexto={V.indicadores.ativosContexto(formularios.length)}
              />
              <MetricaDeTempo
                quando={resumo.ultimaRespostaEm}
                rotulo={V.indicadores.ultima}
                vazio={V.indicadores.ultimaVazio}
              />
            </div>
          </Secao>

          <Secao id="sinais" titulo={V.sinais.titulo} descricao={V.sinais.descricao}>
            <Sinais sinais={sinais} />
          </Secao>

          <Secao id="serie" titulo={V.serie.titulo} descricao={V.serie.descricao(DIAS_PERIODO_PADRAO)}>
            <Cartao nivel={3}>
              <SerieDeRespostas serie={serie} />
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {A.comparacao.noPeriodo(resumo.respostasNoPeriodo, DIAS_PERIODO_PADRAO)}
                </span>
                {" · "}
                {A.comparacao.variacao(variacao, resumo.respostasNoPeriodoAnterior, DIAS_PERIODO_PADRAO)}
              </p>
            </Cartao>
          </Secao>

          <Secao
            id="formularios"
            titulo={V.formularios.titulo}
            acao={{ href: "/admin/formularios", rotulo: V.formularios.verTodos }}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {formularios.slice(0, FORMULARIOS_NA_VISAO_GERAL).map((formulario) => (
                <ResumoDoFormulario key={formulario.id} formulario={formulario} />
              ))}
            </ul>
          </Secao>

          <Secao
            id="recentes"
            titulo={V.respostasRecentes.titulo}
            acao={{ href: "/admin/resultados", rotulo: V.respostasRecentes.verResultados }}
          >
            {respostasDetalhadas.length === 0 ? (
              <EstadoVazio titulo={V.semRespostas.titulo} descricao={V.semRespostas.descricao} />
            ) : (
              <ul className="space-y-3">
                {respostasDetalhadas.map(({ resposta, perguntas, nomeDoFormulario }) => (
                  <RespostaRecebida
                    key={resposta.id}
                    resposta={resposta}
                    perguntas={perguntas}
                    nomeDoFormulario={nomeDoFormulario}
                    href={`/admin/resultados?formulario=${encodeURIComponent(resposta.formularioId)}`}
                  />
                ))}
              </ul>
            )}
          </Secao>
        </Container>
      </main>
    </>
  );
}

/** Um formulário em uma linha: nome, situação, quantas respostas e quando chegou a última. */
function ResumoDoFormulario({ formulario }: { formulario: FormularioNaLista }) {
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <Link
          href={`/admin/resultados?formulario=${encodeURIComponent(formulario.id)}`}
          className="font-semibold underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {formulario.nome}
        </Link>
        <Situacao situacao={formulario.situacao} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {formulario.totalDeRespostas > 0
          ? A.formularios.respostas(formulario.totalDeRespostas)
          : A.formularios.semRespostas}
        {formulario.ultimaRespostaEm && (
          <>
            {" · "}
            <Quando data={formulario.ultimaRespostaEm} />
          </>
        )}
      </p>
    </li>
  );
}
