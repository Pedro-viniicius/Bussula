/**
 * As regras dos formulários.
 *
 * Aqui mora o que o produto decide: como nasce o endereço público, quando uma
 * edição vira uma versão nova, quem pode receber resposta. Onde os dados são
 * guardados não interessa a este arquivo — ele fala com o contrato de
 * `src/dominio/formularios/repositorio.ts`.
 */
import { deuCerto, deuErrado, type Resultado } from "@/dominio/erros";
import { aceitaResposta } from "@/dominio/formularios/status";
import type { SituacaoDoFormulario } from "@/dominio/formularios/status";
import type {
  DadosDoFormulario,
  Formulario,
  FormularioComPerguntas,
  FormularioNaLista,
  FormularioPublico,
} from "@/dominio/formularios/tipos";
import { formulariosGravados, respostasGravadas } from "@/repositorios";
import { gerarSlug, slugAlternativo } from "@/utilitarios/slug";
import { formularioEstaValido, limparDadosDoFormulario, validarFormulario } from "@/validacoes/formulario";

/** Quantos sufixos numéricos tentar antes de desistir de um endereço. */
const TENTATIVAS_DE_SLUG = 50;

/** O endereço que vai no cartão NFC e no QR Code. */
export function caminhoPublicoDoFormulario(slug: string): string {
  return `/f/${slug}`;
}

/** A lista do painel: cada formulário com o que ele já produziu. */
export async function listarFormularios(): Promise<FormularioNaLista[]> {
  const [formularios, totais] = await Promise.all([
    formulariosGravados.listar(),
    respostasGravadas.totaisPorFormulario(),
  ]);
  return formularios.map((formulario) => {
    const total = totais.get(formulario.id);
    return {
      ...formulario,
      totalDeRespostas: total?.total ?? 0,
      ultimaRespostaEm: total?.ultimaEm ?? null,
    };
  });
}

export async function buscarFormularioPorId(id: string): Promise<FormularioComPerguntas | null> {
  return formulariosGravados.buscarPorId(id);
}

/**
 * O que a tela pública recebe. Recusa formulário inexistente e formulário que
 * não está ativo — a checagem é aqui, no servidor, não na tela.
 */
export async function buscarFormularioPublicoPorSlug(slug: string): Promise<Resultado<FormularioPublico>> {
  const formulario = await formulariosGravados.buscarPorSlug(slug);
  if (!formulario) return deuErrado("FORMULARIO_NAO_ENCONTRADO");
  if (!aceitaResposta(formulario.situacao)) return deuErrado("FORMULARIO_INATIVO");

  const perguntas = await formulariosGravados.perguntasDaVersao(formulario.id, formulario.versaoAtual);
  if (!perguntas || perguntas.length === 0) return deuErrado("FORMULARIO_INATIVO");

  return deuCerto({
    id: formulario.id,
    slug: formulario.slug,
    nome: formulario.nome,
    descricao: formulario.descricao,
    versao: formulario.versaoAtual,
    perguntas,
  });
}

/*
 * Criar, editar e publicar.
 *
 * Nenhuma tela do painel chama estas funções: os formulários são preparados
 * e configurados pela equipe que cuida do sistema, não pela loja. Elas
 * continuam aqui, com as mesmas regras, para as ferramentas internas dessa
 * equipe — e para que um formulário nunca seja gravado sem passar por elas.
 */

export async function criarFormulario(dados: DadosDoFormulario): Promise<Resultado<Formulario>> {
  const limpos = limparDadosDoFormulario(dados);
  if (!formularioEstaValido(validarFormulario(limpos))) return deuErrado("VALIDACAO_FALHOU");

  const slug = await escolherSlugLivre(gerarSlug(limpos.nome));
  const criado = await formulariosGravados.criar({ slug, ...limpos });
  return deuCerto(criado);
}

/**
 * Editar um formulário grava uma versão nova em vez de reescrever a atual.
 * As respostas já recebidas continuam apontando para a versão em que foram
 * dadas, e por isso continuam fazendo sentido.
 */
export async function atualizarFormulario(
  id: string,
  dados: DadosDoFormulario,
): Promise<Resultado<Formulario>> {
  const limpos = limparDadosDoFormulario(dados);
  if (!formularioEstaValido(validarFormulario(limpos))) return deuErrado("VALIDACAO_FALHOU");

  const atualizado = await formulariosGravados.salvarNovaVersao(id, limpos);
  if (!atualizado) return deuErrado("FORMULARIO_NAO_ENCONTRADO");
  return deuCerto(atualizado);
}

/** Põe no ar. Só publica o que tem pergunta válida. */
export async function publicarFormulario(id: string): Promise<Resultado<Formulario>> {
  const formulario = await formulariosGravados.buscarPorId(id);
  if (!formulario) return deuErrado("FORMULARIO_NAO_ENCONTRADO");
  if (!formularioEstaValido(validarFormulario(formulario))) return deuErrado("VALIDACAO_FALHOU");
  return mudarSituacaoDoFormulario(id, "ATIVO");
}

export async function mudarSituacaoDoFormulario(
  id: string,
  situacao: SituacaoDoFormulario,
): Promise<Resultado<Formulario>> {
  const atualizado = await formulariosGravados.mudarSituacao(id, situacao);
  if (!atualizado) return deuErrado("FORMULARIO_NAO_ENCONTRADO");
  return deuCerto(atualizado);
}

/** "experiencia-na-loja", "experiencia-na-loja-2", "experiencia-na-loja-3"… */
async function escolherSlugLivre(base: string): Promise<string> {
  if (await formulariosGravados.slugEstaLivre(base)) return base;
  for (let tentativa = 2; tentativa <= TENTATIVAS_DE_SLUG; tentativa++) {
    const alternativo = slugAlternativo(base, tentativa);
    if (await formulariosGravados.slugEstaLivre(alternativo)) return alternativo;
  }
  // Improvável: cinquenta formulários com o mesmo nome. Um sufixo de tempo resolve.
  return slugAlternativo(base, Date.now());
}
