/**
 * Testes do cadastro com WhatsApp, cupom e indicação (passo 6 do plano).
 *
 * Rodam contra o modo de teste (repositórios em memória). Cada teste cria o
 * próprio formulário, com telefones e chaves novos, para não depender da ordem
 * nem dos dados fictícios — os números do `servicos.test.ts` não se mexem.
 * Tudo aqui é fictício: nomes "Teste" e telefones fora da faixa dos dados de
 * exemplo.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { afterEach, describe, it } from "node:test";
import { cupomComFormatoValido, codigoDeIndicacaoValido } from "../dominio/contatos/codigos";
import { ConflitoDeContato } from "../dominio/contatos/repositorio";
import { MODULOS_DESLIGADOS, type ModulosDoFormulario } from "../dominio/formularios/modulos";
import { ehPerguntaPessoal, type Pergunta } from "../dominio/formularios/perguntas";
import { CONFIGURACAO_DA_LOJA_PADRAO, type ConfiguracaoDaLoja } from "../dominio/formularios/tipos";
import { VERSAO_ATUAL } from "../lib/texts/consentimento";
import { loja } from "../repositorios/em-memoria/loja";
import { formulariosGravados, respostasGravadas } from "../repositorios";
import {
  buscarFormularioPublicoPorSlug,
  criarFormulario,
  listarFormularios,
  mudarSituacaoDoFormulario,
  publicarFormulario,
  salvarConfiguracaoDaLoja,
  situacaoDaPrivacidade,
  type AmbienteDaTrava,
} from "./formularios";
import { comPerguntas, registrarResposta, type EnvioDeResposta, type OpcoesDoEnvio } from "./respostas";
import { buscarResultadosDoFormulario } from "./resultados";

const SESSAO = { id: randomUUID(), exp: Math.floor(Date.now() / 1000) + 3600 };
const AGORA = new Date("2026-10-15T12:00:00-03:00");

const CONTROLADOR_VAZIO = { razaoSocial: "", cnpj: "", endereco: "", emailPrivacidade: "" };
const CONTROLADOR_COMPLETO = {
  razaoSocial: "Empresa de Teste Ltda",
  cnpj: "11.222.333/0001-81",
  endereco: "Rua de Teste, 1, Lavras, MG",
  emailPrivacidade: "privacidade@teste.com.br",
};
const PRODUCAO_SEM_CONTROLADOR: AmbienteDaTrava = { producao: true, controlador: CONTROLADOR_VAZIO };
const PRODUCAO_COMPLETA: AmbienteDaTrava = { producao: true, controlador: CONTROLADOR_COMPLETO };

let sequencia = 0;
/** Telefone novo e válido a cada chamada, fora da faixa dos dados fictícios. */
function telefone(): string {
  sequencia += 1;
  return `2197${String(sequencia).padStart(7, "0")}`;
}
function digitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

const PERGUNTAS: Pergunta[] = [
  { id: "p-conheceu", tipo: "escolha_unica", enunciado: "Como conheceu a loja?", ajuda: null, obrigatoria: false, opcoes: ["Rua", "Amigo"], escala: null },
  { id: "p-nome", tipo: "nome", enunciado: "Como você se chama?", ajuda: null, obrigatoria: false, opcoes: [], escala: null },
  { id: "p-whatsapp", tipo: "whatsapp", enunciado: "Qual é o seu WhatsApp?", ajuda: null, obrigatoria: true, opcoes: [], escala: null },
];

const TUDO_LIGADO: ModulosDoFormulario = {
  recompra: true,
  ofertas: true,
  cupom: { prefixo: "TST" },
  indicacao: true,
};

/** Cria e publica um formulário de teste; devolve o endereço e o id. */
async function novoFormulario(
  opcoes: {
    modulos?: ModulosDoFormulario;
    configuracao?: Partial<ConfiguracaoDaLoja>;
    perguntas?: Pergunta[];
    publicar?: boolean;
  } = {},
) {
  const criado = await criarFormulario({
    nome: `Cadastro de teste ${randomUUID().slice(0, 8)}`,
    descricao: null,
    perguntas: opcoes.perguntas ?? PERGUNTAS,
    modulos: opcoes.modulos ?? TUDO_LIGADO,
  });
  assert.ok(criado.ok);
  const id = criado.valor.id;
  await formulariosGravados.salvarConfiguracaoDaLoja(id, {
    ...CONFIGURACAO_DA_LOJA_PADRAO,
    textoDoBrinde: "Brinde de teste",
    ...opcoes.configuracao,
  });
  if (opcoes.publicar !== false) assert.ok((await publicarFormulario(id)).ok);
  return { id, slug: criado.valor.slug };
}

