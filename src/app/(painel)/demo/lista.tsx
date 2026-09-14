import Link from "next/link";
import { FINALIDADES } from "@/lib/domain";
import type { Filtros, LinhaLista } from "@/lib/demo/queries";
import { A } from "@/lib/texts/admin";
import { LinhaContato } from "./linha-contato";

type Opcoes = { vendedores: { id: string; nome: string }[]; modelos: string[]; prazos: string[] };
type Props = {
  itens: LinhaLista[];
  total: number;
  paginas: number;
  filtros: Filtros;
  opcoes: Opcoes;
};

const FUSO = "America/Sao_Paulo";
const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: FUSO });
const select =
  "min-h-11 w-full rounded-lg border border-white/15 bg-[#1c1c1e] px-3 text-base text-white focus:border-white/40 focus:outline-none";

export function Lista({ itens, total, paginas, filtros, opcoes }: Props) {
  const T = A.demo.lista;
  const F = T.filtros;
  const link = (pagina: number) => {
    const p = new URLSearchParams();
    if (filtros.vendedor) p.set("v", filtros.vendedor);
    if (filtros.modelo) p.set("m", filtros.modelo);
    if (filtros.prazo) p.set("p", filtros.prazo);
    if (filtros.consentimento) p.set("c", filtros.consentimento);
    if (pagina > 1) p.set("pg", String(pagina));
    const q = p.toString();
    return `/demo${q ? `?${q}` : ""}#lista`;
  };

  return (
    <div className="space-y-4">
      <form method="get" action="/demo#lista" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
        <label className="block text-sm text-white/60">
          {F.vendedor}
          <select name="v" defaultValue={filtros.vendedor ?? ""} className={`${select} mt-1`}>
            <option value="">{F.todos}</option>
            {opcoes.vendedores.map((v) => (
              <option key={v.id} value={v.id}>{v.nome}</option>
            ))}
            <option value="sem">{F.semVendedor}</option>
          </select>
        </label>
        <label className="block text-sm text-white/60">
          {F.modelo}
          <select name="m" defaultValue={filtros.modelo ?? ""} className={`${select} mt-1`}>
            <option value="">{F.todos}</option>
            {opcoes.modelos.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm text-white/60">
          {F.prazo}
          <select name="p" defaultValue={filtros.prazo ?? ""} className={`${select} mt-1`}>
            <option value="">{F.todos}</option>
            {opcoes.prazos.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-white/80 sm:col-span-2 lg:col-span-1">
          <input type="checkbox" name="c" value="marketing" defaultChecked={filtros.consentimento === "marketing"} className="size-5 accent-[var(--destaque)]" />
          {F.soMarketing}
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button type="submit" className="min-h-11 flex-1 rounded-lg bg-white px-4 font-semibold text-black hover:bg-white/90 lg:flex-none">{F.aplicar}</button>
          <Link href="/demo#lista" className="flex min-h-11 items-center rounded-lg border border-white/20 px-4 text-white/80 hover:bg-white/10">{F.limpar}</Link>
        </div>
      </form>

      <p className="text-sm text-white/50">{T.resultado(total)} · {T.pagina(filtros.pagina, paginas)}</p>

      {itens.length === 0 ? (
        <p className="py-8 text-center text-white/60">{T.vazio}</p>
      ) : (
        <ul className="divide-y divide-white/10 border-y border-white/10">
          <li className="hidden py-2 text-xs font-medium tracking-wide text-white/40 uppercase md:grid md:grid-cols-[1.7fr_1.2fr_0.9fr_1.4fr_0.5fr] md:gap-4">
            <span>{T.colunas.contato}</span><span>{T.colunas.interesse}</span><span>{T.colunas.vendedor}</span><span>{T.colunas.consentimentos}</span><span className="text-right">{T.colunas.hora}</span>
          </li>
          {itens.map((l) => (
            <li key={l.id} className="grid grid-cols-1 gap-2 py-3 md:grid-cols-[1.7fr_1.2fr_0.9fr_1.4fr_0.5fr] md:items-center md:gap-4">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1"><LinhaContato id={l.id} nome={l.nome} telefone={l.telefone} email={l.email} /></div>
                {l.suspeito && <span className="shrink-0 rounded border border-amber-400/50 px-1.5 py-0.5 text-[11px] font-medium text-amber-300 uppercase">{T.suspeito}</span>}
              </div>
              <div className="text-sm text-white/80 sm:text-base">
                <span>{l.modelo ?? "—"}</span>
                <span className="text-white/40"> · </span>
                <span>{l.prazo ?? "—"}</span>
              </div>
              <div className="text-sm text-white/80 sm:text-base">
                {l.vendedor ?? <span className="text-white/40">{A.demo.ranking.semVendedor}</span>}
                <span className="text-white/40"> · {A.demo.origem.rotulos[l.origem] ?? l.origem}</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {FINALIDADES.map((f) => {
                  const sim = l.consentimentos[f];
                  return (
                    <span key={f} className={`rounded px-1.5 py-0.5 text-xs ${sim ? "bg-white/15 text-white" : "border border-white/15 text-white/35 line-through"}`}>
                      {T.consent[f]}
                    </span>
                  );
                })}
                {!l.consentimentos.marketing && (
                  <span className="text-xs font-medium text-red-300">{T.naoContatar}</span>
                )}
              </div>
              <div className="text-sm text-white/50 tabular-nums md:text-right">{hora.format(l.criadoEm)}</div>
            </li>
          ))}
        </ul>
      )}

      {paginas > 1 && (
        <nav className="flex items-center justify-between gap-3" aria-label="Paginação">
          {filtros.pagina > 1 ? (
            <Link href={link(filtros.pagina - 1)} className="flex min-h-11 items-center rounded-lg border border-white/20 px-4 hover:bg-white/10">{T.anterior}</Link>
          ) : <span />}
          <span className="text-sm text-white/50">{T.pagina(filtros.pagina, paginas)}</span>
          {filtros.pagina < paginas ? (
            <Link href={link(filtros.pagina + 1)} className="flex min-h-11 items-center rounded-lg border border-white/20 px-4 hover:bg-white/10">{T.proxima}</Link>
          ) : <span />}
        </nav>
      )}
    </div>
  );
}
