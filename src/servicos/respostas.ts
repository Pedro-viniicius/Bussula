/**
 * O caminho de uma resposta de cliente, do toque no cartão até o painel.
 *
 * `registrarResposta` é a composição dos passos, em ordem, cada um com uma
 * saída previsível:
 *
 *   carregar o formulário (com a trava) → validar as respostas
 *   → separar o dado pessoal → chave já existe? → limite por IP
 *   → resolver a indicação → decidir cupom e indicação
 *   → gravar (resposta e contato juntos) → montar o que a pessoa ganhou
 *
 * Nome e WhatsApp NUNCA entram em `respostas.valores`: viram o contato.
 */
import {
  FUSO_HORARIO,
  INTERVALO_DA_LIMPEZA_DO_IP_HASH_MS,
  RESPOSTAS_POR_PAGINA,
  RETENCAO_DO_IP_HASH_MS,
  VALIDADE_DO_CUPOM_DIAS,
} from "@/dominio/constantes";
import { codigoDeIndicacaoValido, gerarCodigoDeIndicacao, gerarCodigoDoCupom } from "@/dominio/contatos/codigos";
import { ConflitoDeContato } from "@/dominio/contatos/repositorio";
import type { ContatoGravado, ContatoParaGravar, Finalidade } from "@/dominio/contatos/tipos";
import { deuCerto, type CodigoDeErro } from "@/dominio/erros";
import type { ModulosDoFormulario } from "@/dominio/formularios/modulos";
import {
  semDadosPessoais,
  type Pergunta,
  type ValorDaResposta,
} from "@/dominio/formularios/perguntas";
import type { ConfiguracaoDaLoja } from "@/dominio/formularios/tipos";
import type { BeneficiosDoEnvio } from "@/dominio/respostas/envio";
import type { OrigemDaResposta, Resposta } from "@/dominio/respostas/tipos";
import { formulariosGravados, contatosGravados, respostasGravadas } from "@/repositorios";
import { log, resumoDoErro } from "@/lib/logger";
import { avaliarLimiteDeEnvio, lerLimitesDeEnvio } from "@/lib/security/limite-de-envios";
import { FINALIDADES_DE_CONSENTIMENTO, textoDaFinalidade, versaoConhecida } from "@/lib/texts/consentimento";
import { normalizarTelefone } from "@/lib/validation/phone";
import { limparValores, respostasEstaoValidas, validarRespostas } from "@/validacoes/resposta";
import { ambienteDaTrava, buscarFormularioParaEnvio, type AmbienteDaTrava } from "./formularios";

export type EnvioDeResposta = {
  slug: string;
  /** Gerada no navegador; reenviar a mesma chave não cria uma segunda resposta. */
  chaveEnvio: string;
  valores: Record<string, ValorDaResposta>;
  origem: OrigemDaResposta;
  /** Código de indicação lido do `?ref=`. Desconhecido ou mal formado é ignorado sem aviso. */
  ref?: string | null;
  /** O texto que a pessoa viu e o que marcou. Itens antigos da fila não o trazem. */
  consentimento?: { versao: string; aceites: Record<string, boolean> } | null;
};

/** O que só o servidor decide: vem do cabeçalho da requisição e do relógio. */
export type OpcoesDoEnvio = {
  /** Hash do IP (nunca o IP). Nulo = sem limite por IP. */
  ipHash?: string | null;
  agora?: Date;
  ambiente?: AmbienteDaTrava;
};

export type ConfirmacaoDoEnvio = {
  /** Verdadeiro quando esta chave já tinha sido recebida antes. */
  jaEstavaRegistrada: boolean;
  beneficios: BeneficiosDoEnvio;
};

/** Uma recusa prevista, com o que a rota precisa para explicá-la. */
export type RecusaDoEnvio = {
  ok: false;
  erro: CodigoDeErro;
  detalhe?: string;
  /** Erro por pergunta, quando a recusa foi de validação. */
  porPergunta?: Record<string, string>;
  /** No limite por IP: quanto esperar antes de tentar de novo. */
  tenteDeNovoEmSegundos?: number;
};

