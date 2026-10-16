import { CONCLUIDO } from "@/lib/texts/publico";
import { BotaoCopiar } from "./botao-copiar";

/**
 * O cupom na tela de conclusão. O anúncio da troca de "Gerando seu cupom…" pelo
 * código é único e vem da tela (`Conclusao`), para não ler o cupom duas vezes.
 * Nunca recebe um código que o servidor não tenha enviado agora.
 */
const T = CONCLUIDO.cupom;

export type CupomNaTela =
  | { tipo: "gerando" }
  | { tipo: "emitido"; codigo: string; brinde: string | null; validoAte: string };

export function BlocoDoCupom({ cupom }: { cupom: CupomNaTela }) {
  return (
    <section
      aria-labelledby="titulo-do-cupom"
      aria-busy={cupom.tipo === "gerando"}
      className="w-full rounded-xl border border-acento/40 bg-acento-suave p-5 text-left"
    >
      <h2 id="titulo-do-cupom" className="text-sm font-medium text-acento-forte">
        {T.titulo}
      </h2>

      {cupom.tipo === "gerando" ? (
        <p className="mt-3 text-lg font-semibold text-acento-forte">{T.gerando}</p>
      ) : (
        <>
          <p
            translate="no"
            className="mt-2 font-mono text-2xl font-bold tracking-widest whitespace-nowrap text-acento-forte min-[360px]:text-[28px] min-[400px]:text-[32px]"
          >
            {cupom.codigo}
          </p>
          <p className="mt-3 text-base">{cupom.brinde ?? T.semBrinde}</p>
          <p className="mt-1 text-sm font-medium text-acento-forte">{T.validoAte(cupom.validoAte)}</p>
          <p className="mt-3 text-sm text-muted-foreground">{T.comoUsar}</p>
          <p className="mt-1 text-sm text-muted-foreground">{T.dica}</p>
          <BotaoCopiar
            className="mt-4"
            texto={cupom.codigo}
            rotulo={T.copiar}
            rotuloCopiado={T.copiado}
            mensagemDeFalha={T.naoCopiou}
          />
        </>
      )}
    </section>
  );
}
