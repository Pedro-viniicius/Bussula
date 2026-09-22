import { Container } from "@/components/interface/primitivos";

/**
 * O que aparece enquanto uma tela do painel carrega.
 *
 * Blocos cinzas no lugar do conteúdo, com as mesmas alturas: a página não
 * "pula" quando o conteúdo chega. O texto para leitor de tela é explícito,
 * porque retângulos cinza não dizem nada em voz alta.
 */
export default function CarregandoPainel() {
  return (
    <main className="flex-1 py-6 sm:py-8" aria-busy="true">
      <Container className="max-w-4xl">
        <p className="sr-only" role="status">
          Carregando…
        </p>
        <div aria-hidden className="animate-pulse space-y-8">
          <div className="space-y-2">
            <div className="h-8 w-56 rounded-lg bg-muted" />
            <div className="h-4 w-80 max-w-full rounded bg-muted" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-muted" />
            ))}
          </div>
          <div className="h-48 rounded-xl bg-muted" />
        </div>
      </Container>
    </main>
  );
}
