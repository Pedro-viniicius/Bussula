import type { DistribuicaoDaPergunta } from "@/dominio/dashboard/tipos";
import { A } from "@/lib/texts/admin";
import { cn } from "@/lib/utils";

/**
 * Como as pessoas responderam a uma pergunta.
 *
 * Escolha, sim/não e escala viram barras com o número ao lado; pergunta
 * aberta vira uma lista das últimas respostas, porque contar frases não diz
 * nada. Cada barra existe para responder "qual opção pesa mais?".
 */
const porcentagem = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const umaCasa = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function Distribuicao({ distribuicao }: { distribuicao: DistribuicaoDaPergunta }) {
  const { totalDeRespostas, opcoes, textos, media } = distribuicao;

  if (totalDeRespostas === 0) {
    return <p className="text-sm text-muted-foreground">{A.detalhe.semRespostasNaPergunta}</p>;
  }

  if (textos.length > 0) {
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {A.detalhe.respostasEmTexto} · {totalDeRespostas}
        </p>
        <ul className="mt-2 space-y-2">
          {textos.map((texto, indice) => (
            <li key={indice} className="rounded-lg bg-muted px-3 py-2 text-sm leading-snug">
              “{texto}”
            </li>
          ))}
        </ul>
      </>
    );
  }

  const maior = Math.max(...opcoes.map((o) => o.total), 1);

  return (
    <>
      {media !== null && (
        <p className="mb-3 text-sm font-medium text-acento-forte">{A.detalhe.media(umaCasa.format(media))}</p>
      )}
      <ul className="space-y-2">
        {opcoes.map((opcao) => (
          <li key={opcao.rotulo} className="grid gap-1 sm:grid-cols-[minmax(0,12rem)_1fr_4rem] sm:items-center sm:gap-3">
            <span className="text-sm">{opcao.rotulo}</span>
            <span aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <span
                className={cn("block h-full rounded-full", opcao.total > 0 ? "bg-acento" : "bg-transparent")}
                style={{ width: `${(opcao.total / maior) * 100}%` }}
              />
            </span>
            <span className="text-sm tabular-nums text-muted-foreground sm:text-right">
              {opcao.total} · {porcentagem.format(opcao.total / totalDeRespostas)}
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
