import { FUSO_HORARIO } from "@/dominio/constantes";
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import { A } from "@/lib/texts/admin";
import { cn } from "@/lib/utils";

/**
 * Respostas por dia, em barras.
 *
 * O gráfico responde a uma pergunta — "a coleta está subindo ou parando?" —
 * e não existe para enfeitar. Quem usa leitor de tela recebe a mesma
 * informação por uma tabela escondida, porque barra desenhada em CSS não se
 * lê em voz alta.
 */
const DIA_DA_SEMANA = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: FUSO_HORARIO });
const DIA_E_MES = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO_HORARIO });

export function SerieDeRespostas({ serie }: { serie: PontoDaSerie[] }) {
  const maior = Math.max(...serie.map((p) => p.total), 1);
  const houveResposta = serie.some((p) => p.total > 0);

  if (!houveResposta) {
    return <p className="py-6 text-center text-sm text-muted-foreground">{A.visaoGeral.serie.vazio}</p>;
  }

  return (
    <>
      <ul aria-hidden className="flex items-end gap-1.5 sm:gap-2" style={{ height: "9rem" }}>
        {serie.map((ponto) => {
          const altura = (ponto.total / maior) * 100;
          return (
            <li key={ponto.dia.toISOString()} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-1.5">
              <span className="text-center text-xs font-medium tabular-nums text-muted-foreground">
                {ponto.total > 0 ? ponto.total : ""}
              </span>
              {/* A altura da barra é medida só no espaço que sobra entre o número e a data:
                  medida na coluna inteira, a barra mais alta empurrava a data para fora do gráfico. */}
              <span className="flex min-h-0 w-full flex-1 items-end">
                <span
                  className={cn("w-full rounded-t-sm", ponto.total > 0 ? "bg-acento" : "bg-muted")}
                  style={{ height: `${Math.max(altura, ponto.total > 0 ? 6 : 2)}%` }}
                />
              </span>
              <span className="truncate text-center text-[0.65rem] leading-tight text-muted-foreground sm:text-xs">
                {DIA_E_MES.format(ponto.dia)}
              </span>
            </li>
          );
        })}
      </ul>

      {/* A mesma série em texto, para leitores de tela. */}
      <table className="sr-only">
        <caption>{A.visaoGeral.serie.titulo}</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Respostas</th>
          </tr>
        </thead>
        <tbody>
          {serie.map((ponto) => (
            <tr key={ponto.dia.toISOString()}>
              <th scope="row">{`${DIA_DA_SEMANA.format(ponto.dia)} ${DIA_E_MES.format(ponto.dia)}`}</th>
              <td>{ponto.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
