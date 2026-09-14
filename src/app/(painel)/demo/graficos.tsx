import { A } from "@/lib/texts/admin";

/**
 * Plain HTML/CSS bars: one series per chart, so no palette and no legend.
 * The single red accent marks the peak / the leader; everything else is
 * white on near-black. Bars stay ≤ 24 px thick with a 2 px surface gap.
 */
type Item = { rotulo: string; total: number };

export function Colunas({ itens }: { itens: { hora: number; total: number }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.total));
  const pico = itens.find((i) => i.total === max);
  return (
    <div className="flex h-48 items-end gap-0.5 sm:h-60 sm:gap-1" role="img" aria-label={`${A.demo.curva.sub}; ${A.demo.curva.pico} ${pico?.hora}h`}>
      {itens.map((i) => {
        const ehPico = i === pico;
        return (
          <div key={i.hora} className="flex h-full flex-1 flex-col justify-end" title={`${i.hora}h: ${i.total}`}>
            <div className="mb-1 text-center text-sm leading-none font-semibold sm:text-base">
              {ehPico ? (
                <>
                  {i.total}
                  <span className="ml-1 hidden text-[0.7em] font-medium tracking-wide text-white/50 uppercase sm:inline">{A.demo.curva.pico}</span>
                </>
              ) : (
                <span className="text-white/60">{i.total}</span>
              )}
            </div>
            <div
              className="mx-auto w-full max-w-6 rounded-t border-t-0"
              style={{ height: `${(i.total / max) * 100}%`, background: ehPico ? "var(--destaque)" : "rgba(255,255,255,0.82)" }}
            />
            <div className="mt-2 text-center text-xs text-white/50 tabular-nums sm:text-sm">{i.hora}h</div>
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
        const cor = lider ? "var(--destaque)" : i.apagado ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.82)";
        const rotulo = `truncate ${lider ? "font-semibold text-white" : i.apagado ? "text-white/50" : "text-white/80"}`;
        const valor = `tabular-nums ${lider ? "font-semibold" : "text-white/70"}`;
        const barra = (alt: string) => (
          <span className={`block w-full ${alt}`}>
            <span className="block h-full rounded-r" style={{ width: `${(i.total / max) * 100}%`, background: cor }} />
          </span>
        );
        return lado ? (
          <li key={i.rotulo} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3" title={`${i.rotulo}: ${i.total}`}>
            <span className={`${rotulo} text-base sm:text-lg`}>{i.rotulo}</span>
            {barra("h-5")}
            <span className={`${valor} text-right text-base sm:text-lg`}>{i.total}</span>
          </li>
        ) : (
          <li key={i.rotulo} title={`${i.rotulo}: ${i.total}`}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-base sm:text-lg">
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

export function Secao({ titulo, sub, children, className = "" }: { titulo: string; sub?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-6 ${className}`}>
      <h2 className="text-lg font-semibold sm:text-xl">{titulo}</h2>
      {sub && <p className="mb-4 text-sm text-white/50">{sub}</p>}
      {!sub && <div className="mb-4" />}
      {children}
    </section>
  );
}
