"use client";

import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="text-2xl font-bold">Algo deu errado</h1>
      <p className="text-muted-foreground">
        Não foi possível carregar a página. Tente novamente em instantes.
      </p>
      <Button onClick={reset}>Tentar novamente</Button>
    </main>
  );
}
