import Link from "next/link";
import type { Metadata } from "next";
import { Marca } from "@/components/marca";
import { buttonVariants } from "@/components/ui/button";
import { MARCA } from "@/lib/marca";
import { ACESSO } from "@/lib/texts/publico";

export const metadata: Metadata = {
  title: `${MARCA.nome} — ${ACESSO.subtitulo}`,
  description: ACESSO.explicacao,
  robots: { index: false, follow: false },
};

/**
 * A porta de entrada do sistema.
 *
 * Não é uma página de vendas: é orientação e acesso. Quem chega aqui é da
 * equipe da Essencial Fit e quer entrar no painel; o cliente nunca passa por
 * esta tela, porque o cartão NFC e o QR Code levam direto ao formulário.
 */
export default function AcessoPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-sm">
        <Marca />
        <h1 className="mt-8 text-3xl font-bold tracking-tight text-balance">{ACESSO.subtitulo}</h1>
        <p className="mt-3 leading-relaxed text-muted-foreground">{ACESSO.explicacao}</p>

        <div className="mt-10 flex flex-col gap-3">
          <Link href="/admin" className={buttonVariants({ size: "lg" })}>
            {ACESSO.entrarNoPainel}
          </Link>
          <Link href="/admin/formularios" className={buttonVariants({ variant: "outline", size: "lg" })}>
            {ACESSO.verFormularios}
          </Link>
        </div>

        <Link
          href="/privacidade"
          className="mt-10 inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {ACESSO.privacidade}
        </Link>
      </div>
    </main>
  );
}
