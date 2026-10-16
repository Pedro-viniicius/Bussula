import Link from "next/link";
import { Cartao } from "@/components/interface/primitivos";
import { buttonVariants } from "@/components/ui/button";
import { ORDENS_DE_CONTATOS, type FiltrosDeContatos } from "@/dominio/contatos/tipos";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import { ORIGENS_DA_RESPOSTA, ROTULO_DA_ORIGEM } from "@/dominio/respostas/tipos";
import { A } from "@/lib/texts/admin";

const CLASSE_DO_CAMPO =
  "min-h-11 w-full rounded-lg border border-border bg-background px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

/**
 * Os filtros da lista: um formulário GET comum, então a escolha vive na URL
 * (link compartilhável, botão voltar) e funciona sem JavaScript. Mudar o
 * filtro volta para a primeira página.
 */
export function FiltrosDeContatos({
  formularios,
  filtros,
  haFiltroAtivo,
}: {
  formularios: FormularioNaLista[];
  filtros: FiltrosDeContatos;
  haFiltroAtivo: boolean;
}) {
  const F = A.contatos.filtros;
  const ROTULO_DA_ORDEM = { recentes: F.maisRecentes, indicacoes: F.maisIndicacoes } as const;

  return (
    <Cartao aria-label={F.titulo}>
      <form method="get" action="/admin/contatos" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <label htmlFor="filtro-formulario" className="mb-1 block text-sm font-medium">
            {F.formulario}
          </label>
          <select id="filtro-formulario" name="formulario" defaultValue={filtros.formularioId ?? ""} className={CLASSE_DO_CAMPO}>
            <option value="">{F.todosFormularios}</option>
            {formularios.map((formulario) => (
              <option key={formulario.id} value={formulario.id}>
                {formulario.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-origem" className="mb-1 block text-sm font-medium">
            {F.origem}
          </label>
          <select id="filtro-origem" name="origem" defaultValue={filtros.origem ?? ""} className={CLASSE_DO_CAMPO}>
            <option value="">{F.todasOrigens}</option>
            {ORIGENS_DA_RESPOSTA.map((origem) => (
              <option key={origem} value={origem}>
                {ROTULO_DA_ORIGEM[origem]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filtro-mostrar" className="mb-1 block text-sm font-medium">
            {F.mostrar}
          </label>
          <select id="filtro-mostrar" name="mostrar" defaultValue={filtros.somenteQueAceitam ? "aceitam" : ""} className={CLASSE_DO_CAMPO}>
            <option value="">{F.mostrarTodos}</option>
            <option value="aceitam">{F.mostrarQueAceitam}</option>
          </select>
        </div>
        <div>
          <label htmlFor="filtro-ordem" className="mb-1 block text-sm font-medium">
            {F.ordenar}
          </label>
          <select id="filtro-ordem" name="ordem" defaultValue={filtros.ordem} className={CLASSE_DO_CAMPO}>
            {ORDENS_DE_CONTATOS.map((ordem) => (
              <option key={ordem} value={ordem}>
                {ROTULO_DA_ORDEM[ordem]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
          <button type="submit" className={buttonVariants({ variant: "secondary" })}>
            {F.aplicar}
          </button>
          {haFiltroAtivo && (
            <Link
              href="/admin/contatos"
              className="inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {F.limpar}
            </Link>
          )}
        </div>
      </form>
    </Cartao>
  );
}
