/**
 * As regras dos formulários.
 *
 * Aqui mora o que o produto decide: como nasce o endereço público, quando uma
 * edição vira uma versão nova, quem pode receber resposta. Onde os dados são
 * guardados não interessa a este arquivo — ele fala com o contrato de
 * `src/dominio/formularios/repositorio.ts`.
 */
import { deuCerto, deuErrado, type CodigoDeErro, type Resultado } from "@/dominio/erros";
import type { ModulosDoFormulario } from "@/dominio/formularios/modulos";
import { MODULOS_DESLIGADOS } from "@/dominio/formularios/modulos";
import { pedeDadosPessoais, type Pergunta } from "@/dominio/formularios/perguntas";
import { aceitaResposta } from "@/dominio/formularios/status";
import type { SituacaoDoFormulario } from "@/dominio/formularios/status";
import type {
  ConfiguracaoDaLoja,
  ConsentimentoPublico,
  DadosDoFormulario,
  Formulario,
  FormularioComPerguntas,
  FormularioNaLista,
  FormularioPublico,
} from "@/dominio/formularios/tipos";
import {
  situacaoDoControlador,
  type CampoDoControlador,
  type Controlador,
} from "@/dominio/privacidade/controlador";
import type { SessaoAdmin } from "@/lib/admin/session-token";
import { log, resumoDoErro } from "@/lib/logger";
import { CONTROLADOR } from "@/lib/marca";
import { USAR_MOCKS } from "@/lib/mock/config";
import { textoDaFinalidade, VERSAO_ATUAL } from "@/lib/texts/consentimento";
import { formulariosGravados, respostasGravadas, trilhaDeAuditoria } from "@/repositorios";
import { gerarSlug, slugAlternativo } from "@/utilitarios/slug";
import {
  configuracaoEstaValida,
  formularioEstaValido,
  limparConfiguracaoDaLoja,
  limparDadosDoFormulario,
  validarConfiguracaoDaLoja,
  validarFormulario,
  type ErrosDaConfiguracao,
} from "@/validacoes/formulario";

/** Quantos sufixos numéricos tentar antes de desistir de um endereço. */
const TENTATIVAS_DE_SLUG = 50;

/** O endereço que vai no cartão NFC e no QR Code. */
export function caminhoPublicoDoFormulario(slug: string): string {
  return `/f/${slug}`;
}

/**
 * O que a trava do controlador (D9) precisa saber do ambiente. Vem por
 * parâmetro, com o ambiente real como padrão, para os testes exercitarem a
 * produção sem mexer em `process.env`.
 */
export type AmbienteDaTrava = {
  /** Produção de verdade: `NODE_ENV=production` e modo de teste desligado (falha fechada). */
  producao: boolean;
  controlador: Controlador;
};

export function ambienteDaTrava(): AmbienteDaTrava {
  return { producao: process.env.NODE_ENV === "production" && !USAR_MOCKS, controlador: CONTROLADOR };
}

function travaValendo(pedeDados: boolean, ambiente: AmbienteDaTrava): boolean {
  return ambiente.producao && pedeDados && !situacaoDoControlador(ambiente.controlador).completo;
}

/** A lista do painel: cada formulário com o que ele já produziu. */
export async function listarFormularios(ambiente: AmbienteDaTrava = ambienteDaTrava()): Promise<FormularioNaLista[]> {
  const [formularios, totais] = await Promise.all([
    formulariosGravados.listar(),
    respostasGravadas.totaisPorFormulario(),
  ]);
  return Promise.all(
    formularios.map(async (formulario) => {
      const total = totais.get(formulario.id);
      const [perguntas, modulos] = await Promise.all([
        formulariosGravados.perguntasDaVersao(formulario.id, formulario.versaoAtual),
        formulariosGravados.modulosDaVersao(formulario.id, formulario.versaoAtual),
      ]);
      const pedeDados = pedeDadosPessoais(perguntas ?? []);
      return {
        ...formulario,
        totalDeRespostas: total?.total ?? 0,
        ultimaRespostaEm: total?.ultimaEm ?? null,
        modulos: modulos ?? { ...MODULOS_DESLIGADOS },
        pedeDadosPessoais: pedeDados,
        travado: travaValendo(pedeDados, ambiente),
      };
    }),
  );
}

