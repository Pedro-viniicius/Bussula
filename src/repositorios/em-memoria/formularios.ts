/**
 * Formulários em memória — a implementação usada quando o projeto roda sem
 * banco. Responde exatamente o mesmo contrato da versão em Postgres.
 */
import { randomUUID } from "node:crypto";
import type { RepositorioDeFormularios } from "@/dominio/formularios/repositorio";
import type { Formulario } from "@/dominio/formularios/tipos";
import { loja } from "./loja";

function copiar(formulario: Formulario): Formulario {
  return { ...formulario };
}

export const repositorioDeFormulariosEmMemoria: RepositorioDeFormularios = {
  async listar() {
    return [...loja().formularios]
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime())
      .map(copiar);
  },

  async buscarPorId(id) {
    const formulario = loja().formularios.find((f) => f.id === id);
    if (!formulario) return null;
    const perguntas = await this.perguntasDaVersao(id, formulario.versaoAtual);
    return { ...copiar(formulario), perguntas: perguntas ?? [] };
  },

  async buscarPorSlug(slug) {
    const formulario = loja().formularios.find((f) => f.slug === slug);
    return formulario ? copiar(formulario) : null;
  },

  async perguntasDaVersao(formularioId, versao) {
    const encontrada = loja().versoes.find((v) => v.formularioId === formularioId && v.versao === versao);
    return encontrada ? encontrada.perguntas.map((p) => ({ ...p })) : null;
  },

  async slugEstaLivre(slug) {
    return !loja().formularios.some((f) => f.slug === slug);
  },

  async criar(entrada) {
    const agora = new Date();
    const formulario: Formulario = {
      id: randomUUID(),
      slug: entrada.slug,
      nome: entrada.nome,
      descricao: entrada.descricao,
      situacao: "RASCUNHO",
      versaoAtual: 1,
      criadoEm: agora,
      atualizadoEm: agora,
    };
    loja().formularios.push(formulario);
    loja().versoes.push({ formularioId: formulario.id, versao: 1, perguntas: entrada.perguntas });
    return copiar(formulario);
  },

  async salvarNovaVersao(id, dados) {
    const formulario = loja().formularios.find((f) => f.id === id);
    if (!formulario) return null;

    formulario.versaoAtual += 1;
    formulario.nome = dados.nome;
    formulario.descricao = dados.descricao;
    formulario.atualizadoEm = new Date();
    loja().versoes.push({
      formularioId: id,
      versao: formulario.versaoAtual,
      perguntas: dados.perguntas,
    });
    return copiar(formulario);
  },

  async mudarSituacao(id, situacao) {
    const formulario = loja().formularios.find((f) => f.id === id);
    if (!formulario) return null;
    formulario.situacao = situacao;
    formulario.atualizadoEm = new Date();
    return copiar(formulario);
  },
};
