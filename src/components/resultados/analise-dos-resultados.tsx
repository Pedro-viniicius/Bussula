import { Aviso, Etiqueta, Secao, type Tom } from "@/components/interface/primitivos";
import type {
  Achado,
  AnaliseDosResultados,
  Evidencia,
  NaturezaDoAchado,
  PossivelAcao,
} from "@/dominio/analise/tipos";
import { A } from "@/lib/texts/admin";

/**
 * As duas partes que vêm depois dos dados: "Inteligência dos dados" e
 * "Possíveis ações".
 *
 * Recebe a análise ainda em andamento (uma promessa) e espera por ela aqui
 * dentro. Assim a página mostra os números na hora, e esta parte aparece
 * quando a análise fica pronta — a ordem dados → interpretação → ação vale
 * também no tempo.
 *
 * Nada do que se mostra aqui é escrito por este componente: ele só organiza o
 * que a análise disse, sempre com a evidência ao lado.
 */
const NATUREZAS_NA_ORDEM: NaturezaDoAchado[] = ["fato", "interpretacao", "hipotese"];

/** Hipótese leva o tom de atenção: é o que ainda não foi confirmado. */
const TOM_DA_NATUREZA: Record<NaturezaDoAchado, Tom> = {
  fato: "neutro",
  interpretacao: "neutro",
  hipotese: "atencao",
};

export async function AnaliseDosResultados({ analise }: { analise: Promise<AnaliseDosResultados> }) {
  const analiseFeita = await analise;
  const T = A.resultados;

  if (analiseFeita.situacao === "dados-insuficientes") {
    return (
      <SecaoDaAnalise>
        <Aviso role="status">{T.analise.insuficiente(analiseFeita.totalDeRespostas, analiseFeita.minimoDeRespostas)}</Aviso>
      </SecaoDaAnalise>
    );
  }

  const evidenciasPorId = new Map(analiseFeita.evidencias.map((evidencia) => [evidencia.id, evidencia]));

  return (
    <>
      <SecaoDaAnalise>
        {analiseFeita.achados.length === 0 ? (
          <Aviso role="status">{T.analise.semAchados}</Aviso>
        ) : (
          <div className="space-y-8">
            {NATUREZAS_NA_ORDEM.map((natureza) => (
              <GrupoDeAchados
                key={natureza}
                natureza={natureza}
                achados={analiseFeita.achados.filter((achado) => achado.natureza === natureza)}
                evidenciasPorId={evidenciasPorId}
              />
            ))}
          </div>
        )}
        {analiseFeita.limites.length > 0 && <Limites limites={analiseFeita.limites} />}
      </SecaoDaAnalise>

      <Secao id="acoes" titulo={T.acoes.titulo} descricao={T.acoes.descricao}>
        {analiseFeita.acoes.length === 0 ? (
          <Aviso role="status">{T.acoes.vazio}</Aviso>
        ) : (
          <ListaDeAcoes acoes={analiseFeita.acoes} evidenciasPorId={evidenciasPorId} />
        )}
      </Secao>
    </>
  );
}

/** O que aparece enquanto a análise é feita: o mesmo espaço, com um aviso que se lê em voz alta. */
export function AnaliseCarregando() {
  return (
    <SecaoDaAnalise>
      <div aria-busy="true">
        <p role="status" className="text-sm text-muted-foreground">
          {A.resultados.analise.carregando}
        </p>
        <div aria-hidden className="mt-4 grid animate-pulse gap-3 md:grid-cols-2">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
      </div>
    </SecaoDaAnalise>
  );
}

function SecaoDaAnalise({ children }: { children: React.ReactNode }) {
  const T = A.resultados.analise;
  return (
    <Secao id="analise" titulo={T.titulo} descricao={T.descricao} etiqueta={<Etiqueta>{T.etiqueta}</Etiqueta>}>
      {children}
    </Secao>
  );
}

