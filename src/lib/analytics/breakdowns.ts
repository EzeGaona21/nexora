/**
 * Desgloses de Analytics — módulo puro sobre datos ya consultados.
 */

import { weekdayOf } from "../dates.ts";

export interface WeekdayAverage {
  weekday: number;
  /** Facturación promedio de ese día de la semana en el período. */
  average: number;
  days: number;
}

/** Promedio por día de semana, ordenado de lunes a domingo. */
export function weekdayAverages(daily: { date: string; revenue: number }[]): WeekdayAverage[] {
  const acc = Array.from({ length: 7 }, (_, weekday) => ({ weekday, total: 0, days: 0 }));
  for (const d of daily) {
    const slot = acc[weekdayOf(d.date)];
    slot.total += d.revenue;
    slot.days += 1;
  }
  return [1, 2, 3, 4, 5, 6, 0].map((w) => ({
    weekday: w,
    average: acc[w].days > 0 ? acc[w].total / acc[w].days : 0,
    days: acc[w].days,
  }));
}

export interface CategoryBreakdown {
  category: string;
  revenue: number;
  profit: number;
  units: number;
  /** Participación en la facturación del período (0–100). */
  share: number;
  /** Margen bruto sobre facturación (0–100). */
  margin: number;
}

export function categoryBreakdown(
  products: { category: string | null; revenue: number; profit: number; units: number }[],
): CategoryBreakdown[] {
  const map = new Map<string, { revenue: number; profit: number; units: number }>();
  for (const p of products) {
    if (p.units <= 0) continue;
    const key = p.category ?? "Sin categoría";
    const slot = map.get(key) ?? { revenue: 0, profit: 0, units: 0 };
    slot.revenue += p.revenue;
    slot.profit += p.profit;
    slot.units += p.units;
    map.set(key, slot);
  }
  const total = [...map.values()].reduce((a, c) => a + c.revenue, 0);
  return [...map.entries()]
    .map(([category, c]) => ({
      category,
      ...c,
      share: total > 0 ? (c.revenue / total) * 100 : 0,
      margin: c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export type AbcClass = "A" | "B" | "C";

export interface AbcItem<T> {
  item: T;
  class: AbcClass;
  /** Participación acumulada hasta este producto inclusive (0–100). */
  cumulativeShare: number;
}

/**
 * Clasificación ABC (Pareto) por facturación: A = productos que explican el
 * primer 80 %, B = hasta el 95 %, C = el resto. Solo productos con ventas.
 */
export function abcClassification<T extends { revenue: number }>(products: T[]): AbcItem<T>[] {
  const sold = products.filter((p) => p.revenue > 0).sort((a, b) => b.revenue - a.revenue);
  const total = sold.reduce((a, p) => a + p.revenue, 0);
  let running = 0;
  return sold.map((item) => {
    // La clase depende de dónde EMPIEZA el producto en la curva acumulada:
    // así el que cruza el 80 % todavía cuenta como A.
    const before = total > 0 ? (running / total) * 100 : 0;
    running += item.revenue;
    return {
      item,
      class: before < 80 ? "A" : before < 95 ? "B" : "C",
      cumulativeShare: total > 0 ? (running / total) * 100 : 0,
    };
  });
}