export async function buscarFormularioPorId(id: string): Promise<FormularioComPerguntas | null> {
  return formulariosGravados.buscarPorId(id);
}

export type SituacaoDaPrivacidade = {
  /** Os dados da empresa responsável estão completos. */
  completo: boolean;
  pendentes: CampoDoControlador[];
  /** A trava vale neste ambiente (produção). Fora dela, o painel só avisa. */
  travaAtiva: boolean;
  /** Formulários (não arquivados) que pedem dado pessoal e dependem desses dados. */
  formulariosAfetados: { id: string; nome: string }[];
};

/** O estado do controlador e quem ele afeta, para o painel avisar o gerente. */
export async function situacaoDaPrivacidade(ambiente: AmbienteDaTrava = ambienteDaTrava()): Promise<SituacaoDaPrivacidade> {
  const { completo, pendentes } = situacaoDoControlador(ambiente.controlador);
  const lista = await listarFormularios(ambiente);
  return {
    completo,
    pendentes,
    travaAtiva: ambiente.producao,
    formulariosAfetados: lista
      .filter((f) => f.pedeDadosPessoais && f.situacao !== "ARQUIVADO")
      .map((f) => ({ id: f.id, nome: f.nome })),
  };
}

/** O formulário público junto do que só o servidor precisa (módulos completos e configuração da loja). */
export type FormularioParaEnvio = {
  publico: FormularioPublico;
  modulos: ModulosDoFormulario;
  configuracaoDaLoja: ConfiguracaoDaLoja;
};

/**
 * Resolve o formulário de um endereço público. Recusa formulário inexistente,
 * formulário que não está ativo e formulário travado (pede dado pessoal sem
 * os dados do controlador em produção) — a checagem é aqui, no servidor, não
 * na tela.
 */
export async function buscarFormularioParaEnvio(
  slug: string,
  ambiente: AmbienteDaTrava = ambienteDaTrava(),
): Promise<Resultado<FormularioParaEnvio>> {
  const formulario = await formulariosGravados.buscarPorSlug(slug);
  if (!formulario) return deuErrado("FORMULARIO_NAO_ENCONTRADO");
  if (!aceitaResposta(formulario.situacao)) return deuErrado("FORMULARIO_INATIVO");

  const [perguntasDaVersao, modulosDaVersao] = await Promise.all([
    formulariosGravados.perguntasDaVersao(formulario.id, formulario.versaoAtual),
    formulariosGravados.modulosDaVersao(formulario.id, formulario.versaoAtual),
  ]);
  if (!perguntasDaVersao || perguntasDaVersao.length === 0) return deuErrado("FORMULARIO_INATIVO");

  const modulos = modulosDaVersao ?? { ...MODULOS_DESLIGADOS };
  const config = formulario.configuracaoDaLoja;
  const perguntas = comObrigatoriedadeDaLoja(perguntasDaVersao, config);
  const pedeDados = pedeDadosPessoais(perguntas);

  if (travaValendo(pedeDados, ambiente)) {
    // Só os nomes dos campos pendentes: nunca os valores.
    log.error("formulário travado: dados do controlador incompletos", {
      slug,
      pendentes: situacaoDoControlador(ambiente.controlador).pendentes.join(","),
    });
    return deuErrado("FORMULARIO_TRAVADO");
  }

  const pedeWhatsapp = perguntas.some((p) => p.tipo === "whatsapp");
  return deuCerto({
    publico: {
      id: formulario.id,
      slug: formulario.slug,
      nome: formulario.nome,
      descricao: formulario.descricao,
      versao: formulario.versaoAtual,
      perguntas,
      modulos: {
        recompra: modulos.recompra,
        ofertas: modulos.ofertas,
        cupom: modulos.cupom !== null,
        indicacao: modulos.indicacao,
      },
      consentimento: pedeWhatsapp ? consentimentoPublico(modulos) : null,
      controlador: pedeDados
        ? {
            razaoSocial: ambiente.controlador.razaoSocial,
            cnpj: ambiente.controlador.cnpj,
            emailPrivacidade: ambiente.controlador.emailPrivacidade,
          }
        : null,
      pedeDadosPessoais: pedeDados,
    },
    modulos,
    configuracaoDaLoja: config,
  });
}