export type ResultadoDoRegistro = { ok: true; valor: ConfirmacaoDoEnvio } | RecusaDoEnvio;

const SEM_BENEFICIOS: BeneficiosDoEnvio = { cupom: null, indicacao: null };
const MS_POR_DIA = 24 * 60 * 60 * 1000;
/** Quantas vezes se sorteia um código novo depois de uma colisão, além da primeira gravação. */
const NOVAS_TENTATIVAS_DE_CODIGO = 5;

let ultimaLimpezaDoIp = 0;

/**
 * Limpeza oportunista do hash do IP (a política de privacidade promete
 * "pouco tempo"): no máximo uma vez a cada `INTERVALO_DA_LIMPEZA_DO_IP_HASH_MS`
 * por instância, e sem nunca atrapalhar o envio. Sem cron.
 */
export async function limparIpsAntigosSeNecessario(agora: Date = new Date()): Promise<void> {
  if (agora.getTime() - ultimaLimpezaDoIp < INTERVALO_DA_LIMPEZA_DO_IP_HASH_MS) return;
  ultimaLimpezaDoIp = agora.getTime();
  try {
    await respostasGravadas.limparIpsAntigos(new Date(agora.getTime() - RETENCAO_DO_IP_HASH_MS));
  } catch (erro) {
    ultimaLimpezaDoIp = 0; // tenta de novo no próximo envio
    log.warn("limpeza do hash de IP falhou", resumoDoErro(erro));
  }
}

export async function registrarResposta(
  envio: EnvioDeResposta,
  opcoes: OpcoesDoEnvio = {},
): Promise<ResultadoDoRegistro> {
  const agora = opcoes.agora ?? new Date();
  const ipHash = opcoes.ipHash ?? null;

  const encontrado = await buscarFormularioParaEnvio(envio.slug, opcoes.ambiente ?? ambienteDaTrava());
  if (!encontrado.ok) {
    log.warn("resposta recusada", { slug: envio.slug, motivo: encontrado.erro });
    return encontrado;
  }
  const { publico, modulos, configuracaoDaLoja } = encontrado.valor;
  const { perguntas, id, versao } = publico;

  // Mesma validação que rodou no celular. O que chega pela rede não é confiável.
  const erros = validarRespostas(perguntas, envio.valores);
  if (!respostasEstaoValidas(erros)) {
    log.warn("resposta inválida", { slug: envio.slug, perguntas: Object.keys(erros).join(",") });
    return { ok: false, erro: "VALIDACAO_FALHOU", detalhe: Object.keys(erros).join(","), porPergunta: erros };
  }

  const consentimento = lerConsentimento(envio.consentimento);
  if (!consentimento.ok) {
    log.warn("consentimento recusado", { slug: envio.slug, motivo: consentimento.motivo });
    return { ok: false, erro: "VALIDACAO_FALHOU", detalhe: "consentimento" };
  }

  // Dado pessoal sai daqui e nunca volta para `valores`.
  const pessoal = separarDadoPessoal(perguntas, envio.valores);
  const valores = limparValores(semDadosPessoais(perguntas), envio.valores);

  try {
    const anterior = await respostasGravadas.buscarPorChave(envio.chaveEnvio);
    if (anterior) {
      const beneficios = await beneficiosDaChaveReenviada(anterior, id, modulos, configuracaoDaLoja, publico.slug);
      log.info("resposta registrada", { slug: envio.slug, versao, origem: envio.origem, duplicada: true });
      return deuCerto({ jaEstavaRegistrada: true, beneficios });
    }

    await limparIpsAntigosSeNecessario(agora);

    const limite = ipHash ? await limiteExcedido(ipHash, agora) : null;
    if (limite) {
      log.warn("limite de envios por IP", { slug: envio.slug, janela: limite.janela });
      return { ok: false, erro: "LIMITE_EXCEDIDO", tenteDeNovoEmSegundos: limite.tenteDeNovoEmSegundos };
    }

    const plano = await planejarContato({
      pessoal,
      consentimento: consentimento.valor,
      modulos,
      configuracaoDaLoja,
      formularioId: id,
      ref: envio.ref ?? null,
      agora,
    });

    const gravado = await gravarComTentativas(
      { formularioId: id, versaoFormulario: versao, chaveEnvio: envio.chaveEnvio, valores, origem: envio.origem, ipHash },
      plano,
    );

    const slugDestino = await slugDoDestinoDaIndicacao(configuracaoDaLoja, publico.slug);
    // Corrida entre duas requisições com a mesma chave: vale o cadastro que venceu.
    const vencedora = gravado.duplicada ? await respostasGravadas.buscarPorChave(envio.chaveEnvio) : null;
    const beneficios =
      gravado.duplicada
        ? vencedora
          ? await beneficiosDaChaveReenviada(vencedora, id, modulos, configuracaoDaLoja, publico.slug)
          : SEM_BENEFICIOS
        : montarBeneficios(gravado.contato, plano, gravado.statusDoCupom, slugDestino, configuracaoDaLoja.textoDoBrinde);

    log.info("resposta registrada", {
      slug: envio.slug,
      versao,
      origem: envio.origem,
      duplicada: gravado.duplicada,
      contato: gravado.contato !== null,
      cupom: beneficios.cupom?.status ?? "nenhum",
      indicado: plano.contato?.indicadoPor != null,
    });
    return deuCerto({ jaEstavaRegistrada: gravado.duplicada, beneficios });
  } catch (erro) {
    log.error("falha ao gravar resposta", { slug: envio.slug, ...resumoDoErro(erro) });
    return { ok: false, erro: "FALHA_DE_PERSISTENCIA" };
  }
}

