import type { NextConfig } from "next";

/**
 * Endereços antigos do painel, de antes de ele ser organizado em Visão Geral,
 * Formulários e Resultados & IA. Continuam funcionando para quem os tiver
 * salvos, e levam ao lugar onde a mesma informação está hoje.
 *
 * Criar e editar formulário deixou de ser uma tela do painel: esses endereços
 * levam à lista de formulários. A ordem importa — a primeira regra que
 * combina é a que vale, e `/novo` precisa vir antes de `/:id`.
 */
const ENDERECOS_ANTIGOS_DO_PAINEL = [
  { source: "/admin/formularios/novo", destination: "/admin/formularios", permanent: false },
  { source: "/admin/formularios/:id/editar", destination: "/admin/formularios", permanent: false },
  { source: "/admin/formularios/:id", destination: "/admin/resultados?formulario=:id", permanent: false },
  // O filtro (`?formulario=`) e a página (`?pagina=`) seguem junto, sem regra nenhuma a mais.
  { source: "/admin/respostas", destination: "/admin/resultados", permanent: false },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return ENDERECOS_ANTIGOS_DO_PAINEL;
  },
};

export default nextConfig;
