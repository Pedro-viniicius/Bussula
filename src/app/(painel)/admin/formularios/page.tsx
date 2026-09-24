import Link from "next/link";
import type { ReactNode } from "react";
import { Container, EstadoVazio } from "@/components/interface/primitivos";
import { Situacao } from "@/components/interface/situacao";
import { Quando } from "@/components/interface/tempo";
import { AcoesDeSituacao } from "@/components/formularios/acoes-de-situacao";
import { LinkPublico } from "@/components/formularios/link-publico";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { buttonVariants } from "@/components/ui/button";
import { EXPLICACAO_DA_SITUACAO, temLinkPublico } from "@/dominio/formularios/status";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import { caminhoPublicoDoFormulario, listarFormularios } from "@/servicos/formularios";
import { dataCurta } from "@/utilitarios/tempo";

export const dynamic = "force-dynamic";

/**
 * Formulários: o que está sendo coletado e como cada formulário está indo.
 *
 * São os formulários preparados para a loja pela equipe que cuida do sistema.
 * Esta tela não cria nem edita formulário — mostra o que existe, em que
 * situação está, quantas respostas recebeu e leva aos resultados.
 */
export default async function FormulariosPage() {
  await exigirAdmin("/admin/formularios");
  const formularios = await listarFormularios();
  const F = A.formularios;

  return (
    <>
      <TopoAdmin atual="formularios" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-4xl">
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{F.titulo}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">{F.subtitulo}</p>
          </header>

          <div className="mt-8">
            {formularios.length === 0 ? (
              <EstadoVazio titulo={F.vazio.titulo} descricao={F.vazio.descricao} />
            ) : (
              <ul className="space-y-4">
                {formularios.map((formulario) => (
                  <CartaoDoFormulario key={formulario.id} formulario={formulario} />
                ))}
              </ul>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}

function CartaoDoFormulario({ formulario }: { formulario: FormularioNaLista }) {
  const F = A.formularios;
  const idDoTitulo = `formulario-${formulario.id}-titulo`;

  return (
    <li
      id={`formulario-${formulario.id}`}
      aria-labelledby={idDoTitulo}
      className="scroll-mt-32 rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <h2 id={idDoTitulo} className="text-lg font-semibold tracking-tight">
          {formulario.nome}
        </h2>
        <Situacao situacao={formulario.situacao} />
      </div>
      {formulario.descricao && (
        <p className="mt-1 text-sm">
          <span className="font-medium">{F.campos.objetivo}:</span>{" "}
          <span className="text-muted-foreground">{formulario.descricao}</span>
        </p>
      )}
      <p className="mt-1 text-sm text-muted-foreground">{EXPLICACAO_DA_SITUACAO[formulario.situacao]}</p>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-4 sm:grid-cols-3">
        <Campo rotulo={F.campos.respostas}>
          <span className="tabular-nums">
            {formulario.totalDeRespostas > 0 ? F.respostas(formulario.totalDeRespostas) : F.semRespostas}
          </span>
        </Campo>
        <Campo rotulo={F.campos.ultimaResposta}>
          {formulario.ultimaRespostaEm ? <Quando data={formulario.ultimaRespostaEm} /> : F.campos.nenhumaAinda}
        </Campo>
        <Campo rotulo={F.campos.criadoEm}>{dataCurta(formulario.criadoEm)}</Campo>
      </dl>

      {temLinkPublico(formulario.situacao) && (
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium">{F.endereco.titulo}</p>
          <LinkPublico caminho={caminhoPublicoDoFormulario(formulario.slug)} />
          <p className="mt-1.5 text-xs text-muted-foreground">{F.endereco.ajuda}</p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-start gap-2">
        <Link
          href={`/admin/resultados?formulario=${encodeURIComponent(formulario.id)}`}
          className={buttonVariants({ size: "sm" })}
        >
          {F.acoes.verResultados}
        </Link>
        <AcoesDeSituacao id={formulario.id} situacao={formulario.situacao} />
      </div>
    </li>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{rotulo}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}