function envio(slug: string, parcial: Partial<EnvioDeResposta> & { telefone?: string; nome?: string } = {}): EnvioDeResposta {
  const { telefone: fone, nome, ...resto } = parcial;
  return {
    slug,
    chaveEnvio: randomUUID(),
    origem: "nfc",
    valores: {
      "p-conheceu": "Rua",
      ...(nome ? { "p-nome": nome } : {}),
      ...(fone ? { "p-whatsapp": fone } : {}),
    },
    consentimento: { versao: VERSAO_ATUAL, aceites: { recompra: true, ofertas: false } },
    ...resto,
  };
}

async function enviar(e: EnvioDeResposta, opcoes: OpcoesDoEnvio = {}) {
  const r = await registrarResposta(e, { agora: AGORA, ...opcoes });
  assert.ok(r.ok, `esperava sucesso, veio ${JSON.stringify(r)}`);
  return r.valor;
}

describe("cupom", () => {
  it("emite com validade de 30 dias e devolve o código uma vez", async () => {
    const { slug } = await novoFormulario();
    const resultado = await enviar(envio(slug, { telefone: telefone(), nome: "Teste" }));

    assert.equal(resultado.jaEstavaRegistrada, false);
    const cupom = resultado.beneficios.cupom;
    assert.ok(cupom && cupom.status === "emitido");
    assert.ok(cupomComFormatoValido(cupom.codigo));
    assert.ok(cupom.codigo.startsWith("TST-"));
    assert.equal(cupom.textoDoBrinde, "Brinde de teste");
    assert.equal(cupom.validoAte, "2026-11-14");
  });

  it("segundo cadastro do mesmo telefone no mesmo formulário volta ja_emitido, sem código nem validade", async () => {
    const { slug } = await novoFormulario();
    const fone = telefone();
    await enviar(envio(slug, { telefone: fone }));
    const segundo = await enviar(envio(slug, { telefone: fone }));

    assert.deepEqual(segundo.beneficios.cupom, { status: "ja_emitido" });
  });

  it("o mesmo telefone ganha cupom em outro formulário", async () => {
    const a = await novoFormulario();
    const b = await novoFormulario();
    const fone = telefone();
    await enviar(envio(a.slug, { telefone: fone }));
    const noOutro = await enviar(envio(b.slug, { telefone: fone }));
    assert.equal(noOutro.beneficios.cupom?.status, "emitido");
  });

  it("chave reenviada nunca devolve o código do cupom, e a indicação repete o código", async () => {
    const { slug } = await novoFormulario();
    const original = envio(slug, { telefone: telefone() });
    const primeiro = await enviar(original);
    const repetido = await enviar(original);

    assert.equal(repetido.jaEstavaRegistrada, true);
    assert.deepEqual(repetido.beneficios.cupom, { status: "ja_emitido" });
    assert.deepEqual(repetido.beneficios.indicacao, primeiro.beneficios.indicacao);
    assert.ok(!JSON.stringify(repetido).includes("TST-"));
  });

  it("cupom não depende de consentimento", async () => {
    const { slug } = await novoFormulario();
    const semConsentir = await enviar(
      envio(slug, { telefone: telefone(), consentimento: { versao: VERSAO_ATUAL, aceites: {} } }),
    );
    assert.equal(semConsentir.beneficios.cupom?.status, "emitido");

    const semNada = await enviar(envio(slug, { telefone: telefone(), consentimento: null }));
    assert.equal(semNada.beneficios.cupom?.status, "emitido");
  });

  it("WhatsApp pulado: sem cupom, sem indicação e nenhum contato (nome é descartado)", async () => {
    const { slug } = await novoFormulario({ configuracao: { whatsappObrigatorio: false } });
    const antes = loja().contatos.length;
    const resultado = await enviar(envio(slug, { nome: "Teste Sem Número" }));

    assert.deepEqual(resultado.beneficios, { cupom: null, indicacao: null });
    assert.equal(loja().contatos.length, antes);
  });

  it("WhatsApp obrigatório e em branco é recusado, com o erro por pergunta", async () => {
    const { slug } = await novoFormulario();
    const r = await registrarResposta(envio(slug, {}));
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.erro, "VALIDACAO_FALHOU");
      assert.ok(r.porPergunta?.["p-whatsapp"]);
    }
  });

  it("colisão de código: tenta de novo e emite", async () => {
    const { slug } = await novoFormulario();
    const restaurar = simularConflitos(["codigo", "codigo", "codigo"]);
    try {
      const r = await enviar(envio(slug, { telefone: telefone() }));
      assert.equal(r.beneficios.cupom?.status, "emitido");
    } finally {
      restaurar();
    }
  });

  it("colisão de código esgotada: grava o contato sem cupom e devolve falhou", async () => {
    const { slug } = await novoFormulario();
    const antes = loja().contatos.length;
    const restaurar = simularConflitos(Array(20).fill("codigo"));
    try {
      const r = await enviar(envio(slug, { telefone: telefone() }));
      assert.deepEqual(r.beneficios.cupom, { status: "falhou" });
      assert.equal(loja().contatos.length, antes + 1);
      assert.equal(loja().contatos.at(-1)?.cupom, null);
    } finally {
      restaurar();
    }
  });

  it("corrida pelo cupom do telefone vira ja_emitido", async () => {
    const { slug } = await novoFormulario();
    const restaurar = simularConflitos(["cupom_do_telefone"]);
    try {
      const r = await enviar(envio(slug, { telefone: telefone() }));
      assert.deepEqual(r.beneficios.cupom, { status: "ja_emitido" });
    } finally {
      restaurar();
    }
  });
});

