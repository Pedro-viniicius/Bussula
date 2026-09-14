import { processarEnvio } from "@/lib/leads/enviar";
import { log } from "@/lib/logger";
import { M } from "@/lib/texts/messages";

export const dynamic = "force-dynamic";

/**
 * Lead intake. Semantic failures (validation, duplicate, closed event, rate
 * limit) are 200 with ok:false — the client must show them, not retry them.
 * Only a real server failure is 5xx, which is what the offline queue keys on.
 */
export async function POST(request: Request, { params }: RouteContext<"/api/f/[slug]/leads">) {
  const { slug } = await params;
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, motivo: "invalido", erro: M.erros.generico }, { status: 400 });
  }
  try {
    return Response.json(await processarEnvio(slug, corpo, request.headers));
  } catch (err) {
    log.error("falha ao gravar lead", { slug, erro: err instanceof Error ? err.message : String(err) });
    return Response.json({ ok: false, motivo: "falha", erro: M.erros.generico }, { status: 500 });
  }
}
