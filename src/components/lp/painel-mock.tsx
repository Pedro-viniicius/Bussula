import { cn } from "@/lib/utils";
import { LP } from "@/lib/texts/lp";
import { LinhaMascarada, type Registro } from "./linha-mascarada";

type Props = {
  className?: string;
  /** "compacto" é o do hero: contagem, ranking e ponto de atenção. */
  modo?: "compacto" | "completo";
};

/**
 * Mockup do painel, como foto de produto. Todo dado é de exemplo e rotulado.
 * Azul só onde há significado: número-chave, líder do ranking, "vale olhar".
 */
export function PainelMock({ className, modo = "completo" }: Props) {
  const M = LP.mock;
  const max = Math.max(...M.ranking.pessoas.map((p) => p.valor));

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] border border-hairline bg-canvas text-left text-ink shadow-[0_40px_80px_-48px_rgba(11,18,32,0.28)]",
        className,
      )}
      role="img"
      aria-label={LP.painel.legenda}
    >
      {/* Barra superior */}
      <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4 sm:px-8">
        <div className="flex items-center gap-2 text-[15px]">
          <span className="font-semibold">{M.local}</span>
          <span className="text-ink-muted">· {M.periodo}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-hairline px-2.5 py-0.5 text-[12px] font-medium text-ink-muted">{M.exemplo}</span>
          <span className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <span className="lp-pulse inline-block size-2 rounded-full bg-brand" aria-hidden />
            {M.aoVivo}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-8">
        {/* Contagem ao vivo */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {M.kpis.map((k, i) => (
            <div key={k.rotulo} className="rounded-2xl bg-canvas-alt p-3 sm:p-5">
              <p className="text-[12px] leading-tight text-ink-muted sm:text-[13px]">{k.rotulo}</p>
              <p className={cn("mt-2 text-[28px] leading-none font-semibold tracking-tight tabular-nums sm:text-[40px]", i === 0 && "text-brand")}>
                {k.valor}
              </p>
              <p className="mt-1.5 text-[12px] text-ink-muted">{k.nota}</p>
            </div>
          ))}
        </div>

        <div className={cn("grid gap-4 sm:gap-5", modo === "completo" ? "lg:grid-cols-2" : "md:grid-cols-2")}>
          {/* Ranking da equipe */}
          <div className="self-start rounded-2xl border border-hairline p-5">
            <div className="flex items-baseline justify-between">
              <p className="text-[15px] font-semibold">{M.ranking.titulo}</p>
              <p className="text-[13px] text-ink-muted">{M.ranking.periodo}</p>
            </div>
            <ul className="mt-4 space-y-3">
              {M.ranking.pessoas.map((p, i) => (
                <li key={p.nome} className="grid grid-cols-[1.5rem_4rem_1fr_2rem] items-center gap-2 text-[15px]">
                  <span className="text-[13px] text-ink-muted tabular-nums">{i + 1}º</span>
                  <span className="truncate">{p.nome}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-canvas-alt">
                    <span
                      className={cn("block h-full rounded-full", i === 0 ? "bg-brand" : "bg-brand-light")}
                      style={{ width: `${(p.valor / max) * 100}%` }}
                    />
                  </span>
                  <span className={cn("text-right font-medium tabular-nums", i === 0 && "text-brand")}>{p.valor}</span>
                </li>
              ))}
            </ul>
          </div>

          <PontoDeAtencao />
        </div>

        {modo === "completo" && (
          <div className="rounded-2xl border border-hairline px-5 pt-4 pb-3">
            <p className="text-[15px] font-semibold">{M.registros.titulo}</p>
            <div className="mt-1 divide-y divide-hairline">
              {M.registros.linhas.map((l) => (
                <LinhaMascarada key={l.nome} registro={l as Registro} />
              ))}
            </div>
            <p className="pt-2 text-[13px] text-ink-muted">{M.registros.aviso}</p>
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
    <div className={cn("rounded-2xl bg-brand-tint p-5", className)}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold">{A.titulo}</p>
        <span className="rounded-full border border-brand/30 px-2.5 py-0.5 text-[12px] font-medium text-brand">{A.selo}</span>
      </div>
      <dl className="mt-4 space-y-3">
        {linhas.map((l, i) => (
          <div key={l.rotulo}>
            <dt className="text-[12px] font-medium text-ink-muted">{l.rotulo}</dt>
            <dd className={cn("text-[15px] leading-snug", i === 3 && "font-semibold text-brand")}>{l.texto}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 border-t border-brand/15 pt-3 text-[13px] text-ink-muted">{A.rodape}</p>
    </div>
  );
}
