/**
 * QA da área de contatos: CSV com nomes hostis (fórmula, aspas, ponto e
 * vírgula, quebra de linha), revelar sem sessão e telefone fora do padrão.
 * Contra os dados fictícios em memória.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { describe, it } from "node:test";
import type { SessaoAdmin } from "../lib/admin/session-token";
import { VERSAO_ATUAL } from "../lib/texts/consentimento";
import { repositorioDeRespostasEmMemoria as respostas } from "../repositorios/em-memoria/respostas";
import { exportarContatosCsv, listarContatos, revelarContato } from "./contatos";

const trilha = () => (globalThis as unknown as { trilhaEmMemoria?: unknown[] }).trilhaEmMemoria ?? [];
const BALCAO = "form-cadastro-no-balcao";
const SESSAO: SessaoAdmin = { id: "sessao-borda", exp: Math.floor(Date.now() / 1000) + 3600 };

let sequencia = 0;
async function novoContato(nome: string | null, aceita = true) {
  sequencia += 1;
  const telefone = `+55359${String(70000000 + sequencia)}`;
  const gravado = await respostas.gravar({
    formularioId: BALCAO,
    versaoFormulario: 1,
    chaveEnvio: randomUUID(),
    valores: {},
    origem: "nfc",
    ipHash: null,
    contato: {
      nome,
      telefone,
      versaoDoConsentimento: VERSAO_ATUAL,
      consentimentos: [{ finalidade: "recompra", concedido: aceita }],
      cupom: null,
      codigoIndicacao: null,
      indicadoPor: null,
    },
  });
  return { id: gravado.contato!.id, telefone };
}

/** Separa o CSV em registros respeitando aspas (uma célula pode ter quebra de linha). */
function registros(csv: string): string[][] {
  const linhas: string[][] = [];
  let linha: string[] = [];
  let celula = "";
  let aspas = false;
  const texto = csv.replace(/^﻿/, "");
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (aspas) {
      if (c === '"' && texto[i + 1] === '"') {
        celula += '"';
        i++;
      } else if (c === '"') aspas = false;
      else celula += c;
    } else if (c === '"') aspas = true;
    else if (c === ";") {
      linha.push(celula);
      celula = "";
    } else if (c === "\r" && texto[i + 1] === "\n") {
      linha.push(celula);
      linhas.push(linha);
      linha = [];
      celula = "";
      i++;
    } else celula += c;
  }
  return linhas;
}

describe("CSV com nomes hostis", () => {
  it("nomes que começam com = + - @ ou tab saem neutralizados em todas as colunas de texto", async () => {
    const perigosos = ["=1+1", "+cmd|' /c calc'!A0", "-2+3", "@SUM(A1:A9)", "\t=1+1", "=HYPERLINK(\"http://x\";\"a\")"];
    for (const nome of perigosos) await novoContato(nome);

    const arquivo = await exportarContatosCsv({ formularioId: BALCAO }, SESSAO);
    assert.ok(arquivo);
    const tabela = registros(arquivo.csv);
    for (const nome of perigosos) {
      const linha = tabela.find((l) => l[0] === `'${nome}`);
      assert.ok(linha, `nome ${JSON.stringify(nome)} sem apóstrofo`);
    }
    // Nenhuma célula do arquivo inteiro pode começar com caractere de fórmula.
    for (const linha of tabela) {
      for (const celula of linha) assert.ok(!/^[=+\-@\t]/.test(celula), `célula perigosa: ${JSON.stringify(celula)}`);
    }
  });

  it("aspas, ponto e vírgula e quebra de linha no nome não deslocam as colunas", async () => {
    const nomes = ['Ana "A" Silva', "Bia; Costa", "Caio\nQuebra", "Duda\r\nDois"];
    for (const nome of nomes) await novoContato(nome);

    const arquivo = await exportarContatosCsv({ formularioId: BALCAO }, SESSAO);
    const tabela = registros(arquivo!.csv);
    const colunas = tabela[0].length;
    assert.ok(tabela.every((l) => l.length === colunas), "todas as linhas têm o mesmo número de colunas");
    for (const nome of nomes) assert.ok(tabela.some((l) => l[0] === nome), JSON.stringify(nome));
  });

  it("quem não aceitou mensagens nunca sai no arquivo, nem com nome hostil", async () => {
    await novoContato("=EXCLUIDO()", false);
    const arquivo = await exportarContatosCsv({ formularioId: BALCAO }, SESSAO);
    assert.ok(!arquivo!.csv.includes("EXCLUIDO"));
  });
});

describe("acesso ao dado pessoal sem sessão", () => {
  it("revelar e exportar sem sessão devolvem nulo e não escrevem na trilha", async () => {
    const { id } = await novoContato("Sem Sessão Silva");
    const antes = JSON.stringify(trilha());
    assert.equal(await revelarContato(id, null), null);
    assert.equal(await exportarContatosCsv({ formularioId: BALCAO }, null), null);
    assert.equal(JSON.stringify(trilha()), antes);
  });

  it("a lista nunca devolve o nome inteiro nem o telefone inteiro", async () => {
    const { telefone } = await novoContato("Fulana de Tal Sobrenome");
    const pagina = await listarContatos({ ordem: "recentes", pagina: 1 });
    const dump = JSON.stringify(pagina);
    assert.ok(!dump.includes(telefone));
    assert.ok(!dump.includes(telefone.slice(3)));
    assert.ok(!dump.includes("Sobrenome"));
  });
});
