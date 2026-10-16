/**
 * Contatos lidos do Postgres.
 *
 * Gravar contato não está aqui: nasce na transação da resposta
 * (`respostas-no-banco.ts`). Estas consultas são SQL à mão porque a regra de
 * "aceita mensagens por telefone" (vale a última resposta explícita por finalidade) e a
 * contagem de indicações por telefones distintos não cabem no construtor do
 * drizzle sem ficar ilegíveis.
 *
 * Estas consultas NÃO têm teste automatizado (o projeto não sobe banco nos
 * testes): o roteiro de verificação manual está no relatório do passo 4.
 */
import { sql, type SQL } from "drizzle-orm";
import type { RepositorioDeContatos } from "@/dominio/contatos/repositorio";
import type { FiltrosDeContatos, LinhaCrua, LinhaCsv } from "@/dominio/contatos/tipos";
import type { OrigemDaResposta } from "@/dominio/respostas/tipos";
import { db } from "@/lib/db";

const FORMATO_DE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Timestamp como texto ISO em UTC. O drizzle devolve data de consulta crua
 * como texto, e o formato padrão do Postgres ("… +00") não é ISO; assim a
 * conversão para `Date` não depende do fuso do servidor.
 */
function iso(coluna: SQL): SQL {
  return sql`to_char(${coluna} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

/**
 * Tabelas de apoio:
 * - `ultima`: a última resposta explícita de cada telefone, por finalidade, entre
 *   todos os cadastros dele (cadastro que não exibiu a finalidade não tem linha
 *   e, portanto, não muda o estado dela; uma linha com concedido=false é recusa);
 * - `consent`: por telefone, quais finalidades estão concedidas;
 * - `base`: um contato por linha, com o consentimento do número e as indicações
 *   (telefones distintos indicados por qualquer cadastro do mesmo número).
 */
const BASE = sql`
  ultima as (
    select distinct on (c.telefone, cc.finalidade) c.telefone, cc.finalidade, cc.concedido
    from contatos c
    join consentimentos_contato cc on cc.contato_id = c.id
    order by c.telefone, cc.finalidade, cc.registrado_em desc, c.criado_em desc, c.id desc
  ),
  consent as (
    select u.telefone,
      coalesce(bool_or(u.concedido) filter (where u.finalidade = 'recompra'), false) as aceita_recompra,
      coalesce(bool_or(u.concedido) filter (where u.finalidade = 'ofertas'), false) as aceita_ofertas
    from ultima u
    group by u.telefone
  ),
  base as (
    select c.id, c.nome, c.telefone, c.formulario_id, f.nome as formulario_nome, r.origem,
      c.criado_em, c.cupom is not null as cupom_emitido, c.cupom_expira_em,
      exists (
        select 1 from contatos o
        where o.formulario_id = c.formulario_id and o.telefone = c.telefone
          and o.id <> c.id and o.cupom is not null
      ) as cupom_em_outro_cadastro,
      coalesce(k.aceita_recompra, false) as aceita_recompra,
      coalesce(k.aceita_ofertas, false) as aceita_ofertas,
      coalesce(k.aceita_recompra or k.aceita_ofertas, false) as aceita_mensagens,
      (
        select count(distinct i.telefone)::int
        from contatos i
        join contatos d on i.indicado_por = d.id
        where d.telefone = c.telefone
      ) as indicacoes
    from contatos c
    join formularios f on f.id = c.formulario_id
    join respostas r on r.id = c.resposta_id
    left join consent k on k.telefone = c.telefone
  )
`;

type Filtros = Pick<FiltrosDeContatos, "formularioId" | "origem" | "somenteQueAceitam">;

/** Condições `where` sobre `base`. Devolve nulo se o filtro nunca casaria (id fora do formato). */
function condicoes(filtros: Filtros): SQL | null {
  const partes: SQL[] = [sql`true`];
  if (filtros.formularioId) {
    if (!FORMATO_DE_UUID.test(filtros.formularioId)) return null;
    partes.push(sql`formulario_id = ${filtros.formularioId}::uuid`);
  }
  if (filtros.origem) partes.push(sql`origem = ${filtros.origem}`);
  if (filtros.somenteQueAceitam) partes.push(sql`aceita_mensagens`);
  return sql.join(partes, sql` and `);
}

type LinhaDoBanco = {
  id: string;
  nome: string | null;
  telefone: string;
  formulario_id: string;
  formulario_nome: string;
  origem: OrigemDaResposta;
  criado_em: string;
  cupom_emitido: boolean;
  cupom_em_outro_cadastro: boolean;
  cupom_expira_em: string | null;
  aceita_recompra: boolean;
  aceita_ofertas: boolean;
  aceita_mensagens: boolean;
  indicacoes: number;
};

/** Colunas lidas de `base`, com as datas já em ISO. */
const COLUNAS = sql`
  id, nome, telefone, formulario_id, formulario_nome, origem,
  ${iso(sql`criado_em`)} as criado_em, cupom_emitido, cupom_em_outro_cadastro,
  ${iso(sql`cupom_expira_em`)} as cupom_expira_em,
  aceita_recompra, aceita_ofertas, aceita_mensagens, indicacoes
`;

function paraLinhaCrua(l: LinhaDoBanco): LinhaCrua {
  return {
    id: l.id,
    nome: l.nome,
    telefone: l.telefone,
    formularioId: l.formulario_id,
    formularioNome: l.formulario_nome,
    origem: l.origem,
    criadoEm: new Date(l.criado_em),
    aceitaMensagens: l.aceita_mensagens,
    cupomEmitido: l.cupom_emitido,
    cupomEmitidoEmOutroCadastro: l.cupom_em_outro_cadastro,
    cupomExpiraEm: l.cupom_expira_em ? new Date(l.cupom_expira_em) : null,
    indicacoes: l.indicacoes,
  };
}

export const repositorioDeContatosNoBanco: RepositorioDeContatos = {
  async listar(filtros, porPagina) {
    const onde = condicoes(filtros);
    if (!onde) return { itens: [], total: 0, paginas: 1 };

    const pagina = Math.max(1, filtros.pagina);
    const ordem =
      filtros.ordem === "indicacoes"
        ? sql`indicacoes desc, criado_em desc, id desc`
        : sql`criado_em desc, id desc`;

    const { rows: totais } = await db.execute<{ total: number }>(
      sql`with ${BASE} select count(*)::int as total from base where ${onde}`,
    );
    const total = totais[0]?.total ?? 0;

    const { rows } = await db.execute<LinhaDoBanco>(
      sql`with ${BASE} select ${COLUNAS} from base where ${onde}
          order by ${ordem} limit ${porPagina} offset ${(pagina - 1) * porPagina}`,
    );
    return {
      itens: rows.map(paraLinhaCrua),
      total,
      paginas: Math.max(1, Math.ceil(total / porPagina)),
    };
  },

  async resumo() {
    const { rows } = await db.execute<{
      contatos: number;
      aceitam_mensagens: number;
      cupons_emitidos: number;
      indicacoes: number;
    }>(sql`
      with ${BASE}
      select
        (select count(*)::int from base) as contatos,
        (select count(*)::int from base where aceita_mensagens) as aceitam_mensagens,
        (select count(*)::int from base where cupom_emitido) as cupons_emitidos,
        (select count(distinct telefone)::int from contatos where indicado_por is not null) as indicacoes
    `);
    const r = rows[0];
    return {
      contatos: r?.contatos ?? 0,
      aceitamMensagens: r?.aceitam_mensagens ?? 0,
      cuponsEmitidos: r?.cupons_emitidos ?? 0,
      indicacoes: r?.indicacoes ?? 0,
    };
  },

  async buscarCompleto(id) {
    if (!FORMATO_DE_UUID.test(id)) return null;
    const { rows } = await db.execute<{
      id: string;
      nome: string | null;
      telefone: string;
      formulario_id: string;
      aceita_mensagens: boolean;
      cupom: string | null;
      cupom_brinde: string | null;
      cupom_expira_em: string | null;
    }>(sql`
      with ${BASE}
      select c.id, c.nome, c.telefone, c.formulario_id, b.aceita_mensagens,
        c.cupom, c.cupom_brinde, ${iso(sql`c.cupom_expira_em`)} as cupom_expira_em
      from contatos c
      join base b on b.id = c.id
      where c.id = ${id}::uuid
    `);
    const l = rows[0];
    if (!l) return null;
    return {
      id: l.id,
      nome: l.nome,
      telefone: l.telefone,
      formularioId: l.formulario_id,
      aceitaMensagens: l.aceita_mensagens,
      cupom: l.cupom && l.cupom_expira_em
        ? { codigo: l.cupom, brinde: l.cupom_brinde, expiraEm: new Date(l.cupom_expira_em) }
        : null,
    };
  },

  async paraExportacao(filtros) {
    const onde = condicoes({ ...filtros, somenteQueAceitam: true });
    if (!onde) return [];
    // Um registro por telefone: o cadastro mais recente que passa nos filtros.
    const { rows } = await db.execute<LinhaDoBanco>(
      sql`with ${BASE}
          select distinct on (telefone) ${COLUNAS} from base where ${onde}
          order by telefone, criado_em desc, id desc`,
    );
    return rows
      .map((l): LinhaCsv => ({
        nome: l.nome,
        telefone: l.telefone,
        formularioNome: l.formulario_nome,
        origem: l.origem,
        criadoEm: new Date(l.criado_em),
        aceitaRecompra: l.aceita_recompra,
        aceitaOfertas: l.aceita_ofertas,
        indicacoes: l.indicacoes,
      }))
      .sort((a, b) => b.criadoEm.getTime() - a.criadoEm.getTime());
  },

  async porCodigoDeIndicacao(codigo) {
    const { rows } = await db.execute<{ id: string; telefone: string }>(
      sql`select id, telefone from contatos where codigo_indicacao = ${codigo} limit 1`,
    );
    return rows[0] ?? null;
  },

  async jaRecebeuCupom(formularioId, telefone) {
    if (!FORMATO_DE_UUID.test(formularioId)) return false;
    const { rows } = await db.execute<{ existe: boolean }>(sql`
      select exists (
        select 1 from contatos
        where formulario_id = ${formularioId}::uuid and telefone = ${telefone} and cupom is not null
      ) as existe
    `);
    return rows[0]?.existe ?? false;
  },
};
