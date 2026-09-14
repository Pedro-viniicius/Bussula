import { A } from "@/lib/texts/admin";

type Props = { total: number; ate3Meses: number; mediaPorVendedor: number; taxaMarketing: number };

const fmt = new Intl.NumberFormat("pt-BR");
const pct = new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 });
const dec = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

/** Four numbers; the second is the hero — the one a sales director reads first. */
export function Kpis({ total, ate3Meses, mediaPorVendedor, taxaMarketing }: Props) {
  const K = A.demo.kpis;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      <Tile rotulo={K.total} valor={fmt.format(total)} />
      <Tile rotulo={K.ate3Meses} valor={fmt.format(ate3Meses)} sub={K.ate3MesesSub} hero />
      <Tile rotulo={K.mediaVendedor} valor={dec.format(mediaPorVendedor)} />
      <Tile rotulo={K.taxaMarketing} valor={pct.format(taxaMarketing)} />
    </div>
  );
}

function Tile({ rotulo, valor, sub, hero = false }: { rotulo: string; valor: string; sub?: string; hero?: boolean }) {
  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${hero ? "border-[var(--destaque)]/60 bg-[var(--destaque)]/10" : "border-white/10 bg-white/[0.03]"}`}>
      <p className="text-sm text-white/60 sm:text-base">{rotulo}</p>
      <p className={`mt-1 leading-none font-bold tracking-tight tabular-nums ${hero ? "text-6xl sm:text-7xl lg:text-8xl" : "text-4xl sm:text-5xl lg:text-6xl"}`} style={hero ? { color: "var(--destaque)" } : undefined}>
        {valor}
      </p>
      {sub && <p className="mt-2 text-xs text-white/40 sm:text-sm">{sub}</p>}
    </div>
  );
}
