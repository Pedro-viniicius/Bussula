import Link from "next/link";
import type { ReactNode } from "react";
import { Container, EstadoVazio, Etiqueta } from "@/components/interface/primitivos";
import { Situacao } from "@/components/interface/situacao";
import { Quando } from "@/components/interface/tempo";
import { AcoesDeSituacao } from "@/components/formularios/acoes-de-situacao";
import { AvisoDeTravado } from "@/components/formularios/aviso-de-travado";
import { ConfiguracaoDoFormulario } from "@/components/formularios/configuracao-do-formulario";
import { LinkPublico } from "@/components/formularios/link-publico";
import { TopoAdmin } from "@/components/navegacao/topo-admin";
import { buttonVariants } from "@/components/ui/button";
import { EXPLICACAO_DA_SITUACAO, temLinkPublico } from "@/dominio/formularios/status";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import { exigirAdmin } from "@/lib/admin/session";
import { A } from "@/lib/texts/admin";
import {
  buscarFormularioPorId,
  caminhoPublicoDoFormulario,
  listarFormularios,
  situacaoDaPrivacidade,
} from "@/servicos/formularios";
import { dataCurta } from "@/utilitarios/tempo";

export const dynamic = "force-dynamic";

/**
 * Formulários: o que está sendo coletado e como cada formulário está indo.
 *
 * São os formulários preparados para a loja pela equipe que cuida do sistema.
 * Esta tela não cria nem altera as perguntas — mostra o que existe, em que
 * situação está, quantas respostas recebeu e leva aos resultados. Os módulos
 * aparecem só para leitura; a loja ajusta apenas a configuração (brinde,
 * obrigatoriedades, destino da indicação), que não cria versão nova.
 */
export default async function FormulariosPage() {
  await exigirAdmin("/admin/formularios");
  const [formularios, privacidade] = await Promise.all([listarFormularios(), situacaoDaPrivacidade()]);
  const F = A.formularios;

  // As perguntas de cada formulário: saber quem tem nome/WhatsApp e quem pode ser destino de indicação.
  const detalhes = new Map(
    (await Promise.all(formularios.map((f) => buscarFormularioPorId(f.id))))
      .filter((d) => d !== null)
      .map((d) => [d.id, d] as const),
  );
  const temWhatsapp = (id: string) => detalhes.get(id)?.perguntas.some((p) => p.tipo === "whatsapp") ?? false;
  const destinosAtivos = formularios
    .filter((f) => f.situacao === "ATIVO" && temWhatsapp(f.id))
    .map((f) => ({ id: f.id, nome: f.nome }));

  return (
    <>
      <TopoAdmin atual="formularios" />
      <main id="conteudo" className="flex-1 py-6 sm:py-8">
        <Container className="max-w-4xl">
          <header>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{F.titulo}</h1>
            <p className="mt-1 max-w-2xl text-muted-foreground">{F.subtitulo}</p>
          </header>

          <div className="mt-6">
            <AvisoDeTravado situacao={privacidade} />
          </div>

          <div className="mt-8">
            {formularios.length === 0 ? (
              <EstadoVazio titulo={F.vazio.titulo} descricao={F.vazio.descricao} />
            ) : (
              <ul className="space-y-4">
                {formularios.map((formulario) => (
                  <CartaoDoFormulario
                    key={formulario.id}
                    formulario={formulario}
                    temPerguntaDeNome={detalhes.get(formulario.id)?.perguntas.some((p) => p.tipo === "nome") ?? false}
                    temPerguntaDeWhatsapp={temWhatsapp(formulario.id)}
                    destinosPossiveis={destinosAtivos.filter((d) => d.id !== formulario.id)}
                    destinoForaDoAr={destinoForaDoAr(formulario, destinosAtivos, formularios)}
                  />
                ))}
              </ul>
            )}
          </div>
        </Container>
      </main>
    </>
  );
}

