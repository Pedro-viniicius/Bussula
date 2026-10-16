"use server";

import type { ContatoRevelado } from "@/dominio/contatos/tipos";
import { sessaoAtual } from "@/lib/admin/session";
import { log, resumoDoErro } from "@/lib/logger";
import { revelarContato } from "@/servicos/contatos";

/** Id de contato: o formato de UUID do banco ou o id curto dos dados de teste. Nada além disso entra na consulta. */
const FORMATO_DO_ID = /^[A-Za-z0-9_-]{1,64}$/;

/**
 * Revela nome e telefone de um contato.
 *
 * Uma Server Action é um endereço como outro qualquer: a sessão é conferida
 * aqui dentro, e não só na página que a exibe. O serviço grava a auditoria
 * antes de devolver; se ela falhar, o erro é capturado e nada é revelado
 * (a tela mostra "Não foi possível revelar agora").
 */
export async function revelarContatoAction(id: string): Promise<ContatoRevelado | null> {
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  if (typeof id !== "string" || !FORMATO_DO_ID.test(id)) return null;

  try {
    return await revelarContato(id, sessao);
  } catch (erro) {
    log.error("falha ao revelar contato", { id, ...resumoDoErro(erro) });
    return null;
  }
}
