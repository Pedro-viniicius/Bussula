import Link from "next/link";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import { A } from "@/lib/texts/admin";
import { cn } from "@/lib/utils";

/**
 * A escolha do formulário cujos resultados aparecem na tela.
 *
 * Cada opção é um link, e a escolha vive na URL: dá para compartilhar o
 * endereço, recarregar a página e usar o voltar do navegador sem perder o
 * formulário escolhido. Funciona inclusive sem JavaScript.
 */
export function SeletorDeFormulario({
  formularios,
  selecionadoId,
}: {
  formularios: FormularioNaLista[];
  selecionadoId: string | null;
}) {
  return (
    <nav aria-label={A.resultados.escolher}>
      <p className="mb-2 text-sm font-medium text-muted-foreground">{A.resultados.escolher}</p>
      <ul className="flex flex-wrap gap-2">
        {formularios.map((formulario) => {
          const escolhido = formulario.id === selecionadoId;
          return (
            <li key={formulario.id}>
              <Link
                href={`/admin/resultados?formulario=${encodeURIComponent(formulario.id)}`}
                aria-current={escolhido ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  escolhido
                    ? "border-acento bg-acento-suave font-semibold text-acento-forte"
                    : "border-border font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {formulario.nome}
                <span className="text-xs tabular-nums opacity-80">
                  {formulario.totalDeRespostas}
                  <span className="sr-only"> {formulario.totalDeRespostas === 1 ? "resposta" : "respostas"}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
