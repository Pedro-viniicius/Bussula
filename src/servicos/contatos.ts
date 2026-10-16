/**
 * Contatos no painel: a única porta de leitura de dado pessoal.
 *
 * Quatro regras sustentam este arquivo:
 *   1. a lista sai MASCARADA daqui, antes de chegar à página: o telefone
 *      completo não atravessa a fronteira do servidor sem `revelarContato`;
 *   2. revelar e exportar conferem a sessão e gravam a auditoria ANTES de
 *      devolver o dado — se a auditoria falhar, nada é entregue;
 *   3. a auditoria não leva nome nem telefone, só ids e contagens;
 *   4. a exportação traz só quem aceita mensagens, um registro por telefone.
 */
import { CONTATOS_POR_PAGINA, FUSO_HORARIO } from "@/dominio/constantes";
import type { FormularioNaLista } from "@/dominio/formularios/tipos";
import { montarLinkWhatsapp, ocultarNome, ocultarTelefone } from "@/dominio/contatos/mascara";
import {
  ORDENS_DE_CONTATOS,
  type ContatoRevelado,
  type FiltrosDeContatos,
  type LinhaCsv,
  type LinhaDeContato,
  type ResumoDeContatos,
} from "@/dominio/contatos/tipos";
import { ORIGENS_DA_RESPOSTA, ROTULO_DA_ORIGEM, type OrigemDaResposta } from "@/dominio/respostas/tipos";
import type { SessaoAdmin } from "@/lib/admin/session-token";
import { A } from "@/lib/texts/admin";
import { formatarE164 } from "@/lib/validation/phone";
import { contatosGravados, trilhaDeAuditoria } from "@/repositorios";
import { dataCompleta, dataCurta } from "@/utilitarios/tempo";
import { listarFormularios } from "./formularios";

/**
 * Liga e desliga o botão "Enviar cupom no WhatsApp".
 *
 * PENDENTE DE CONFIRMAÇÃO JURÍDICA: o botão aparece também para quem não
 * aceitou mensagens, porque entrega o cupom que o cliente pediu ao se
 * cadastrar. Se o advogado não confirmar, troque para `false`: o dado
 * `linkEnvioDoCupom` passa a vir sempre nulo e nada mais muda.
 */
export const ENVIO_DO_CUPOM_PELO_WHATSAPP = true;

/** O que o painel pede à lista, lido da URL ou dos campos do formulário de exportação. */
export type EntradaDeFiltros = Record<string, string | string[] | undefined>;

function texto(valor: string | string[] | undefined): string | undefined {
  return typeof valor === "string" && valor !== "" ? valor : undefined;
}

/**
 * Lê `?formulario=&origem=&mostrar=&ordem=&pagina=`. Valor desconhecido vale
 * como "sem filtro": uma URL antiga ou digitada à mão nunca derruba a tela.
 *
 * Se `formulariosConhecidos` vier, um formulário fora da lista é ignorado.
 */
export function lerFiltrosDeContatos(
  entrada: EntradaDeFiltros,
  formulariosConhecidos?: readonly string[],
): FiltrosDeContatos {
  const formulario = texto(entrada.formulario);
  const origem = texto(entrada.origem);
  const ordem = texto(entrada.ordem);
  const pagina = Number.parseInt(texto(entrada.pagina) ?? "1", 10);

  return {
    formularioId:
      formulario && (!formulariosConhecidos || formulariosConhecidos.includes(formulario)) ? formulario : undefined,
    origem: ORIGENS_DA_RESPOSTA.includes(origem as OrigemDaResposta) ? (origem as OrigemDaResposta) : undefined,
    somenteQueAceitam: texto(entrada.mostrar) === "aceitam" ? true : undefined,
    ordem: ORDENS_DE_CONTATOS.includes(ordem as FiltrosDeContatos["ordem"])
      ? (ordem as FiltrosDeContatos["ordem"])
      : "recentes",
    pagina: Number.isFinite(pagina) && pagina > 1 ? pagina : 1,
  };
}

/** A linha da lista, mascarada, com o que a tela precisa saber do formulário dela. */
export type ContatoDaLista = LinhaDeContato & {
  formularioTemCupom: boolean;
  formularioTemIndicacao: boolean;
};

export type PaginaDeContatos = {
  itens: ContatoDaLista[];
  total: number;
  paginas: number;
  pagina: number;
};

type ModulosPorFormulario = Map<string, { cupom: boolean; indicacao: boolean }>;

/**
 * Quais módulos cada formulário tem. Reaproveita a lista que a página já
 * carregou (`formularios`); sem ela, busca uma vez.
 */
