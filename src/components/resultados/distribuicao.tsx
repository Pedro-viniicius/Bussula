import { familiaDoTipo } from "@/dominio/formularios/perguntas";
import type { DistribuicaoDaPergunta, OpcaoContada } from "@/dominio/resultados/tipos";
import { A } from "@/lib/texts/admin";
import { cn } from "@/lib/utils";
import { formatarComUmaCasa, formatarPorcentagem, fracaoDe } from "@/utilitarios/numeros";

/**
 * Como as pessoas responderam a uma pergunta.
 *
 * Escolha, sim/não e escala viram barras com o número ao lado; pergunta
 * aberta vira uma lista das últimas respostas, porque contar frases não diz
 * nada. Cada barra existe para responder "qual opção pesa mais?".
 */
export function Distribuicao({ distribuicao }: { distribuicao: DistribuicaoDaPergunta }) {
  const P = A.resultados.porPergunta;
  const { totalDeRespostas, opcoes, textos, media } = distribuicao;
  const familia = familiaDoTipo(distribuicao.tipo);

  if (totalDeRespostas === 0) {
    return <p className="text-sm text-muted-foreground">{P.semRespostasNaPergunta}</p>;
  }

  if (familia === "texto") {
    const aviso = P.ultimasEmTexto(textos.length, totalDeRespostas);
    return (
      <>
        <p className="text-sm text-muted-foreground">
          {P.respostasEmTexto} · {totalDeRespostas}
          {aviso && ` · ${aviso}`}
        </p>
        <ul className="mt-2 space-y-2">
          {textos.map((texto, posicao) => (
            <li key={posicao} className="rounded-lg bg-muted px-3 py-2 text-sm leading-snug">
              “{texto}”
            </li>
          ))}
        </ul>
      </>
    );
  }

  const maisEscolhida = familia === "escolha" ? opcaoQueSeDestaca(opcoes) : null;

  return (
    <>
      {media !== null && (
        <p className="mb-3 text-sm font-medium text-acento-forte">{P.media(formatarComUmaCasa(media))}</p>
      )}
      {maisEscolhida && (
        <p className="mb-3 text-sm font-medium text-acento-forte">
          {P.maisEscolhida(maisEscolhida.rotulo, formatarPorcentagem(fracaoDe(maisEscolhida.total, totalDeRespostas)))}
        </p>
      )}
      <BarrasDeContagem opcoes={opcoes} total={totalDeRespostas} />
    </>
  );
}

/**
 * Barras horizontais com o número e a porcentagem ao lado. A barra é só
 * desenho (`aria-hidden`): o que se lê em voz alta é o texto.
 *
 * O arranjo acompanha a largura do cartão, e não a da tela (`@container`):
 * num cartão estreito, rótulo, barra e número empilham; num largo, ficam lado
 * a lado. Assim a mesma peça serve para um cartão de um terço da página e
 * para um cartão de meia página.
 */
export function BarrasDeContagem({ opcoes, total }: { opcoes: OpcaoContada[]; total: number }) {
  const maiorTotal = Math.max(...opcoes.map((opcao) => opcao.total), 1);

  return (
    <ul className="@container space-y-2">
      {opcoes.map((opcao) => {
        const larguraDaBarra = (opcao.total / maiorTotal) * 100;
        return (
          <li
            key={opcao.rotulo}
            className="grid gap-1 @sm:grid-cols-[minmax(0,12rem)_1fr_5rem] @sm:items-center @sm:gap-3"
          >
            <span className="text-sm">{opcao.rotulo}</span>
            <span aria-hidden className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <span
                className={cn("block h-full rounded-full", opcao.total > 0 ? "bg-acento" : "bg-transparent")}
                style={{ width: `${larguraDaBarra}%` }}
              />
            </span>
            <span className="text-sm tabular-nums text-muted-foreground @sm:text-right">
              {opcao.total} · {formatarPorcentagem(fracaoDe(opcao.total, total))}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** A opção mais escolhida — só quando ela está sozinha no topo; empate não tem "mais escolhida". */
function opcaoQueSeDestaca(opcoes: OpcaoContada[]): OpcaoContada | null {
  const ordenadas = [...opcoes].sort((a, b) => b.total - a.total);
  const primeira = ordenadas[0];
  const segunda = ordenadas[1];
  if (!primeira || primeira.total === 0) return null;
  if (segunda && segunda.total === primeira.total) return null;
  return primeira;
}
