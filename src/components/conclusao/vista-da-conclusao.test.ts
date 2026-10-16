import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { ResultadoDoEnvio } from "@/dominio/respostas/envio";
import type { RegistroDaConclusao } from "@/lib/offline/conclusao-guardada";
import { CONCLUIDO } from "@/lib/texts/publico";
import { formatarValidade, montarVista } from "./vista-da-conclusao";

function registro(sobrescrever: Partial<RegistroDaConclusao> = {}): RegistroDaConclusao {
  return {
    chaveEnvio: "k",
    slug: "cadastro-no-balcao",
    modulos: { recompra: true, ofertas: false, cupom: true, indicacao: true },
    pediuContato: true,
    pulouContato: false,
    resultado: null,
    ...sobrescrever,
  };
}

const ok = (beneficios?: Extract<ResultadoDoEnvio, { ok: true }>["beneficios"]): ResultadoDoEnvio => ({
  ok: true,
  jaEstavaRegistrada: false,
  ...(beneficios !== undefined ? { beneficios } : {}),
});

describe("montarVista", () => {
  test("formata a validade sem passar por Date", () => {
    assert.equal(formatarValidade("2026-11-14"), "14/11/2026");
    assert.equal(formatarValidade("lixo"), "lixo");
  });

  test("cupom novo mostra código, brinde, validade e indicação", () => {
    const v = montarVista(
      registro({
        resultado: ok({
          cupom: { status: "emitido", codigo: "ESS-7K4Q-92", textoDoBrinde: "10% off", validoAte: "2026-11-14" },
          indicacao: { codigo: "ABCD2345", slugDestino: "cadastro-no-balcao" },
        }),
      }),
      false,
    );
    assert.equal(v.titulo, CONCLUIDO.tituloCadastro);
    assert.deepEqual(v.cupom, { tipo: "emitido", codigo: "ESS-7K4Q-92", brinde: "10% off", validoAte: "14/11/2026" });
    assert.deepEqual(v.indicacao, {
      tipo: "pronta",
      codigo: "ABCD2345",
      slugDestino: "cadastro-no-balcao",
      brinde: "10% off",
    });
  });

  test("ja_emitido: título próprio, sem bloco de cupom, indicação continua", () => {
    const v = montarVista(
      registro({
        resultado: ok({
          cupom: { status: "ja_emitido" },
          indicacao: { codigo: "ABCD2345", slugDestino: "cadastro-no-balcao" },
        }),
      }),
      false,
    );
    assert.equal(v.titulo, CONCLUIDO.jaTinha.titulo);
    assert.equal(v.icone, "info");
    assert.equal(v.cupom, null);
    assert.equal(v.indicacao?.tipo, "pronta");
    assert.equal(v.indicacao?.tipo === "pronta" && v.indicacao.brinde, null);
    assert.equal(v.aviso?.tom, "neutro");
    assert.doesNotMatch(JSON.stringify(v), /\d{2}\/\d{2}\/\d{4}/, "nenhuma data no estado ja_emitido");
  });

  test("cupom que falhou: aviso de atenção e sem bloco", () => {
    const v = montarVista(registro({ resultado: ok({ cupom: { status: "falhou" }, indicacao: null }) }), false);
    assert.equal(v.cupom, null);
    assert.equal(v.aviso?.tom, "atencao");
    assert.equal(v.aviso?.texto, CONCLUIDO.cupomFalhou);
  });

  test("só indicação (módulo de cupom desligado)", () => {
    const v = montarVista(
      registro({
        modulos: { recompra: true, ofertas: false, cupom: false, indicacao: true },
        resultado: ok({ cupom: null, indicacao: { codigo: "ABCD2345", slugDestino: "x" } }),
      }),
      false,
    );
    assert.equal(v.cupom, null);
    assert.equal(v.indicacao?.tipo, "pronta");
  });

  test("WhatsApp pulado com cupom ligado: linha neutra, sem blocos", () => {
    const v = montarVista(
      registro({ pulouContato: true, resultado: ok({ cupom: null, indicacao: null }) }),
      false,
    );
    assert.equal(v.semWhatsapp, true);
    assert.equal(v.cupom, null);
    assert.equal(v.indicacao, null);
  });

  test("item antigo sem beneficios é tratado como nenhum benefício", () => {
    const v = montarVista(registro({ resultado: ok() }), false);
    assert.equal(v.cupom, null);
    assert.equal(v.indicacao, null);
    assert.equal(v.semDados, false);
  });

  test("guardada com cupom ligado: gerando, sem código inventado", () => {
    const v = montarVista(registro(), true);
    assert.equal(v.titulo, CONCLUIDO.guardadaComCupom.titulo);
    assert.deepEqual(v.cupom, { tipo: "gerando" });
    assert.deepEqual(v.indicacao, { tipo: "aguardando" });
  });

  test("guardada sem cupom, com indicação: link aparece depois", () => {
    const v = montarVista(registro({ modulos: { recompra: true, ofertas: false, cupom: false, indicacao: true } }), true);
    assert.equal(v.texto, CONCLUIDO.guardada);
    assert.equal(v.cupom, null);
    assert.deepEqual(v.indicacao, { tipo: "aguardando" });
  });

  test("guardada e WhatsApp pulado: nada vai chegar, então não espera cupom", () => {
    const v = montarVista(registro({ pulouContato: true }), true);
    assert.equal(v.cupom, null);
    assert.equal(v.indicacao, null);
    assert.equal(v.semWhatsapp, true);
  });

  test("formulário anônimo (sem módulos) mantém a tela atual", () => {
    const v = montarVista(
      registro({
        pediuContato: false,
        modulos: { recompra: false, ofertas: false, cupom: false, indicacao: false },
        resultado: ok({ cupom: null, indicacao: null }),
      }),
      false,
    );
    assert.equal(v.titulo, CONCLUIDO.titulo);
    assert.equal(v.texto, CONCLUIDO.texto);
    assert.equal(v.aviso, null);
    assert.equal(v.semWhatsapp, false);
  });

  test("sem registro: confirmação genérica com a orientação do print", () => {
    assert.equal(montarVista(null, false).semDados, true);
    assert.equal(montarVista(null, true).semDados, false);
    assert.equal(montarVista(null, true).texto, CONCLUIDO.guardada);
  });

  test("a fila trouxe uma recusa: mostra orientação fixa, não a mensagem do servidor", () => {
    const v = montarVista(
      registro({ resultado: { ok: false, erro: "FORMULARIO_INATIVO", mensagem: "Fora do ar." } }),
      false,
    );
    assert.equal(v.titulo, CONCLUIDO.naoRegistrado.titulo);
    assert.equal(v.texto, CONCLUIDO.naoRegistrado.texto);
    assert.equal(v.rodape, CONCLUIDO.naoRegistrado.rodape);
    assert.notEqual(v.rodape, CONCLUIDO.fechar);
    assert.equal(v.cupom, null);
  });
});