function GrupoDeAchados({
  natureza,
  achados,
  evidenciasPorId,
}: {
  natureza: NaturezaDoAchado;
  achados: Achado[];
  evidenciasPorId: Map<string, Evidencia>;
}) {
  if (achados.length === 0) return null;
  const grupo = A.resultados.analise.grupos[natureza];
  const idDoTitulo = `analise-${natureza}-titulo`;

  return (
    <section aria-labelledby={idDoTitulo}>
      <h3 id={idDoTitulo} className="text-base font-semibold sm:text-lg">
        {grupo.titulo}
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{grupo.descricao}</p>
      <ul className="mt-3 grid gap-3 md:grid-cols-2">
        {achados.map((achado) => (
          <li key={`${natureza}-${achado.texto}`} className="flex flex-col rounded-xl border border-border bg-card p-4">
            <Etiqueta tom={TOM_DA_NATUREZA[natureza]} className="self-start">
              {A.resultados.analise.natureza[natureza]}
            </Etiqueta>
            <p className="mt-2 leading-snug">{achado.texto}</p>
            {natureza === "fato" ? (
              <FonteDoFato evidencias={buscarEvidencias(achado.evidencias, evidenciasPorId)} />
            ) : (
              <EvidenciasCitadas evidencias={buscarEvidencias(achado.evidencias, evidenciasPorId)} />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ListaDeAcoes({ acoes, evidenciasPorId }: { acoes: PossivelAcao[]; evidenciasPorId: Map<string, Evidencia> }) {
  return (
    <ol className="space-y-3">
      {acoes.map((acao, posicao) => (
        <li key={acao.texto} className="flex gap-3 rounded-xl border border-border border-l-4 border-l-acento bg-card p-4">
          <span
            aria-hidden
            className="grid size-7 shrink-0 place-items-center rounded-full bg-acento-suave text-sm font-semibold text-acento-forte"
          >
            {posicao + 1}
          </span>
          <div className="min-w-0">
            <p className="leading-snug">{acao.texto}</p>
            <EvidenciasCitadas evidencias={buscarEvidencias(acao.evidencias, evidenciasPorId)} />
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Um fato já traz o número no texto; basta dizer de que pergunta ele veio. */
function FonteDoFato({ evidencias }: { evidencias: Evidencia[] }) {
  const fontes = [...new Set(evidencias.map((evidencia) => evidencia.fonte))];
  if (fontes.length === 0) return null;
  return (
    <p className="mt-2 text-xs text-muted-foreground">
      {A.resultados.analise.fonte}: {fontes.join(" · ")}
    </p>
  );
}

/** "Com base em": os números exatos que sustentam uma interpretação, hipótese ou ação. */
function EvidenciasCitadas({ evidencias }: { evidencias: Evidencia[] }) {
  if (evidencias.length === 0) return null;
  return (
    <div className="mt-3 border-t border-border pt-2">
      <p className="text-xs font-medium text-muted-foreground">{A.resultados.analise.comBaseEm}</p>
      <ul className="mt-1 space-y-1">
        {evidencias.map((evidencia) => (
          <li key={evidencia.id} className="text-xs leading-snug text-muted-foreground">
            <span className="font-medium text-foreground">{evidencia.texto}</span> — {evidencia.fonte}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Limites({ limites }: { limites: string[] }) {
  return (
    <section aria-labelledby="analise-limites-titulo" className="mt-8 rounded-xl border border-dashed border-border p-4">
      <h3 id="analise-limites-titulo" className="text-sm font-semibold">
        {A.resultados.analise.limites}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {limites.map((limite) => (
          <li key={limite}>{limite}</li>
        ))}
      </ul>
    </section>
  );
}

function buscarEvidencias(ids: string[], evidenciasPorId: Map<string, Evidencia>): Evidencia[] {
  const encontradas: Evidencia[] = [];
  for (const id of ids) {
    const evidencia = evidenciasPorId.get(id);
    if (evidencia) encontradas.push(evidencia);
  }
  return encontradas;
}
