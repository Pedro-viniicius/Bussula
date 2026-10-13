import { cn } from "@/lib/utils";
import { LP } from "@/lib/texts/lp";
import { LinhaMascarada, type Registro } from "./linha-mascarada";

type Props = {
  className?: string;
  /** "compacto" é o do hero: só contagem, ranking e ponto de atenção. */
  modo?: "compacto" | "completo";
};

/**
 * Mockup do painel, em HTML, nas cores da direção. Tudo aqui é dado de
 * exemplo e está rotulado como tal.
 */
export function PainelMock({ className, modo = "completo" }: Props) {
  const M = LP.mock;
  const max = Math.max(...M.ranking.pessoas.map((p) => p.valor));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-(--lp-radius) border border-(--lp-line) bg-(--lp-surface) text-(--lp-ink) shadow-[0_24px_60px_-30px_rgba(0,0,0,0.35)]",
        className,
      )}
      role="img"
      aria-label={LP.painel.legenda}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 border-b border-(--lp-line) px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{M.local}</span>
          <span className="text-(--lp-muted)">· {M.periodo}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-(--lp-line) px-2 py-0.5 text-[11px] font-medium tracking-wide text-(--lp-muted) uppercase">
            {M.exemplo}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-(--lp-muted)">
            <span className="lp-pulse inline-block size-2 rounded-full bg-(--lp-accent)" aria-hidden />
            {M.aoVivo}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        {/* Contagem ao vivo */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {M.kpis.map((k, i) => (
            <div key={k.rotulo} className={cn("rounded-lg border border-(--lp-line) p-3", i === 0 && "bg-(--lp-accent-soft)")}>
              <p className="text-[11px] leading-tight text-(--lp-muted) sm:text-xs">{k.rotulo}</p>
              <p className={cn("mt-1 text-2xl font-bold tracking-tight tabular-nums sm:text-3xl", i === 0 && "text-(--lp-accent)")}>
                {k.valor}
              </p>
              <p className="mt-0.5 text-[11px] text-(--lp-muted)">{k.nota}</p>
            </div>
          ))}
        </div>

        <div className={cn("grid gap-4", modo === "completo" && "lg:grid-cols-2")}>
          {/* Ranking da equipe */}
          <div className="self-start rounded-lg border border-(--lp-line) p-4">
            <div className="flex items-baseline justify-between">
              <p className="text-sm font-semibold">{M.ranking.titulo}</p>
              <p className="text-xs text-(--lp-muted)">{M.ranking.periodo}</p>
            </div>
            <ul className="mt-3 space-y-2.5">
              {M.ranking.pessoas.map((p, i) => (
                <li key={p.nome} className="grid grid-cols-[1.25rem_4.5rem_1fr_2rem] items-center gap-2 text-sm">
                  <span className="text-xs text-(--lp-muted) tabular-nums">{i + 1}º</span>
                  <span className="truncate">{p.nome}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-(--lp-bg-2)">
                    <span
                      className={cn("block h-full rounded-full", i === 0 ? "bg-(--lp-accent)" : "bg-(--lp-ink-2)")}
                      style={{ width: `${(p.valor / max) * 100}%` }}
                    />
                  </span>
                  <span className="text-right font-medium tabular-nums">{p.valor}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ponto de atenção */}
          <PontoDeAtencao />
        </div>

        {modo === "completo" && (
          <div className="rounded-lg border border-(--lp-line) px-4 pt-3 pb-2">
            <p className="text-sm font-semibold">{M.registros.titulo}</p>
            <div className="mt-1 divide-y divide-(--lp-line)">
              {M.registros.linhas.map((l) => (
                <LinhaMascarada key={l.nome} registro={l as Registro} />
              ))}
            </div>
            <p className="pt-2 text-xs text-(--lp-muted)">{M.registros.aviso}</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function PontoDeAtencao({ className }: { className?: string }) {
  const A = LP.mock.atencao;
  const linhas = [A.oQueMudou, A.oQueMostra, A.porQueImporta, A.valeOlhar];
  return (
    <div className={cn("rounded-lg border border-(--lp-accent)/50 bg-(--lp-accent-soft) p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold">{A.titulo}</p>
        <span className="rounded-full border border-(--lp-accent)/40 px-2 py-0.5 text-[11px] font-medium tracking-wide text-(--lp-accent) uppercase">
          {A.selo}
        </span>
      </div>
      <dl className="mt-3 space-y-2.5">
        {linhas.map((l, i) => (
          <div key={l.rotulo}>
            <dt className="text-[11px] font-medium tracking-wide text-(--lp-muted) uppercase">{l.rotulo}</dt>
            <dd className={cn("text-sm leading-snug", i === 3 && "font-semibold text-(--lp-accent)")}>{l.texto}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 border-t border-(--lp-accent)/30 pt-2 text-xs text-(--lp-muted)">{A.rodape}</p>
    </div>
  );
}