async function modulosDosFormularios(formularios?: readonly FormularioNaLista[]): Promise<ModulosPorFormulario> {
  const lista = formularios ?? (await listarFormularios());
  return new Map(
    lista.map((f) => [f.id, { cupom: f.modulos.cupom != null, indicacao: f.modulos.indicacao === true }]),
  );
}

/** "AAAA-MM-DD" no fuso da loja. */
function diaDoCupom(data: Date): string {
  return data.toLocaleDateString("en-CA", { timeZone: FUSO_HORARIO });
}

function primeiroNomeDe(nome: string | null): string | null {
  return nome?.trim().split(/\s+/)[0] || null;
}

/**
 * `formularios` é a lista que a página já carregou com `listarFormularios()`;
 * passá-la evita ler os formulários de novo.
 */
export async function listarContatos(
  filtros: FiltrosDeContatos,
  agora: Date = new Date(),
  formularios?: readonly FormularioNaLista[],
): Promise<PaginaDeContatos> {
  let pagina = filtros.pagina;
  let resultado = await contatosGravados.listar({ ...filtros, pagina }, CONTATOS_POR_PAGINA);
  // Uma página além da última (link antigo, número digitado) mostra a última.
  if (pagina > resultado.paginas) {
    pagina = resultado.paginas;
    resultado = await contatosGravados.listar({ ...filtros, pagina }, CONTATOS_POR_PAGINA);
  }
  const modulos = await modulosDosFormularios(formularios);

  return {
    total: resultado.total,
    paginas: resultado.paginas,
    pagina,
    itens: resultado.itens.map((linha): ContatoDaLista => {
      const dosModulos = modulos.get(linha.formularioId);
      return {
        id: linha.id,
        nomeOculto: ocultarNome(linha.nome),
        telefoneOculto: ocultarTelefone(linha.telefone),
        formularioNome: linha.formularioNome,
        origem: linha.origem,
        criadoEm: linha.criadoEm,
        aceitaMensagens: linha.aceitaMensagens,
        cupom: {
          emitido: linha.cupomEmitido,
          situacao: linha.cupomEmitido ? "emitido" : linha.cupomEmitidoEmOutroCadastro ? "ja_tinha" : "nenhum",
          validoAte: linha.cupomExpiraEm ? diaDoCupom(linha.cupomExpiraEm) : null,
          expirado: linha.cupomExpiraEm ? linha.cupomExpiraEm.getTime() < agora.getTime() : false,
        },
        indicacoes: linha.indicacoes,
        formularioTemCupom: dosModulos?.cupom ?? linha.cupomEmitido,
        formularioTemIndicacao: dosModulos?.indicacao ?? false,
      };
    }),
  };
}

export type ResumoDoPainel = ResumoDeContatos & {
  /** Algum formulário tem cupom ligado (ou já emitiu): a métrica só aparece então. */
  haCupons: boolean;
  haIndicacoes: boolean;
};

export async function resumoDosContatos(formularios?: readonly FormularioNaLista[]): Promise<ResumoDoPainel> {
  const [resumo, modulos] = await Promise.all([contatosGravados.resumo(), modulosDosFormularios(formularios)]);
  const todos = [...modulos.values()];
  return {
    ...resumo,
    haCupons: resumo.cuponsEmitidos > 0 || todos.some((m) => m.cupom),
    haIndicacoes: resumo.indicacoes > 0 || todos.some((m) => m.indicacao),
  };
}

/**
 * Entrega o contato completo a quem tem sessão. Sem sessão ou sem contato,
 * devolve nulo e NÃO audita. Com sessão, grava a auditoria antes de devolver;
 * se gravar falhar, o erro sobe e nada é revelado.
 */
