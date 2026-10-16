"use server";

import { revalidatePath } from "next/cache";
import { lojaPodeMudarSituacao, type SituacaoDoFormulario } from "@/dominio/formularios/status";
import { sessaoAtual } from "@/lib/admin/session";
import { log } from "@/lib/logger";
import type { ConfiguracaoDaLoja } from "@/dominio/formularios/tipos";
import type { ErrosDaConfiguracao } from "@/validacoes/formulario";
import {
  buscarFormularioPorId,
  mudarSituacaoDoFormulario,
  salvarConfiguracaoDaLoja,
} from "@/servicos/formularios";

/**
 * Ações do painel sobre formulários: pausar, retomar e arquivar (esta) e salvar
 * a configuração da loja (mais abaixo).
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

/** O que a tela recebe de volta ao salvar a configuração. Só o necessário: nenhum registro do banco. */
export type ResultadoDoSalvar =
  | { ok: true }
  | {
      ok: false;
      /** Erros por campo, devolvidos pelo servidor (as travas valem aqui, não só na tela). */
      erros?: ErrosDaConfiguracao;
      /** Falha sem campo a apontar: o formulário sumiu, a sessão caiu, o banco falhou. */
      geral?: boolean;
    };

const FORMATO_DO_ID = /^[A-Za-z0-9_-]{1,64}$/;
/** Folga acima de MAIOR_TEXTO_DO_BRINDE: o excesso é recusado pela validação, não cortado. */
const LIMITE_DE_ENTRADA_DO_BRINDE = 1_000;

/**
 * Lê o que chegou como dado não confiável. Server Action é um endereço
 * público: tipos errados viram `null` (recusa), nunca um valor "consertado".
 */
function lerConfiguracao(bruto: unknown): ConfiguracaoDaLoja | null {
  if (typeof bruto !== "object" || bruto === null) return null;
  const c = bruto as Record<string, unknown>;
  const { textoDoBrinde, nomeObrigatorio, whatsappObrigatorio, formularioDeIndicacaoId } = c;

  if (typeof nomeObrigatorio !== "boolean" || typeof whatsappObrigatorio !== "boolean") return null;
  if (textoDoBrinde !== null && typeof textoDoBrinde !== "string") return null;
  if (typeof textoDoBrinde === "string" && textoDoBrinde.length > LIMITE_DE_ENTRADA_DO_BRINDE) return null;
  if (formularioDeIndicacaoId !== null) {
    if (typeof formularioDeIndicacaoId !== "string" || !FORMATO_DO_ID.test(formularioDeIndicacaoId)) return null;
  }
  return { textoDoBrinde, nomeObrigatorio, whatsappObrigatorio, formularioDeIndicacaoId };
}

/**
 * Salva a configuração da loja de um formulário (brinde, obrigatoriedades,
 * destino da indicação). Não cria versão.
 *
 * A sessão é conferida aqui dentro. As travas (nome exige WhatsApp, destino
 * ativo com WhatsApp, só ativo ou em preparação) e a auditoria estão no
 * serviço; esta ação só repassa o que ele devolve.
 */
export async function salvarConfiguracaoAction(id: string, dados: ConfiguracaoDaLoja): Promise<ResultadoDoSalvar> {
  const sessao = await sessaoAtual();
  if (!sessao) return { ok: false, geral: true };

  const configuracao = lerConfiguracao(dados);
  if (typeof id !== "string" || !FORMATO_DO_ID.test(id) || !configuracao) return { ok: false, geral: true };

  const resultado = await salvarConfiguracaoDaLoja(id, configuracao, sessao);
  if (!resultado.ok) {
    if (resultado.erros) return { ok: false, erros: resultado.erros };
    log.warn("configuração do formulário não foi salva", { id, motivo: resultado.erro });
    return { ok: false, geral: true };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/formularios");
  log.info("configuração do formulário salva", { id });
  return { ok: true };
}