/* ------------------------------------------------------------------ *
 * Consentimento                                                      *
 * ------------------------------------------------------------------ */

type ConsentimentoLido = { versao: string; aceites: Record<string, boolean> } | null;

/** Versão desconhecida ou formato quebrado é recusa; ausente é "não consentiu nada". */
function lerConsentimento(
  bruto: EnvioDeResposta["consentimento"],
): { ok: true; valor: ConsentimentoLido } | { ok: false; motivo: string } {
  if (bruto === undefined || bruto === null) return { ok: true, valor: null };
  if (typeof bruto !== "object" || typeof bruto.versao !== "string") return { ok: false, motivo: "formato" };
  if (!versaoConhecida(bruto.versao)) return { ok: false, motivo: "versao_desconhecida" };
  const aceites = bruto.aceites;
  if (typeof aceites !== "object" || aceites === null || Array.isArray(aceites)) {
    return { ok: false, motivo: "formato" };
  }
  return { ok: true, valor: { versao: bruto.versao, aceites } };
}

/**
 * Uma linha por finalidade EXIBIDA (módulo ligado e texto existente na versão
 * que a pessoa viu): marcada = concedido, o resto = não. Ids que o formulário
 * não exibe são ignorados.
 */
function consentimentosDoEnvio(
  consentimento: ConsentimentoLido,
  modulos: ModulosDoFormulario,
): { versao: string | null; linhas: { finalidade: Finalidade; concedido: boolean }[] } {
  if (!consentimento) return { versao: null, linhas: [] };
  const linhas = FINALIDADES_DE_CONSENTIMENTO.filter(
    (finalidade) => modulos[finalidade] && textoDaFinalidade(consentimento.versao, finalidade) !== null,
  ).map((finalidade) => ({ finalidade, concedido: consentimento.aceites[finalidade] === true }));
  return { versao: linhas.length > 0 ? consentimento.versao : null, linhas };
}

/* ------------------------------------------------------------------ *
 * Dado pessoal e contato                                             *
 * ------------------------------------------------------------------ */

function separarDadoPessoal(perguntas: Pergunta[], valores: Record<string, ValorDaResposta>) {
  const textoDe = (tipo: "whatsapp" | "nome") => {
    const pergunta = perguntas.find((p) => p.tipo === tipo);
    const valor = pergunta ? valores[pergunta.id] : null;
    return typeof valor === "string" ? valor.trim() : "";
  };
  const telefone = normalizarTelefone(textoDe("whatsapp"));
  // Nome sem WhatsApp é descartado (minimização).
  const nome = telefone ? textoDe("nome") || null : null;
  return { telefone, nome };
}

