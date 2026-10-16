import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { extrairIp } from "./ip-hash";

describe("extrairIp", () => {
  it("prefere x-vercel-forwarded-for, que o cliente não consegue forjar", () => {
    const h = new Headers({ "x-vercel-forwarded-for": "203.0.113.9", "x-forwarded-for": "1.2.3.4, 203.0.113.9" });
    assert.equal(extrairIp(h), "203.0.113.9");
  });

  it("sem o cabeçalho da Vercel, usa o primeiro salto de x-forwarded-for e depois x-real-ip", () => {
    assert.equal(extrairIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" })), "1.2.3.4");
    assert.equal(extrairIp(new Headers({ "x-real-ip": "9.9.9.9" })), "9.9.9.9");
    assert.equal(extrairIp(new Headers()), null);
  });
});
