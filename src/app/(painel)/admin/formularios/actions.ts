"use server";

import { revalidatePath } from "next/cache";
import type { SituacaoDoFormulario } from "@/dominio/formularios/status";
import type { DadosDoFormulario } from "@/dominio/formularios/tipos";
import { sessaoAtual } from "@/lib/admin/session";
import { log } from "@/lib/logger";
import {
  atualizarFormulario,
  criarFormulario,
  mudarSituacaoDoFormulario,
  publicarFormulario,
} from "@/servicos/formularios";
import { limparDadosDoFormulario, validarFormulario, type ErrosDoFormulario } from "@/validacoes/formulario";

/**
 * As ações do painel sobre formulários.
 *
 * Toda uma delas confere a sessão antes de qualquer coisa: esconder um botão
 * na tela não é autorização, e uma server action é um endereço como outro
 * qualquer. Sem sessão, nada acontece.
 */
export type ResultadoDoSalvamento =
  | { ok: true; id: string }
  | { ok: false; erros: ErrosDoFormulario }
  | { ok: false; mensagem: string };

const SEM_AUTORIZACAO: ResultadoDoSalvamento = { ok: false, mensagem: "Sua sessão expirou. Entre de novo." };

export async function salvarFormularioAction(
  id: string | null,
  dados: DadosDoFormulario,
  publicar: boolean,
): Promise<ResultadoDoSalvamento> {
  const sessao = await sessaoAtual();
  if (!sessao) return SEM_AUTORIZACAO;

  const limpos = limparDadosDoFormulario(dados);
  const erros = validarFormulario(limpos);
  const temErro =
    erros.nome || erros.descricao || erros.perguntas || Object.keys(erros.porPergunta).length > 0;
  if (temErro) return { ok: false, erros };

  const salvo = id ? await atualizarFormulario(id, limpos) : await criarFormulario(limpos);
  if (!salvo.ok) {
    log.warn("falha ao salvar formulário", { id, motivo: salvo.erro });
    return { ok: false, mensagem: "Não foi possível salvar. Tente de novo." };
  }

  if (publicar) {
    const publicado = await publicarFormulario(salvo.valor.id);
    if (!publicado.ok) return { ok: false, mensagem: "O formulário foi salvo, mas não pôde ser publicado." };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/formularios");
  revalidatePath(`/admin/formularios/${salvo.valor.id}`);
  log.info("formulário salvo", { id: salvo.valor.id, publicado: publicar });
  return { ok: true, id: salvo.valor.id };
}

export async function mudarSituacaoAction(
  id: string,
  situacao: SituacaoDoFormulario,
): Promise<{ ok: boolean }> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false };

  const resultado = await mudarSituacaoDoFormulario(id, situacao);
  if (!resultado.ok) {
    log.warn("falha ao mudar a situação do formulário", { id, situacao, motivo: resultado.erro });
    return { ok: false };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/formularios");
  revalidatePath(`/admin/formularios/${id}`);
  log.info("situação do formulário alterada", { id, situacao });
  return { ok: true };
}
