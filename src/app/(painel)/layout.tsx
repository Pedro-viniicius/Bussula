import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Painel do evento",
  robots: { index: false, follow: false },
};

/**
 * Admin and demo screens share the pitch-deck look: near-black, white type,
 * one red accent. Tokens live in globals.css under `.painel`.
 */
export default function PainelLayout({ children }: LayoutProps<"/">) {
  return <div className="painel flex min-h-full flex-1 flex-col">{children}</div>;
}
