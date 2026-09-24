/**
 * Qual formulário a tela de resultados abre quando ninguém escolheu um.
 *
 * O que tem mais respostas, porque é onde há mais para ver. Em empate — ou
 * quando nenhum recebeu resposta — fica o primeiro da lista.
 */
export function escolherFormularioPadrao<T extends { totalDeRespostas: number }>(formularios: T[]): T | null {
  let escolhido: T | null = null;
  for (const formulario of formularios) {
    if (!escolhido || formulario.totalDeRespostas > escolhido.totalDeRespostas) escolhido = formulario;
  }
  return escolhido;
}