/** O que a tela pública recebe. Ver `buscarFormularioParaEnvio` para as recusas. */
export async function buscarFormularioPublicoPorSlug(
  slug: string,
  ambiente: AmbienteDaTrava = ambienteDaTrava(),
): Promise<Resultado<FormularioPublico>> {
  const encontrado = await buscarFormularioParaEnvio(slug, ambiente);
  return encontrado.ok ? deuCerto(encontrado.valor.publico) : encontrado;
}

/** A obrigatoriedade de WhatsApp e nome vem da loja; o `obrigatoria` da definição é ignorado. */
function comObrigatoriedadeDaLoja(perguntas: Pergunta[], config: ConfiguracaoDaLoja): Pergunta[] {
  return perguntas.map((pergunta) => {
    if (pergunta.tipo === "whatsapp") return { ...pergunta, obrigatoria: config.whatsappObrigatorio };
    if (pergunta.tipo === "nome") return { ...pergunta, obrigatoria: config.nomeObrigatorio };
    return pergunta;
  });
}

/** Só as finalidades ligadas, com o texto da versão atual. Lista vazia quando só há cupom ou indicação. */
function consentimentoPublico(modulos: ModulosDoFormulario): ConsentimentoPublico {
  const ligadas = [
    ...(modulos.recompra ? (["recompra"] as const) : []),
    ...(modulos.ofertas ? (["ofertas"] as const) : []),
  ];
  return {
    versao: VERSAO_ATUAL,
    finalidades: ligadas.flatMap((id) => {
      const rotulo = textoDaFinalidade(VERSAO_ATUAL, id);
      return rotulo ? [{ id, rotulo }] : [];
    }),
  };
}

export type ResultadoDaConfiguracao =
  | { ok: true; valor: Formulario }
  | { ok: false; erro: CodigoDeErro; erros?: ErrosDaConfiguracao };

/**
 * Salva a configuração da loja (brinde, obrigatoriedades, destino da indicação).
 * Não cria versão. Valida no servidor, com as mesmas travas da tela, e deixa
 * uma linha de auditoria com o antes e o depois ANTES de gravar: se a
 * auditoria falhar, nada é alterado.
 */
export async function salvarConfiguracaoDaLoja(
  id: string,
  dados: ConfiguracaoDaLoja,
  sessao: SessaoAdmin | null,
): Promise<ResultadoDaConfiguracao> {
  if (!sessao) return { ok: false, erro: "NAO_AUTORIZADO" };

  const formulario = await formulariosGravados.buscarPorId(id);
  if (!formulario) return { ok: false, erro: "FORMULARIO_NAO_ENCONTRADO" };

  const nova = limparConfiguracaoDaLoja(dados);
  const destino = nova.formularioDeIndicacaoId
    ? await formulariosGravados.buscarPorId(nova.formularioDeIndicacaoId)
    : null;

  const erros = validarConfiguracaoDaLoja(nova, {
    situacao: formulario.situacao,
    modulos: formulario.modulos,
    destinoGravadoId: formulario.configuracaoDaLoja.formularioDeIndicacaoId,
    destino: destino
      ? { situacao: destino.situacao, temWhatsapp: destino.perguntas.some((p) => p.tipo === "whatsapp") }
      : null,
  });
  if (!configuracaoEstaValida(erros)) return { ok: false, erro: "VALIDACAO_FALHOU", erros };

  try {
    await trilhaDeAuditoria.registrar({
      acao: "formulario_configurado",
      entidade: "formulario",
      entidadeId: id,
      usuarioId: sessao.id,
      metadados: { formularioId: id, antes: formulario.configuracaoDaLoja, depois: nova },
    });
    const salvo = await formulariosGravados.salvarConfiguracaoDaLoja(id, nova);
    if (!salvo) return { ok: false, erro: "FORMULARIO_NAO_ENCONTRADO" };
    return { ok: true, valor: salvo };
  } catch (erro) {
    log.error("falha ao salvar a configuração da loja", {
      formularioId: id,
      ...resumoDoErro(erro),
    });
    return { ok: false, erro: "FALHA_DE_PERSISTENCIA" };
  }
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
