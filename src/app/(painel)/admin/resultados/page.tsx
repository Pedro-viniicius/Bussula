import { Suspense } from "react";
import { Container, EstadoVazio, Etiqueta, Secao } from "@/components/interface/primitivos";
import { Situacao } from "@/components/interface/situacao";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { AnaliseCarregando, AnaliseDosResultados } from "@/components/resultados/analise-dos-resultados";
import { DadosDoFormulario } from "@/components/resultados/dados-do-formulario";
import { RespostasIndividuais } from "@/components/resultados/respostas-individuais";
import { SeletorDeFormulario } from "@/components/resultados/seletor-de-formulario";
import { RESPOSTAS_POR_PAGINA } from "@/dominio/constantes";
import type { FormularioComPerguntas, FormularioNaLista } from "@/dominio/formularios/tipos";
import { escolherFormularioPadrao } from "@/dominio/resultados/selecao";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { listarFormularios } from "@/servicos/formularios";
import { comPerguntas, listarRespostas } from "@/servicos/respostas";
import { analisarResultados, buscarResultadosDoFormulario } from "@/servicos/resultados";

export const dynamic = "force-dynamic";

/**
 * Resultados & IA: o que as respostas de um formulário significam.
 *
 * A tela conta uma história em ordem, e a ordem é a regra:
 *
 *   DADOS          → o que foi contado, sem leitura nenhuma
 *   INTERPRETAÇÃO  → o que os números podem indicar, sempre com a evidência
 *   POSSÍVEIS AÇÕES → o que dá para fazer com isso
 *
 * Por último vêm as respostas uma a uma, para quem quiser conferir de onde
 * saiu cada número. O formulário e a página escolhidos vivem na URL.
 */
export default async function ResultadosPage({ searchParams }: PageProps<"/admin/resultados">) {
  await exigirAdmin("/admin/resultados");

  const parametros = await searchParams;
  const formularioPedido = lerTexto(parametros.formulario);
  const paginaPedida = lerNumeroDaPagina(parametros.pagina);

  const formularios = await listarFormularios();
  const selecionado = escolherFormulario(formularios, formularioPedido);

  return (
    <>
      <TopoAdmin atual="resultados" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-5xl space-y-8 sm:space-y-10">
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{A.resultados.titulo}</h1>
            <p className="mt-1 max-w-3xl text-muted-foreground">{A.resultados.subtitulo}</p>
            {formularios.length > 0 && (
              <div className="mt-6">
                <SeletorDeFormulario formularios={formularios} selecionadoId={selecionado?.id ?? null} />
              </div>
            )}
          </header>

          <ConteudoDosResultados
            haFormularios={formularios.length > 0}
            selecionado={selecionado}
            paginaPedida={paginaPedida}
          />
        </Container>
      </main>
    </>
  );
}

async function ConteudoDosResultados({
  haFormularios,
  selecionado,
  paginaPedida,
}: {
  haFormularios: boolean;
  selecionado: FormularioNaLista | null;
  paginaPedida: number;
}) {
  const R = A.resultados;

  if (!haFormularios) {
    return <EstadoVazio titulo={R.vazio.titulo} descricao={R.vazio.descricao} />;
  }

  const dados = selecionado ? await buscarResultadosDoFormulario(selecionado.id) : null;
  if (!dados) {
    return <EstadoVazio titulo={R.naoEncontrado.titulo} descricao={R.naoEncontrado.descricao} />;
  }

  // Pedida agora e esperada só dentro do <Suspense>: os números aparecem sem esperar pela análise.
  const analise = analisarResultados(dados);

  const totalDeRespostas = dados.resultados.resumo.totalDeRespostas;
  const totalDePaginas = Math.max(1, Math.ceil(totalDeRespostas / RESPOSTAS_POR_PAGINA));
  // Uma página além da última (um link antigo, um número digitado) mostra a última.
  const pagina = Math.min(paginaPedida, totalDePaginas);
  const paginaDeRespostas =
    totalDeRespostas > 0 ? await listarRespostas({ formularioId: dados.formulario.id, pagina }) : null;
  const respostasDaPagina = paginaDeRespostas ? await comPerguntas(paginaDeRespostas.itens) : [];

  return (
    <>
      <CabecalhoDoFormulario formulario={dados.formulario} />

      <Secao
        id="dados"
        titulo={R.dados.titulo}
        descricao={R.dados.descricao}
        etiqueta={<Etiqueta tom="sucesso">{R.dados.etiqueta}</Etiqueta>}
      >
        <DadosDoFormulario resultados={dados.resultados} />
      </Secao>

      <Suspense fallback={<AnaliseCarregando />}>
        <AnaliseDosResultados analise={analise} />
      </Suspense>

      {paginaDeRespostas && (
        <Secao id="respostas" titulo={R.respostas.titulo} descricao={R.respostas.descricao}>
          <RespostasIndividuais
            formularioId={dados.formulario.id}
            respostas={respostasDaPagina}
            pagina={pagina}
            totalDePaginas={paginaDeRespostas.paginas}
          />
        </Secao>
      )}
    </>
  );
}

/** Qual formulário está em análise, em que situação está e para que serve. */
function CabecalhoDoFormulario({ formulario }: { formulario: FormularioComPerguntas }) {
  return (
    <div className="rounded-xl border border-border bg-superficie p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="text-xl font-semibold tracking-tight">{formulario.nome}</p>
        <Situacao situacao={formulario.situacao} />
      </div>
      {formulario.descricao && (
        <p className="mt-1 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{A.formularios.campos.objetivo}:</span> {formulario.descricao}
        </p>
      )}
    </div>
  );
}

/**
 * O formulário pedido na URL ou, sem pedido, o que tem mais respostas.
 * Um pedido que não corresponde a nenhum formulário devolve nulo — a tela
 * avisa, em vez de mostrar outro formulário como se fosse o pedido.
 */
function escolherFormulario(formularios: FormularioNaLista[], pedido: string | undefined): FormularioNaLista | null {
  if (!pedido) return escolherFormularioPadrao(formularios);
  return formularios.find((formulario) => formulario.id === pedido) ?? null;
}

function lerTexto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" && valor !== "" ? valor : undefined;
}

function lerNumeroDaPagina(valor: string | string[] | undefined): number {
  const numero = Number.parseInt(lerTexto(valor) ?? "1", 10);
  return Number.isFinite(numero) && numero > 1 ? numero : 1;
}