describe("indicação", () => {
  it("ref válido liga o novo contato a quem indicou", async () => {
    const { slug } = await novoFormulario();
    const quemIndica = await enviar(envio(slug, { telefone: telefone() }));
    const codigo = quemIndica.beneficios.indicacao?.codigo;
    assert.ok(codigo && codigoDeIndicacaoValido(codigo));

    const amigo = await enviar(envio(slug, { telefone: telefone(), ref: codigo }));
    const contatoDoAmigo = contatoDaChave(amigo);
    const dono = loja().contatos.find((c) => c.codigoIndicacao === codigo);
    assert.ok(dono);
    assert.equal(contatoDoAmigo?.indicadoPor, dono.id);
  });

  it("ref desconhecido ou mal formado é ignorado sem aviso", async () => {
    const { slug } = await novoFormulario();
    for (const ref of ["ZZZZZZZZ", "lixo!", "", "A".repeat(200)]) {
      const e = envio(slug, { telefone: telefone(), ref });
      const r = await enviar(e);
      assert.equal(r.jaEstavaRegistrada, false);
      assert.equal(contatoDoEnvio(e)?.indicadoPor, null);
    }
  });

  it("ref do próprio número é ignorado", async () => {
    const { slug } = await novoFormulario();
    const fone = telefone();
    const primeiro = await enviar(envio(slug, { telefone: fone }));
    const e = envio(slug, { telefone: fone, ref: primeiro.beneficios.indicacao?.codigo });
    await enviar(e);
    assert.equal(contatoDoEnvio(e)?.indicadoPor, null);
  });

  it("destino ativo com WhatsApp recebe o link; destino inativo cai no próprio formulário", async () => {
    const destino = await novoFormulario({ modulos: { ...MODULOS_DESLIGADOS, recompra: true } });
    const origem = await novoFormulario({ configuracao: { formularioDeIndicacaoId: destino.id } });

    const ativo = await enviar(envio(origem.slug, { telefone: telefone() }));
    assert.equal(ativo.beneficios.indicacao?.slugDestino, destino.slug);

    await mudarSituacaoDoFormulario(destino.id, "INATIVO");
    const inativo = await enviar(envio(origem.slug, { telefone: telefone() }));
    assert.equal(inativo.beneficios.indicacao?.slugDestino, origem.slug);
  });

  it("sem destino configurado, o link aponta para o próprio formulário", async () => {
    const { slug } = await novoFormulario();
    const r = await enviar(envio(slug, { telefone: telefone() }));
    assert.equal(r.beneficios.indicacao?.slugDestino, slug);
  });
});

