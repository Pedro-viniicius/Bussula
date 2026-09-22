import Link from "next/link";
import { notFound } from "next/navigation";
import { Cartao, Container, EstadoVazio } from "@/components/interface/primitivos";
import { Situacao } from "@/components/interface/situacao";
import { Distribuicao } from "@/components/dashboard/distribuicao";
import { AcoesDeSituacao } from "@/components/formularios/acoes-de-situacao";
import { LinkPublico } from "@/components/formularios/link-publico";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { buttonVariants } from "@/components/ui/button";
import { EXPLICACAO_DA_SITUACAO, temLinkPublico } from "@/dominio/formularios/status";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { calcularDistribuicoes } from "@/servicos/dashboard";
import { buscarFormularioPorId, caminhoPublicoDoFormulario } from "@/servicos/formularios";

export const dynamic = "force-dynamic";

/**
 * Um formulário por dentro: o endereço público, o que fazer com ele e como
 * as pessoas responderam a cada pergunta.
 */
export default async function DetalheDoFormularioPage({ params }: PageProps<"/admin/formularios/[id]">) {
  const { id } = await params;
  await exigirAdmin(`/admin/formularios/${id}`);

  const formulario = await buscarFormularioPorId(id);
  if (!formulario) notFound();

  const distribuicoes = await calcularDistribuicoes(formulario.id, formulario.perguntas);
  const totalDeRespostas = Math.max(...distribuicoes.map((d) => d.totalDeRespostas), 0);
  const D = A.detalhe;

  return (
    <>
      <TopoAdmin atual="formularios" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-4xl space-y-8">
          <header>
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{formulario.nome}</h1>
                {formulario.descricao && <p className="mt-1 text-muted-foreground">{formulario.descricao}</p>}
              </div>
              <Situacao situacao={formulario.situacao} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {EXPLICACAO_DA_SITUACAO[formulario.situacao]} · {A.formularios.versao(formulario.versaoAtual)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/formularios/${formulario.id}/editar`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {A.formularios.acoes.editar}
              </Link>
              <Link
                href={`/admin/respostas?formulario=${formulario.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {A.formularios.acoes.verRespostas}
              </Link>
              <AcoesDeSituacao id={formulario.id} situacao={formulario.situacao} />
            </div>
          </header>

          <Cartao titulo={D.link} descricao={temLinkPublico(formulario.situacao) ? D.linkAjuda : undefined}>
            {temLinkPublico(formulario.situacao) ? (
              <LinkPublico caminho={caminhoPublicoDoFormulario(formulario.slug)} />
            ) : (
              <p className="text-sm text-muted-foreground">{D.linkIndisponivel}</p>
            )}
          </Cartao>

          <section aria-labelledby="resultados-titulo">
            <h2 id="resultados-titulo" className="text-lg font-semibold tracking-tight sm:text-xl">
              {D.resultados}
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">{D.resultadosDescricao}</p>

            <div className="mt-4">
              {totalDeRespostas === 0 ? (
                <EstadoVazio titulo={D.vazio.titulo} descricao={D.vazio.descricao} />
              ) : (
                <div className="space-y-4">
                  {distribuicoes.map((distribuicao) => (
                    <Cartao key={distribuicao.perguntaId} nivel={3} titulo={distribuicao.enunciado}>
                      <Distribuicao distribuicao={distribuicao} />
                    </Cartao>
                  ))}
                </div>
              )}
            </div>
          </section>
        </Container>
      </main>
    </>
  );
}
