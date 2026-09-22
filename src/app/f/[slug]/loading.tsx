import { FORMULARIO_PUBLICO as T } from "@/lib/texts/publico";

/**
 * O formulário abre num celular, possivelmente em rede móvel. Uma linha
 * honesta enquanto carrega é melhor do que uma tela branca — e melhor do
 * que um esqueleto que finge um conteúdo que ainda não se conhece.
 */
export default function CarregandoFormulario() {
  return (
    <main className="flex flex-1 items-center justify-center px-6 py-10" aria-busy="true">
      <p role="status" className="text-muted-foreground">
        {T.carregando}
      </p>
    </main>
  );
}
