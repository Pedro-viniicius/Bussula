import { Suspense } from "react";
import type { Metadata } from "next";
import { Conclusao } from "@/components/conclusao/conclusao";
import { SwRegister } from "@/components/sw-register";
import { MARCA } from "@/lib/marca";
import { TituloDaAba } from "./titulo-da-aba";

/**
 * Renderizada por requisição, de propósito. O `proxy.ts` põe um CSP com nonce
 * (`script-src 'nonce-…' 'strict-dynamic'`) e o Next só carimba o nonce nos
 * scripts ao renderizar com a requisição em mãos. Uma página estática sai sem
 * nonce: numa carga direta o navegador bloqueia todos os scripts e a tela,
 * renderizada no cliente, fica em branco. Offline, o service worker devolve a
 * cópia guardada da última resposta, que leva seu próprio CSP e seu nonce.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Resposta enviada — ${MARCA.nome}`,
  robots: { index: false, follow: false },
};

/**
 * A confirmação. Deliberadamente sem consulta ao banco e sem ler a URL no
 * servidor: o conteúdo variável (cupom, indicação, envio guardado) vive no
 * navegador, então a página é a mesma para todo mundo e abre mesmo quando a
 * resposta ainda está na fila do aparelho, esperando a conexão voltar. O
 * título da aba é o genérico até o navegador ler o registro (`TituloDaAba`).
 */
export default function RespostaConcluidaPage() {
  return (
    <>
      <Suspense>
        <Conclusao />
        <TituloDaAba />
      </Suspense>
      {/* Mantém a fila sendo reprocessada enquanto esta tela estiver aberta. */}
      <SwRegister />
    </>
  );
}
