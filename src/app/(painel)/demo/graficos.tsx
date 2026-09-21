import { A } from "@/lib/texts/admin";
import { cn } from "@/lib/utils";

/**
 * Plain HTML/CSS bars: one series per chart, so no palette and no legend.
 * The single accent marks the peak / the leader; everything else is neutral
 * on the panel surface. Bars stay ≤ 24 px thick with a 2 px surface gap.
 */
type Item = { rotulo: string; total: number };

export function Colunas({ itens }: { itens: { hora: number; total: number }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.total));
  const pico = itens.find((i) => i.total === max);
  // Com muitas horas no eixo, um rótulo a cada duas evita sobreposição no celular.
  const passo = itens.length > 12 ? 2 : 1;
  return (
    <div className="flex h-44 items-end gap-0.5 sm:h-60 sm:gap-1" role="img" aria-label={`${A.demo.curva.sub}; ${A.demo.curva.pico} ${pico?.hora}h`}>
      {itens.map((i, idx) => {
        const ehPico = i === pico;
        return (
          <div key={i.hora} className="flex h-full flex-1 flex-col justify-end" title={`${i.hora}h: ${i.total}`}>
            <div className={cn("mb-1 text-center text-sm leading-none font-semibold sm:text-base", !ehPico && "hidden sm:block")}>
              {ehPico ? (
                <>
                  {i.total}
                  <span className="ml-1 hidden text-[0.7em] font-medium tracking-wide text-muted-foreground uppercase sm:inline">{A.demo.curva.pico}</span>
                </>
              ) : (
                <span className="text-muted-foreground">{i.total}</span>
              )}
            </div>
            <div
              className={cn("mx-auto w-full max-w-6 rounded-t", ehPico ? "bg-destaque" : "bg-foreground/80")}
              style={{ height: `${(i.total / max) * 100}%` }}
            />
            <div className={cn("mt-2 text-center text-[10px] text-muted-foreground tabular-nums sm:text-sm", idx % passo !== 0 && !ehPico && "invisible sm:visible")}>
              {i.hora}h
            </div>
          </div>
        );
      })}
    </div>
  );
}

type BarrasProps = {
  itens: (Item & { apagado?: boolean })[];
  destacarPrimeiro?: boolean;
  /** Label beside the bar (needs width); otherwise label above the bar. */
  lado?: boolean;
};

export function Barras({ itens, destacarPrimeiro = false, lado = false }: BarrasProps) {
  const max = Math.max(1, ...itens.map((i) => i.total));
  return (
    <ul className={lado ? "space-y-2.5" : "space-y-3"}>
      {itens.map((i, idx) => {
        const lider = destacarPrimeiro && idx === 0;
        const cor = lider ? "bg-destaque" : i.apagado ? "bg-muted-foreground/60" : "bg-foreground/80";
        const rotulo = cn("truncate", lider ? "font-semibold text-foreground" : i.apagado ? "text-muted-foreground" : "text-foreground/90");
        const valor = cn("tabular-nums", lider ? "font-semibold" : "text-muted-foreground");
        const barra = (alt: string) => (
          <span className={`block w-full ${alt}`}>
            <span className={cn("block h-full rounded-r", cor)} style={{ width: `${(i.total / max) * 100}%` }} />
          </span>
        );
        return lado ? (
          <li
            key={i.rotulo}
            className="grid grid-cols-[minmax(0,6.5rem)_1fr_2.5rem] items-center gap-2 sm:grid-cols-[minmax(0,10rem)_1fr_3rem] sm:gap-3"
            title={`${i.rotulo}: ${i.total}`}
          >
            <span className={`${rotulo} text-sm sm:text-lg`}>{i.rotulo}</span>
            {barra("h-5")}
            <span className={`${valor} text-right text-sm sm:text-lg`}>{i.total}</span>
          </li>
        ) : (
          <li key={i.rotulo} title={`${i.rotulo}: ${i.total}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm sm:text-lg">
              <span className={rotulo}>{i.rotulo}</span>
              <span className={valor}>{i.total}</span>
            </div>
            {barra("h-3")}
          </li>
        );
      })}
    </ul>
  );
}

/** Uma frase respondendo ao gráfico acima. Só aparece quando o dado sustenta. */
export function Leitura({ children }: { children: string }) {
  return <p className="mt-4 border-t border-border pt-3 text-sm leading-snug text-muted-foreground">{children}</p>;
}