/** O destino da indicação salvo, quando ele existe mas deixou de estar ativo com WhatsApp. */
function destinoForaDoAr(
  formulario: FormularioNaLista,
  ativos: { id: string; nome: string }[],
  todos: FormularioNaLista[],
): { id: string; nome: string } | null {
  const id = formulario.configuracaoDaLoja.formularioDeIndicacaoId;
  if (!id || ativos.some((a) => a.id === id)) return null;
  const encontrado = todos.find((f) => f.id === id);
  return encontrado ? { id, nome: encontrado.nome } : null;
}

const MODULOS_NA_ORDEM = ["recompra", "ofertas", "cupom", "indicacao"] as const;

function CartaoDoFormulario({
  formulario,
  temPerguntaDeNome,
  temPerguntaDeWhatsapp,
  destinosPossiveis,
  destinoForaDoAr,
}: {
  formulario: FormularioNaLista;
  temPerguntaDeNome: boolean;
  temPerguntaDeWhatsapp: boolean;
  destinosPossiveis: { id: string; nome: string }[];
  destinoForaDoAr: { id: string; nome: string } | null;
}) {
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
        <div className="flex flex-wrap items-center gap-2">
          {formulario.travado && <Etiqueta tom="perigo">{F.travado.etiqueta}</Etiqueta>}
          <Situacao situacao={formulario.situacao} />
        </div>
      </div>
      {formulario.descricao && (
        <p className="mt-1 text-sm">
          <span className="font-medium">{F.campos.objetivo}:</span>{" "}
          <span className="text-muted-foreground">{formulario.descricao}</span>
        </p>
      )}
      <p className="mt-1 text-sm text-muted-foreground">
        {formulario.travado ? F.travado.explicacao : EXPLICACAO_DA_SITUACAO[formulario.situacao]}
      </p>

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

      <SecaoDeModulos formulario={formulario}>
        <ConfiguracaoDoFormulario
          id={formulario.id}
          editavel={formulario.situacao === "ATIVO" || formulario.situacao === "RASCUNHO"}
          configuracao={formulario.configuracaoDaLoja}
          cupomLigado={formulario.modulos.cupom !== null}
          indicacaoLigada={formulario.modulos.indicacao}
          temPerguntaDeNome={temPerguntaDeNome}
          temPerguntaDeWhatsapp={temPerguntaDeWhatsapp}
          destinosPossiveis={destinosPossiveis}
          destinoForaDoAr={destinoForaDoAr}
        />
      </SecaoDeModulos>

      {temLinkPublico(formulario.situacao) && (
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium">{F.endereco.titulo}</p>
          <LinkPublico caminho={caminhoPublicoDoFormulario(formulario.slug)} />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {formulario.travado ? F.travado.linkNaoAbre : F.endereco.ajuda}
          </p>
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

/** Os módulos do formulário, só para leitura, e logo abaixo a configuração da loja. */
function SecaoDeModulos({ formulario, children }: { formulario: FormularioNaLista; children: ReactNode }) {
  const M = A.formularios.modulos;
  const idDoTitulo = `formulario-${formulario.id}-modulos`;
  const ligado = {
    recompra: formulario.modulos.recompra,
    ofertas: formulario.modulos.ofertas,
    cupom: formulario.modulos.cupom !== null,
    indicacao: formulario.modulos.indicacao,
  };
  const algumLigado = MODULOS_NA_ORDEM.some((chave) => ligado[chave]);

  return (
    <section aria-labelledby={idDoTitulo} className="mt-4 border-t border-border pt-4">
      <h3 id={idDoTitulo} className="text-sm font-medium">
        {M.titulo}
      </h3>
      {algumLigado ? (
        <>
          <ul className="mt-2 space-y-2">
            {MODULOS_NA_ORDEM.map((chave) => (
              <li key={chave} className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{M.lista[chave].rotulo}</p>
                  <p className="text-xs text-muted-foreground">{M.lista[chave].descricao}</p>
                </div>
                <Etiqueta tom={ligado[chave] ? "sucesso" : "neutro"}>{ligado[chave] ? M.ligado : M.desligado}</Etiqueta>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">{M.definidosPelaEquipe}</p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">{M.nenhum}</p>
      )}
      {children}
    </section>
  );
}
