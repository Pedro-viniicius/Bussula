import type { Metadata } from "next";
import { LP } from "@/lib/texts/lp";
import "./lp.css";

export const metadata: Metadata = {
  title: LP.meta.titulo,
  description: LP.meta.descricao,
  // Fica fora dos buscadores até os placeholders serem trocados.
  robots: { index: false, follow: false },
  openGraph: {
    title: LP.meta.titulo,
    description: LP.meta.descricao,
    locale: "pt_BR",
    type: "website",
  },
};

/**
 * A landing page é uma rota à parte. Não toca no formulário de captura nem
 * no painel. Os tokens visuais ficam em lp.css, sob `.lp-a` e `.lp-b`.
 */
export default function LpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
