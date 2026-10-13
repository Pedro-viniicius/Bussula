import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { LP } from "@/lib/texts/lp";
import "./lp.css";

// Baixada no build e servida do próprio domínio: a CSP (font-src 'self') continua valendo.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

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
 * no painel.
 */
export default function LpLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${inter.variable} flex min-h-full flex-1 flex-col`}>{children}</div>;
}
