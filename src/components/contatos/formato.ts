/** "2026-11-14" -> "14/11/2026". A data já vem no fuso da loja; só se reordena o texto. */
export function formatarDia(dia: string): string {
  const [ano, mes, diaDoMes] = dia.split("-");
  return `${diaDoMes}/${mes}/${ano}`;
}
