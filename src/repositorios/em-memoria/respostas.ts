/**
 * Respostas em memória — o mesmo contrato da versão em Postgres, inclusive a
 * proteção contra envio duplicado.
 */
import { randomUUID } from "node:crypto";
import { FUSO_HORARIO } from "@/dominio/constantes";
import { ConflitoDeContato } from "@/dominio/contatos/repositorio";
import type { ContatoGravado } from "@/dominio/contatos/tipos";
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import type { RepositorioDeRespostas, TotalDoFormulario } from "@/dominio/respostas/repositorio";
import type { Resposta } from "@/dominio/respostas/tipos";
import type { ContatoEmMemoria } from "./dados-iniciais";
import { loja } from "./loja";

/** As chaves de envio já gravadas, para reconhecer uma retentativa. */
const globalParaChaves = globalThis as unknown as { chavesDeEnvio?: Map<string, string> };

function chaves(): Map<string, string> {
  globalParaChaves.chavesDeEnvio ??= new Map();
  return globalParaChaves.chavesDeEnvio;
}

function copiar(resposta: Resposta): Resposta {
  return { ...resposta, valores: { ...resposta.valores } };
}

function maisRecentesPrimeiro(lista: Resposta[]): Resposta[] {
  return [...lista].sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
}

function paraGravado(contato: ContatoEmMemoria | undefined): ContatoGravado | null {
  if (!contato) return null;
  return {
    id: contato.id,
    cupom: contato.cupom,
    cupomExpiraEm: contato.cupomExpiraEm,
    codigoIndicacao: contato.codigoIndicacao,
  };
}

export const repositorioDeRespostasEmMemoria: RepositorioDeRespostas = {
  async gravar(entrada) {
    const existente = await this.buscarPorChave(entrada.chaveEnvio);
    if (existente) return { resposta: existente.resposta, contato: existente.contato, duplicada: true };

    // Tudo é conferido ANTES de gravar qualquer coisa: se uma regra de
    // unicidade falhar, nada fica para trás (o banco faz o mesmo com a transação).
    const contato = entrada.contato;
    if (contato) {
      const existentes = loja().contatos;
      if (
        contato.cupom &&
        existentes.some(
          (c) => c.cupom !== null && c.formularioId === entrada.formularioId && c.telefone === contato.telefone,
        )
      ) {
        throw new ConflitoDeContato("cupom_do_telefone");
      }
      const codigoRepetido =
        (contato.cupom && existentes.some((c) => c.cupom === contato.cupom!.codigo)) ||
        (contato.codigoIndicacao && existentes.some((c) => c.codigoIndicacao === contato.codigoIndicacao));
      if (codigoRepetido) throw new ConflitoDeContato("codigo");
    }

    const agora = new Date();
    const resposta: Resposta = {
      id: randomUUID(),
      formularioId: entrada.formularioId,
      versaoFormulario: entrada.versaoFormulario,
      valores: { ...entrada.valores },
      origem: entrada.origem,
      criadoEm: agora,
    };

    let gravado: ContatoEmMemoria | undefined;
    if (contato) {
      gravado = {
        id: randomUUID(),
        respostaId: resposta.id,
        formularioId: entrada.formularioId,
        nome: contato.nome,
        telefone: contato.telefone,
        cupom: contato.cupom?.codigo ?? null,
        cupomBrinde: contato.cupom?.brinde ?? null,
        cupomExpiraEm: contato.cupom?.expiraEm ?? null,
        codigoIndicacao: contato.codigoIndicacao,
        indicadoPor: contato.indicadoPor,
        criadoEm: agora,
      };
      loja().contatos.push(gravado);
      if (contato.versaoDoConsentimento) {
        for (const { finalidade, concedido } of contato.consentimentos) {
          loja().consentimentos.push({
            contatoId: gravado.id,
            finalidade,
            concedido,
            textoVersao: contato.versaoDoConsentimento,
            registradoEm: agora,
          });
        }
      }
    }

    loja().respostas.push(resposta);
    if (entrada.ipHash) loja().ipsDeEnvio.push({ ipHash: entrada.ipHash, criadoEm: agora });
    chaves().set(entrada.chaveEnvio, resposta.id);
    return { resposta: copiar(resposta), duplicada: false, contato: paraGravado(gravado) };
  },

  async buscarPorChave(chaveEnvio) {
    const id = chaves().get(chaveEnvio);
    if (!id) return null;
    const original = loja().respostas.find((r) => r.id === id);
    if (!original) return null;
    const contato = loja().contatos.find((c) => c.respostaId === original.id);
    return {
      resposta: copiar(original),
      contato: paraGravado(contato),
      telefoneDoContato: contato?.telefone ?? null,
    };
  },

  async contarPorIp(ipHash, desde) {
    const dele = loja().ipsDeEnvio.filter((e) => e.ipHash === ipHash && e.criadoEm >= desde);
    const maisAntiga = dele.reduce<Date | null>((menor, e) => (!menor || e.criadoEm < menor ? e.criadoEm : menor), null);
    return { total: dele.length, maisAntigaEm: maisAntiga };
  },

  async limparIpsAntigos(antesDe) {
    const antes = loja().ipsDeEnvio.length;
    loja().ipsDeEnvio = loja().ipsDeEnvio.filter((e) => e.criadoEm >= antesDe);
    return antes - loja().ipsDeEnvio.length;
  },

  async listar({ formularioId, pagina, porPagina }) {
    const encontradas = maisRecentesPrimeiro(
      loja().respostas.filter((r) => !formularioId || r.formularioId === formularioId),
    );
    const inicio = (pagina - 1) * porPagina;
    return {
      itens: encontradas.slice(inicio, inicio + porPagina).map(copiar),
      total: encontradas.length,
      paginas: Math.max(1, Math.ceil(encontradas.length / porPagina)),
    };
  },

  async recentes(limite) {
    return maisRecentesPrimeiro(loja().respostas).slice(0, limite).map(copiar);
  },

  async doFormulario(formularioId) {
    return maisRecentesPrimeiro(loja().respostas.filter((r) => r.formularioId === formularioId)).map(copiar);
  },

  async contarTudo() {
    return loja().respostas.length;
  },

  async contarDesde(data) {
    return loja().respostas.filter((r) => r.criadoEm >= data).length;
  },

  async ultimaEm() {
    const ultima = maisRecentesPrimeiro(loja().respostas)[0];
    return ultima ? ultima.criadoEm : null;
  },

  async porDia(desde) {
    const totais = new Map<string, number>();
    for (const resposta of loja().respostas) {
      if (resposta.criadoEm < desde) continue;
      const dia = resposta.criadoEm.toLocaleDateString("en-CA", { timeZone: FUSO_HORARIO });
      totais.set(dia, (totais.get(dia) ?? 0) + 1);
    }
    return [...totais.entries()]
      .map(([dia, total]): PontoDaSerie => ({ dia: new Date(`${dia}T00:00:00-03:00`), total }))
      .sort((a, b) => a.dia.getTime() - b.dia.getTime());
  },

  async totaisPorFormulario() {
    const mapa = new Map<string, TotalDoFormulario>();
    for (const resposta of loja().respostas) {
      const atual = mapa.get(resposta.formularioId) ?? { total: 0, ultimaEm: null };
      mapa.set(resposta.formularioId, {
        total: atual.total + 1,
        ultimaEm: !atual.ultimaEm || resposta.criadoEm > atual.ultimaEm ? resposta.criadoEm : atual.ultimaEm,
      });
    }
    return mapa;
  },
};
