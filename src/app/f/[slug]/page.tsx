import { Suspense } from "react";
import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { FormularioPublicoInterativo } from "@/components/formularios/formulario-publico";
import { SwRegister } from "@/components/sw-register";
import { MARCA } from "@/lib/marca";
import { FORMULARIO_PUBLICO as T, TRAVADO } from "@/lib/texts/publico";
import { buscarFormularioPublicoPorSlug } from "@/servicos/formularios";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const formulario = await buscarFormularioPublicoPorSlug(slug);
  if (!formulario.ok && formulario.erro === "FORMULARIO_TRAVADO") {
    // Responde 200 (a página já começa a ser enviada assim), mas fora dos buscadores.
    return { title: TRAVADO.tituloDaPagina, robots: { index: false, follow: false } };
  }
  return { title: formulario.ok ? `${formulario.valor.nome} — ${MARCA.nome}` : MARCA.nome };
}

/**
 * A tela que abre quando o cliente encosta o celular no cartão NFC ou lê o
 * QR Code. Não sabe nada do painel e não depende dele.
 *
 * O formulário só abre se estiver ativo, e quem decide isso é o servidor —
 * um endereço adivinhado não revela rascunho nem formulário arquivado.
 *
 * Esta página não lê a query (`?o=`, `?ref=`): o service worker guarda o HTML
 * sem ela, e a origem ou a indicação de uma visita não podem vazar para outra.
 * Quem lê é o formulário, no navegador.
 */
export default async function FormularioPublicoPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;

  const formulario = await buscarFormularioPublicoPorSlug(slug);

  if (!formulario.ok) {
    const aviso =
      formulario.erro === "FORMULARIO_TRAVADO"
        ? TRAVADO
        : formulario.erro === "FORMULARIO_INATIVO"
          ? T.inativo
          : T.naoEncontrado;
    return (
      <Tela>
        <h1 className="text-2xl font-bold tracking-tight text-balance">{aviso.titulo}</h1>
        <p className="mt-3 text-muted-foreground">{aviso.texto}</p>
      </Tela>
    );
  }

  return (
    <Tela nome={formulario.valor.nome}>
      {formulario.valor.descricao && (
        <p className="mb-6 text-muted-foreground">{formulario.valor.descricao}</p>
      )}
      <Suspense>
        <FormularioPublicoInterativo formulario={formulario.valor} />
      </Suspense>
      <SwRegister slug={slug} />
    </Tela>
  );
}

/** A moldura de todas as telas públicas: marca no topo, uma coluna estreita. */
function Tela({ nome, children }: { nome?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-5 py-3">
          <Marca />
          {nome && <p className="truncate text-sm text-muted-foreground">{nome}</p>}
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 pt-8 pb-10">{children}</main>
    </div>
  );
}
