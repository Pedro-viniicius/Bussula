/**
 * Publica os formulários descritos num arquivo JSON (config/formularios/*.json).
 *
 *   pnpm formularios:publicar config/formularios/exemplo.json            # simulação (local)
 *   pnpm formularios:publicar config/formularios/exemplo.json --aplicar  # grava (local)
 *   pnpm formularios:publicar:prod config/formularios/<cliente>.json     # simulação em PRODUÇÃO
 *   pnpm formularios:publicar:prod config/formularios/<cliente>.json --aplicar
 *
 * Sem `--aplicar` nada é gravado: só mostra o que aconteceria. O destino é
 * anunciado antes de qualquer coisa. Nunca arquiva formulário que não está no
 * arquivo, nunca reativa um formulário pausado (INATIVO) e nunca mexe na
 * configuração da loja (brinde, obrigatoriedades).
 *
 * Se o arquivo for inválido ou algum formulário for recusado, nada é gravado.
 * Se o banco falhar no meio da gravação, alguns formulários podem já ter sido
 * gravados: rode o mesmo comando de novo (o que já está igual não muda).
 */
import { readFileSync } from "node:fs";

// Os serviços escolhem banco ou memória ao serem importados: escrever num
// ambiente de teste sem perceber seria o pior resultado. Por isso a flag é
// fixada ANTES de qualquer import, e conferida depois.
process.env.USAR_MOCKS = "false";

async function main() {
  const argumentos = process.argv.slice(2);
  const aplicar = argumentos.includes("--aplicar");
  const caminho = argumentos.find((a) => !a.startsWith("--"));
  if (!caminho) {
    console.error("Uso: pnpm formularios:publicar <arquivo.json> [--aplicar]");
    process.exit(1);
  }

  // Os serviços conectam por DATABASE_URL (src/lib/db/index.ts), não pela
  // DATABASE_URL_UNPOOLED que os outros scripts usam: o aviso mostra o banco
  // que de fato será usado.
  const { requireEnv } = await import("./lib/env");
  const { anunciarAlvo } = await import("./lib/alvo");
  anunciarAlvo(requireEnv("DATABASE_URL"), aplicar ? "escrevendo em" : "simulando contra");

  const { USAR_MOCKS } = await import("../src/lib/mock/config");
  if (USAR_MOCKS) {
    console.error("Abortado: o modo de teste (USAR_MOCKS) continua ligado; nada seria gravado no banco.");
    process.exit(1);
  }

  let texto: string;
  try {
    texto = readFileSync(caminho, "utf8");
  } catch {
    console.error(`Não consegui ler o arquivo: ${caminho}`);
    process.exit(1);
  }

  const { publicarDoTexto } = await import("../src/servicos/publicacao-de-formularios");
  const relatorio = await publicarDoTexto(texto, { aplicar });

  if (!relatorio.ok) {
    console.error("Arquivo recusado. Nada foi gravado:");
    for (const erro of relatorio.erros) console.error(`  - ${erro}`);
    process.exit(1);
  }

  for (const aviso of relatorio.avisos) console.warn(`Aviso: ${aviso}`);

  const rotulo = { CRIAR: "criar", NOVA_VERSAO: "nova versão", SEM_MUDANCA: "sem mudança", RECUSADO: "RECUSADO" } as const;
  for (const r of relatorio.resultados) {
    const noAr = r.poeNoAr ? " + pôr no ar (ATIVO)" : "";
    const motivo = r.motivo ? `: ${r.motivo}` : "";
    const pausado = r.naoReativado ? " (INATIVO: não reativado; reative no painel)" : "";
    const feito = r.aplicado && (r.acao !== "SEM_MUDANCA" || r.poeNoAr) ? " [feito]" : "";
    console.log(`  ${r.slug}: ${rotulo[r.acao]}${noAr}${pausado}${motivo}${feito}`);
  }

  if (relatorio.recusado) {
    console.error("Há formulário recusado. Nada foi gravado.");
    process.exit(1);
  }
  if (!aplicar) console.log("Simulação: nada foi gravado. Rode de novo com --aplicar para gravar.");
}

/** Fecha a conexão aberta pelos serviços; sem isso o processo espera ~30 s para encerrar. */
async function fecharConexao() {
  const { pgPool } = globalThis as unknown as { pgPool?: { end(): Promise<void> } };
  await pgPool?.end().catch(() => undefined);
}

main()
  .catch((err) => {
    console.error("Falhou:", err);
    process.exitCode = 1;
  })
  .finally(fecharConexao);
