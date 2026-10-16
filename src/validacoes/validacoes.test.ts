import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { perguntaEmBranco, trocarTipo, type Pergunta } from "../dominio/formularios/perguntas";
import { gerarSlug } from "../utilitarios/slug";
import { MODULOS_DESLIGADOS } from "../dominio/formularios/modulos";
import { CONFIGURACAO_DA_LOJA_PADRAO, type ConfiguracaoDaLoja } from "../dominio/formularios/tipos";
import { FORMULARIO_PUBLICO } from "../lib/texts/publico";
import {
  configuracaoEstaValida,
  formularioEstaValido,
  limparConfiguracaoDaLoja,
  validarConfiguracaoDaLoja,
  validarFormulario,
  validarModulos,
  validarPergunta,
  type ContextoDaConfiguracao,
} from "./formulario";
import { limparValores, respostasEstaoValidas, validarResposta, validarRespostas } from "./resposta";

function pergunta(parcial: Partial<Pergunta> & Pick<Pergunta, "id" | "tipo">): Pergunta {
  return {
    enunciado: "Uma pergunta",
    ajuda: null,
    obrigatoria: false,
    opcoes: [],
    escala: null,
    ...parcial,
  };
}

describe("endereço público do formulário", () => {
  it("tira acento, espaço e pontuação", () => {
    assert.equal(gerarSlug("Experiência na loja"), "experiencia-na-loja");
    assert.equal(gerarSlug("  Pós-venda!!  "), "pos-venda");
  });
  it("nunca devolve vazio", () => {
    assert.equal(gerarSlug("!!!"), "formulario");
    assert.equal(gerarSlug(""), "formulario");
  });
});

describe("validação da pergunta", () => {
  it("exige enunciado", () => {
    assert.equal(validarPergunta(pergunta({ id: "a", tipo: "texto_curto", enunciado: "  " })), "Escreva a pergunta.");
  });
  it("exige ao menos duas opções onde o tipo usa opções", () => {
    const uma = pergunta({ id: "a", tipo: "escolha_unica", opcoes: ["Só uma"] });
    assert.equal(validarPergunta(uma), "Escreva ao menos 2 opções.");
  });
  it("recusa opções repetidas", () => {
    const repetidas = pergunta({ id: "a", tipo: "escolha_unica", opcoes: ["Sim", "Sim"] });
    assert.equal(validarPergunta(repetidas), "Há opções repetidas.");
  });
  it("recusa escala invertida", () => {
    const invertida = pergunta({
      id: "a",
      tipo: "escala",
      escala: { minimo: 5, maximo: 1, rotuloMinimo: null, rotuloMaximo: null },
    });
    assert.equal(validarPergunta(invertida), "O maior valor da escala precisa ser maior que o menor.");
  });
  it("aceita uma pergunta completa", () => {
    assert.equal(validarPergunta(pergunta({ id: "a", tipo: "escolha_unica", opcoes: ["Sim", "Não"] })), null);
  });
});

describe("troca de tipo da pergunta", () => {
  it("dá opções ao virar escolha e as tira ao voltar para texto", () => {
    const texto = perguntaEmBranco("a", "texto_curto");
    assert.deepEqual(texto.opcoes, []);
    const escolha = trocarTipo(texto, "escolha_unica");
    assert.equal(escolha.opcoes.length, 2);
    const escala = trocarTipo(escolha, "escala");
    assert.deepEqual(escala.opcoes, []);
    assert.ok(escala.escala);
    assert.deepEqual(trocarTipo(escala, "sim_nao").escala, null);
  });
});

describe("validação do formulário", () => {
  it("exige nome e ao menos uma pergunta", () => {
    const erros = validarFormulario({ nome: "", descricao: null, perguntas: [] });
    assert.equal(erros.nome, "Dê um nome ao formulário.");
    assert.equal(erros.perguntas, "Crie ao menos uma pergunta.");
    assert.equal(formularioEstaValido(erros), false);
  });
  it("aponta o erro na pergunta certa", () => {
    const erros = validarFormulario({
      nome: "Experiência na loja",
      descricao: null,
      perguntas: [pergunta({ id: "boa", tipo: "sim_nao" }), pergunta({ id: "ruim", tipo: "escolha_unica" })],
    });
    assert.equal(erros.porPergunta.boa, undefined);
    assert.ok(erros.porPergunta.ruim);
  });
});

