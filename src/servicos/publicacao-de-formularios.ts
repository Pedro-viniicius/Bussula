/**
 * Publicação dos formulários a partir do arquivo de definição.
 *
 * Alimenta o script `scripts/publicar-formularios.ts`. Regras:
 * - o slug é explícito e estável (vai gravado no chip NFC);
 * - idempotente: definição igual ao que está no ar não muda nada; diferente
 *   grava uma versão nova; `publicar` põe no ar (ATIVO);
 * - formulário arquivado é recusado, nunca ressuscitado;
 * - nunca arquiva nem altera o que não está no arquivo;
 * - não toca na configuração da loja (brinde, obrigatoriedades, destino da
 *   indicação são do gerente);
 * - formulário INATIVO (pausado pela loja) não é reativado: a nova versão é
 *   gravada, mas ele segue pausado e o relatório avisa;
 * - a validação é tudo ou nada: se o arquivo for inválido ou qualquer
 *   formulário for recusado, nada é gravado. A APLICAÇÃO, porém, não é
 *   transacional: se o banco falhar no meio, os formulários anteriores já
 *   foram gravados. É seguro rodar de novo — o que já está igual não muda.
 */
import type { ModulosDoFormulario } from "@/dominio/formularios/modulos";
import type { Pergunta } from "@/dominio/formularios/perguntas";
import type { SituacaoDoFormulario } from "@/dominio/formularios/status";
import { formulariosGravados } from "@/repositorios";
import { lerDefinicoes, type DefinicaoDeFormulario } from "@/validacoes/definicao-de-formulario";

export type AcaoDaPublicacao = "CRIAR" | "NOVA_VERSAO" | "SEM_MUDANCA" | "RECUSADO";

export type ResultadoDaPublicacao = {
  slug: string;
  acao: AcaoDaPublicacao;
  /** Verdadeiro quando a situação vai (ou foi) para ATIVO. */
  poeNoAr: boolean;
  /** Situação que o formulário tem hoje; nula quando ele ainda não existe. */
  situacaoAtual: SituacaoDoFormulario | null;
  /** Verdadeiro quando o arquivo pede para publicar mas o formulário está INATIVO: o script não o reativa. */
  naoReativado?: boolean;
  /** Por que foi recusado. */
  motivo?: string;
  /** Verdadeiro quando a gravação aconteceu de fato. */
  aplicado: boolean;
};

export type RelatorioDaPublicacao =
  | { ok: false; erros: string[] }
  | {
      ok: true;
      avisos: string[];
      resultados: ResultadoDaPublicacao[];
      /** Algum formulário foi recusado: nada foi gravado. */
      recusado: boolean;
    };

/** JSON com as chaves em ordem fixa, para comparar sem depender da ordem. */
function canonico(valor: unknown): string {
  if (Array.isArray(valor)) return `[${valor.map(canonico).join(",")}]`;
  if (valor && typeof valor === "object") {
    const objeto = valor as Record<string, unknown>;
    return `{${Object.keys(objeto)
      .sort()
      .map((chave) => `${JSON.stringify(chave)}:${canonico(objeto[chave])}`)
      .join(",")}}`;
  }
  return JSON.stringify(valor ?? null);
}

function perguntasIguais(a: Pergunta[], b: Pergunta[]): boolean {
  return canonico(a) === canonico(b);
}

function modulosIguais(a: ModulosDoFormulario, b: ModulosDoFormulario): boolean {
  return canonico(a) === canonico(b);
}

type Plano = { definicao: DefinicaoDeFormulario; resultado: ResultadoDaPublicacao; idExistente: string | null };

async function planejar(definicao: DefinicaoDeFormulario): Promise<Plano> {
  const existente = await formulariosGravados.buscarPorSlug(definicao.slug);
  if (!existente) {
    return {
      definicao,
      idExistente: null,
      resultado: {
        slug: definicao.slug,
        acao: "CRIAR",
        poeNoAr: definicao.publicar,
        situacaoAtual: null,
        aplicado: false,
      },
    };
  }

  const base = { slug: definicao.slug, situacaoAtual: existente.situacao, aplicado: false };
  if (existente.situacao === "ARQUIVADO") {
    return {
      definicao,
      idExistente: existente.id,
      resultado: {
        ...base,
        acao: "RECUSADO",
        poeNoAr: false,
        motivo: "o formulário está arquivado e o script não reativa arquivados. Use outro slug.",
      },
    };
  }

  const atual = await formulariosGravados.buscarPorId(existente.id);
  const igual =
    atual !== null &&
    atual.nome === definicao.nome &&
    atual.descricao === definicao.descricao &&
    perguntasIguais(atual.perguntas, definicao.perguntas) &&
    modulosIguais(atual.modulos, definicao.modulos);

  return {
    definicao,
    idExistente: existente.id,
    resultado: {
      ...base,
      acao: igual ? "SEM_MUDANCA" : "NOVA_VERSAO",
      poeNoAr: definicao.publicar && existente.situacao !== "ATIVO" && existente.situacao !== "INATIVO",
      ...(definicao.publicar && existente.situacao === "INATIVO" ? { naoReativado: true } : {}),
    },
  };
}

/**
 * Compara cada definição com o que está gravado e, com `aplicar`, grava.
 * Sem `aplicar` é só simulação: nada é escrito.
 */
export async function sincronizarDefinicoes(
  definicoes: DefinicaoDeFormulario[],
  { aplicar }: { aplicar: boolean },
): Promise<{ resultados: ResultadoDaPublicacao[]; recusado: boolean }> {
  const planos: Plano[] = [];
  for (const definicao of definicoes) planos.push(await planejar(definicao));

  const recusado = planos.some((p) => p.resultado.acao === "RECUSADO");
  if (!aplicar || recusado) return { resultados: planos.map((p) => p.resultado), recusado };

  for (const plano of planos) {
    const { definicao, resultado } = plano;
    const dados = {
      nome: definicao.nome,
      descricao: definicao.descricao,
      perguntas: definicao.perguntas,
      modulos: definicao.modulos,
    };
    let id = plano.idExistente;
    if (resultado.acao === "CRIAR") {
      id = (await formulariosGravados.criar({ slug: definicao.slug, ...dados })).id;
    } else if (resultado.acao === "NOVA_VERSAO" && id) {
      await formulariosGravados.salvarNovaVersao(id, dados);
    }
    if (resultado.poeNoAr && id) await formulariosGravados.mudarSituacao(id, "ATIVO");
    resultado.aplicado = true;
  }
  return { resultados: planos.map((p) => p.resultado), recusado: false };
}

/** Lê o texto do arquivo, valida tudo e sincroniza. Arquivo inválido: nenhuma escrita. */
export async function publicarDoTexto(texto: string, opcoes: { aplicar: boolean }): Promise<RelatorioDaPublicacao> {
  const leitura = lerDefinicoes(texto);
  if (!leitura.ok) return { ok: false, erros: leitura.erros };
  const { resultados, recusado } = await sincronizarDefinicoes(leitura.definicoes, opcoes);
  return { ok: true, avisos: leitura.avisos, resultados, recusado };
}
