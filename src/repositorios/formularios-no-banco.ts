/**
 * Formulários guardados no Postgres.
 *
 * Esta é a única camada que sabe que existe um banco. As regras de negócio
 * ficam em `src/servicos/formularios.ts` e não enxergam nada daqui.
 */
import { desc, eq, and } from "drizzle-orm";
import { lerModulos } from "@/dominio/formularios/modulos";
import type { Pergunta } from "@/dominio/formularios/perguntas";
import type { RepositorioDeFormularios } from "@/dominio/formularios/repositorio";
import type { SituacaoDoFormulario } from "@/dominio/formularios/status";
import type { DadosDoFormulario, Formulario, FormularioComPerguntas } from "@/dominio/formularios/tipos";
import { db } from "@/lib/db";
import { formularios, versoesFormulario, type FormularioGravado } from "@/lib/db/schema";

/**
 * O formato dos ids no Postgres. Um id fora dele (vindo de um endereço
 * digitado à mão, por exemplo) não pode existir no banco — e, se chegasse à
 * consulta, o Postgres recusaria a comparação com erro em vez de "não achei".
 */
const FORMATO_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Linha do banco → formulário do domínio. Um lugar só para essa tradução. */
function paraDominio(linha: FormularioGravado): Formulario {
  return {
    id: linha.id,
    slug: linha.slug,
    nome: linha.nome,
    descricao: linha.descricao,
    situacao: linha.situacao as SituacaoDoFormulario,
    versaoAtual: linha.versaoAtual,
    criadoEm: linha.criadoEm,
    atualizadoEm: linha.atualizadoEm,
    configuracaoDaLoja: {
      textoDoBrinde: linha.textoDoBrinde,
      nomeObrigatorio: linha.nomeObrigatorio,
      whatsappObrigatorio: linha.whatsappObrigatorio,
      formularioDeIndicacaoId: linha.formularioDeIndicacaoId,
    },
  };
}

export const repositorioDeFormulariosNoBanco: RepositorioDeFormularios = {
  async listar() {
    const linhas = await db.select().from(formularios).orderBy(desc(formularios.criadoEm));
    return linhas.map(paraDominio);
  },

  async buscarPorId(id) {
    if (!FORMATO_DE_UUID.test(id)) return null;
    const [linha] = await db.select().from(formularios).where(eq(formularios.id, id)).limit(1);
    if (!linha) return null;
    const [perguntas, modulos] = await Promise.all([
      this.perguntasDaVersao(linha.id, linha.versaoAtual),
      this.modulosDaVersao(linha.id, linha.versaoAtual),
    ]);
    const comPerguntas: FormularioComPerguntas = {
      ...paraDominio(linha),
      perguntas: perguntas ?? [],
      modulos: modulos ?? lerModulos(null),
    };
    return comPerguntas;
  },

  async buscarPorSlug(slug) {
    const [linha] = await db.select().from(formularios).where(eq(formularios.slug, slug)).limit(1);
    return linha ? paraDominio(linha) : null;
  },

  async perguntasDaVersao(formularioId, versao) {
    const [linha] = await db
      .select({ perguntas: versoesFormulario.perguntas })
      .from(versoesFormulario)
      .where(and(eq(versoesFormulario.formularioId, formularioId), eq(versoesFormulario.versao, versao)))
      .limit(1);
    return linha ? (linha.perguntas as Pergunta[]) : null;
  },

  async modulosDaVersao(formularioId, versao) {
    const [linha] = await db
      .select({ modulos: versoesFormulario.modulos })
      .from(versoesFormulario)
      .where(and(eq(versoesFormulario.formularioId, formularioId), eq(versoesFormulario.versao, versao)))
      .limit(1);
    // O jsonb nunca é confiado: valor ausente ou estranho vale como tudo desligado.
    return linha ? lerModulos(linha.modulos) : null;
  },

  async slugEstaLivre(slug) {
    const [linha] = await db
      .select({ id: formularios.id })
      .from(formularios)
      .where(eq(formularios.slug, slug))
      .limit(1);
    return !linha;
  },

  async criar(entrada) {
    return db.transaction(async (tx) => {
      const [linha] = await tx
        .insert(formularios)
        .values({ slug: entrada.slug, nome: entrada.nome, descricao: entrada.descricao, versaoAtual: 1 })
        .returning();
      await tx
        .insert(versoesFormulario)
        .values({
          formularioId: linha.id,
          versao: 1,
          perguntas: entrada.perguntas,
          modulos: entrada.modulos ?? lerModulos(null),
        });
      return paraDominio(linha);
    });
  },

  async salvarNovaVersao(id, dados: DadosDoFormulario) {
    return db.transaction(async (tx) => {
      const [atual] = await tx.select().from(formularios).where(eq(formularios.id, id)).limit(1);
      if (!atual) return null;

      // Sem módulos nos dados, a versão nova herda os da que estava no ar.
      let modulos = dados.modulos;
      if (!modulos) {
        const [anterior] = await tx
          .select({ modulos: versoesFormulario.modulos })
          .from(versoesFormulario)
          .where(and(eq(versoesFormulario.formularioId, id), eq(versoesFormulario.versao, atual.versaoAtual)))
          .limit(1);
        modulos = lerModulos(anterior?.modulos);
      }

      const proximaVersao = atual.versaoAtual + 1;
      await tx
        .insert(versoesFormulario)
        .values({ formularioId: id, versao: proximaVersao, perguntas: dados.perguntas, modulos });

      const [atualizado] = await tx
        .update(formularios)
        .set({
          nome: dados.nome,
          descricao: dados.descricao,
          versaoAtual: proximaVersao,
          atualizadoEm: new Date(),
        })
        .where(eq(formularios.id, id))
        .returning();
      return paraDominio(atualizado);
    });
  },

  async salvarConfiguracaoDaLoja(id, configuracao) {
    if (!FORMATO_DE_UUID.test(id)) return null;
    const [linha] = await db
      .update(formularios)
      .set({
        textoDoBrinde: configuracao.textoDoBrinde,
        nomeObrigatorio: configuracao.nomeObrigatorio,
        whatsappObrigatorio: configuracao.whatsappObrigatorio,
        formularioDeIndicacaoId: configuracao.formularioDeIndicacaoId,
      })
      .where(eq(formularios.id, id))
      .returning();
    return linha ? paraDominio(linha) : null;
  },

  async mudarSituacao(id, situacao) {
    const [linha] = await db
      .update(formularios)
      .set({ situacao, atualizadoEm: new Date() })
      .where(eq(formularios.id, id))
      .returning();
    return linha ? paraDominio(linha) : null;
  },
};
