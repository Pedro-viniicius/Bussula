import Link from "next/link";
import { RespostaRecebida } from "@/components/dashboard/resposta-recebida";
import { buttonVariants } from "@/components/ui/button";
import { A } from "@/lib/texts/admin";
import type { RespostaComPerguntas } from "@/servicos/respostas";

/**
 * As respostas de um formulário, uma a uma, em páginas.
 *
 * É a base de todos os números da tela, e fica ao alcance de quem quiser
 * conferir de onde uma porcentagem saiu. A página vive na URL, como o
 * formulário escolhido, e o link leva direto a esta parte da tela.
 */
export function RespostasIndividuais({
  formularioId,
  respostas,
  pagina,
  totalDePaginas,
}: {
  formularioId: string;
  respostas: RespostaComPerguntas[];
  pagina: number;
  totalDePaginas: number;
}) {
  const R = A.resultados.respostas;

  function enderecoDaPagina(numero: number): string {
    const busca = new URLSearchParams({ formulario: formularioId });
    if (numero > 1) busca.set("pagina", String(numero));
    return `/admin/resultados?${busca.toString()}#respostas`;
  }

  return (
    <>
      <ul className="space-y-3">
        {respostas.map(({ resposta, perguntas }) => (
          <RespostaRecebida key={resposta.id} resposta={resposta} perguntas={perguntas} />
        ))}
      </ul>

      {totalDePaginas > 1 && (
        <nav className="mt-6 flex items-center justify-between gap-4" aria-label={R.paginacao}>
          {pagina > 1 ? (
            <Link href={enderecoDaPagina(pagina - 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {R.anterior}
            </Link>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground" aria-current="page">
            {R.pagina(pagina, totalDePaginas)}
          </p>
          {pagina < totalDePaginas ? (
            <Link href={enderecoDaPagina(pagina + 1)} className={buttonVariants({ variant: "outline", size: "sm" })}>
              {R.proxima}
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  );
}
