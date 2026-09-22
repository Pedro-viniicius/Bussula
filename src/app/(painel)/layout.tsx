import type { Metadata } from "next";
import { A } from "@/lib/texts/admin";

export const metadata: Metadata = {
  title: "Painel Essencial Fit",
  robots: { index: false, follow: false },
};

/**
 * Casca do painel. O tema é o mesmo do resto do sistema (globals.css);
 * o que este layout acrescenta é o atalho para pular direto ao conteúdo,
 * que é a primeira parada de quem navega por teclado.
 */
export default function PainelLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:ring-3 focus:ring-ring/50"
      >
        {A.nav.pular}
      </a>
      {children}
    </div>
  );
}
