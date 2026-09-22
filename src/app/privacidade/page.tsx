import Link from "next/link";
import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { MARCA } from "@/lib/marca";
import { PRIVACIDADE } from "@/lib/texts/publico";

export const metadata: Metadata = {
  title: `Privacidade — ${MARCA.nome}`,
  description: "Como a Essencial Fit usa e protege o que as pessoas respondem nos formulários.",
  robots: { index: false, follow: false },
};

export default function PrivacidadePage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 bg-background px-5 py-10 sm:py-16">
      <Marca />
      <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">{PRIVACIDADE.titulo}</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{PRIVACIDADE.resumo}</p>

      <div className="mt-10 space-y-8 leading-relaxed">
        {PRIVACIDADE.secoes.map((secao) => (
          <section key={secao.titulo}>
            <h2 className="text-xl font-semibold">{secao.titulo}</h2>
            <p className="mt-2 text-muted-foreground">{secao.texto}</p>
          </section>
        ))}
        <p className="text-muted-foreground">
          <a
            className="font-medium text-acento underline underline-offset-4"
            href={`mailto:${MARCA.contatoPrivacidade}`}
          >
            {MARCA.contatoPrivacidade}
          </a>
        </p>
      </div>

      <Link
        href="/"
        className="mt-10 inline-flex min-h-11 items-center font-semibold text-acento underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        {PRIVACIDADE.voltar}
      </Link>
    </main>
  );
}