describe("validação da resposta", () => {
  const obrigatoria = pergunta({ id: "nota", tipo: "avaliacao", obrigatoria: true });

  it("cobra o que é obrigatório e deixa passar o que é opcional", () => {
    assert.ok(validarResposta(obrigatoria, null));
    assert.equal(validarResposta(pergunta({ id: "livre", tipo: "texto_livre" }), null), null);
  });
  it("recusa nota fora de 1 a 5", () => {
    assert.equal(validarResposta(obrigatoria, 5), null);
    assert.ok(validarResposta(obrigatoria, 6));
    assert.ok(validarResposta(obrigatoria, 0));
  });
  it("recusa opção que não existe no formulário", () => {
    const escolha = pergunta({ id: "opcao", tipo: "escolha_unica", opcoes: ["Sim", "Não"] });
    assert.equal(validarResposta(escolha, "Sim"), null);
    assert.ok(validarResposta(escolha, "Talvez"));
  });
  it("recusa múltipla escolha com item inventado", () => {
    const multipla = pergunta({ id: "m", tipo: "multipla_escolha", opcoes: ["A", "B"] });
    assert.equal(validarResposta(multipla, ["A", "B"]), null);
    assert.ok(validarResposta(multipla, ["A", "C"]));
  });
  it("respeita o intervalo da escala", () => {
    const escala = pergunta({
      id: "e",
      tipo: "escala",
      escala: { minimo: 0, maximo: 10, rotuloMinimo: null, rotuloMaximo: null },
    });
    assert.equal(validarResposta(escala, 0), null);
    assert.equal(validarResposta(escala, 10), null);
    assert.ok(validarResposta(escala, 11));
  });
  it("junta os erros por pergunta", () => {
    const erros = validarRespostas([obrigatoria, pergunta({ id: "opcional", tipo: "texto_curto" })], {});
    assert.deepEqual(Object.keys(erros), ["nota"]);
    assert.equal(respostasEstaoValidas(erros), false);
  });
});

describe("limpeza antes de gravar", () => {
  it("descarta o que não pertence ao formulário e o que ficou em branco", () => {
    const perguntas = [pergunta({ id: "a", tipo: "texto_curto" }), pergunta({ id: "b", tipo: "texto_curto" })];
    const limpos = limparValores(perguntas, { a: "  oi  ", b: "   ", intruso: "não deveria entrar" });
    assert.deepEqual(limpos, { a: "oi" });
  });
});

describe("resposta de WhatsApp", () => {
  const whats = (obrigatoria: boolean) => pergunta({ id: "w", tipo: "whatsapp", obrigatoria });
  const erros = FORMULARIO_PUBLICO.whatsapp.erros;

  it("aceita um celular com máscara, com +55 e sem máscara", () => {
    for (const valor of ["(35) 99999-8888", "+55 35 99999-8888", "35999998888"]) {
      assert.equal(validarResposta(whats(true), valor), null);
    }
  });

  it("obrigatório e vazio pede o WhatsApp", () => {
    assert.equal(validarResposta(whats(true), ""), erros.vazio);
    assert.equal(validarResposta(whats(true), "   "), erros.vazio);
    assert.equal(validarResposta(whats(true), null), erros.vazio);
  });

  it("opcional e vazio passa", () => {
    assert.equal(validarResposta(whats(false), ""), null);
    assert.equal(validarResposta(whats(false), null), null);
  });

  it("devolve a mensagem do motivo certo", () => {
    assert.equal(validarResposta(whats(false), "(35) 9999-888"), erros.incompleto);
    assert.equal(validarResposta(whats(false), "(10) 99999-8888"), erros.ddd);
    assert.equal(validarResposta(whats(false), "(35) 83333-4444"), erros.naoCelular);
    assert.equal(validarResposta(whats(false), "(35) 99999-9999"), erros.repetido);
  });

  it("recusa um valor que não é texto", () => {
    assert.equal(validarResposta(whats(false), 35999998888), erros.vazio);
    assert.equal(validarResposta(whats(false), true), erros.vazio);
    assert.equal(validarResposta(whats(false), ["35999998888"]), erros.vazio);
  });
});

