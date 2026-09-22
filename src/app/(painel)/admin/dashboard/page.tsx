import { redirect } from "next/navigation";

/**
 * O painel de dados é a própria tela inicial do admin: separar as duas
 * custaria um clique e não daria nada em troca. Este endereço existe só para
 * quem chegar por um link antigo ou pela documentação.
 */
export default function DashboardPage() {
  redirect("/admin");
}
