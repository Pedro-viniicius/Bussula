import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ALFABETO_DOS_CODIGOS,
  codigoDeIndicacaoValido,
  cupomComFormatoValido,
  gerarCodigoDeIndicacao,
  gerarCodigoDoCupom,
  prefixoDeCupomValido,
} from "./codigos";

describe("códigos de cupom e indicação", () => {
  it("o alfabeto não tem símbolos ambíguos", () => {
    assert.equal(ALFABETO_DOS_CODIGOS.length, 31);
    assert.doesNotMatch(ALFABETO_DOS_CODIGOS, /[01OIL]/);
  });

  it("o cupom segue PREFIXO-XXXX-XX com o alfabeto", () => {
    for (let i = 0; i < 200; i++) {
      const c = gerarCodigoDoCupom("ESS");
      assert.match(c, /^ESS-[A-Z2-9]{4}-[A-Z2-9]{2}$/);
      assert.doesNotMatch(c.slice(4), /[01OIL]/);
      assert.ok(cupomComFormatoValido(c));
    }
  });

  it("usa o prefixo informado e cai em ESS quando inválido", () => {
    assert.ok(gerarCodigoDoCupom("FIT").startsWith("FIT-"));
    assert.ok(gerarCodigoDoCupom().startsWith("ESS-"));
    assert.ok(gerarCodigoDoCupom("a").startsWith("ESS-"));
    assert.ok(gerarCodigoDoCupom("MUITOLONGO").startsWith("ESS-"));
  });

  it("valida prefixos de 2 a 6 caracteres A-Z0-9", () => {
    assert.equal(prefixoDeCupomValido("ES"), true);
    assert.equal(prefixoDeCupomValido("ABC123"), true);
    assert.equal(prefixoDeCupomValido("E"), false);
    assert.equal(prefixoDeCupomValido("ABCDEFG"), false);
    assert.equal(prefixoDeCupomValido("abc"), false);
    assert.equal(prefixoDeCupomValido("A-B"), false);
  });

  it("rejeita cupom com formato errado", () => {
    assert.equal(cupomComFormatoValido("ESS-ABCD-E1"), false);
    assert.equal(cupomComFormatoValido("ESS-ABC-EF"), false);
    assert.equal(cupomComFormatoValido("ESSABCDEF"), false);
  });

  it("o código de indicação tem 8 caracteres do alfabeto", () => {
    for (let i = 0; i < 100; i++) {
      const c = gerarCodigoDeIndicacao();
      assert.equal(c.length, 8);
      assert.ok(codigoDeIndicacaoValido(c));
    }
    assert.equal(codigoDeIndicacaoValido("ABCDEFG"), false);
    assert.equal(codigoDeIndicacaoValido("ABCDEFG0"), false);
    assert.equal(codigoDeIndicacaoValido("abcdefgh"), false);
  });

  it("não repete código em uma amostra grande", () => {
    const vistos = new Set(Array.from({ length: 2000 }, () => gerarCodigoDeIndicacao()));
    assert.equal(vistos.size, 2000);
  });
});
