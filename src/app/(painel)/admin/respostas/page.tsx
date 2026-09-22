import Link from "next/link";
import { Container, EstadoVazio } from "@/components/interface/primitivos";
import { RespostaRecebida } from "@/components/dashboard/resposta-recebida";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { buttonVariants } from "@/components/ui/button";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { listarFormularios } from "@/servicos/formularios";
import { comPerguntas, listarRespostas } from "@/servicos/respostas";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Todas as respostas, da mais recente para a mais antiga, com um filtro por
 * formulário. O filtro vive na URL: um link com filtro pode ser compartilhado
 * e continua valendo depois de recarregar.
 */
export default async function RespostasPage({ searchParams }: PageProps<"/admin/respostas">) {
  await exigirAdmin("/admin/respostas");

  const parametros = await searchParams;
  const texto = (chave: string) =>
    typeof parametros[chave] === "string" && parametros[chave] ? (parametros[chave] as string) : undefined;

  const formularioId = texto("formulario");
  const pagina = Math.max(1, Number.parseInt(texto("pagina") ?? "1", 10) || 1);

  const [formularios, pagina_] = await Promise.all([
    listarFormularios(),
    listarRespostas({ formularioId, pagina }),
  ]);
  const detalhadas = await comPerguntas(pagina_.itens);
  const R = A.respostas;

  const linkDaPagina = (numero: number) => {
    const busca = new URLSearchParams();
    if (formularioId) busca.set("formulario", formularioId);
    if (numero > 1) busca.set("pagina", String(numero));
    const consulta = busca.toString();
    return consulta ? `/admin/respostas?${consulta}` : "/admin/respostas";
  };

  return (
    <>
      <TopoAdmin atual="respostas" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-4xl">
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{R.titulo}</h1>
            <p className="mt-1 text-muted-foreground">{R.subtitulo}</p>
          </header>

          {formularios.length > 1 && (
            <nav aria-label={R.filtrar} className="mt-6 flex flex-wrap gap-2">
              <FiltroLink href="/admin/respostas" ativo={!formularioId} rotulo={R.todosOsFormularios} />
              {formularios.map((formulario) => (
                <FiltroLink
                  key={formulario.id}
                  href={`/admin/respostas?formulario=${formulario.id}`}
                  ativo={formularioId === formulario.id}
                  rotulo={formulario.nome}
                />
              ))}
            </nav>
          )}

          <div className="mt-6">
            {detalhadas.length === 0 ? (
              <EstadoVazio titulo={R.vazio.titulo} descricao={R.vazio.descricao} />
            ) : (
              <>
                <ul className="space-y-3">
                  {detalhadas.map(({ resposta, perguntas, nomeDoFormulario }) => (
                    <RespostaRecebida
                      key={resposta.id}
                      resposta={resposta}
                      perguntas={perguntas}
                      nomeDoFormulario={nomeDoFormulario}
                      href={`/admin/formularios/${resposta.formularioId}`}
                    />
                  ))}
                </ul>

                {pagina_.paginas > 1 && (
                  <nav className="mt-6 flex items-center justify-between gap-4" aria-label={R.pagina(pagina, pagina_.paginas)}>
                    {pagina > 1 ? (
                      <Link href={linkDaPagina(pagina - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {R.anterior}
                      </Link>
                    ) : (
                      <span />
                    )}
                    <p className="text-sm text-muted-foreground">{R.pagina(pagina, pagina_.paginas)}</p>
                    {pagina < pagina_.paginas ? (
                      <Link href={linkDaPagina(pagina + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        {R.proxima}
                      </Link>
                    ) : (
                      <span />
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}

function FiltroLink({ href, ativo, rotulo }: { href: string; ativo: boolean; rotulo: string }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "true" : undefined}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full border px-3.5 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        ativo
          ? "border-acento bg-acento-suave font-semibold text-acento-forte"
          : "border-border font-medium text-muted-foreground hover:bg-muted",
      )}
    >
      {rotulo}
    </Link>
  );
}
