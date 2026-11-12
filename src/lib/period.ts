/**
 * Período de análisis elegido por el usuario (?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * o ?rango=7|30|90|mes). Módulo puro: valida y acota la entrada.
 */

import { addDays, diffDays, startOfMonth } from "./dates.ts";

export interface Period {
  from: string;
  to: string;
  days: number;
  /** Clave del atajo activo, o "custom". */
  preset: string;
}

export const PERIOD_PRESETS = [
  { key: "7", label: "7 días" },
  { key: "30", label: "30 días" },
  { key: "90", label: "90 días" },
  { key: "mes", label: "Este mes" },
] as const;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
/** Tope de un año para mantener las consultas acotadas. */
export const MAX_PERIOD_DAYS = 366;

function isRealDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function resolvePeriod(
  params: { rango?: string; desde?: string; hasta?: string },
  today: string,
): Period {
  const { desde, hasta } = params;
  if (desde && hasta && isRealDate(desde) && isRealDate(hasta)) {
    const to = hasta > today ? today : hasta;
    let from = desde > to ? to : desde;
    if (diffDays(from, to) + 1 > MAX_PERIOD_DAYS) from = addDays(to, -(MAX_PERIOD_DAYS - 1));
    return { from, to, days: diffDays(from, to) + 1, preset: "custom" };
  }
  if (params.rango === "mes") {
    const from = startOfMonth(today);
    return { from, to: today, days: diffDays(from, today) + 1, preset: "mes" };
  }
  const days = params.rango === "7" ? 7 : params.rango === "90" ? 90 : 30;
  return { from: addDays(today, -(days - 1)), to: today, days, preset: String(days) };
}

/** Período inmediatamente anterior, de la misma duración. */
export function previousPeriod(period: Period): { from: string; to: string } {
  const to = addDays(period.from, -1);
  return { from: addDays(to, -(period.days - 1)), to };
}
