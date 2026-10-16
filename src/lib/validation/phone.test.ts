import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FORMULARIO_PUBLICO } from "../texts/publico";
import { formatarE164, mascararTelefone, motivoTelefoneInvalido, normalizarTelefone } from "./phone";

describe("máscara do telefone", () => {
  it("formata enquanto a pessoa digita, sem bloquear", () => {
    assert.equal(mascararTelefone(""), "");
    assert.equal(mascararTelefone("3"), "(3");
    assert.equal(mascararTelefone("359"), "(35) 9");
    assert.equal(mascararTelefone("35999998888"), "(35) 99999-8888");
  });

  it("ignora letras e dígitos além do 11º", () => {
    assert.equal(mascararTelefone("abc35 99999-8888 77"), "(35) 99999-8888");
  });

  it("aceita colar com +55, com 55 e com espaços, sem cortar o número", () => {
    assert.equal(mascararTelefone("+55 35 99999-8888"), "(35) 99999-8888");
    assert.equal(mascararTelefone("5535999998888"), "(35) 99999-8888");
    assert.equal(mascararTelefone("+55 (35) 99999-8888"), "(35) 99999-8888");
  });

  it("não confunde o DDD 55 (Rio Grande do Sul) com o código do país", () => {
    assert.equal(mascararTelefone("55999998888"), "(55) 99999-8888");
    // Um dígito a mais por engano é ignorado, e o número não se desloca.
    assert.equal(mascararTelefone("559999988887"), "(55) 99999-8888");
  });
});

describe("normalização do telefone", () => {
  it("devolve E.164 para um celular válido, com ou sem o 55", () => {
    assert.equal(normalizarTelefone("(35) 99999-8888"), "+5535999998888");
    assert.equal(normalizarTelefone("+55 35 99999-8888"), "+5535999998888");
    assert.equal(normalizarTelefone("5535999998888"), "+5535999998888");
    assert.equal(normalizarTelefone("(55) 99999-8888"), "+5555999998888");
  });

  it("devolve nulo para o que não serve", () => {
    assert.equal(normalizarTelefone(""), null);
    assert.equal(normalizarTelefone("35 9999-888"), null);
    assert.equal(normalizarTelefone("(10) 99999-8888"), null);
    assert.equal(normalizarTelefone("(35) 89999-8888"), null);
    assert.equal(normalizarTelefone("(35) 99999-9999"), null);
  });
});

describe("motivo de o telefone não servir", () => {
  const casos: [string, string, ReturnType<typeof motivoTelefoneInvalido>][] = [
    ["vazio", "", "vazio"],
    ["só letras", "abc", "vazio"],
    ["menos de 11 dígitos", "(35) 9999-888", "incompleto"],
    ["dígitos demais", "359999988887777", "incompleto"],
    ["DDD abaixo de 11", "(10) 99999-8888", "ddd"],
    ["DDD terminado em zero", "(30) 99999-8888", "ddd"],
    ["fixo (3º dígito diferente de 9)", "(35) 3333-4444", "incompleto"],
    ["celular sem o 9", "(35) 83333-4444", "naoCelular"],
    ["teclado batido", "(35) 99999-9999", "repetido"],
    ["válido", "(35) 99999-8888", null],
    ["válido colado com +55", "+55 35 99999-8888", null],
  ];

  for (const [nome, entrada, esperado] of casos) {
    it(`${nome}`, () => assert.equal(motivoTelefoneInvalido(entrada), esperado));
  }

  it("cada motivo tem a sua mensagem, e nenhuma está vazia", () => {
    const motivos = ["vazio", "incompleto", "ddd", "naoCelular", "repetido"] as const;
    const mensagens = motivos.map((motivo) => FORMULARIO_PUBLICO.whatsapp.erros[motivo]);
    assert.equal(new Set(mensagens).size, 5);
    for (const mensagem of mensagens) assert.ok(mensagem.length > 10);
  });
});

describe("telefone para exibir", () => {
  it("formata o E.164 sem o código do país", () => {
    assert.equal(formatarE164("+5535999998888"), "(35) 99999-8888");
    assert.equal(formatarE164("+5555999998888"), "(55) 99999-8888");
  });
});
