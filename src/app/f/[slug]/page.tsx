import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form/lead-form";
import { SwRegister } from "@/components/sw-register";
import { buscarEventoPorSlug } from "@/lib/db/queries";
import { M } from "@/lib/texts/messages";
import { Encerrado } from "./encerrado";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/f/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const evento = await buscarEventoPorSlug(slug);
  return { title: evento ? `${evento.nome} — Cadastro` : "Cadastro do evento" };
}

/**
 * The event is gated on `ativo` only. inicio/fim are kept for reporting but a
 * clock or timezone bug must never close the form mid-rush; a human toggle
 * on /admin is the only switch.
 */
export default async function FormularioPage({ params }: PageProps<"/f/[slug]">) {
  const { slug } = await params;
  const evento = await buscarEventoPorSlug(slug);
  if (!evento) notFound();
  if (!evento.ativo) return <Encerrado nomeEvento={evento.nome} />;

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 pt-6 pb-10">
      <header className="mb-6">
        <p className="text-sm font-medium text-muted-foreground">{evento.nome}</p>
        <h1 className="text-2xl font-bold tracking-tight">{M.form.titulo}</h1>
        <p className="mt-1 text-muted-foreground">{M.form.subtitulo}</p>
      </header>
      <Suspense>
        <LeadForm
          evento={{
            slug: evento.slug,
            nome: evento.nome,
            modelos: evento.modelos,
            politicaVersao: evento.politicaVersao,
          }}
        />
      </Suspense>
      <SwRegister slug={evento.slug} />
    </main>
  );
}
