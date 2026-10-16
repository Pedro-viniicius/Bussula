/**
 * O arquivo de definição dos formulários (`config/formularios/<cliente>.json`).
 *
 * É a única porta pela qual os módulos e as perguntas pessoais entram no
 * sistema (o painel só lê). Por isso, além do formato, aqui moram as travas de
 * risco jurídico do plano: D4(a), pergunta de WhatsApp sem finalidade, e D4(c),
 * dado pessoal junto de pergunta de saúde ou objetivo.
 *
 * Tudo é puro: recebe texto, devolve definições normalizadas ou a lista de
 * erros. Nada é gravado aqui.
 */
import { z } from "zod";
import { MODULOS_DESLIGADOS, usaNumero, type ModulosDoFormulario } from "@/dominio/formularios/modulos";
import {
  DESCRICAO_DO_TIPO,
  TIPOS_DE_PERGUNTA,
  pedeDadosPessoais,
  type Pergunta,
} from "@/dominio/formularios/perguntas";
import type { DadosDoFormulario } from "@/dominio/formularios/tipos";
import { limparDadosDoFormulario, validarFormulario } from "@/validacoes/formulario";

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const ID_DA_PERGUNTA = /^[A-Za-z0-9_-]{1,40}$/;

const PERGUNTA = z.strictObject({
  id: z.string().regex(ID_DA_PERGUNTA, "use de 1 a 40 letras, números, _ ou -"),
  tipo: z.enum(TIPOS_DE_PERGUNTA),
  enunciado: z.string(),
  ajuda: z.string().nullish(),
  obrigatoria: z.boolean().optional(),
  opcoes: z.array(z.string()).optional(),
  escala: z
    .strictObject({
      minimo: z.number(),
      maximo: z.number(),
      rotuloMinimo: z.string().nullish(),
      rotuloMaximo: z.string().nullish(),
    })
    .nullish(),
});

const MODULOS = z.strictObject({
  recompra: z.boolean().optional(),
  ofertas: z.boolean().optional(),
  cupom: z.strictObject({ prefixo: z.string().optional() }).nullish(),
  indicacao: z.boolean().optional(),
});

const FORMULARIO = z.strictObject({
  slug: z.string().regex(SLUG, "use letras minúsculas, números e hífen (ex.: cadastro-balcao)").min(3).max(60),
  nome: z.string(),
  descricao: z.string().nullish(),
  publicar: z.boolean().optional(),
  modulos: MODULOS.optional(),
  perguntas: z.array(PERGUNTA),
});

const ARQUIVO = z.strictObject({ formularios: z.array(FORMULARIO).min(1, "inclua ao menos um formulário") });

/** Um formulário do arquivo, já limpo e com os padrões aplicados. */
export type DefinicaoDeFormulario = {
  slug: string;
  nome: string;
  descricao: string | null;
  /** Verdadeiro: o formulário vai para o ar (ATIVO) ao aplicar. */
  publicar: boolean;
  modulos: ModulosDoFormulario;
  perguntas: Pergunta[];
};

export type LeituraDasDefinicoes =
  | { ok: true; definicoes: DefinicaoDeFormulario[]; avisos: string[] }
  | { ok: false; erros: string[] };

/* ------------------------------------------------------------------ *
 * D4(c): termos de saúde e objetivo. Comparados sem acento e em      *
 * minúsculas, por palavra inteira (assim "peso" não pega "pesquisa").*
 * ------------------------------------------------------------------ */
const TERMOS_DE_SAUDE = [
  "saude",
  "objetiv\\w*",
  "peso",
  "emagre\\w*",
  "doenc\\w*",
  "medicament\\w*",
  "remedio\\w*",
  "gestante",
  "gravid\\w*",
  "lesa\\w*",
  "lesoe\\w*",
  "diabet\\w*",
  "pressao",
  "hipertens\\w*",
  "alergi\\w*",
  "diet\\w*",
  "cirurgi\\w*",
  "tratamento",
  "metas?",
  "massas?",
  "hipertrofia",
  "gordura\\w*",
  "intoleran\\w*",
  "lactose",
  "gluten",
  "colesterol",
  "glicose",
  "hormon\\w*",
  "ansiedade",
  "sono",
  "imc",
  "treino\\w*",
];
const REGEX_DE_SAUDE = new RegExp(`\\b(${TERMOS_DE_SAUDE.join("|")})\\b`);