describe("resposta de nome", () => {
  const nome = (obrigatoria: boolean) => pergunta({ id: "n", tipo: "nome", obrigatoria });

  it("aceita um nome e tira os espaços nas pontas ao limpar", () => {
    assert.equal(validarResposta(nome(true), "Ana"), null);
    const perguntas = [nome(true)];
    assert.deepEqual(limparValores(perguntas, { n: "  Ana  " }), { n: "Ana" });
  });

  it("obrigatório e vazio pede o nome", () => {
    assert.equal(validarResposta(nome(true), ""), "Digite seu nome para continuar.");
  });

  it("opcional e vazio passa; nome enorme não", () => {
    assert.equal(validarResposta(nome(false), ""), null);
    assert.equal(validarResposta(nome(false), "a".repeat(121)), "Escreva no máximo 120 caracteres.");
  });

  it("recusa um valor que não é texto", () => {
    assert.equal(validarResposta(nome(false), 7), "Digite seu nome para continuar.");
  });
});

describe("módulos do formulário", () => {
  it("aceita módulos desligados e um prefixo válido", () => {
    assert.equal(validarModulos(MODULOS_DESLIGADOS), null);
    assert.equal(validarModulos({ ...MODULOS_DESLIGADOS, cupom: { prefixo: "ESS" } }), null);
  });

  it("recusa prefixo de cupom fora de 2 a 6 caracteres A-Z ou 0-9", () => {
    for (const prefixo of ["E", "ABCDEFG", "ess", "E S", "ÉSS", ""]) {
      assert.ok(validarModulos({ ...MODULOS_DESLIGADOS, cupom: { prefixo } }), `prefixo "${prefixo}"`);
    }
  });

  it("o formulário com módulos inválidos não está válido", () => {
    const dados = {
      nome: "Cadastro",
      descricao: null,
      perguntas: [pergunta({ id: "a", tipo: "texto_curto", enunciado: "Qual?" })],
      modulos: { ...MODULOS_DESLIGADOS, cupom: { prefixo: "x" } },
    };
    assert.equal(formularioEstaValido(validarFormulario(dados)), false);
    assert.equal(formularioEstaValido(validarFormulario({ ...dados, modulos: MODULOS_DESLIGADOS })), true);
  });
});

