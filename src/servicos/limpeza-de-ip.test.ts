/**
 * O hash do IP não fica para sempre: depois de 2 horas é zerado, por uma
 * limpeza oportunista (no máximo uma vez a cada 10 minutos por instância).
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { respostasGravadas } from "../repositorios";
import { loja } from "../repositorios/em-memoria/loja";
import { limparIpsAntigosSeNecessario } from "./respostas";

const MIN = 60_000;

function registrarIp(ipHash: string, criadoEm: Date) {
  loja().ipsDeEnvio.push({ ipHash, criadoEm });
}
const restantes = (ipHash: string) => loja().ipsDeEnvio.filter((e) => e.ipHash === ipHash).length;

describe("repositório: limparIpsAntigos", () => {
  it("remove só o que é mais antigo que o corte e devolve quantos", async () => {
    const corte = new Date("2031-01-01T12:00:00Z");
    registrarIp("rep-velho", new Date(corte.getTime() - 5 * MIN));
    registrarIp("rep-novo", new Date(corte.getTime() + 5 * MIN));
    assert.ok((await respostasGravadas.limparIpsAntigos(corte)) >= 1);
    assert.equal(restantes("rep-velho"), 0);
    assert.equal(restantes("rep-novo"), 1);
  });
});

describe("limpeza oportunista", () => {
  it("zera o que passou de 2 horas e respeita o intervalo de 10 minutos", async () => {
    const t0 = new Date("2032-06-01T12:00:00Z");
    registrarIp("svc-velho", new Date(t0.getTime() - 3 * 60 * MIN));
    registrarIp("svc-recente", new Date(t0.getTime() - 30 * MIN));

    await limparIpsAntigosSeNecessario(t0);
    assert.equal(restantes("svc-velho"), 0);
    assert.equal(restantes("svc-recente"), 1);

    // 5 minutos depois: ainda dentro do intervalo, não roda.
    registrarIp("svc-velho2", new Date(t0.getTime() - 3 * 60 * MIN));
    await limparIpsAntigosSeNecessario(new Date(t0.getTime() + 5 * MIN));
    assert.equal(restantes("svc-velho2"), 1);

    // 11 minutos depois: roda de novo.
    await limparIpsAntigosSeNecessario(new Date(t0.getTime() + 11 * MIN));
    assert.equal(restantes("svc-velho2"), 0);
  });

  it("falha do repositório não derruba o envio e libera nova tentativa", async () => {
    const original = respostasGravadas.limparIpsAntigos;
    const t = new Date("2033-06-01T12:00:00Z");
    respostasGravadas.limparIpsAntigos = async () => {
      throw new Error("banco fora");
    };
    const aviso = console.warn;
    console.warn = () => {};
    try {
      await assert.doesNotReject(limparIpsAntigosSeNecessario(t));
    } finally {
      console.warn = aviso;
      respostasGravadas.limparIpsAntigos = original;
    }
    registrarIp("svc-falha", new Date(t.getTime() - 3 * 60 * MIN));
    await limparIpsAntigosSeNecessario(new Date(t.getTime() + 1 * MIN));
    assert.equal(restantes("svc-falha"), 0);
  });
});
