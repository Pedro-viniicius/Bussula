import Link from "next/link";
import { Container, EstadoVazio } from "@/components/interface/primitivos";
import { Situacao } from "@/components/interface/situacao";
import { Quando } from "@/components/interface/tempo";
import { AcoesDeSituacao } from "@/components/formularios/acoes-de-situacao";
import { LinkPublico } from "@/components/formularios/link-publico";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { buttonVariants } from "@/components/ui/button";
import { temLinkPublico } from "@/dominio/formularios/status";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { caminhoPublicoDoFormulario, listarFormularios } from "@/servicos/formularios";

export const dynamic = "force-dynamic";

/** A lista de formulários: o que existe, em que situação, e o que dá para fazer com cada um. */
export default async function FormulariosPage() {
  await exigirAdmin("/admin/formularios");
  const formularios = await listarFormularios();
  const F = A.formularios;

  return (
    <>
      <TopoAdmin atual="formularios" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-4xl">
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{F.titulo}</h1>
              <p className="mt-1 max-w-xl text-muted-foreground">{F.subtitulo}</p>
            </div>
            <Link href="/admin/formularios/novo" className={buttonVariants()}>
              {F.novo}
            </Link>
          </header>

          <div className="mt-8">
            {formularios.length === 0 ? (
              <EstadoVazio titulo={F.vazio.titulo} descricao={F.vazio.descricao}>
                <Link href="/admin/formularios/novo" className={buttonVariants({ size: "lg" })}>
                  {F.vazio.acao}
                </Link>
              </EstadoVazio>
            ) : (
              <ul className="space-y-4">
                {formularios.map((formulario) => (
                  <li key={formulario.id} className="rounded-xl border border-border bg-card p-4 sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <h2 className="text-lg font-semibold tracking-tight">
                          <Link
                            href={`/admin/formularios/${formulario.id}`}
                            className="underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                          >
                            {formulario.nome}
                          </Link>
                        </h2>
                        {formulario.descricao && (
                          <p className="mt-0.5 text-sm text-muted-foreground">{formulario.descricao}</p>
                        )}
                      </div>
                      <Situacao situacao={formulario.situacao} />
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {formulario.totalDeRespostas > 0 ? F.respostas(formulario.totalDeRespostas) : F.semRespostas}
                      {formulario.ultimaRespostaEm && (
                        <>
                          {" · "}
                          <Quando data={formulario.ultimaRespostaEm} />
                        </>
                      )}
                      {" · "}
                      {F.versao(formulario.versaoAtual)}
                    </p>

                    {temLinkPublico(formulario.situacao) && (
                      <div className="mt-4">
                        <LinkPublico caminho={caminhoPublicoDoFormulario(formulario.slug)} />
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Link
                        href={`/admin/formularios/${formulario.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {F.acoes.verRespostas}
                      </Link>
                      <Link
                        href={`/admin/formularios/${formulario.id}/editar`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {F.acoes.editar}
                      </Link>
                      <AcoesDeSituacao id={formulario.id} situacao={formulario.situacao} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}