describe("limite de envios por IP", () => {
  const original = { minuto: process.env.LIMITE_POR_MINUTO, hora: process.env.LIMITE_POR_HORA };
  afterEach(() => {
    restaurarVariavel("LIMITE_POR_MINUTO", original.minuto);
    restaurarVariavel("LIMITE_POR_HORA", original.hora);
  });

  it("chave nova acima do limite é recusada com a espera; chave existente é devolvida", async () => {
    process.env.LIMITE_POR_MINUTO = "2";
    const { slug } = await novoFormulario({ modulos: MODULOS_DESLIGADOS, perguntas: [PERGUNTAS[0]] });
    const ipHash = `ip-${randomUUID()}`;
    const agora = new Date();
    const opcoes = { ipHash, agora };

    const primeiro = envio(slug, { consentimento: null });
    await enviar(primeiro, opcoes);
    await enviar(envio(slug, { consentimento: null }), opcoes);

    const terceiro = await registrarResposta(envio(slug, { consentimento: null }), opcoes);
    assert.equal(terceiro.ok, false);
    if (!terceiro.ok) {
      assert.equal(terceiro.erro, "LIMITE_EXCEDIDO");
      assert.ok((terceiro.tenteDeNovoEmSegundos ?? 0) >= 1);
    }

    const reenvio = await enviar(primeiro, opcoes);
    assert.equal(reenvio.jaEstavaRegistrada, true);
  });

  it("outro IP não é afetado, e sem hash de IP não há limite", async () => {
    process.env.LIMITE_POR_MINUTO = "1";
    const { slug } = await novoFormulario({ modulos: MODULOS_DESLIGADOS, perguntas: [PERGUNTAS[0]] });
    const agora = new Date();
    await enviar(envio(slug, { consentimento: null }), { ipHash: "ip-a", agora });
    await enviar(envio(slug, { consentimento: null }), { ipHash: "ip-b", agora });
    await enviar(envio(slug, { consentimento: null }), { ipHash: null, agora });
    await enviar(envio(slug, { consentimento: null }), { ipHash: null, agora });
  });
});

describe("trava do controlador", () => {
  it("em produção, formulário com pergunta pessoal e controlador incompleto fica travado (tela e envio)", async () => {
    const { slug } = await novoFormulario();
    const tela = await buscarFormularioPublicoPorSlug(slug, PRODUCAO_SEM_CONTROLADOR);
    assert.equal(tela.ok, false);
    if (!tela.ok) assert.equal(tela.erro, "FORMULARIO_TRAVADO");

    const antes = loja().respostas.length;
    const r = await registrarResposta(envio(slug, { telefone: telefone() }), { ambiente: PRODUCAO_SEM_CONTROLADOR });
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.erro, "FORMULARIO_TRAVADO");
    assert.equal(loja().respostas.length, antes);
  });

  it("com o controlador completo, ou fora de produção, ou sem pergunta pessoal, o formulário abre", async () => {
    const { slug } = await novoFormulario();
    assert.ok((await buscarFormularioPublicoPorSlug(slug, PRODUCAO_COMPLETA)).ok);
    assert.ok((await buscarFormularioPublicoPorSlug(slug, { producao: false, controlador: CONTROLADOR_VAZIO })).ok);

    const anonimo = await novoFormulario({ modulos: MODULOS_DESLIGADOS, perguntas: [PERGUNTAS[0]] });
    assert.ok((await buscarFormularioPublicoPorSlug(anonimo.slug, PRODUCAO_SEM_CONTROLADOR)).ok);
  });

  it("a lista e a situação da privacidade apontam os formulários afetados", async () => {
    const { id } = await novoFormulario();
    const anonimo = await novoFormulario({ modulos: MODULOS_DESLIGADOS, perguntas: [PERGUNTAS[0]] });

    const lista = await listarFormularios(PRODUCAO_SEM_CONTROLADOR);
    assert.equal(lista.find((f) => f.id === id)?.travado, true);
    assert.equal(lista.find((f) => f.id === id)?.pedeDadosPessoais, true);
    assert.equal(lista.find((f) => f.id === anonimo.id)?.travado, false);
    assert.equal((await listarFormularios({ producao: false, controlador: CONTROLADOR_VAZIO })).some((f) => f.travado), false);

    const situacao = await situacaoDaPrivacidade(PRODUCAO_SEM_CONTROLADOR);
    assert.equal(situacao.completo, false);
    assert.equal(situacao.travaAtiva, true);
    assert.deepEqual(situacao.pendentes, ["razaoSocial", "cnpj", "endereco", "emailPrivacidade"]);
    assert.ok(situacao.formulariosAfetados.some((f) => f.id === id));
    assert.ok(!situacao.formulariosAfetados.some((f) => f.id === anonimo.id));
  });
});

