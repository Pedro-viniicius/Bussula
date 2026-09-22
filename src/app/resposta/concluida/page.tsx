import { Suspense } from "react";
import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { SwRegister } from "@/components/sw-register";
import { CONCLUIDO } from "@/lib/texts/publico";
import { MARCA } from "@/lib/marca";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Resposta enviada — ${MARCA.nome}`,
  robots: { index: false, follow: false },
};

/**
 * A confirmação. Deliberadamente sem consulta ao banco: esta tela precisa
 * abrir mesmo quando a resposta ainda está na fila do aparelho, esperando a
 * conexão voltar.
 */
export default async function RespostaConcluidaPage({ searchParams }: PageProps<"/resposta/concluida">) {
  const consulta = await searchParams;
  const aguardandoConexao = consulta.guardada === "1";

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-10 text-center">
      <Marca className="mb-10" />
      <div className="anim-surgir">
        <p aria-hidden className="text-5xl">
          ✓
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-balance sm:text-3xl">{CONCLUIDO.titulo}</h1>
        <p className="mt-3 max-w-sm text-muted-foreground">
          {aguardandoConexao ? CONCLUIDO.guardada : CONCLUIDO.texto}
        </p>
        <p className="mt-6 text-sm text-muted-foreground">{CONCLUIDO.fechar}</p>
      </div>
      {/* Mantém a fila sendo reprocessada enquanto esta tela estiver aberta. */}
      <Suspense>
        <SwRegister slug="" />
      </Suspense>
    </main>
  );
}
