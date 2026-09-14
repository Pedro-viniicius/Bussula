import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validarConfigAdmin } from "./config";
import { base32Encode, codigoTotp, segundosRestantes, verificarTotp } from "./totp";
import { criarTokenSessao, destinoSeguro, lerTokenSessao } from "./session-token";

// RFC 6238 test secret ("12345678901234567890"); expected values from the RFC, truncated to 6 digits.
const SEGREDO = base32Encode(Buffer.from("12345678901234567890"));
const ENV_OK = { ADMIN_PASSWORD: "x".repeat(16), ADMIN_TOTP_SECRET: SEGREDO, SESSION_SECRET: "s".repeat(32) };

describe("TOTP", () => {
  it("bate com os vetores da RFC 6238", () => {
    assert.equal(codigoTotp(SEGREDO, 59_000), "287082");
    assert.equal(codigoTotp(SEGREDO, 1_111_111_109_000), "081804");
    assert.equal(codigoTotp(SEGREDO, 1_234_567_890_000), "005924");
  });
  it("aceita o passo atual e ±1 (30 s), recusa ±2", () => {
    const t = 1_111_111_109_000; // meio de um passo
    const atual = codigoTotp(SEGREDO, t);
    assert.equal(verificarTotp(SEGREDO, atual, t), true);
    assert.equal(verificarTotp(SEGREDO, atual, t + 30_000), true);
    assert.equal(verificarTotp(SEGREDO, atual, t - 30_000), true);
    assert.equal(verificarTotp(SEGREDO, atual, t + 60_000), false);
    assert.equal(verificarTotp(SEGREDO, atual, t - 60_000), false);
  });
  it("recusa formato inválido e aceita espaço no meio", () => {
    assert.equal(verificarTotp(SEGREDO, "12345", 59_000), false);
    assert.equal(verificarTotp(SEGREDO, "abcdef", 59_000), false);
    assert.equal(verificarTotp(SEGREDO, "287 082", 59_000), true);
  });
  it("segundos restantes ficam entre 1 e 30", () => {
    assert.equal(segundosRestantes(0), 30);
    assert.equal(segundosRestantes(29_000), 1);
  });
});

describe("configuração do admin", () => {
  it("passa com as três variáveis válidas", () => {
    assert.equal(validarConfigAdmin(ENV_OK).ok, true);
  });
  it("falha fechado quando falta ou é curta", () => {
    const r = validarConfigAdmin({ ...ENV_OK, ADMIN_TOTP_SECRET: "" });
    assert.equal(r.ok, false);
    if (!r.ok) assert.deepEqual(r.problemas.map((p) => p.variavel), ["ADMIN_TOTP_SECRET"]);
    const r2 = validarConfigAdmin({ ADMIN_PASSWORD: "curta", SESSION_SECRET: "curto", ADMIN_TOTP_SECRET: "não-base32!" });
    assert.equal(r2.ok, false);
    if (!r2.ok) assert.equal(r2.problemas.length, 3);
  });
});

describe("token de sessão", () => {
  it("assina, lê e expira", () => {
    const t = 1_700_000_000_000;
    const { token, sessao } = criarTokenSessao(t, ENV_OK);
    assert.deepEqual(lerTokenSessao(token, t + 1000, ENV_OK), sessao);
    assert.equal(lerTokenSessao(token, t + 13 * 3600_000, ENV_OK), null);
  });
  it("recusa assinatura adulterada, outro segredo e segredo ausente", () => {
    const { token } = criarTokenSessao(Date.now(), ENV_OK);
    const [payload] = token.split(".");
    assert.equal(lerTokenSessao(`${payload}.AAAA`, Date.now(), ENV_OK), null);
    assert.equal(lerTokenSessao(token, Date.now(), { SESSION_SECRET: "t".repeat(32) }), null);
    assert.equal(lerTokenSessao(token, Date.now(), {}), null);
    assert.throws(() => criarTokenSessao(Date.now(), {}));
  });
});

describe("destino após login", () => {
  it("só aceita caminho relativo do próprio site", () => {
    assert.equal(destinoSeguro("/demo?pg=2"), "/demo?pg=2");
    assert.equal(destinoSeguro("//evil.com"), "/admin");
    assert.equal(destinoSeguro("https://evil.com"), "/admin");
    assert.equal(destinoSeguro("/x\\evil"), "/admin");
    assert.equal(destinoSeguro(""), "/admin");
  });
});
