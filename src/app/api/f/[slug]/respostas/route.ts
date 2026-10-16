import { MENSAGEM_DO_ERRO, type CodigoDeErro } from "@/dominio/erros";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import { origemValida } from "@/dominio/respostas/tipos";
import { log, resumoDoErro } from "@/lib/logger";
import { extrairIp, hashIp } from "@/lib/security/ip-hash";
import { registrarResposta, type EnvioDeResposta } from "@/servicos/respostas";

export const dynamic = "force-dynamic";

/** A chave nasce de `crypto.randomUUID()` no navegador; qualquer outra coisa não é nossa. */
const FORMATO_DA_CHAVE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
 *
 * Exceção: o limite de envios por IP responde 429 com `Retry-After`. No envio
 * interativo, por ser menor que 500, a página não enfileira: a tela mantém as
 * respostas e pede para esperar. No REENVIO da fila (página e service worker)
 * o 429 é "pendente": o cadastro já foi aceito pela pessoa e não pode ser
 * descartado, então o item fica na fila e volta depois do `Retry-After`.
 *
 * O corpo é `{ chaveEnvio, valores, origem, ref?, consentimento? }`. O IP vem
 * só do cabeçalho — nunca do corpo — e só o hash dele é usado.
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
  const { chaveEnvio, valores, origem, ref, consentimento } = corpo as Record<string, unknown>;

  if (typeof chaveEnvio !== "string" || !FORMATO_DA_CHAVE.test(chaveEnvio)) return recusa("VALIDACAO_FALHOU", 400);
  if (typeof valores !== "object" || valores === null || Array.isArray(valores)) {
    return recusa("VALIDACAO_FALHOU", 400);
  }

  const consentimentoLido = lerConsentimento(consentimento);
  if (consentimentoLido === "invalido") return recusa("VALIDACAO_FALHOU", 400);

  try {
    const resultado = await registrarResposta(
      {
        // O slug vem do endereço, nunca do corpo: o corpo é do cliente.
        slug,
        chaveEnvio,
        valores: valores as Record<string, never>,
        origem: origemValida(typeof origem === "string" ? origem : null),
        ref: typeof ref === "string" ? ref : null,
        consentimento: consentimentoLido,
      },
      { ipHash: hashIp(extrairIp(request.headers)) },
    );

    if (!resultado.ok) {
      if (resultado.erro === "LIMITE_EXCEDIDO") {
        const segundos = resultado.tenteDeNovoEmSegundos ?? 60;
        const corpo: ResultadoDoEnvio = {
          ok: false,
          erro: resultado.erro,
          mensagem: MENSAGEM_DO_ERRO[resultado.erro],
          tenteDeNovoEmSegundos: segundos,
        };
        return Response.json(corpo, { status: 429, headers: { "Retry-After": String(segundos) } });
      }
      // Falha de gravação não é recusa prevista: 5xx faz a fila guardar o envio.
      if (resultado.erro === "FALHA_DE_PERSISTENCIA") return recusa("FALHA_DE_PERSISTENCIA", 503);
      const corpo: ResultadoDoEnvio = {
        ok: false,
        erro: resultado.erro,
        mensagem: MENSAGEM_DO_ERRO[resultado.erro],
        ...(resultado.porPergunta ? { porPergunta: resultado.porPergunta } : {}),
      };
      return Response.json(corpo, { status: 200 });
    }
    const resposta: ResultadoDoEnvio = {
      ok: true,
      jaEstavaRegistrada: resultado.valor.jaEstavaRegistrada,
      beneficios: resultado.valor.beneficios,
    };
    return Response.json(resposta, { headers: { "Cache-Control": "no-store" } });
  } catch (erro) {
    log.error("falha inesperada ao registrar resposta", {
      slug,
      ...resumoDoErro(erro),
    });
    // 5xx de propósito: é o que diz à fila offline para guardar e tentar depois.
    return recusa("FALHA_DE_PERSISTENCIA", 500);
  }
}

/** Ausente vale como nenhum; formato quebrado é recusa. A versão é conferida no serviço. */
function lerConsentimento(valor: unknown): EnvioDeResposta["consentimento"] | "invalido" {
  if (valor === undefined || valor === null) return null;
  if (typeof valor !== "object" || Array.isArray(valor)) return "invalido";
  const { versao, aceites } = valor as Record<string, unknown>;
  if (typeof versao !== "string") return "invalido";
  if (typeof aceites !== "object" || aceites === null || Array.isArray(aceites)) return "invalido";
  return { versao, aceites: aceites as Record<string, boolean> };
}

function recusa(erro: CodigoDeErro, status: number) {
  const corpo: ResultadoDoEnvio = { ok: false, erro, mensagem: MENSAGEM_DO_ERRO[erro] };
  return Response.json(corpo, { status });
}
