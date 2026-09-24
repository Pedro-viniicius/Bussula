/**
 * O painel da loja tem três áreas e nenhuma forma de criar ou editar
 * formulário. Estes testes existem para que essa decisão de produto não
 * volte atrás por acidente — um link esquecido, um botão copiado de outra
 * tela, um endereço antigo que parou de funcionar.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import configuracaoDoNext from "../../../next.config";
import { A } from "../../lib/texts/admin";
import { AREAS_DO_PAINEL } from "./areas";

const RAIZ = path.resolve(__dirname, "../../..");
const PASTA_DO_PAINEL = path.join(RAIZ, "src/app/(painel)/admin");

function arquivosDentroDe(pasta: string): string[] {
  const encontrados: string[] = [];
  for (const nome of readdirSync(pasta)) {
    const caminho = path.join(pasta, nome);
    if (statSync(caminho).isDirectory()) encontrados.push(...arquivosDentroDe(caminho));
    else if (/\.tsx?$/.test(nome) && !nome.endsWith(".test.ts")) encontrados.push(caminho);
  }
  return encontrados;
}

function todosOsTextos(valor: unknown): string[] {
  if (typeof valor === "string") return [valor];
  if (Array.isArray(valor)) return valor.flatMap(todosOsTextos);
  if (valor && typeof valor === "object") return Object.values(valor).flatMap(todosOsTextos);
  return [];
}

describe("navegação do painel", () => {
  it("tem exatamente Visão Geral, Formulários e Resultados & IA, nesta ordem", () => {
    assert.deepEqual(
      AREAS_DO_PAINEL.map((area) => [area.rotulo, area.href]),
      [
        ["Visão Geral", "/admin"],
        ["Formulários", "/admin/formularios"],
        ["Resultados & IA", "/admin/resultados"],
      ],
    );
  });

  it("não oferece Respostas como área separada", () => {
    assert.ok(AREAS_DO_PAINEL.every((area) => area.rotulo !== "Respostas"));
  });
});

describe("criação e edição de formulários fora do painel", () => {
  it("nenhum texto do painel fala em criar formulário", () => {
    const textos = todosOsTextos(A);
    for (const texto of textos) {
      assert.doesNotMatch(texto, /novo formulário|criar (o )?(primeiro )?formulário|editar formulário/i, texto);
    }
  });

  it("as telas de criar e editar não existem mais", () => {
    assert.equal(existsSync(path.join(PASTA_DO_PAINEL, "formularios/novo")), false);
    assert.equal(existsSync(path.join(PASTA_DO_PAINEL, "formularios/[id]/editar")), false);
    assert.equal(existsSync(path.join(PASTA_DO_PAINEL, "respostas")), false);
  });

  it("nenhuma tela ou componente aponta para o construtor de formulários", () => {
    const arquivos = [...arquivosDentroDe(path.join(RAIZ, "src/app")), ...arquivosDentroDe(path.join(RAIZ, "src/components"))];
    for (const arquivo of arquivos) {
      const conteudo = readFileSync(arquivo, "utf8");
      assert.doesNotMatch(conteudo, /formularios\/novo|\/editar[`"'/]|salvarFormularioAction|EditorDeFormulario/, arquivo);
    }
  });
});

describe("endereços antigos do painel", () => {
  async function destinoDe(endereco: string): Promise<string | undefined> {
    const regras = (await configuracaoDoNext.redirects?.()) ?? [];
    for (const regra of regras) {
      const padrao = new RegExp(`^${regra.source.replace(/:id/g, "([^/]+)")}$`);
      const combinacao = endereco.match(padrao);
      if (combinacao) return regra.destination.replace(":id", combinacao[1] ?? "");
    }
    return undefined;
  }

  it("levam criar e editar para a lista de formulários", async () => {
    assert.equal(await destinoDe("/admin/formularios/novo"), "/admin/formularios");
    assert.equal(await destinoDe("/admin/formularios/abc/editar"), "/admin/formularios");
  });

  it("levam o detalhe do formulário e a lista de respostas para os resultados", async () => {
    assert.equal(await destinoDe("/admin/formularios/abc"), "/admin/resultados?formulario=abc");
    assert.equal(await destinoDe("/admin/respostas"), "/admin/resultados");
  });

  it("não desviam as áreas atuais", async () => {
    assert.equal(await destinoDe("/admin"), undefined);
    assert.equal(await destinoDe("/admin/formularios"), undefined);
    assert.equal(await destinoDe("/admin/resultados"), undefined);
  });
});
