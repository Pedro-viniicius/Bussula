import { Metrica } from "@/components/interface/primitivos";
import { dataCompleta, tempoRelativo } from "@/utilitarios/tempo";

/**
 * Uma data do jeito que se lê: "há 8 min".
 *
 * O carimbo exato fica no `title`, para quem precisar do minuto certo — e no
 * atributo `dateTime`, que é o que uma ferramenta de acessibilidade lê.
 */
export function Quando({ data, className }: { data: Date; className?: string }) {
  return (
    <time dateTime={data.toISOString()} title={dataCompleta(data)} className={className}>
      {tempoRelativo(data)}
    </time>
  );
}

/** "Última resposta · há 4 min" — ou um traço com a explicação, quando ainda não houve nenhuma. */
export function MetricaDeTempo({ quando, rotulo, vazio }: { quando: Date | null; rotulo: string; vazio: string }) {
  if (!quando) {
    return <Metrica valor="—" rotulo={rotulo} contexto={vazio} />;
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <p className="text-3xl leading-none font-semibold tracking-tight sm:text-4xl">
        <Quando data={quando} />
      </p>
      <p className="mt-2 text-sm font-medium sm:text-base">{rotulo}</p>
    </div>
  );
}