type PlanoDoContato = {
  contato: ContatoParaGravar | null;
  /** O cupom foi negado antes de gravar porque o telefone já recebeu um. */
  cupomJaEmitido: boolean;
  prefixoDoCupom: string | null;
  validadeDoCupom: Date;
};

async function planejarContato(entrada: {
  pessoal: { telefone: string | null; nome: string | null };
  consentimento: ConsentimentoLido;
  modulos: ModulosDoFormulario;
  configuracaoDaLoja: ConfiguracaoDaLoja;
  formularioId: string;
  ref: string | null;
  agora: Date;
}): Promise<PlanoDoContato> {
  const { pessoal, modulos, configuracaoDaLoja, agora } = entrada;
  const validade = new Date(agora.getTime() + VALIDADE_DO_CUPOM_DIAS * MS_POR_DIA);
  const vazio: PlanoDoContato = {
    contato: null,
    cupomJaEmitido: false,
    prefixoDoCupom: null,
    validadeDoCupom: validade,
  };
  // Sem WhatsApp não há contato, nem cupom, nem indicação.
  if (!pessoal.telefone) return vazio;

  const { versao, linhas } = consentimentosDoEnvio(entrada.consentimento, modulos);
  const aceitouAlgo = linhas.some((l) => l.concedido);
  // Sem finalidade aceita e sem cupom nem indicação, o número não tem para que ser guardado.
  if (!aceitouAlgo && !modulos.cupom && !modulos.indicacao) return vazio;

  const jaEmitido = modulos.cupom ? await contatosGravados.jaRecebeuCupom(entrada.formularioId, pessoal.telefone) : false;
  // Cupom ligado sem brinde cadastrado: não há o que prometer, então nada é emitido.
  const podeEmitir = Boolean(modulos.cupom) && !jaEmitido && temBrinde(configuracaoDaLoja);
  const indicadoPor = await resolverIndicacao(entrada.ref, pessoal.telefone);

  return {
    contato: {
      nome: pessoal.nome,
      telefone: pessoal.telefone,
      versaoDoConsentimento: versao,
      consentimentos: linhas,
      cupom:
        modulos.cupom && podeEmitir
          ? {
              codigo: gerarCodigoDoCupom(modulos.cupom.prefixo),
              brinde: configuracaoDaLoja.textoDoBrinde!,
              expiraEm: validade,
            }
          : null,
      codigoIndicacao: modulos.indicacao ? gerarCodigoDeIndicacao() : null,
      indicadoPor,
    },
    cupomJaEmitido: jaEmitido,
    prefixoDoCupom: modulos.cupom?.prefixo ?? null,
    validadeDoCupom: validade,
  };
}

/** O id de quem indicou. Código mal formado, desconhecido ou o próprio número: ignorado sem aviso. */
async function resolverIndicacao(ref: string | null, telefone: string): Promise<string | null> {
  if (typeof ref !== "string" || !codigoDeIndicacaoValido(ref)) return null;
  const dono = await contatosGravados.porCodigoDeIndicacao(ref);
  if (!dono || dono.telefone === telefone) return null;
  return dono.id;
}

/* ------------------------------------------------------------------ *
 * Limite por IP                                                      *
 * ------------------------------------------------------------------ */

async function limiteExcedido(ipHash: string, agora: Date) {
  const [minuto, hora] = await Promise.all([
    respostasGravadas.contarPorIp(ipHash, new Date(agora.getTime() - 60_000)),
    respostasGravadas.contarPorIp(ipHash, new Date(agora.getTime() - 3_600_000)),
  ]);
  return avaliarLimiteDeEnvio({ minuto, hora }, lerLimitesDeEnvio(), agora);
}

/* ------------------------------------------------------------------ *
 * Gravação                                                           *
 * ------------------------------------------------------------------ */

type StatusDoCupom = "emitido" | "ja_emitido" | "falhou" | null;