describe("dado pessoal fora das respostas", () => {
  it("`valores` nunca contém o id de pergunta pessoal nem o número", async () => {
    const { slug, id } = await novoFormulario();
    const fone = telefone();
    const e = envio(slug, { telefone: fone, nome: "Teste Pessoal" });
    await enviar(e);

    const resposta = loja().respostas.find((r) => r.formularioId === id)!;
    assert.deepEqual(Object.keys(resposta.valores), ["p-conheceu"]);
    assert.ok(!JSON.stringify(resposta.valores).includes(digitos(fone).slice(2)));
    assert.ok(!JSON.stringify(resposta.valores).includes("Teste Pessoal"));

    const contato = contatoDoEnvio(e)!;
    assert.equal(contato.telefone, `+55${digitos(fone)}`);
    assert.equal(contato.nome, "Teste Pessoal");
  });

  it("nenhuma resposta do sistema guarda id de pergunta pessoal em `valores`", async () => {
    const pessoais = new Set<string>();
    for (const v of loja().versoes) for (const p of v.perguntas) if (ehPerguntaPessoal(p)) pessoais.add(p.id);
    for (const r of loja().respostas) {
      for (const chave of Object.keys(r.valores)) assert.ok(!pessoais.has(chave), `${chave} em valores`);
    }
  });

  it("os resultados e as respostas individuais não trazem a pergunta pessoal", async () => {
    const { slug, id } = await novoFormulario();
    await enviar(envio(slug, { telefone: telefone(), nome: "Teste" }));

    const dados = await buscarResultadosDoFormulario(id);
    assert.ok(dados);
    assert.deepEqual(dados.formulario.perguntas.map((p) => p.id), ["p-conheceu"]);
    assert.ok(dados.resultados.distribuicoes.every((p) => p.perguntaId !== "p-whatsapp" && p.perguntaId !== "p-nome"));

    const individuais = await comPerguntas(dados.respostas);
    assert.ok(individuais.every((i) => i.perguntas.every((p) => !ehPerguntaPessoal(p))));
  });

  it("o formulário público leva a obrigatoriedade da loja, os módulos e o consentimento", async () => {
    const { slug } = await novoFormulario({ configuracao: { whatsappObrigatorio: false } });
    const r = await buscarFormularioPublicoPorSlug(slug, PRODUCAO_COMPLETA);
    assert.ok(r.ok);
    const whats = r.valor.perguntas.find((p) => p.tipo === "whatsapp");
    const nome = r.valor.perguntas.find((p) => p.tipo === "nome");
    assert.equal(whats?.obrigatoria, false);
    assert.equal(nome?.obrigatoria, false);
    assert.deepEqual(r.valor.modulos, { recompra: true, ofertas: true, cupom: true, indicacao: true });
    assert.equal(r.valor.consentimento?.versao, VERSAO_ATUAL);
    assert.deepEqual(r.valor.consentimento?.finalidades.map((f) => f.id), ["recompra", "ofertas"]);
    assert.equal(r.valor.controlador?.razaoSocial, CONTROLADOR_COMPLETO.razaoSocial);
    assert.equal(r.valor.pedeDadosPessoais, true);

    const anonimo = await novoFormulario({ modulos: MODULOS_DESLIGADOS, perguntas: [PERGUNTAS[0]] });
    const a = await buscarFormularioPublicoPorSlug(anonimo.slug);
    assert.ok(a.ok);
    assert.equal(a.valor.consentimento, null);
    assert.equal(a.valor.controlador, null);
    assert.equal(a.valor.pedeDadosPessoais, false);
  });
});