describe("configuração da loja", () => {
  const contexto = (parcial: Partial<ContextoDaConfiguracao> = {}): ContextoDaConfiguracao => ({
    situacao: "ATIVO",
    modulos: { ...MODULOS_DESLIGADOS, cupom: { prefixo: "ESS" } },
    destino: null,
    ...parcial,
  });
  const config = (parcial: Partial<ConfiguracaoDaLoja> = {}): ConfiguracaoDaLoja => ({
    ...CONFIGURACAO_DA_LOJA_PADRAO,
    textoDoBrinde: "Um shaker na primeira compra",
    ...parcial,
  });

  it("aceita a configuração padrão com brinde quando o cupom está ligado", () => {
    assert.deepEqual(validarConfiguracaoDaLoja(config(), contexto()), {});
  });

  it("exige o brinde quando o cupom está ligado, de 1 a 120 caracteres", () => {
    assert.ok(validarConfiguracaoDaLoja(config({ textoDoBrinde: null }), contexto()).textoDoBrinde);
    assert.ok(validarConfiguracaoDaLoja(config({ textoDoBrinde: "   " }), contexto()).textoDoBrinde);
    assert.deepEqual(validarConfiguracaoDaLoja(config({ textoDoBrinde: "a".repeat(120) }), contexto()), {});
    assert.ok(validarConfiguracaoDaLoja(config({ textoDoBrinde: "a".repeat(121) }), contexto()).textoDoBrinde);
  });

  it("sem cupom o brinde é opcional, mas continua limitado a 120 caracteres", () => {
    const semCupom = contexto({ modulos: MODULOS_DESLIGADOS });
    assert.deepEqual(validarConfiguracaoDaLoja(config({ textoDoBrinde: null }), semCupom), {});
    assert.ok(validarConfiguracaoDaLoja(config({ textoDoBrinde: "a".repeat(121) }), semCupom).textoDoBrinde);
  });

  it("nome obrigatório exige WhatsApp obrigatório", () => {
    const erros = validarConfiguracaoDaLoja(config({ nomeObrigatorio: true, whatsappObrigatorio: false }), contexto());
    assert.ok(erros.nomeObrigatorio);
    assert.deepEqual(validarConfiguracaoDaLoja(config({ nomeObrigatorio: true, whatsappObrigatorio: true }), contexto()), {});
  });

  it("WhatsApp opcional com cupom ligado é permitido (quem pula fica sem cupom)", () => {
    assert.deepEqual(validarConfiguracaoDaLoja(config({ whatsappObrigatorio: false }), contexto()), {});
  });

  it("o destino da indicação precisa existir, estar ativo e pedir WhatsApp", () => {
    const destino = "a0000000-0000-4000-8000-000000000000";
    const com = (d: ContextoDaConfiguracao["destino"]) =>
      validarConfiguracaoDaLoja(config({ formularioDeIndicacaoId: destino }), contexto({ destino: d }));

    assert.ok(com(null).formularioDeIndicacaoId);
    assert.ok(com({ situacao: "RASCUNHO", temWhatsapp: true }).formularioDeIndicacaoId);
    assert.ok(com({ situacao: "INATIVO", temWhatsapp: true }).formularioDeIndicacaoId);
    assert.ok(com({ situacao: "ATIVO", temWhatsapp: false }).formularioDeIndicacaoId);
    assert.deepEqual(com({ situacao: "ATIVO", temWhatsapp: true }), {});
  });

  it("destino que não mudou não é conferido de novo: destino fora do ar não impede outras mudanças", () => {
    const destino = "a0000000-0000-4000-8000-000000000000";
    const inativo = { situacao: "INATIVO" as const, temWhatsapp: true };
    const igual = validarConfiguracaoDaLoja(
      config({ formularioDeIndicacaoId: destino, textoDoBrinde: "Outro brinde" }),
      contexto({ destino: inativo, destinoGravadoId: destino }),
    );
    assert.deepEqual(igual, {});
    // Trocar para outro destino fora do ar continua barrado.
    const outro = "b0000000-0000-4000-8000-000000000000";
    const trocou = validarConfiguracaoDaLoja(
      config({ formularioDeIndicacaoId: outro }),
      contexto({ destino: inativo, destinoGravadoId: destino }),
    );
    assert.ok(trocou.formularioDeIndicacaoId);
  });

  it("destino nulo (o próprio formulário) não precisa de contexto de destino", () => {
    assert.deepEqual(validarConfiguracaoDaLoja(config({ formularioDeIndicacaoId: null }), contexto({ destino: null })), {});
  });

  it("só dá para editar formulário ativo ou em preparação", () => {
    for (const situacao of ["ATIVO", "RASCUNHO"] as const) {
      assert.equal(validarConfiguracaoDaLoja(config(), contexto({ situacao })).situacao, undefined);
    }
    for (const situacao of ["INATIVO", "ARQUIVADO"] as const) {
      assert.ok(validarConfiguracaoDaLoja(config(), contexto({ situacao })).situacao);
    }
  });

  it("acumula os erros e informa se está válida", () => {
    const erros = validarConfiguracaoDaLoja(
      config({ textoDoBrinde: null, nomeObrigatorio: true, whatsappObrigatorio: false }),
      contexto({ situacao: "INATIVO" }),
    );
    assert.equal(configuracaoEstaValida(erros), false);
    assert.deepEqual(Object.keys(erros).sort(), ["nomeObrigatorio", "situacao", "textoDoBrinde"]);
    assert.equal(configuracaoEstaValida({}), true);
  });

  it("limpar tira espaços e transforma brinde vazio em nulo", () => {
    assert.equal(limparConfiguracaoDaLoja(config({ textoDoBrinde: "  Shaker  " })).textoDoBrinde, "Shaker");
    assert.equal(limparConfiguracaoDaLoja(config({ textoDoBrinde: "   " })).textoDoBrinde, null);
  });
});