/**
 * Grava tratando os conflitos que só o banco enxerga:
 * - `cupom_do_telefone` (corrida): grava de novo sem cupom, que vira `ja_emitido`;
 * - `codigo`: sorteia códigos novos, até `NOVAS_TENTATIVAS_DE_CODIGO` vezes;
 *   esgotadas, grava sem cupom e sem código de indicação e devolve `falhou`.
 */
async function gravarComTentativas(
  base: Omit<Parameters<typeof respostasGravadas.gravar>[0], "contato">,
  plano: PlanoDoContato,
): Promise<{
  duplicada: boolean;
  contato: ContatoGravado | null;
  statusDoCupom: StatusDoCupom;
}> {
  let contato = plano.contato;
  let status: StatusDoCupom = !contato
    ? null
    : contato.cupom
      ? "emitido"
      : plano.cupomJaEmitido
        ? "ja_emitido"
        : null;

  for (let nova = 0; ; nova++) {
    try {
      const gravado = await respostasGravadas.gravar({ ...base, contato });
      return { duplicada: gravado.duplicada, contato: gravado.contato, statusDoCupom: status };
    } catch (erro) {
      if (!(erro instanceof ConflitoDeContato) || !contato) throw erro;

      if (erro.tipo === "cupom_do_telefone") {
        contato = { ...contato, cupom: null };
        status = "ja_emitido";
        continue;
      }

      if (nova >= NOVAS_TENTATIVAS_DE_CODIGO) {
        // Última saída: grava o contato sem os códigos que colidiram.
        contato = { ...contato, cupom: null, codigoIndicacao: null };
        if (status === "emitido") status = "falhou";
        log.warn("colisão de código esgotou as tentativas; gravando sem cupom");
        const gravado = await respostasGravadas.gravar({ ...base, contato });
        return { duplicada: gravado.duplicada, contato: gravado.contato, statusDoCupom: status };
      }

      contato = {
        ...contato,
        cupom: contato.cupom
          ? { ...contato.cupom, codigo: gerarCodigoDoCupom(plano.prefixoDoCupom ?? undefined) }
          : null,
        codigoIndicacao: contato.codigoIndicacao ? gerarCodigoDeIndicacao() : null,
      };
    }
  }
}

/* ------------------------------------------------------------------ *
 * O que a pessoa ganhou                                              *
 * ------------------------------------------------------------------ */

/** `AAAA-MM-DD` no fuso da loja. */
function dataNoFusoDaLoja(data: Date): string {
  return data.toLocaleDateString("en-CA", { timeZone: FUSO_HORARIO });
}

/** O formulário que recebe quem veio por indicação: o escolhido, se ainda estiver no ar com WhatsApp; senão o próprio. */
async function slugDoDestinoDaIndicacao(config: ConfiguracaoDaLoja, slugProprio: string): Promise<string> {
  if (!config.formularioDeIndicacaoId) return slugProprio;
  const destino = await formulariosGravados.buscarPorId(config.formularioDeIndicacaoId);
  const servePraIndicar = destino?.situacao === "ATIVO" && destino.perguntas.some((p) => p.tipo === "whatsapp");
  return servePraIndicar ? destino.slug : slugProprio;
}

function montarBeneficios(
  contato: ContatoGravado | null,
  plano: PlanoDoContato,
  status: StatusDoCupom,
  slugDestino: string,
  textoDoBrinde: string | null,
): BeneficiosDoEnvio {
  if (!contato) return SEM_BENEFICIOS;

  let cupom: BeneficiosDoEnvio["cupom"] = null;
  if (status === "emitido" && contato.cupom) {
    cupom = {
      status: "emitido",
      codigo: contato.cupom,
      textoDoBrinde: textoDoBrinde,
      validoAte: dataNoFusoDaLoja(contato.cupomExpiraEm ?? plano.validadeDoCupom),
    };
  } else if (status === "ja_emitido") {
    cupom = { status: "ja_emitido" };
  } else if (status === "falhou") {
    cupom = { status: "falhou" };
  }

  return {
    cupom,
    indicacao: contato.codigoIndicacao ? { codigo: contato.codigoIndicacao, slugDestino } : null,
  };
}

