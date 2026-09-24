import Link from "next/link";
import { Marca } from "@/components/marca";
import { Container } from "@/components/interface/primitivos";
import { A } from "@/lib/texts/admin";
import { cn } from "@/lib/utils";
import { sairAction } from "@/app/(painel)/admin/login/actions";
import { AREAS_DO_PAINEL, type AreaDoPainel } from "./areas";

/**
 * A barra que acompanha todas as telas do painel.
 *
 * A área em que se está é marcada de três formas ao mesmo tempo — peso da
 * fonte, sublinhado e `aria-current` —, porque só a cor não seria lida por
 * todo mundo. No celular os itens quebram para a linha de baixo em vez de
 * rolarem de lado: rolagem lateral sem aviso esconde o último item de quem
 * não souber que ela existe.
 */
export function TopoAdmin({ atual }: { atual: AreaDoPainel }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/admin"
          className="shrink-0 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Marca compacta />
        </Link>
        <form action={sairAction}>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {A.nav.sair}
          </button>
        </form>
      </Container>

      <nav aria-label={A.nav.areas} className="border-t border-border">
        <Container className="flex flex-wrap gap-x-1">
          {AREAS_DO_PAINEL.map((area) => {
            const ativa = area.chave === atual;
            return (
              <Link
                key={area.chave}
                href={area.href}
                aria-current={ativa ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 text-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  ativa
                    ? "border-acento font-semibold text-acento-forte"
                    : "border-transparent font-medium text-muted-foreground hover:text-foreground",
                )}
              >
                {area.rotulo}
              </Link>
            );
          })}
        </Container>
      </nav>
    </header>
  );
}
