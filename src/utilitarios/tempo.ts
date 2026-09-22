/**
 * Datas do jeito que se lê em voz alta.
 *
 * "há 8 min" responde na hora; "2026-09-22 12:48:37" obriga a pessoa a fazer
 * conta de cabeça. O carimbo exato continua disponível — vai no `title` do
 * elemento, para quem precisar do minuto certo.
 */
import { FUSO_HORARIO } from "@/dominio/constantes";

const SEGUNDO = 1_000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/** "Agora", "há 34 s", "há 8 min", "há 2 h", "há 3 dias", "12/03/2026". */
export function tempoRelativo(data: Date, agora: Date = new Date()): string {
  const diferenca = agora.getTime() - data.getTime();
  if (diferenca < 0) return dataCurta(data);
  if (diferenca < 10 * SEGUNDO) return "Agora";
  if (diferenca < MINUTO) return `há ${Math.floor(diferenca / SEGUNDO)} s`;
  if (diferenca < HORA) return `há ${Math.floor(diferenca / MINUTO)} min`;
  if (diferenca < DIA) return `há ${Math.floor(diferenca / HORA)} h`;
  if (diferenca < 7 * DIA) {
    const dias = Math.floor(diferenca / DIA);
    return dias === 1 ? "ontem" : `há ${dias} dias`;
  }
  return dataCurta(data);
}

/** "12/03/2026" */
export function dataCurta(data: Date): string {
  return data.toLocaleDateString("pt-BR", { timeZone: FUSO_HORARIO });
}

/** "12/03/2026, 14:37" — o carimbo exato, para o `title` e para o CSV. */
export function dataCompleta(data: Date): string {
  return data.toLocaleString("pt-BR", {
    timeZone: FUSO_HORARIO,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Início do dia de hoje no fuso da loja — base para "respostas hoje". */
export function inicioDeHoje(agora: Date = new Date()): Date {
  const diaLocal = agora.toLocaleDateString("en-CA", { timeZone: FUSO_HORARIO });
  return new Date(`${diaLocal}T00:00:00-03:00`);
}

/** Início do dia que ficou `dias` dias para trás, no mesmo fuso. */
export function inicioDeDiasAtras(dias: number, agora: Date = new Date()): Date {
  const inicio = inicioDeHoje(agora);
  inicio.setDate(inicio.getDate() - dias);
  return inicio;
}
