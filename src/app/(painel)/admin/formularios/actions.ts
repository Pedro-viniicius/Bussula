"use server";

import { revalidatePath } from "next/cache";
import { lojaPodeMudarSituacao, type SituacaoDoFormulario } from "@/dominio/formularios/status";
import { sessaoAtual } from "@/lib/admin/session";
import { log } from "@/lib/logger";
import { buscarFormularioPorId, mudarSituacaoDoFormulario } from "@/servicos/formularios";

/**
 * A única ação do painel sobre formulários: pausar, retomar e arquivar.
 *
 * Criar e editar formulários não passa mais pelo painel — é trabalho da
 * equipe que cuida do sistema. Por isso esta ação confere duas coisas antes
 * de tudo: a sessão (uma server action é um endereço como outro qualquer) e se
 * a mudança pedida é uma das que a loja pode fazer. Sem as duas, nada muda.
 */
export async function mudarSituacaoAction(
  id: string,
  situacao: SituacaoDoFormulario,
): Promise<{ ok: boolean }> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false };

  const formulario = await buscarFormularioPorId(id);
  if (!formulario) return { ok: false };

  if (!lojaPodeMudarSituacao(formulario.situacao, situacao)) {
    log.warn("mudança de situação recusada", { id, de: formulario.situacao, para: situacao });
    return { ok: false };
  }

  const resultado = await mudarSituacaoDoFormulario(id, situacao);
  if (!resultado.ok) {
    log.warn("falha ao mudar a situação do formulário", { id, situacao, motivo: resultado.erro });
    return { ok: false };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/formularios");
  revalidatePath("/admin/resultados");
  log.info("situação do formulário alterada", { id, situacao });
  return { ok: true };
}
