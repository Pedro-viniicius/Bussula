import { MENSAGEM_DO_ERRO, type CodigoDeErro } from "@/dominio/erros";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import { origemValida } from "@/dominio/respostas/tipos";
import { log } from "@/lib/logger";
import { registrarResposta } from "@/servicos/respostas";

export const dynamic = "force-dynamic";

/**
 * A entrada das respostas.
 *
 * Uma rota, e não uma server action, porque a fila offline (na página e no
 * service worker) precisa poder repetir exatamente a mesma requisição depois,
 * possivelmente com a aba já fechada.
 *
 * Recusa prevista responde 200 com `ok: false` — é coisa para a tela mostrar,
 * não para tentar de novo. Só falha real de servidor responde 5xx, que é o
 * que faz a fila guardar o envio para mais tarde.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/f/[slug]/respostas">) {
  const { slug } = await params;

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return recusa("VALIDACAO_FALHOU", 400);
  }

  if (typeof corpo !== "object" || corpo === null) return recusa("VALIDACAO_FALHOU", 400);
  const { chaveEnvio, valores, origem } = corpo as Record<string, unknown>;

  if (typeof chaveEnvio !== "string" || !chaveEnvio) return recusa("VALIDACAO_FALHOU", 400);
  if (typeof valores !== "object" || valores === null || Array.isArray(valores)) {
    return recusa("VALIDACAO_FALHOU", 400);
  }

  try {
    const resultado = await registrarResposta({
      // O slug vem do endereço, nunca do corpo: o corpo é do cliente.
      slug,
      chaveEnvio,
      valores: valores as Record<string, never>,
      origem: origemValida(typeof origem === "string" ? origem : null),
    });

    if (!resultado.ok) return recusa(resultado.erro, 200);
    const resposta: ResultadoDoEnvio = { ok: true, jaEstavaRegistrada: resultado.valor.jaEstavaRegistrada };
    return Response.json(resposta);
  } catch (erro) {
    log.error("falha inesperada ao registrar resposta", {
      slug,
      erro: erro instanceof Error ? erro.message : String(erro),
    });
    // 5xx de propósito: é o que diz à fila offline para guardar e tentar depois.
    return recusa("FALHA_DE_PERSISTENCIA", 500);
  }
}

function recusa(erro: CodigoDeErro, status: number) {
  const corpo: ResultadoDoEnvio = { ok: false, erro, mensagem: MENSAGEM_DO_ERRO[erro] };
  return Response.json(corpo, { status });
}
