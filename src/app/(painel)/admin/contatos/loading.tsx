import { Container } from "@/components/interface/primitivos";
import { A } from "@/lib/texts/admin";

/** Esqueleto da tela de contatos: o cabeçalho, quatro métricas e cinco linhas, nas alturas reais. */
export default function CarregandoContatos() {
  return (
    <main className="flex-1 py-6 sm:py-8" aria-busy="true">
      <Container className="max-w-5xl">
        <p className="sr-only" role="status">
          {A.contatos.carregando}
        </p>
        <div aria-hidden className="animate-pulse space-y-8">
          <div className="space-y-2">
            <div className="h-8 w-40 rounded-lg bg-muted" />
            <div className="h-4 w-96 max-w-full rounded bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
          <div className="space-y-3">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </Container>
    </main>
  );
}
