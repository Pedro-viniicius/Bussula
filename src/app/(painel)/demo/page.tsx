import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import {
  eventoDemo, listar, opcoesFiltro, porHora, porModelo, porOrigem, porPrazo, porVendedor, resumo, revelacoesHoje, type Filtros,
} from "@/lib/demo/queries";
import { sairAction } from "../admin/login/actions";
import { ExportarBotao } from "./exportar-botao";
import { Barras, Colunas, Secao } from "./graficos";
import { Kpis } from "./kpis";
import { Lista } from "./lista";

export const dynamic = "force-dynamic";

function diasAteAnonimizacao(inicio: Date, meses: number, agora = Date.now()) {
  const data = new Date(inicio);
  data.setMonth(data.getMonth() + meses);
  return Math.max(0, Math.ceil((data.getTime() - agora) / 86_400_000));
}

/**
 * Demo dashboard on invented data. The event is fixed to DEMO_SLUG inside
 * the queries; the URL only carries list filters and the page number.
 */
export default async function DemoPage({ searchParams }: PageProps<"/demo">) {
  await exigirAdmin("/demo");
  const evento = await eventoDemo();
  if (!evento) {
    return <main className="flex flex-1 items-center justify-center p-6 text-center text-white/70">{A.demo.semDados}</main>;
  }

  const sp = await searchParams;
  const um = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const filtros: Filtros = {
    vendedor: um("v"),
    modelo: um("m"),
    prazo: um("p"),
    consentimento: um("c") === "marketing" ? "marketing" : undefined,
    pagina: Math.max(1, Number.parseInt(um("pg") ?? "1", 10) || 1),
  };

  const [kpis, horas, vendedores, modelos, prazos, origens, revelacoes, opcoes, lista] = await Promise.all([
    resumo(evento.id), porHora(evento.id), porVendedor(evento.id), porModelo(evento.id), porPrazo(evento.id),
    porOrigem(evento.id), revelacoesHoje(), opcoesFiltro(evento.id), listar(evento.id, filtros),
  ]);

  const diasRestantes = diasAteAnonimizacao(evento.inicio, evento.retencaoMeses);
  const dataEvento = evento.inicio.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" });

  return (
    <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
        <div>
          <p className="text-xs font-medium tracking-widest text-white/50 uppercase">{A.demo.selo}</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{A.demo.titulo}</h1>
          <p className="mt-1 text-white/60">{evento.nome} · {dataEvento}</p>
        </div>
        <form action={sairAction}>
          <button type="submit" className="min-h-11 text-sm text-white/50 underline underline-offset-4">{A.sair}</button>
        </form>
      </header>

      <div className="space-y-4 sm:space-y-6">
        <Kpis total={kpis.total} ate3Meses={kpis.ate3Meses} mediaPorVendedor={kpis.mediaPorVendedor} taxaMarketing={kpis.taxaMarketing} />

        <Secao titulo={A.demo.curva.titulo} sub={A.demo.curva.sub}>
          <Colunas itens={horas} />
        </Secao>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Secao titulo={A.demo.ranking.titulo}>
            <Barras
              lado
              destacarPrimeiro
              itens={[
                ...vendedores.filter((v) => v.id).map((v) => ({ rotulo: v.nome!, total: v.total })),
                ...vendedores.filter((v) => !v.id).map((v) => ({ rotulo: A.demo.ranking.semVendedor, total: v.total, apagado: true })),
              ]}
            />
          </Secao>
          <div className="grid gap-4 sm:gap-6">
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              <Secao titulo={A.demo.modelo.titulo}>
                <Barras itens={modelos.map((m) => ({ rotulo: m.rotulo ?? A.demo.modelo.semResposta, total: m.total }))} />
              </Secao>
              <Secao titulo={A.demo.prazo.titulo}>
                <Barras itens={prazos.map((p) => ({ rotulo: p.rotulo ?? A.demo.prazo.semResposta, total: p.total }))} />
              </Secao>
            </div>
            <Secao titulo={A.demo.origem.titulo}>
              <Barras itens={origens.map((o) => ({ rotulo: A.demo.origem.rotulos[o.rotulo] ?? o.rotulo, total: o.total }))} />
            </Secao>
          </div>
        </div>

        <Secao titulo={A.demo.lista.titulo} className="scroll-mt-4" >
          <div id="lista" className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1 text-sm text-white/50">
              <p><span className="font-semibold text-white">{A.demo.lista.revelacoesHoje(revelacoes)}</span></p>
              <p>{A.demo.lista.retencao(diasRestantes, evento.retencaoMeses)}</p>
            </div>
            <div className="w-full lg:max-w-md">
              <ExportarBotao comMarketing={kpis.comMarketing} semMarketing={kpis.semMarketing} />
            </div>
          </div>
          <Lista itens={lista.itens} total={lista.total} paginas={lista.paginas} filtros={filtros} opcoes={opcoes} />
        </Secao>

        <p className="pb-4 text-center text-xs text-white/30">{A.demo.selo}</p>
      </div>
    </main>
  );
}
