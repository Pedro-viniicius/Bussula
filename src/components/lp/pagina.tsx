import { cn } from "@/lib/utils";
import {
  Canais,
  ComoFunciona,
  CtaFinal,
  Faq,
  Hero,
  Nav,
  Painel,
  Piloto,
  Privacidade,
  Problema,
  ProvaSocial,
  Rodape,
  Usos,
  Visao,
  type Variante,
} from "./secoes";

/** A ordem das seções é a mesma nas duas direções; muda a roupa, não a história. */
export function PaginaLp({ variante }: { variante: Variante }) {
  return (
    <div className={cn("lp min-h-full flex-1", variante === "a" ? "lp-a" : "lp-b")}>
      <Nav variante={variante} />
      <main>
        <Hero variante={variante} />
        <Problema variante={variante} />
        <ComoFunciona variante={variante} />
        <Painel variante={variante} />
        <Usos variante={variante} />
        <Privacidade variante={variante} />
        <Canais variante={variante} />
        <Visao variante={variante} />
        <Piloto variante={variante} />
        <ProvaSocial />
        <Faq variante={variante} />
        <CtaFinal variante={variante} />
      </main>
      <Rodape variante={variante} />
    </div>
  );
}
