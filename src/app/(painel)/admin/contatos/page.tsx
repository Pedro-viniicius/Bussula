import Link from "next/link";
import { ExportarContatos } from "@/components/contatos/exportar-contatos";
import { FiltrosDeContatos } from "@/components/contatos/filtros-de-contatos";
import { ListaDeContatos } from "@/components/contatos/lista-de-contatos";
import { Container, EstadoVazio, Metrica } from "@/components/interface/primitivos";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { contarParaExportacao, lerFiltrosDeContatos, listarContatos, resumoDosContatos } from "@/servicos/contatos";
import { listarFormularios } from "@/servicos/formularios";

export const dynamic = "force-dynamic";

/**
 * Contatos: quem se cadastrou e pode ser chamado.
 *
 * É dado pessoal, então a tela inteira parte do mascarado: o servidor só
 * entrega nome e telefone escondidos, e revelar (uma linha por vez) e exportar
 * deixam registro. Os filtros e a página vivem na URL.
 */
export default async function ContatosPage({ searchParams }: PageProps<"/admin/contatos">) {
  await exigirAdmin("/admin/contatos");

  const parametros = await searchParams;
  const formularios = await listarFormularios();
  const filtros = lerFiltrosDeContatos(parametros, formularios.map((formulario) => formulario.id));
  const C = A.contatos;

  const [resumo, pagina, paraExportar] = await Promise.all([
    resumoDosContatos(formularios),
    listarContatos(filtros, new Date(), formularios),
    contarParaExportacao(filtros),
  ]);

  const haFiltroAtivo = !!(filtros.formularioId || filtros.origem || filtros.somenteQueAceitam || filtros.ordem !== "recentes");
  const filtrosDoExportar: Record<string, string> = {};
  if (filtros.formularioId) filtrosDoExportar.formulario = filtros.formularioId;
  if (filtros.origem) filtrosDoExportar.origem = filtros.origem;
  if (filtros.somenteQueAceitam) filtrosDoExportar.mostrar = "aceitam";
  if (filtros.ordem !== "recentes") filtrosDoExportar.ordem = filtros.ordem;

  return (
    <>
      <TopoAdmin atual="contatos" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-5xl space-y-6 sm:space-y-8">
          <header className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
            <div className="min-w-0 max-w-3xl">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{C.titulo}</h1>
              <p className="mt-1 text-muted-foreground">{C.subtitulo}</p>
            </div>
            {resumo.contatos > 0 && (
              <ExportarContatos
                total={paraExportar}
                filtros={filtrosDoExportar}
                comErro={texto(parametros.erro) === "exportar"}
              />
            )}
          </header>

          {resumo.contatos === 0 ? (
            <EstadoVazio titulo={C.vazio.titulo} descricao={C.vazio.descricao}>
              <Link href="/admin/formularios" className={buttonVariants()}>
                {C.vazio.verFormularios}
              </Link>
            </EstadoVazio>
          ) : (
            <>
              <section aria-label={C.resumo.titulo} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <Metrica valor={String(resumo.contatos)} rotulo={C.resumo.contatos} />
                <Metrica valor={String(resumo.aceitamMensagens)} rotulo={C.resumo.aceitam} />
                {resumo.haCupons && <Metrica valor={String(resumo.cuponsEmitidos)} rotulo={C.resumo.cupons} />}
                {resumo.haIndicacoes && <Metrica valor={String(resumo.indicacoes)} rotulo={C.resumo.indicacoes} />}
              </section>

              <FiltrosDeContatos formularios={formularios} filtros={filtros} haFiltroAtivo={haFiltroAtivo} />

              {pagina.total === 0 ? (
                <EstadoVazio titulo={C.vazioComFiltro.titulo} descricao={C.vazioComFiltro.descricao}>
                  <Link href="/admin/contatos" className={buttonVariants({ variant: "outline" })}>
                    {C.filtros.limpar}
                  </Link>
                </EstadoVazio>
              ) : (
                <ListaDeContatos pagina={pagina} filtros={filtros} />
              )}
            </>
          )}
        </Container>
      </main>
    </>
  );
}

function texto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" ? valor : undefined;
}