function temBrinde(config: ConfiguracaoDaLoja): boolean {
  return (config.textoDoBrinde ?? "").trim() !== "";
}

/**
 * A chave já existia: devolve o que a pessoa teria, mas NUNCA o código do
 * cupom (ele só sai uma vez, na primeira resposta). A indicação repete o código.
 *
 * Tudo vem do cadastro ORIGINAL: o telefone do reenvio não conta (senão a
 * chave serviria de oráculo para saber se um número qualquer já tem cupom), e
 * uma chave que pertence a outro formulário não revela nada.
 */
async function beneficiosDaChaveReenviada(
  anterior: NonNullable<Awaited<ReturnType<typeof respostasGravadas.buscarPorChave>>>,
  formularioId: string,
  modulos: ModulosDoFormulario,
  config: ConfiguracaoDaLoja,
  slugProprio: string,
): Promise<BeneficiosDoEnvio> {
  const { contato, telefoneDoContato } = anterior;
  if (!contato || anterior.resposta.formularioId !== formularioId) return SEM_BENEFICIOS;

  let cupom: BeneficiosDoEnvio["cupom"] = null;
  if (contato.cupom) {
    cupom = { status: "ja_emitido" };
  } else if (modulos.cupom && telefoneDoContato) {
    // Sem cupom neste cadastro: ou o telefone já tinha um, ou a emissão falhou
    // (ou não havia brinde cadastrado, e então não há o que contar).
    if (await contatosGravados.jaRecebeuCupom(formularioId, telefoneDoContato)) cupom = { status: "ja_emitido" };
    else if (temBrinde(config)) cupom = { status: "falhou" };
  }

  return {
    cupom,
    indicacao: contato.codigoIndicacao
      ? { codigo: contato.codigoIndicacao, slugDestino: await slugDoDestinoDaIndicacao(config, slugProprio) }
      : null,
  };
}

export async function listarRespostas(filtros: { formularioId?: string; pagina: number }) {
  return respostasGravadas.listar({
    formularioId: filtros.formularioId,
    pagina: Math.max(1, filtros.pagina),
    porPagina: RESPOSTAS_POR_PAGINA,
  });
}

export async function buscarRespostasRecentes(limite: number): Promise<Resposta[]> {
  return respostasGravadas.recentes(limite);
}

export type RespostaComPerguntas = {
  resposta: Resposta;
  /** As perguntas da versão em que esta resposta foi dada. */
  perguntas: Pergunta[];
  nomeDoFormulario: string;
};

/**
 * Junta cada resposta com as perguntas da versão em que foi dada.
 *
 * Busca cada versão uma vez só, mesmo que vinte respostas venham da mesma —
 * senão uma página de vinte linhas faria vinte consultas iguais.
 */
export async function comPerguntas(respostas: Resposta[]): Promise<RespostaComPerguntas[]> {
  const formularios = await formulariosGravados.listar();
  const nomePorId = new Map(formularios.map((f) => [f.id, f.nome]));

  const versoesNecessarias = new Map<string, { formularioId: string; versao: number }>();
  for (const resposta of respostas) {
    versoesNecessarias.set(`${resposta.formularioId}:${resposta.versaoFormulario}`, {
      formularioId: resposta.formularioId,
      versao: resposta.versaoFormulario,
    });
  }

  const perguntasPorVersao = new Map<string, Pergunta[]>();
  await Promise.all(
    [...versoesNecessarias.entries()].map(async ([chave, { formularioId, versao }]) => {
      perguntasPorVersao.set(chave, (await formulariosGravados.perguntasDaVersao(formularioId, versao)) ?? []);
    }),
  );

  return respostas.map((resposta) => ({
    resposta,
    // Dado pessoal não aparece nas respostas individuais.
    perguntas: semDadosPessoais(
      perguntasPorVersao.get(`${resposta.formularioId}:${resposta.versaoFormulario}`) ?? [],
    ),
    nomeDoFormulario: nomePorId.get(resposta.formularioId) ?? "Formulário removido",
  }));
}