export async function revelarContato(
  id: string,
  sessao: SessaoAdmin | null,
  opcoes: { agora?: Date; enviarCupom?: boolean } = {},
): Promise<ContatoRevelado | null> {
  if (!sessao) return null;
  const agora = opcoes.agora ?? new Date();
  const enviarCupom = opcoes.enviarCupom ?? ENVIO_DO_CUPOM_PELO_WHATSAPP;

  const contato = await contatosGravados.buscarCompleto(id);
  if (!contato) return null;

  await trilhaDeAuditoria.registrar({
    acao: "contato_revelado",
    entidade: "contato",
    entidadeId: contato.id,
    usuarioId: sessao.id,
    metadados: { formularioId: contato.formularioId },
  });

  const primeiroNome = primeiroNomeDe(contato.nome);
  const cupom = contato.cupom
    ? {
        codigo: contato.cupom.codigo,
        validoAte: diaDoCupom(contato.cupom.expiraEm),
        expirado: contato.cupom.expiraEm.getTime() < agora.getTime(),
      }
    : null;

  const linkWhatsapp = contato.aceitaMensagens
    ? montarLinkWhatsapp(contato.telefone, A.contatos.mensagemWhatsApp(primeiroNome))
    : null;

  const linkEnvioDoCupom =
    enviarCupom && contato.cupom && cupom && !cupom.expirado
      ? montarLinkWhatsapp(
          contato.telefone,
          A.contatos.mensagemCupom(primeiroNome, cupom.codigo, contato.cupom.brinde, dataCurta(contato.cupom.expiraEm)),
        )
      : null;

  return {
    nome: contato.nome,
    telefone: formatarE164(contato.telefone),
    linkWhatsapp,
    cupom,
    linkEnvioDoCupom,
  };
}

// ---------------------------------------------------------------------------
// Exportação CSV
// ---------------------------------------------------------------------------

/**
 * Impede que o Excel trate a célula como fórmula: quem começa com
 * `=`, `+`, `-`, `@`, tabulação ou quebra de linha ganha um `'` na frente.
 */
export function neutralizarCelula(valor: string): string {
  return /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
}

function celulaCsv(valor: string): string {
  const seguro = neutralizarCelula(valor);
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/**
 * BOM (o Excel abre em UTF-8), separador `;` e `\r\n`. O telefone sai só com
 * dígitos e código do país (ex.: 5535999998832).
 */
export function montarCsv(linhas: LinhaCsv[]): string {
  const E = A.contatos.exportar;
  const corpo = linhas.map((linha) =>
    [
      linha.nome ?? "",
      linha.telefone.replace(/\D/g, ""),
      linha.formularioNome,
      ROTULO_DA_ORIGEM[linha.origem],
      dataCompleta(linha.criadoEm),
      linha.aceitaRecompra ? E.sim : E.nao,
      linha.aceitaOfertas ? E.sim : E.nao,
      String(linha.indicacoes),
    ]
      .map(celulaCsv)
      .join(";"),
  );
  return `﻿${[E.colunas.join(";"), ...corpo].join("\r\n")}\r\n`;
}

/**
 * Quantos contatos sairiam no arquivo com estes filtros (um por telefone, só
 * quem aceita). Só conta: não gera arquivo e não audita.
 */
export async function contarParaExportacao(filtros: Pick<FiltrosDeContatos, "formularioId" | "origem">): Promise<number> {
  const linhas = await contatosGravados.paraExportacao({ formularioId: filtros.formularioId, origem: filtros.origem });
  return linhas.length;
}

export type ArquivoExportado = { csv: string; linhas: number };

/**
 * O CSV de quem aceitou mensagens, respeitando formulário e origem. Sem
 * sessão devolve nulo. A auditoria é gravada ANTES de devolver o arquivo.
 */
export async function exportarContatosCsv(
  filtros: Pick<FiltrosDeContatos, "formularioId" | "origem">,
  sessao: SessaoAdmin | null,
): Promise<ArquivoExportado | null> {
  if (!sessao) return null;

  const linhas = await contatosGravados.paraExportacao({
    formularioId: filtros.formularioId,
    origem: filtros.origem,
  });

  await trilhaDeAuditoria.registrar({
    acao: "contatos_exportados",
    entidade: "contato",
    usuarioId: sessao.id,
    metadados: {
      linhas: linhas.length,
      filtros: { formularioId: filtros.formularioId ?? null, origem: filtros.origem ?? null },
    },
  });

  return { csv: montarCsv(linhas), linhas: linhas.length };
}

/**
 * A requisição de exportação veio de uma página deste mesmo site?
 *
 * Route Handlers não têm a conferência de origem das Server Actions, e o
 * cookie de sessão é `SameSite=lax`. Aceita só `Sec-Fetch-Site: same-origin`
 * e, quando há `Origin`, exige que o host seja o do próprio pedido. Sem
 * nenhum dos dois cabeçalhos, recusa (falha fechada).
 */
export function origemConfiavel(cabecalhos: Headers): boolean {
  const destino = cabecalhos.get("sec-fetch-site");
  if (destino !== null && destino !== "same-origin") return false;

  const origem = cabecalhos.get("origin");
  if (origem !== null) {
    const host = cabecalhos.get("x-forwarded-host") ?? cabecalhos.get("host");
    try {
      return host !== null && new URL(origem).host === host;
    } catch {
      return false;
    }
  }
  return destino === "same-origin";
}