function semAcento(texto: string): string {
  return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** O primeiro termo de saúde ou objetivo num texto qualquer, ou nulo. */
export function termoDeSaudeNoTexto(texto: string): string | null {
  return REGEX_DE_SAUDE.exec(semAcento(texto))?.[1] ?? null;
}

/**
 * O primeiro termo de saúde ou objetivo na pergunta (enunciado, ajuda, opções
 * e rótulos da escala), ou nulo.
 */
export function termoDeSaudeNaPergunta(pergunta: Pergunta): string | null {
  return termoDeSaudeNoTexto(
    [
      pergunta.enunciado,
      pergunta.ajuda ?? "",
      ...pergunta.opcoes,
      pergunta.escala?.rotuloMinimo ?? "",
      pergunta.escala?.rotuloMaximo ?? "",
    ].join(" \n "),
  );
}

function normalizarPergunta(bruta: z.infer<typeof PERGUNTA>): Pergunta {
  const descricao = DESCRICAO_DO_TIPO[bruta.tipo];
  return {
    id: bruta.id,
    tipo: bruta.tipo,
    enunciado: bruta.enunciado,
    ajuda: bruta.ajuda ?? null,
    // A obrigatoriedade do nome e do WhatsApp é da loja (D3), não do arquivo.
    obrigatoria: descricao.pessoal ? false : (bruta.obrigatoria ?? false),
    opcoes: descricao.usaOpcoes ? (bruta.opcoes ?? []) : [],
    escala:
      descricao.usaEscala && bruta.escala
        ? {
            minimo: bruta.escala.minimo,
            maximo: bruta.escala.maximo,
            rotuloMinimo: bruta.escala.rotuloMinimo ?? null,
            rotuloMaximo: bruta.escala.rotuloMaximo ?? null,
          }
        : null,
  };
}

function normalizarModulos(bruto: z.infer<typeof MODULOS> | undefined): ModulosDoFormulario {
  if (!bruto) return { ...MODULOS_DESLIGADOS };
  return {
    recompra: bruto.recompra ?? false,
    ofertas: bruto.ofertas ?? false,
    cupom: bruto.cupom ? { prefixo: bruto.cupom.prefixo ?? "ESS" } : null,
    indicacao: bruto.indicacao ?? false,
  };
}

/**
 * As regras de um formulário já normalizado: as de sempre
 * (`validarFormulario`) mais as travas D4(a) e D4(c). `avisos` não impedem.
 */
export function regrasDaDefinicao(definicao: DefinicaoDeFormulario): { erros: string[]; avisos: string[] } {
  const erros: string[] = [];
  const avisos: string[] = [];
  const dados: DadosDoFormulario = limparDadosDoFormulario({
    nome: definicao.nome,
    descricao: definicao.descricao,
    perguntas: definicao.perguntas,
    modulos: definicao.modulos,
  });
  const achados = validarFormulario(dados);
  if (achados.nome) erros.push(achados.nome);
  if (achados.descricao) erros.push(achados.descricao);
  if (achados.perguntas) erros.push(achados.perguntas);
  if (achados.modulos) erros.push(achados.modulos);
  for (const [id, erro] of Object.entries(achados.porPergunta)) erros.push(`pergunta "${id}": ${erro}`);

  const ids = definicao.perguntas.map((p) => p.id);
  for (const repetido of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) {
    erros.push(`pergunta "${repetido}": id repetido.`);
  }

  const temWhatsapp = definicao.perguntas.some((p) => p.tipo === "whatsapp");
  if (temWhatsapp && !usaNumero(definicao.modulos)) {
    erros.push(
      "tem pergunta de WhatsApp, mas nenhum módulo usa o número (recompra, ofertas, cupom ou indicacao). Sem finalidade, não se coleta telefone.",
    );
  }

  if (pedeDadosPessoais(definicao.perguntas)) {
    const termoDaDescricao = definicao.descricao ? termoDeSaudeNoTexto(definicao.descricao) : null;
    if (termoDaDescricao) {
      erros.push(
        `a descrição do formulário que pede nome ou WhatsApp não pode citar saúde ou objetivo (termo "${termoDaDescricao}").`,
      );
    }
    for (const pergunta of definicao.perguntas) {
      const termo = termoDeSaudeNaPergunta(pergunta);
      if (termo) {
        erros.push(
          `pergunta "${pergunta.id}": formulário que pede nome ou WhatsApp não pode ter pergunta de saúde ou objetivo (termo "${termo}").`,
        );
      }
    }
    if (definicao.perguntas.some((p) => p.tipo === "texto_livre")) {
      avisos.push(
        "tem pergunta de texto livre junto de dado pessoal: a pessoa pode escrever dado de saúde por conta própria. Confirme que isso é aceitável.",
      );
    }
  }

  return { erros, avisos };
}

/**
 * Lê o texto do arquivo. Qualquer erro em qualquer formulário devolve só os
 * erros: quem chama não grava nada.
 */
export function lerDefinicoes(texto: string): LeituraDasDefinicoes {
  let json: unknown;
  try {
    json = JSON.parse(texto);
  } catch (erro) {
    return { ok: false, erros: [`JSON inválido: ${erro instanceof Error ? erro.message : String(erro)}`] };
  }

  const lido = ARQUIVO.safeParse(json);
  if (!lido.success) {
    return {
      ok: false,
      erros: lido.error.issues.map((i) => `${i.path.join(".") || "arquivo"}: ${i.message}`),
    };
  }

  const erros: string[] = [];
  const avisos: string[] = [];
  const definicoes: DefinicaoDeFormulario[] = [];
  const slugs = lido.data.formularios.map((f) => f.slug);

  for (const slug of new Set(slugs.filter((s, i) => slugs.indexOf(s) !== i))) {
    erros.push(`slug "${slug}" repetido no arquivo.`);
  }

  lido.data.formularios.forEach((bruto, indice) => {
    for (const bp of bruto.perguntas) {
      if (DESCRICAO_DO_TIPO[bp.tipo].pessoal && bp.obrigatoria !== undefined) {
        avisos.push(
          `${bruto.slug}: "obrigatoria" da pergunta "${bp.id}" é ignorado; a obrigatoriedade do ${bp.tipo === "nome" ? "nome" : "WhatsApp"} é da loja.`,
        );
      }
      if (!DESCRICAO_DO_TIPO[bp.tipo].usaOpcoes && bp.opcoes?.length) {
        erros.push(`formularios.${indice} (${bruto.slug}): pergunta "${bp.id}" não usa opções (tipo ${bp.tipo}).`);
      }
      if (!DESCRICAO_DO_TIPO[bp.tipo].usaEscala && bp.escala) {
        erros.push(`formularios.${indice} (${bruto.slug}): pergunta "${bp.id}" não usa escala (tipo ${bp.tipo}).`);
      }
    }
    const definicao: DefinicaoDeFormulario = {
      slug: bruto.slug,
      nome: bruto.nome.trim(),
      descricao: bruto.descricao?.trim() || null,
      publicar: bruto.publicar ?? false,
      modulos: normalizarModulos(bruto.modulos),
      perguntas: bruto.perguntas.map(normalizarPergunta),
    };
    const regras = regrasDaDefinicao(definicao);
    for (const erro of regras.erros) erros.push(`${bruto.slug}: ${erro}`);
    for (const aviso of regras.avisos) avisos.push(`${bruto.slug}: ${aviso}`);
    if (definicao.modulos.cupom) {
      avisos.push(`${bruto.slug}: o cupom só vale depois que o gerente cadastrar o texto do brinde no painel.`);
    }
    definicoes.push(definicao);
  });

  return erros.length > 0 ? { ok: false, erros } : { ok: true, definicoes, avisos };
}
