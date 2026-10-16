import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { montarLinkWhatsapp, ocultarNome, ocultarTelefone } from "./mascara";

describe("máscaras de contato", () => {
  it("oculta o nome mantendo o primeiro e a inicial do segundo", () => {
    assert.equal(ocultarNome("Marcos Antunes Silva"), "Marcos A.");
    assert.equal(ocultarNome("  ana   paula "), "ana P.");
    assert.equal(ocultarNome("Ana"), "Ana");
    assert.equal(ocultarNome(""), null);
    assert.equal(ocultarNome(null), null);
  });

  it("oculta o telefone no padrão", () => {
    assert.equal(ocultarTelefone("+5516912345632"), "(16) 9••••-••32");
  });

  it("telefone fora do padrão vira ••••", () => {
    assert.equal(ocultarTelefone("+551691234"), "••••");
    assert.equal(ocultarTelefone(""), "••••");
    assert.equal(ocultarTelefone("+5516912345632999"), "••••");
  });

  it("monta o link wa.me com o texto codificado", () => {
    assert.equal(
      montarLinkWhatsapp("+5535999998888", "Olá, tudo bem?"),
      "https://wa.me/5535999998888?text=Ol%C3%A1%2C%20tudo%20bem%3F",
    );
  });

  it("não monta link para número inválido", () => {
    assert.equal(montarLinkWhatsapp("35999998888", "oi"), null);
    assert.equal(montarLinkWhatsapp("+1555", "oi"), null);
    assert.equal(montarLinkWhatsapp("", "oi"), null);
  });
});
