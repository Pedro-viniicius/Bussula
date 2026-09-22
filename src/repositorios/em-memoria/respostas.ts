/**
 * Respostas em memória — o mesmo contrato da versão em Postgres, inclusive a
 * proteção contra envio duplicado.
 */
import { randomUUID } from "node:crypto";
import { FUSO_HORARIO } from "@/dominio/constantes";
import type { PontoDaSerie } from "@/dominio/dashboard/tipos";
import type { RepositorioDeRespostas, TotalDoFormulario } from "@/dominio/respostas/repositorio";
import type { Resposta } from "@/dominio/respostas/tipos";
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

export const repositorioDeRespostasEmMemoria: RepositorioDeRespostas = {
  async gravar(entrada) {
    const jaGravada = chaves().get(entrada.chaveEnvio);
    if (jaGravada) {
      const original = loja().respostas.find((r) => r.id === jaGravada);
      if (original) return { resposta: copiar(original), duplicada: true };
    }

    const resposta: Resposta = {
      id: randomUUID(),
      formularioId: entrada.formularioId,
      versaoFormulario: entrada.versaoFormulario,
      valores: entrada.valores,
      origem: entrada.origem,
      criadoEm: new Date(),
    };
    loja().respostas.push(resposta);
    chaves().set(entrada.chaveEnvio, resposta.id);
    return { resposta: copiar(resposta), duplicada: false };
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
