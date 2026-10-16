import { sessaoAtual } from "@/lib/admin/session";
import { log, resumoDoErro } from "@/lib/logger";
import { exportarContatosCsv, lerFiltrosDeContatos, origemConfiavel } from "@/servicos/contatos";
import { listarFormularios } from "@/servicos/formularios";
import { A } from "@/lib/texts/admin";
import { FUSO_HORARIO } from "@/dominio/constantes";

/**
 * Exportação dos contatos em CSV.
 *
 * É POST de propósito: a exportação tem efeito (a auditoria) e entrega dado
 * pessoal, e um GET poderia ser disparado por prefetch ou por link de outro
 * site. Route Handlers não têm a conferência de origem das Server Actions,
 * então ela é feita aqui: sessão, depois Origin/Sec-Fetch-Site do mesmo site.
 *
 * Em caso de falha (inclusive a auditoria), nada é entregue: o navegador volta
 * para a tela de contatos, que mostra o aviso.
 */
export const dynamic = "force-dynamic";

/** Só estes campos voltam à tela em caso de erro: o corpo do POST nunca é repetido por inteiro. */
const CAMPOS_DOS_FILTROS = ["formulario", "origem", "mostrar", "ordem", "pagina"];

const SEM_CACHE = { "cache-control": "no-store" };

function voltarComErro(filtros: URLSearchParams): Response {
  const busca = new URLSearchParams();
  for (const campo of CAMPOS_DOS_FILTROS) {
    const valor = filtros.get(campo);
    if (valor) busca.set(campo, valor);
  }
  busca.set("erro", "exportar");
  // 303 para o navegador seguir com GET; caminho relativo para não depender do host visto pelo servidor.
  return new Response(null, { status: 303, headers: { ...SEM_CACHE, location: `/admin/contatos?${busca.toString()}` } });
}

export async function POST(request: Request): Promise<Response> {
  if (!origemConfiavel(request.headers)) {
    return new Response("Origem não permitida.", { status: 403, headers: SEM_CACHE });
  }
  const sessao = await sessaoAtual();
  if (!sessao) {
    return new Response("Sessão expirada.", { status: 401, headers: SEM_CACHE });
  }

  const campos = new URLSearchParams();
  try {
    const form = await request.formData();
    for (const [nome, valor] of form.entries()) {
      if (typeof valor === "string") campos.set(nome, valor);
    }
  } catch {
    return new Response("Pedido inválido.", { status: 400, headers: SEM_CACHE });
  }

  try {
    const formularios = await listarFormularios();
    const filtros = lerFiltrosDeContatos(
      Object.fromEntries(campos),
      formularios.map((formulario) => formulario.id),
    );
    const arquivo = await exportarContatosCsv(filtros, sessao);
    if (!arquivo) return new Response("Sessão expirada.", { status: 401, headers: SEM_CACHE });

    const dia = new Date().toLocaleDateString("en-CA", { timeZone: FUSO_HORARIO });
    return new Response(arquivo.csv, {
      status: 200,
      headers: {
        ...SEM_CACHE,
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="${A.contatos.exportar.nomeDoArquivo(dia)}"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (erro) {
    log.error("falha ao exportar contatos", { ...resumoDoErro(erro) });
    return voltarComErro(campos);
  }
}
