/**
 * Relógio da campanha. Turnos mensais; turno 0 = janeiro de 2022.
 * A data da campanha é parte do estado — nunca vem do relógio do sistema.
 */
export interface GameDate {
  year: number;
  month: number; // 1..12
}

export const CAMPAIGN_START: GameDate = { year: 2022, month: 1 };

export const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export function turnToDate(turn: number): GameDate {
  const m = CAMPAIGN_START.month - 1 + turn;
  return { year: CAMPAIGN_START.year + Math.floor(m / 12), month: (m % 12) + 1 };
}

export function dateToTurn(d: GameDate): number {
  return (d.year - CAMPAIGN_START.year) * 12 + (d.month - CAMPAIGN_START.month);
}

export function dateLabel(d: GameDate): string {
  return `${MESES[d.month - 1]} de ${d.year}`;
}

export function shortLabel(d: GameDate): string {
  return `${MESES_CURTOS[d.month - 1]}/${String(d.year).slice(2)}`;
}

export function turnLabel(turn: number): string {
  return dateLabel(turnToDate(turn));
}

/** "2022-10-02" -> turno em que a data cai. */
export function isoToTurn(iso: string): number {
  const [y, m] = iso.split('-').map(Number);
  return dateToTurn({ year: y, month: m });
}

export function isoLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d === 1 ? '1º' : d} de ${MESES[m - 1]} de ${y}`;
}
