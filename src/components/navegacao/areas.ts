/**
 * As áreas do painel — a lista única de onde a barra de navegação sai.
 *
 * São três, e só três, porque cada uma responde a uma pergunta diferente:
 *
 *   Visão Geral      → como está a coleta agora?
 *   Formulários      → o que está sendo coletado?
 *   Resultados & IA  → o que as respostas significam?
 *
 * Criar ou editar formulário não é uma área: essa parte fica com a equipe que
 * cuida do sistema.
 */
import { A } from "@/lib/texts/admin";

export type AreaDoPainel = "visao-geral" | "formularios" | "resultados";

export type EntradaDaNavegacao = { chave: AreaDoPainel; rotulo: string; href: string };

export const AREAS_DO_PAINEL: readonly EntradaDaNavegacao[] = [
  { chave: "visao-geral", rotulo: A.nav.visaoGeral, href: "/admin" },
  { chave: "formularios", rotulo: A.nav.formularios, href: "/admin/formularios" },
  { chave: "resultados", rotulo: A.nav.resultados, href: "/admin/resultados" },
];
