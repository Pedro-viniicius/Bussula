"use client";

import { CONCLUIDO } from "@/lib/texts/publico";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BotaoCopiar } from "./botao-copiar";

/**
 * "Indique um amigo". O link é montado aqui, no navegador, com o endereço em
 * que a página está aberta (certo em qualquer ambiente). O `ref` é um código
 * opaco: nunca o telefone nem o nome de ninguém.
 */
const T = CONCLUIDO.indicacao;

export type IndicacaoNaTela =
  | { tipo: "aguardando" }
  | { tipo: "pronta"; codigo: string; slugDestino: string; brinde: string | null };

export function montarLinkDeIndicacao(origem: string, slugDestino: string, codigo: string): string {
  return `${origem}/f/${encodeURIComponent(slugDestino)}?o=link&ref=${encodeURIComponent(codigo)}`;
}

export function BlocoDeIndicacao({ indicacao }: { indicacao: IndicacaoNaTela }) {
  return (
    <section aria-labelledby="titulo-da-indicacao" className="w-full rounded-xl border border-border p-5 text-left">
      <h2 id="titulo-da-indicacao" className="text-lg font-semibold">
        {T.titulo}
      </h2>
      {indicacao.tipo === "aguardando" ? (
        <p className="mt-2 text-sm text-muted-foreground">{T.aparecerDepois}</p>
      ) : (
        <Compartilhar indicacao={indicacao} />
      )}
    </section>
  );
}

function Compartilhar({ indicacao }: { indicacao: Extract<IndicacaoNaTela, { tipo: "pronta" }> }) {
  const link = montarLinkDeIndicacao(window.location.origin, indicacao.slugDestino, indicacao.codigo);
  const mensagem = T.mensagem(indicacao.brinde, link);
  const whatsapp = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;

  return (
    <>
      <p className="mt-2 text-sm text-muted-foreground">{T.texto}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <a
          href={whatsapp}
          target="_blank"
          rel="noopener"
          className={cn(buttonVariants({ variant: "default" }), "w-full text-center")}
        >
          {T.compartilhar}
          <span className="sr-only">{CONCLUIDO.abreOWhatsapp}</span>
        </a>
        <BotaoCopiar
          texto={link}
          rotulo={T.copiarLink}
          rotuloCopiado={T.linkCopiado}
          mensagemDeFalha={T.naoCopiou}
          mostrarTextoSeFalhar
          className="sm:col-span-1"
        />
      </div>
    </>
  );
}