describe("consentimento", () => {
  it("versão desconhecida é recusada e nada é gravado", async () => {
    const { slug } = await novoFormulario();
    const antes = loja().respostas.length;
    const r = await registrarResposta(
      envio(slug, { telefone: telefone(), consentimento: { versao: "1999-01-01.v0", aceites: { recompra: true } } }),
    );
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.erro, "VALIDACAO_FALHOU");
    assert.equal(loja().respostas.length, antes);
  });

  it("grava uma linha por finalidade exibida, aceita ou não, com a versão", async () => {
    const { slug } = await novoFormulario();
    const e = envio(slug, {
      telefone: telefone(),
      consentimento: { versao: VERSAO_ATUAL, aceites: { recompra: true, inexistente: true } },
    });
    await enviar(e);
    const contato = contatoDoEnvio(e)!;
    const linhas = loja().consentimentos.filter((c) => c.contatoId === contato.id);
    assert.deepEqual(
      linhas.map((l) => [l.finalidade, l.concedido, l.textoVersao]).sort(),
      [
        ["ofertas", false, VERSAO_ATUAL],
        ["recompra", true, VERSAO_ATUAL],
      ],
    );
  });

  it("sem finalidade aceita e sem cupom nem indicação, o contato não é gravado", async () => {
    const { slug } = await novoFormulario({ modulos: { ...MODULOS_DESLIGADOS, recompra: true, ofertas: true } });
    const antes = loja().contatos.length;
    const recusou = await enviar(
      envio(slug, { telefone: telefone(), consentimento: { versao: VERSAO_ATUAL, aceites: {} } }),
    );
    assert.deepEqual(recusou.beneficios, { cupom: null, indicacao: null });
    assert.equal(loja().contatos.length, antes);

    await enviar(envio(slug, { telefone: telefone() }));
    assert.equal(loja().contatos.length, antes + 1);
  });
});

describe("configuração da loja", () => {
  const nova = (parcial: Partial<ConfiguracaoDaLoja> = {}): ConfiguracaoDaLoja => ({
    ...CONFIGURACAO_DA_LOJA_PADRAO,
    textoDoBrinde: "  Um brinde novo  ",
    ...parcial,
  });

  it("sem sessão recusa e não grava nada", async () => {
    const { id } = await novoFormulario();
    const r = await salvarConfiguracaoDaLoja(id, nova(), null);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.erro, "NAO_AUTORIZADO");
  });

  it("valida no servidor: nome obrigatório exige WhatsApp obrigatório", async () => {
    const { id } = await novoFormulario();
    const antes = auditoriasDeConfiguracao(id).length;
    const r = await salvarConfiguracaoDaLoja(id, nova({ nomeObrigatorio: true, whatsappObrigatorio: false }), SESSAO);
    assert.equal(r.ok, false);
    if (!r.ok) {
      assert.equal(r.erro, "VALIDACAO_FALHOU");
      assert.ok(r.erros?.nomeObrigatorio);
    }
    assert.equal(auditoriasDeConfiguracao(id).length, antes);
  });

  it("cupom ligado exige o brinde", async () => {
    const { id } = await novoFormulario();
    const r = await salvarConfiguracaoDaLoja(id, nova({ textoDoBrinde: "   " }), SESSAO);
    assert.equal(r.ok, false);
    if (!r.ok) assert.ok(r.erros?.textoDoBrinde);
  });

  it("grava, não cria versão e audita o antes e o depois", async () => {
    const { id } = await novoFormulario();
    const antes = (await formulariosGravados.buscarPorId(id))!;
    const r = await salvarConfiguracaoDaLoja(id, nova(), SESSAO);
    assert.ok(r.ok);

    const depois = (await formulariosGravados.buscarPorId(id))!;
    assert.equal(depois.versaoAtual, antes.versaoAtual);
    assert.equal(depois.configuracaoDaLoja.textoDoBrinde, "Um brinde novo");

    const trilha = auditoriasDeConfiguracao(id);
    assert.equal(trilha.length, 1);
    assert.equal(trilha[0].usuarioId, SESSAO.id);
    assert.deepEqual(trilha[0].metadados, {
      formularioId: id,
      antes: antes.configuracaoDaLoja,
      depois: depois.configuracaoDaLoja,
    });
  });

  it("destino da indicação precisa estar ativo e pedir WhatsApp", async () => {
    const { id } = await novoFormulario();
    const semWhats = await novoFormulario({ modulos: MODULOS_DESLIGADOS, perguntas: [PERGUNTAS[0]] });
    const rascunho = await novoFormulario({ publicar: false });
    const bom = await novoFormulario();

    for (const ruim of [semWhats.id, rascunho.id, randomUUID()]) {
      const r = await salvarConfiguracaoDaLoja(id, nova({ formularioDeIndicacaoId: ruim }), SESSAO);
      assert.equal(r.ok, false);
    }
    assert.ok((await salvarConfiguracaoDaLoja(id, nova({ formularioDeIndicacaoId: bom.id }), SESSAO)).ok);
  });
});

