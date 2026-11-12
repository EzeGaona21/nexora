/**
 * Fechas de negocio. NEXORA razona en "días calendario de Argentina"
 * representados como strings ISO (YYYY-MM-DD). Módulo puro, sin dependencias.
 */

export const AR_TIMEZONE = "America/Argentina/Buenos_Aires";

/** Día calendario actual en Argentina (YYYY-MM-DD). */
export function todayAR(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: AR_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function toUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function fromUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUTC(d);
}

export function diffDays(from: string, to: string): number {
  return Math.round((toUTC(to).getTime() - toUTC(from).getTime()) / 86_400_000);
}

/** 0 = domingo … 6 = sábado. */
export function weekdayOf(date: string): number {
  return toUTC(date).getUTCDay();
}

export function startOfMonth(date: string): string {
  return `${date.slice(0, 7)}-01`;
}

export function dayOfMonth(date: string): number {
  return Number(date.slice(8, 10));
}

export function daysInMonth(date: string): number {
  const d = toUTC(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(0);
  return d.getUTCDate();
}

/** Primer día del mes desplazado `months` meses (negativo = hacia atrás). */
export function addMonths(date: string, months: number): string {
  const d = toUTC(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return fromUTC(d);
}

export function endOfMonth(date: string): string {
  return `${date.slice(0, 7)}-${String(daysInMonth(date)).padStart(2, "0")}`;
}

export const WEEKDAY_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;
