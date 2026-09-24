"use client";

import Link from "next/link";
import { Container } from "@/components/interface/primitivos";
import { Button, buttonVariants } from "@/components/ui/button";
import { A } from "@/lib/texts/admin";

/**
 * Quando os resultados não carregam.
 *
 * A mensagem é a mesma qualquer que seja o motivo: detalhe de banco, de rede
 * ou de serviço externo vai para o log do servidor, nunca para a tela.
 */
export default function ErroNosResultados({ reset }: { reset: () => void }) {
  const E = A.resultados.erro;
  return (
    <main id="conteudo" className="flex-1 py-10">
      <Container className="max-w-2xl">
        <div role="alert" className="rounded-xl border border-perigo/40 bg-perigo-suave px-6 py-8 text-center">
          <h1 className="text-xl font-semibold">{E.titulo}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{E.descricao}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={reset}>{E.tentar}</Button>
            <Link href="/admin" className={buttonVariants({ variant: "outline" })}>
              {E.voltar}
            </Link>
          </div>
        </div>
      </Container>
    </main>
  );
}
