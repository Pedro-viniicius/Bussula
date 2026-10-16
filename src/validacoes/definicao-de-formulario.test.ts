import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Pergunta } from "@/dominio/formularios/perguntas";
import { lerDefinicoes, termoDeSaudeNaPergunta } from "./definicao-de-formulario";

const WHATSAPP = { id: "whats", tipo: "whatsapp", enunciado: "Qual é o seu WhatsApp?" };
const ESCOLHA = {
  id: "origem",
  tipo: "escolha_unica",
  enunciado: "Como conheceu a loja?",
  opcoes: ["Amigo", "Redes sociais"],
};

function arquivo(formulario: Record<string, unknown>): string {
  return JSON.stringify({
    formularios: [{ slug: "cadastro-teste", nome: "Cadastro", perguntas: [ESCOLHA], ...formulario }],
  });
}

function erros(texto: string): string[] {
  const leitura = lerDefinicoes(texto);
  assert.equal(leitura.ok, false);
  return leitura.ok ? [] : leitura.erros;
}

describe("definição de formulários (arquivo JSON)", () => {
  it("lê um arquivo válido e aplica os padrões", () => {
    const leitura = lerDefinicoes(arquivo({}));
    assert.equal(leitura.ok, true);
    if (!leitura.ok) return;
    const [f] = leitura.definicoes;
    assert.equal(f.publicar, false);
    assert.equal(f.descricao, null);
    assert.deepEqual(f.modulos, { recompra: false, ofertas: false, cupom: null, indicacao: false });
    assert.equal(f.perguntas[0].obrigatoria, false);
  });

  it("cupom sem prefixo usa o padrão ESS", () => {
    const leitura = lerDefinicoes(
      arquivo({ modulos: { cupom: {} }, perguntas: [WHATSAPP, ESCOLHA] }),
    );
    assert.equal(leitura.ok, true);
    if (leitura.ok) assert.deepEqual(leitura.definicoes[0].modulos.cupom, { prefixo: "ESS" });
  });

  it("JSON malformado é recusado", () => {
    assert.match(erros("{ isto não é json")[0], /JSON inválido/);
  });

  it("campo desconhecido e slug fora do padrão são recusados", () => {
    assert.ok(erros(arquivo({ extra: 1 })).length > 0);
    assert.ok(erros(arquivo({ slug: "Cadastro Teste" })).length > 0);
  });

  it("slug repetido e id de pergunta repetido são recusados", () => {
    const dois = JSON.stringify({
      formularios: [
        { slug: "igual", nome: "A", perguntas: [ESCOLHA] },
        { slug: "igual", nome: "B", perguntas: [ESCOLHA, ESCOLHA] },
      ],
    });
    const achados = erros(dois).join("\n");
    assert.match(achados, /slug "igual" repetido/);
    assert.match(achados, /id repetido/);
  });

  it("pergunta inválida pelas regras de sempre é recusada", () => {
    const achados = erros(arquivo({ perguntas: [{ ...ESCOLHA, opcoes: ["Só uma"] }] })).join("\n");
    assert.match(achados, /ao menos 2 opções/);
  });

  it("D4(a): WhatsApp sem módulo que use o número é recusado", () => {
    assert.match(erros(arquivo({ perguntas: [WHATSAPP, ESCOLHA] })).join("\n"), /nenhum módulo usa o número/);
  });

  it("D4(a): WhatsApp com qualquer módulo que use o número passa", () => {
    for (const modulos of [{ recompra: true }, { ofertas: true }, { cupom: {} }, { indicacao: true }]) {
      assert.equal(lerDefinicoes(arquivo({ modulos, perguntas: [WHATSAPP, ESCOLHA] })).ok, true);
    }
  });

  it("D4(c): termo de saúde ou objetivo junto de pergunta pessoal é recusado", () => {
    const saude = { id: "obj", tipo: "texto_curto", enunciado: "Qual é o seu objetivo com os suplementos?" };
    const achados = erros(arquivo({ modulos: { recompra: true }, perguntas: [WHATSAPP, saude] })).join("\n");
    assert.match(achados, /saúde ou objetivo/);
  });

  it("D4(c): o termo também é achado nas opções, sem acento e sem falso positivo", () => {
    const comOpcao: Pergunta = {
      id: "p",
      tipo: "escolha_unica",
      ajuda: null,
      obrigatoria: false,
      escala: null,
      enunciado: "O que você busca?",
      opcoes: ["Emagrecer", "Outro"],
    };
    assert.equal(termoDeSaudeNaPergunta(comOpcao), "emagrecer");
    const pesquisa = { ...comOpcao, enunciado: "Fez pesquisa de preço?", opcoes: ["Sim", "Não"] };
    assert.equal(termoDeSaudeNaPergunta(pesquisa), null);
  });

  it("D4(c): lista ampliada de termos (palavra inteira, sem acento, sem falso positivo)", () => {
    const base: Pergunta = {
      id: "p", tipo: "texto_curto", ajuda: null, obrigatoria: false, escala: null, opcoes: [], enunciado: "",
    };
    const achados: Record<string, string> = {
      "Qual a sua meta?": "meta",
      "Quer ganhar massa?": "massa",
      "Busca hipertrofia?": "hipertrofia",
      "Quer perder gordura?": "gordura",
      "Tem intolerância a algo?": "intolerancia",
      "Tem lactose no cardápio?": "lactose",
      "Evita glúten?": "gluten",
      "Como está o colesterol?": "colesterol",
      "Controla a glicose?": "glicose",
      "Usa terapia hormonal?": "hormonal",
      "Sente ansiedade?": "ansiedade",
      "Dorme bem? Como é o sono?": "sono",
      "Qual é o seu IMC?": "imc",
      "Qual o seu treino?": "treino",
    };
    for (const [enunciado, termo] of Object.entries(achados)) {
      assert.equal(termoDeSaudeNaPergunta({ ...base, enunciado }), termo, enunciado);
    }
    for (const enunciado of ["Vimos em qual metade da loja?", "Gostou do sonoro da loja?", "Tem massagem?", "Fez um cometa?"]) {
      assert.equal(termoDeSaudeNaPergunta({ ...base, enunciado }), null, enunciado);
    }
  });

  it("D4(c): os rótulos da escala também são verificados", () => {
    const escala: Pergunta = {
      id: "e", tipo: "escala", ajuda: null, obrigatoria: false, opcoes: [], enunciado: "Como se sente?",
      escala: { minimo: 1, maximo: 5, rotuloMinimo: "Muita ansiedade", rotuloMaximo: "Nenhuma" },
    };
    assert.equal(termoDeSaudeNaPergunta(escala), "ansiedade");
    const maximo = { ...escala, escala: { ...escala.escala!, rotuloMinimo: "Nada", rotuloMaximo: "Ótimo sono" } };
    assert.equal(termoDeSaudeNaPergunta(maximo), "sono");
  });

  it("D4(c): a descrição do formulário também é verificada quando há dado pessoal", () => {
    const modulos = { recompra: true };
    const perguntas = [WHATSAPP, ESCOLHA];
    const achados = erros(arquivo({ modulos, perguntas, descricao: "Ajudamos você a atingir sua meta" })).join("\n");
    assert.match(achados, /descrição/);
    assert.match(achados, /"meta"/);
    assert.equal(lerDefinicoes(arquivo({ modulos, perguntas, descricao: "Cadastro rápido no balcão" })).ok, true);
    // Sem dado pessoal, a descrição não é barrada.
    assert.equal(lerDefinicoes(arquivo({ descricao: "Qual a sua meta?" })).ok, true);
  });

  it("sem pergunta pessoal, pergunta de saúde não é barrada por D4(c)", () => {
    const saude = { id: "obj", tipo: "texto_curto", enunciado: "Qual é o seu objetivo?" };
    assert.equal(lerDefinicoes(arquivo({ perguntas: [saude] })).ok, true);
  });

  it("avisa que obrigatoria de pergunta pessoal é ignorado e força false", () => {
    const leitura = lerDefinicoes(
      arquivo({ modulos: { recompra: true }, perguntas: [{ ...WHATSAPP, obrigatoria: true }, ESCOLHA] }),
    );
    assert.equal(leitura.ok, true);
    if (!leitura.ok) return;
    assert.equal(leitura.definicoes[0].perguntas[0].obrigatoria, false);
    assert.ok(leitura.avisos.some((a) => /obrigatoria.*ignorado/.test(a)));
  });

  it("avisa de texto livre junto de dado pessoal e do brinde do cupom", () => {
    const livre = { id: "livre", tipo: "texto_livre", enunciado: "Quer deixar um recado?" };
    const leitura = lerDefinicoes(arquivo({ modulos: { cupom: {} }, perguntas: [WHATSAPP, livre] }));
    assert.equal(leitura.ok, true);
    if (!leitura.ok) return;
    assert.ok(leitura.avisos.some((a) => /texto livre/.test(a)));
    assert.ok(leitura.avisos.some((a) => /brinde/.test(a)));
  });

  it("prefixo de cupom inválido é recusado", () => {
    const achados = erros(arquivo({ modulos: { cupom: { prefixo: "x" } }, perguntas: [WHATSAPP] })).join("\n");
    assert.match(achados, /prefixo do cupom/);
  });

  it("o arquivo de exemplo do repositório é válido", async () => {
    const { readFileSync } = await import("node:fs");
    const leitura = lerDefinicoes(readFileSync("config/formularios/exemplo.json", "utf8"));
    assert.equal(leitura.ok, true);
  });
});
