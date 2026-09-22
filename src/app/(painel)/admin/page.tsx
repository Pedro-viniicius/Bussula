import Link from "next/link";
import { Container, Cartao, EstadoVazio, Metrica } from "@/components/interface/primitivos";
import { Quando } from "@/components/interface/tempo";
import { Situacao } from "@/components/interface/situacao";
import { RespostaRecebida } from "@/components/dashboard/resposta-recebida";
import { SerieDeRespostas } from "@/components/dashboard/serie-de-respostas";
import { Sinais } from "@/components/dashboard/sinais";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { buttonVariants } from "@/components/ui/button";
import { DIAS_PERIODO_PADRAO, RESPOSTAS_RECENTES_NA_VISAO_GERAL } from "@/dominio/constantes";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { carregarResumoDoDashboard, carregarSerieDeRespostas, detectarSinais } from "@/servicos/dashboard";
import { listarFormularios } from "@/servicos/formularios";
import { buscarRespostasRecentes, comPerguntas } from "@/servicos/respostas";

export const dynamic = "force-dynamic";

const numero = new Intl.NumberFormat("pt-BR");

/**
 * Visão geral: a primeira tela depois de entrar.
 *
 * A ordem é a de uma decisão — o que pede atenção, os números que resumem o
 * período, o ritmo da coleta, os formulários e, por último, o detalhe das
 * últimas respostas. Todo número sai das respostas gravadas; não há nenhum
 * valor de exemplo.
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
  const sinais = detectarSinais(formularios);
  const V = A.visaoGeral;

  if (formularios.length === 0) {
    return (
      <>
        <TopoAdmin atual="visao-geral" />
        <main id="conteudo" className="flex-1 py-10">
          <Container className="max-w-2xl">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{V.titulo}</h1>
            <div className="mt-8">
              <EstadoVazio titulo={V.vazio.titulo} descricao={V.vazio.descricao}>
                <Link href="/admin/formularios/novo" className={buttonVariants({ size: "lg" })}>
                  {V.vazio.acao}
                </Link>
              </EstadoVazio>
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

          <Secao id="sinais" titulo={V.sinais.titulo} descricao={V.sinais.descricao}>
            <Sinais sinais={sinais} />
          </Secao>

          <Secao id="indicadores" titulo={V.indicadores.total}>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <Metrica
                valor={numero.format(resumo.totalDeRespostas)}
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
                valor={numero.format(resumo.respostasHoje)}
                rotulo={V.indicadores.hoje}
                contexto={V.indicadores.hojeContexto(resumo.respostasNoPeriodo, DIAS_PERIODO_PADRAO)}
              />
              <Metrica
                valor={numero.format(resumo.formulariosAtivos)}
                rotulo={V.indicadores.ativos}
                contexto={V.indicadores.ativosContexto(formularios.length)}
              />
              <MetricaDeTempo quando={resumo.ultimaRespostaEm} />
            </div>
          </Secao>

          <Secao id="serie" titulo={V.serie.titulo} descricao={V.serie.descricao(DIAS_PERIODO_PADRAO)}>
            <Cartao nivel={3}>
              <SerieDeRespostas serie={serie} />
            </Cartao>
          </Secao>

          <Secao id="formularios" titulo={V.formularios.titulo} acao={{ href: "/admin/formularios", rotulo: V.formularios.verTodos }}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {formularios.slice(0, 4).map((formulario) => (
                <li key={formulario.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <Link
                      href={`/admin/formularios/${formulario.id}`}
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
              ))}
            </ul>
          </Secao>

          <Secao
            id="recentes"
            titulo={V.respostasRecentes.titulo}
            acao={{ href: "/admin/respostas", rotulo: V.respostasRecentes.verTodas }}
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
                    href={`/admin/formularios/${resposta.formularioId}`}
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

/** "Última resposta · há 4 min" — ou o estado vazio, quando não houve nenhuma. */
function MetricaDeTempo({ quando }: { quando: Date | null }) {
  if (!quando) {
    return <Metrica valor="—" rotulo={A.visaoGeral.indicadores.ultima} contexto={A.visaoGeral.indicadores.ultimaVazio} />;
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-3xl leading-none font-semibold tracking-tight sm:text-4xl">
        <Quando data={quando} />
      </p>
      <p className="mt-2 text-sm font-medium sm:text-base">{A.visaoGeral.indicadores.ultima}</p>
    </div>
  );
}

/** Um bloco da página: um título e, quando cabe, um atalho no canto. */
function Secao({
  id,
  titulo,
  descricao,
  acao,
  children,
}: {
  id: string;
  titulo: string;
  descricao?: string;
  acao?: { href: string; rotulo: string };
  children: React.ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-titulo`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id={`${id}-titulo`} className="text-lg font-semibold tracking-tight sm:text-xl">
          {titulo}
        </h2>
        {acao && (
          <Link
            href={acao.href}
            className="text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {acao.rotulo}
          </Link>
        )}
      </div>
      {descricao && <p className="mt-0.5 text-sm text-muted-foreground">{descricao}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}