describe("logs", () => {
  it("o logger apaga `whatsapp`, `nome` e `telefone` em qualquer profundidade", async () => {
    const { log } = await import("../lib/logger");
    const linhas: string[] = [];
    const original = console.log;
    console.log = (linha: string) => linhas.push(linha);
    try {
      log.info("teste", { whatsapp: "21999990001", dentro: { nome: "Fulano", telefone: "+5521999990001" } });
    } finally {
      console.log = original;
    }
    assert.equal(linhas.length, 1);
    assert.ok(!linhas[0].includes("21999990001"));
    assert.ok(!linhas[0].includes("Fulano"));
  });

  it("registrar uma resposta não escreve telefone, nome nem cupom nos logs", async () => {
    const { slug } = await novoFormulario();
    const fone = telefone();
    const saida: string[] = [];
    const guardados = { log: console.log, warn: console.warn, error: console.error };
    const capturar = (linha: unknown) => void saida.push(String(linha));
    console.log = capturar;
    console.warn = capturar;
    console.error = capturar;
    let resultado;
    try {
      resultado = await enviar(envio(slug, { telefone: fone, nome: "Nome Secreto" }));
    } finally {
      Object.assign(console, guardados);
    }
    const tudo = saida.join("\n");
    assert.ok(tudo.includes("resposta registrada"));
    assert.ok(!tudo.includes(digitos(fone).slice(2)));
    assert.ok(!tudo.includes("Nome Secreto"));
    const cupom = resultado.beneficios.cupom;
    assert.ok(cupom?.status === "emitido" && !tudo.includes(cupom.codigo));
  });
});

/* ------------------------------ ajudantes ------------------------------ */

function contatoDoEnvio(e: EnvioDeResposta) {
  const idDaResposta = loja().respostas.find((r) => r.id === chaveParaResposta(e.chaveEnvio))?.id;
  return loja().contatos.find((c) => c.respostaId === idDaResposta);
}

function chaveParaResposta(chave: string): string | undefined {
  const chaves = (globalThis as unknown as { chavesDeEnvio?: Map<string, string> }).chavesDeEnvio;
  return chaves?.get(chave);
}

/** O contato criado pelo envio mais recente que trouxe esse resultado de indicação/cupom. */
function contatoDaChave(resultado: { beneficios: { indicacao: { codigo: string } | null } }) {
  return loja().contatos.find((c) => c.codigoIndicacao === resultado.beneficios.indicacao?.codigo);
}

function auditoriasDeConfiguracao(formularioId: string) {
  const trilha = (globalThis as unknown as { trilhaEmMemoria?: { acao: string; entidadeId?: string; usuarioId?: string | null; metadados?: unknown }[] })
    .trilhaEmMemoria;
  return (trilha ?? []).filter((l) => l.acao === "formulario_configurado" && l.entidadeId === formularioId);
}

function restaurarVariavel(nome: string, valor: string | undefined) {
  if (valor === undefined) delete process.env[nome];
  else process.env[nome] = valor;
}

/**
 * Faz as próximas gravações lançarem os conflitos indicados (um por chamada),
 * e depois deixa passar para o repositório de verdade. Devolve a função que
 * desfaz a troca.
 */
function simularConflitos(conflitos: ("codigo" | "cupom_do_telefone")[]): () => void {
  const original = respostasGravadas.gravar;
  const fila = [...conflitos];
  respostasGravadas.gravar = async function (this: unknown, entrada) {
    const proximo = fila.shift();
    // Sem cupom nem código não há como colidir: o conflito só vale para quem os leva.
    if (proximo && (entrada.contato?.cupom || entrada.contato?.codigoIndicacao)) throw new ConflitoDeContato(proximo);
    return original.call(respostasGravadas, entrada);
  };
  return () => {
    respostasGravadas.gravar = original;
  };
}
