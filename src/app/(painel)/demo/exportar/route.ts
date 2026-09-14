import { db } from "@/lib/db";
import { registrarAuditoria } from "@/lib/admin/audit";
import { sessaoAtual } from "@/lib/admin/session";
import { DEMO_SLUG } from "@/lib/demo/constantes";
import { eventoDemo, paraExportacao } from "@/lib/demo/queries";
import { formatarE164 } from "@/lib/validation/phone";

export const dynamic = "force-dynamic";

const FUSO = "America/Sao_Paulo";

/**
 * CSV of the demo leads. Consent is the default filter: only people who
 * agreed to marketing come out unless ?tudo=1 is passed explicitly.
 * Every export, with or without the override, is an `auditoria` row.
 * UTF-8 BOM + `;` so Excel pt-BR opens it without an import wizard.
 */
export async function GET(request: Request) {
  const sessao = await sessaoAtual();
  if (!sessao) return new Response("Não autorizado", { status: 401 });
  const evento = await eventoDemo();
  if (!evento) return new Response("Evento demo não encontrado", { status: 404 });

  const incluirTudo = new URL(request.url).searchParams.get("tudo") === "1";
  const linhas = await paraExportacao(evento.id, incluirTudo);

  await registrarAuditoria(db, {
    acao: "exportacao",
    entidade: "evento",
    entidadeId: evento.id,
    usuarioId: sessao.id,
    metadados: { evento: DEMO_SLUG, linhas: linhas.length, incluiuSemConsentimento: incluirTudo },
  });

  const cabecalho = ["Nome", "WhatsApp", "E-mail", "Modelo", "Prazo", "Vendedor", "Origem", "Cadastro", "Consentiu marketing", "Consentiu sorteio"];
  const corpo = linhas.map((l) =>
    [
      l.nome,
      formatarE164(l.telefone),
      l.email ?? "",
      l.modelo ?? "",
      l.prazo ?? "",
      l.vendedor ?? "",
      l.origem,
      l.criadoEm.toLocaleString("pt-BR", { timeZone: FUSO }),
      l.marketing ? "sim" : "não",
      l.promocao ? "sim" : "não",
    ].map(celula).join(";"),
  );
  const csv = "﻿" + [cabecalho.join(";"), ...corpo].join("\r\n") + "\r\n";
  const nome = incluirTudo ? "demo-cadastros-todos.csv" : "demo-cadastros-marketing.csv";
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${nome}"`,
      "cache-control": "no-store",
    },
  });
}

function celula(v: string): string {
  return /[";\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
