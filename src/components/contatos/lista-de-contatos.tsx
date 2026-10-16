import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import type { FiltrosDeContatos } from "@/dominio/contatos/tipos";
import { A } from "@/lib/texts/admin";
import type { PaginaDeContatos } from "@/servicos/contatos";
import { COLUNAS_DA_LINHA, LinhaDoContato } from "./linha-do-contato";

/** Endereço de uma página da lista, mantendo os filtros ativos. */
export function enderecoDaPagina(filtros: FiltrosDeContatos, numero: number): string {
  const busca = new URLSearchParams();
  if (filtros.formularioId) busca.set("formulario", filtros.formularioId);
  if (filtros.origem) busca.set("origem", filtros.origem);
  if (filtros.somenteQueAceitam) busca.set("mostrar", "aceitam");
  if (filtros.ordem !== "recentes") busca.set("ordem", filtros.ordem);
  if (numero > 1) busca.set("pagina", String(numero));
  const texto = busca.toString();
  return texto ? `/admin/contatos?${texto}` : "/admin/contatos";
}

/** A lista de contatos já mascarada, com o contador e a paginação. */
export function ListaDeContatos({ pagina, filtros }: { pagina: PaginaDeContatos; filtros: FiltrosDeContatos }) {
  const L = A.contatos.lista;

  return (
    <section aria-labelledby="contatos-lista-titulo">
      <h2 id="contatos-lista-titulo" className="sr-only">
        {L.titulo}
      </h2>
      <p className="mb-3 text-sm font-medium" aria-live="polite">
        {L.contador(pagina.total)}
      </p>

      <div aria-hidden className={`mb-2 hidden px-4 text-xs font-medium text-muted-foreground ${COLUNAS_DA_LINHA}`}>
        <span>{L.colunas.contato}</span>
        <span>{L.colunas.formulario}</span>
        <span>{L.colunas.quando}</span>
        <span>{L.colunas.indicacoes}</span>
        <span>{L.colunas.acoes}</span>
      </div>

      <ul className="space-y-3">
        {pagina.itens.map((contato) => (
          <LinhaDoContato key={contato.id} contato={contato} />
        ))}
      </ul>

      {pagina.paginas > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label={L.paginacao}>
          {pagina.pagina > 1 ? (
            <Link
              href={enderecoDaPagina(filtros, pagina.pagina - 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {L.anterior}
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground">
            {L.pagina(pagina.pagina, pagina.paginas)}
          </p>
          {pagina.pagina < pagina.paginas ? (
            <Link
              href={enderecoDaPagina(filtros, pagina.pagina + 1)}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              {L.proxima}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </section>
  );
}
