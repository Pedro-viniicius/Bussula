/**
 * Contatos em memória — o mesmo contrato da versão em Postgres, incluindo a
 * regra de "aceita mensagens" por telefone.
 */
import type { RepositorioDeContatos } from "@/dominio/contatos/repositorio";
import type { ContatoEmMemoria } from "./dados-iniciais";
import type { LinhaCrua, LinhaCsv } from "@/dominio/contatos/tipos";
import { loja } from "./loja";

type Consentimento = { aceitaRecompra: boolean; aceitaOfertas: boolean };

/** Do mais recente para o mais antigo; empate no instante vale a ordem de gravação (o último gravado é o mais novo). */
function maisRecentesPrimeiro(lista: ContatoEmMemoria[]): ContatoEmMemoria[] {
  return lista
    .map((contato, posicao) => ({ contato, posicao }))
    .sort((a, b) => b.contato.criadoEm.getTime() - a.contato.criadoEm.getTime() || b.posicao - a.posicao)
    .map((item) => item.contato);
}

/**
 * O consentimento vigente de cada telefone: para cada finalidade, a ÚLTIMA
 * RESPOSTA EXPLÍCITA entre todos os cadastros do número. Cadastro que não
 * exibiu a finalidade não tem linha e não altera o estado dela; uma linha com
 * `concedido: false` num cadastro mais recente vale como recusa.
 */
function consentimentoPorTelefone(): Map<string, Consentimento> {
  const vigente = new Map<string, Consentimento>();
  const decididas = new Set<string>();
  for (const contato of maisRecentesPrimeiro(loja().contatos)) {
    const atual = vigente.get(contato.telefone) ?? { aceitaRecompra: false, aceitaOfertas: false };
    vigente.set(contato.telefone, atual);
    for (const linha of loja().consentimentos.filter((c) => c.contatoId === contato.id)) {
      const chave = `${contato.telefone}|${linha.finalidade}`;
      if (decididas.has(chave)) continue;
      decididas.add(chave);
      if (linha.finalidade === "recompra") atual.aceitaRecompra = linha.concedido;
      if (linha.finalidade === "ofertas") atual.aceitaOfertas = linha.concedido;
    }
  }
  return vigente;
}

function aceita(consentimento: Consentimento | undefined): boolean {
  return !!consentimento && (consentimento.aceitaRecompra || consentimento.aceitaOfertas);
}

/** Telefones distintos indicados por quem tem este telefone (somando todos os cadastros dele). */
function contarIndicacoes(telefone: string): number {
  const donos = new Set(loja().contatos.filter((c) => c.telefone === telefone).map((c) => c.id));
  const indicados = new Set(
    loja()
      .contatos.filter((c) => c.indicadoPor !== null && donos.has(c.indicadoPor))
      .map((c) => c.telefone),
  );
  return indicados.size;
}

function paraLinhaCrua(contato: ContatoEmMemoria, vigente: Map<string, Consentimento>): LinhaCrua {
  const formulario = loja().formularios.find((f) => f.id === contato.formularioId);
  const resposta = loja().respostas.find((r) => r.id === contato.respostaId);
  return {
    id: contato.id,
    nome: contato.nome,
    telefone: contato.telefone,
    formularioId: contato.formularioId,
    formularioNome: formulario?.nome ?? "Formulário removido",
    origem: resposta?.origem ?? "link",
    criadoEm: contato.criadoEm,
    aceitaMensagens: aceita(vigente.get(contato.telefone)),
    cupomEmitido: contato.cupom !== null,
    cupomEmitidoEmOutroCadastro: loja().contatos.some(
      (o) =>
        o.id !== contato.id &&
        o.formularioId === contato.formularioId &&
        o.telefone === contato.telefone &&
        o.cupom !== null,
    ),
    cupomExpiraEm: contato.cupomExpiraEm,
    indicacoes: contarIndicacoes(contato.telefone),
  };
}

export const repositorioDeContatosEmMemoria: RepositorioDeContatos = {
  async listar(filtros, porPagina) {
    const vigente = consentimentoPorTelefone();
    const linhas = maisRecentesPrimeiro(loja().contatos)
      .map((contato) => paraLinhaCrua(contato, vigente))
      .filter((l) => !filtros.formularioId || l.formularioId === filtros.formularioId)
      .filter((l) => !filtros.origem || l.origem === filtros.origem)
      .filter((l) => !filtros.somenteQueAceitam || l.aceitaMensagens);

    // `sort` é estável: dentro do mesmo número de indicações, ficam os mais recentes primeiro.
    if (filtros.ordem === "indicacoes") linhas.sort((a, b) => b.indicacoes - a.indicacoes);

    const inicio = (Math.max(1, filtros.pagina) - 1) * porPagina;
    return {
      itens: linhas.slice(inicio, inicio + porPagina),
      total: linhas.length,
      paginas: Math.max(1, Math.ceil(linhas.length / porPagina)),
    };
  },

  async resumo() {
    const vigente = consentimentoPorTelefone();
    const todos = loja().contatos;
    return {
      contatos: todos.length,
      aceitamMensagens: todos.filter((c) => aceita(vigente.get(c.telefone))).length,
      cuponsEmitidos: todos.filter((c) => c.cupom !== null).length,
      indicacoes: new Set(todos.filter((c) => c.indicadoPor !== null).map((c) => c.telefone)).size,
    };
  },

  async buscarCompleto(id) {
    const contato = loja().contatos.find((c) => c.id === id);
    if (!contato) return null;
    return {
      id: contato.id,
      nome: contato.nome,
      telefone: contato.telefone,
      formularioId: contato.formularioId,
      aceitaMensagens: aceita(consentimentoPorTelefone().get(contato.telefone)),
      cupom: contato.cupom
        ? { codigo: contato.cupom, brinde: contato.cupomBrinde, expiraEm: contato.cupomExpiraEm! }
        : null,
    };
  },

  async paraExportacao(filtros) {
    const vigente = consentimentoPorTelefone();
    const escolhidos = new Map<string, LinhaCrua>();
    for (const contato of maisRecentesPrimeiro(loja().contatos)) {
      const linha = paraLinhaCrua(contato, vigente);
      if (!linha.aceitaMensagens) continue;
      if (filtros.formularioId && linha.formularioId !== filtros.formularioId) continue;
      if (filtros.origem && linha.origem !== filtros.origem) continue;
      if (!escolhidos.has(linha.telefone)) escolhidos.set(linha.telefone, linha);
    }
    return [...escolhidos.values()].map((linha): LinhaCsv => {
      const consentimento = vigente.get(linha.telefone)!;
      return {
        nome: linha.nome,
        telefone: linha.telefone,
        formularioNome: linha.formularioNome,
        origem: linha.origem,
        criadoEm: linha.criadoEm,
        aceitaRecompra: consentimento.aceitaRecompra,
        aceitaOfertas: consentimento.aceitaOfertas,
        indicacoes: linha.indicacoes,
      };
    });
  },

  async porCodigoDeIndicacao(codigo) {
    const contato = loja().contatos.find((c) => c.codigoIndicacao === codigo);
    return contato ? { id: contato.id, telefone: contato.telefone } : null;
  },

  async jaRecebeuCupom(formularioId, telefone) {
    return loja().contatos.some(
      (c) => c.formularioId === formularioId && c.telefone === telefone && c.cupom !== null,
    );
  },
};
